import { api, FileEvent } from "./api";

/**
 * A live view of what the viewer is loading.
 *
 * Every file goes through api.fetchFile(), so subscribing to it shows the whole
 * dependency graph as it unfolds -- the model, its materials' textures, the
 * companion .rcsmodel, the sky -- without any loader reporting itself.
 *
 * It fades out once loading settles, and comes back if a later file starts, so
 * a scene that streams in over several seconds explains itself and then gets
 * out of the way. Failures stay on screen: a missing texture is exactly what
 * this is for, and it must not scroll past before it is read.
 */

/** How long the panel lingers after the last file settles. */
const IDLE_HIDE_MS = 1200;
/** Longer when something failed, so the row can be read -- but still finite. */
const FAILURE_HIDE_MS = 5000;
/** Rows kept in the DOM; the oldest completed ones are dropped first. */
const MAX_ROWS = 14;
/** Row line-height, in px. */
const ROW_HEIGHT_PX = 16;
/** Panel width. Wide enough for a long texture name plus its size. */
const PANEL_WIDTH = "38ch";

type Row = {
  element: HTMLElement;
  filename: string;
  failed: boolean;
};

function shortName(filename: string): string {
  const parts = filename.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || filename;
}

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export class LoadingLog {
  private readonly _root: HTMLElement;
  private readonly _list: HTMLElement;
  private readonly _summary: HTMLElement;
  private readonly _rows = new Map<string, Row>();
  private _started = 0;
  private _done = 0;
  private _failed = 0;
  private _pending = 0;
  private _hideTimer: number | undefined;

  constructor(parent: Element) {
    this._root = document.createElement("div");
    this._root.style.cssText = [
      // Fixed, not absolute: this attaches to the body, and the body here has
      // no positioning of its own -- `fixed` pins it to the viewport without
      // depending on that, and without making any ancestor a containing block
      // that the renderers' 100%-sized canvases would then resolve against.
      "position:fixed",
      "top:8px",
      "left:8px",
      "z-index:20",
      `width:${PANEL_WIDTH}`,
      "max-width:calc(100vw - 16px)",
      "padding:8px 10px",
      "border-radius:6px",
      "background:rgba(16,16,20,.78)",
      "color:#e8e8ea",
      "font:11px/1.45 var(--vscode-editor-font-family,ui-monospace,Menlo,Consolas,monospace)",
      "pointer-events:none",
      "opacity:0",
      "transition:opacity .25s ease",
    ].join(";");

    this._summary = document.createElement("div");
    this._summary.style.cssText = "font-weight:600;margin-bottom:4px;letter-spacing:.02em";
    this._root.appendChild(this._summary);

    this._list = document.createElement("div");
    this._root.appendChild(this._list);

    parent.appendChild(this._root);
    api.onFile((event) => this._onFile(event));
  }

  private _onFile(event: FileEvent) {
    switch (event.phase) {
      case "start":
        this._started++;
        this._pending++;
        this._addRow(event.filename);
        break;
      case "done":
        this._done++;
        this._pending--;
        this._finishRow(event.filename, `${humanSize(event.bytes)} · ${Math.round(event.ms)}ms`, false);
        break;
      case "fail":
        this._failed++;
        this._pending--;
        this._finishRow(event.filename, event.reason, true);
        break;
    }
    this._render();
  }

  private _addRow(filename: string) {
    const element = document.createElement("div");
    // Fixed height and never wrapping: the column height is a multiple of the
    // row height, so a row that grew to two lines would push the column break
    // onto the wrong row. Long names are ellipsised instead.
    element.style.cssText = [
      "display:flex",
      "gap:6px",
      "white-space:nowrap",
      "overflow:hidden",
      `height:${ROW_HEIGHT_PX}px`,
      `line-height:${ROW_HEIGHT_PX}px`,
    ].join(";");

    const icon = document.createElement("span");
    icon.textContent = "…";
    icon.style.cssText = "width:1em;flex:none;opacity:.7";

    const name = document.createElement("span");
    name.textContent = shortName(filename);
    name.style.cssText = "overflow:hidden;text-overflow:ellipsis";

    const detail = document.createElement("span");
    detail.style.cssText = "margin-left:auto;flex:none;opacity:.55;padding-left:8px";

    element.append(icon, name, detail);
    this._list.appendChild(element);
    this._rows.set(filename, { element, filename, failed: false });
    this._trim();
  }

  private _finishRow(filename: string, detail: string, failed: boolean) {
    const row = this._rows.get(filename);
    if (!row) return;
    row.failed = failed;
    const [icon, , info] = row.element.children;
    icon.textContent = failed ? "✕" : "✓";
    (icon as HTMLElement).style.opacity = "1";
    (icon as HTMLElement).style.color = failed ? "#ff8080" : "#7ddc9a";
    info.textContent = detail;
    if (failed) {
      (info as HTMLElement).style.opacity = "1";
      (info as HTMLElement).style.color = "#ff8080";
      // One line, with the full reason in the tooltip and in the log.
      (row.element as HTMLElement).title = `${filename}: ${detail}`;
    }
    this._trim();
  }

  /** Keep the panel short, dropping settled successes -- never a failure. */
  private _trim() {
    if (this._rows.size <= MAX_ROWS) return;
    for (const [filename, row] of this._rows) {
      if (this._rows.size <= MAX_ROWS) break;
      if (row.failed) continue;
      const icon = row.element.children[0]?.textContent;
      if (icon === "…") continue; // still loading
      row.element.remove();
      this._rows.delete(filename);
    }
  }

  private _render() {
    const parts = [`${this._done}/${this._started} files`];
    if (this._pending > 0) parts.push(`${this._pending} loading`);
    if (this._failed > 0) parts.push(`${this._failed} failed`);
    this._summary.textContent = parts.join(" · ");

    this._root.style.opacity = "1";
    if (this._hideTimer !== undefined) window.clearTimeout(this._hideTimer);
    // Hides once loading settles, failures included. A ship has no sky.gtf and
    // no track.envsettings beside it, so a missing file is the NORMAL case --
    // keeping the panel up for one would leave it covering the scene forever.
    // The failure stays in the log, and the panel comes back if anything new
    // starts loading.
    if (this._pending === 0) {
      this._hideTimer = window.setTimeout(() => {
        this._root.style.opacity = "0";
      }, this._failed > 0 ? FAILURE_HIDE_MS : IDLE_HIDE_MS);
    }
  }
}
