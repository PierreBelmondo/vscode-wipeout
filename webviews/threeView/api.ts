import * as vscode from "../vscode";
import { ThreeViewMessageImportBody, ThreeViewMessageImportErrorBody } from "@core/api/rpc";

/** A correlated `require` still waiting for its `import` / `import.error`. */
type Pending = {
  filename: string;
  resolve: (body: ThreeViewMessageImportBody) => void;
  reject: (error: Error) => void;
  /** The lost-reply timer, cleared when the reply arrives. */
  timer: number;
};

/** What happened to one file, for the on-screen loading log. */
export type FileEvent =
  | { phase: "start"; filename: string }
  | { phase: "done"; filename: string; bytes: number; ms: number }
  | { phase: "fail"; filename: string; reason: string; ms: number };

export type FileListener = (event: FileEvent) => void;

/**
 * How long to wait for the editor's answer to a `require`.
 *
 * Generous: it covers a cold directory walk over a large data tree, not a slow
 * read. It exists only so a LOST reply surfaces as an error instead of an
 * indefinite wait.
 */
const REQUIRE_TIMEOUT_MS = 30000;

class API {
  private _nextRequireId = 1;
  private readonly _pending = new Map<number, Pending>();
  private readonly _files = new Map<string, Promise<ArrayBuffer>>();
  private readonly _listeners: FileListener[] = [];

  /**
   * Watch file loading as it happens.
   *
   * Every file the viewer needs goes through fetchFile(), so subscribing here
   * sees the whole dependency graph -- textures, materials, the companion
   * .rcsmodel, the sky -- without each loader having to report itself.
   */
  onFile(listener: FileListener) {
    this._listeners.push(listener);
  }

  private _emit(event: FileEvent) {
    // A broken listener is a UI problem and must not fail the load it reports.
    for (const listener of this._listeners) {
      try {
        listener(event);
      } catch {}
    }
  }

  ready() {
    vscode.postMessage({ type: "ready" });
  }

  /**
   * Resolve a dependency and read its bytes.
   *
   * This is `require` plus the fetch that every caller did by hand, so a
   * consumer can `await` a file and `catch` its failure at the point it needs
   * it -- rather than firing a request, returning, and waiting for the reply to
   * arrive at an unrelated `import()` entry point.
   *
   * Deduplicated by filename: an .rcsmodel names the same texture from dozens
   * of materials, and each used to become its own round trip and its own
   * decode. Sharing the promise makes repeat callers await the first request.
   */
  fetchFile(filename: string): Promise<ArrayBuffer> {
    const cached = this._files.get(filename);
    if (cached) return cached;
    // Only the first caller reports: a deduplicated repeat is not a load, and
    // showing it would make the log count the same texture dozens of times.
    const started = performance.now();
    this._emit({ phase: "start", filename });
    const promise = this.require(filename).then(async (body) => {
      const response = await fetch(body.webviewUri);
      if (!response.ok) throw new Error(`${filename}: fetch failed (${response.status})`);
      const buffer = await response.arrayBuffer();
      this._emit({ phase: "done", filename, bytes: buffer.byteLength, ms: performance.now() - started });
      return buffer;
    });
    promise.catch((e: Error) => {
      this._emit({ phase: "fail", filename, reason: e.message, ms: performance.now() - started });
    });
    // The cache only shares an IN-FLIGHT request. Once settled the entry goes,
    // whichever way it went: a failure must not be cached as permanent, and a
    // success must not keep the bytes alive -- this used to hold every file's
    // ArrayBuffer for the life of the webview, which on a track is hundreds
    // of megabytes of raw texture data that nothing reads twice. Decoded
    // textures are pooled by the loader; the browser's own cache covers a
    // repeat fetch of the URL.
    promise.then(
      () => this._files.delete(filename),
      () => this._files.delete(filename)
    );
    this._files.set(filename, promise);
    return promise;
  }

  /**
   * Ask the editor to resolve and serve a dependency.
   *
   * The returned promise settles when that specific file comes back -- with
   * the URL to fetch it from, or a rejection if the editor could not find it.
   * The reply goes nowhere else: whoever awaits this does the loading.
   */
  require(filename: string): Promise<ThreeViewMessageImportBody> {
    const id = this._nextRequireId++;
    const promise = new Promise<ThreeViewMessageImportBody>((resolve, reject) => {
      // A reply that never comes must not hold the load open forever. The
      // editor answers every correlated require, but it is a separate process
      // reached over a bridge: if it throws before replying, is disposed, or
      // drops the message, the awaiting loader would wait for the lifetime of
      // the webview -- and the viewer would sit on the loading screen with no
      // error anywhere. Failing loudly after a timeout is strictly better.
      const timer = window.setTimeout(() => {
        if (!this._pending.delete(id)) return;
        reject(new Error(`${filename}: no reply from the editor after ${REQUIRE_TIMEOUT_MS / 1000}s`));
      }, REQUIRE_TIMEOUT_MS);
      this._pending.set(id, { filename, resolve, reject, timer });
    });
    // Most callers want the side effect and drop the promise. A rejection with
    // no handler would reach `unhandledrejection` and log as an uncaught error,
    // so absorb it here; the promise handed back still rejects for whoever
    // awaits it, because `catch` returns a new promise and leaves this one's
    // own settlement untouched.
    promise.catch(() => {});
    vscode.postMessage({ type: "require", filename, id });
    return promise;
  }

  /**
   * Settle the promise for a correlated reply. Returns false if nothing was
   * waiting for it -- an uncorrelated or already-settled message.
   */
  resolveRequire(body: ThreeViewMessageImportBody): boolean {
    if (body.id === undefined) return false;
    const pending = this._pending.get(body.id);
    if (!pending) return false;
    this._pending.delete(body.id);
    window.clearTimeout(pending.timer);
    pending.resolve(body);
    return true;
  }

  /** Fail the promise for a dependency the editor could not resolve. */
  rejectRequire(body: ThreeViewMessageImportErrorBody): boolean {
    const pending = this._pending.get(body.id);
    if (!pending) {
      this.log(`[require] ${body.uri} failed: ${body.reason}`);
      return false;
    }
    this._pending.delete(body.id);
    window.clearTimeout(pending.timer);
    pending.reject(new Error(`${pending.filename}: ${body.reason}`));
    return true;
  }

  log(message: any) {
    // Mirrored to the webview console: the postMessage bridge drops lines under
    // load -- pick diagnostics repeatedly arrived truncated a few lines in --
    // and the console never does.
    console.log(message);
    vscode.postMessage({ type: "log", message });
  }

  exportGTLF(gltf: any) {
    vscode.postMessage({ type: "export.gltf", body: gltf });
  }

  scene(scene: any) {
    vscode.postMessage({ type: "scene", body: scene });
  }

  sceneSelected(uuid: string) {
    vscode.postMessage({ type: "scene.selected", body: { uuid } });
  }
}

export const api = new API();
