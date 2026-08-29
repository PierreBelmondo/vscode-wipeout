import * as THREE from "three";

import { api } from "../api";
import { Loader } from ".";
import { World } from "../worlds";
import { mipmapsToTexture } from "../utils";
import { POB, POBBlock, POBAnimationPath, POBEmitter, POBPathSlot } from "@core/formats/pob";
import { PobParticleSystem } from "./pobParticles";
import { GTF } from "@core/formats/gtf";

/**
 * A .pob particle system on its own.
 *
 * The engine's emitter holds five `PsysPath` curves (see `POB.emitters`), each
 * a run of `[time, value]` keys normalised over a particle's lifetime. Which
 * property each of the five drives is **not decoded** -- the slots are
 * positional in the engine and nothing in the file names them -- so this is not
 * a simulation of the effect. What it does show is the real motion the file
 * contains: every sprite the system draws with, animated by the curves the
 * file actually carries, with a scrubber over the lifetime.
 *
 * Sprites: PSP builds embed them as palettised sheets; PS3 and Vita builds
 * reference them by the artist's source path (`...\Tex\yellow_glow.tga`), and
 * the shipped texture is `data/psys/tex/<name>.gtf` beside the system.
 */
export class POBLoader extends Loader {
  /** World units per sprite sheet: the tallest sheet is drawn this high. */
  private static readonly SPRITE_HEIGHT = 100;
  private static readonly GAP = 20;

  /** Seconds for one there-and-back sweep of the emitters. */
  private static readonly SWEEP_SECONDS = 4;

  /**
   * A plane whose V axis matches a DataTexture's row order.
   *
   * The decoded sheets store row 0 at the top and upload with `flipY` unset,
   * so the stock plane -- v=1 at the top -- shows them upside down. Flipping V
   * here keeps the texture untouched for the particle shader, which samples
   * with the same top-first convention via gl_PointCoord.
   */
  private static plane(width: number, height: number): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    uv.needsUpdate = true;
    return geometry;
  }

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string) {
    world.userdata.filename = filename;
    const pob = await POB.load(arrayBuffer);
    api.log(
      `[pob] ${pob.name} (${pob.bigEndian ? "PS3, BE" : "LE"}): ${pob.blocks.length} blocks, ` +
        `${pob.textures.length} embedded texture(s), ${pob.texturePaths.length} source path(s)`
    );

    const group = new THREE.Group();
    group.name = pob.name;
    group.userData = { format: "POB", type: "PARTICLE_SYSTEM" };
    world.scene.add(group);

    // The sprites, embedded or external.
    const sprites: { name: string; texture: THREE.Texture; descriptorOffset?: number }[] = [];
    pob.textures.forEach((t, i) => {
      const texture = mipmapsToTexture([t.toMipmap()]);
      if (!texture) return;
      texture.name = `${pob.name}#${i} (${t.width}x${t.height} ${t.bitsPerPixel}bpp)`;
      sprites.push({ name: texture.name, texture, descriptorOffset: t.offset });
    });
    if (!sprites.length) {
      // External: one .gtf per distinct source basename, in file order.
      const names = [...new Set(pob.texturePaths.map((p) => p.split(/[\\/]/).pop()!.replace(/\.tga$/i, "")))];
      for (const name of names) {
        const file = `data/psys/tex/${name}.gtf`;
        try {
          const gtf = GTF.load(await api.fetchFile(file));
          const texture = mipmapsToTexture(gtf.mipmaps);
          if (!texture) continue;
          texture.name = `${name}.gtf`;
          sprites.push({ name: texture.name, texture });
        } catch (e) {
          api.log(`[pob] ${file}: ${(e as Error).message}`);
        }
      }
    }
    for (const s of sprites) world.textures[s.name] = s.texture;

    // Lay the sheets out in a row, each at its own aspect, tallest = SPRITE_HEIGHT.
    let x = 0;
    const H = POBLoader.SPRITE_HEIGHT;
    const meshes: THREE.Mesh[] = [];
    for (const s of sprites) {
      const img = s.texture.image as { width: number; height: number };
      const w = (H * img.width) / img.height;
      const mesh = new THREE.Mesh(
        POBLoader.plane(w, H),
        new THREE.MeshBasicMaterial({
          map: s.texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      );
      mesh.name = s.name;
      mesh.position.set(x + w / 2, H / 2, 0);
      mesh.userData = { restX: x + w / 2, restY: H / 2 };
      group.add(mesh);
      meshes.push(mesh);
      x += w + POBLoader.GAP;
    }
    if (!sprites.length) api.log(`[pob] ${pob.name}: no sprite texture could be loaded`);

    // Run the system: one live emitter per decoded emitter record, drawn above
    // the sheets it uses.
    // Every emitter runs, sheet or not: PS3 and Vita reference their textures
    // externally, so an emitter without one draws a soft dot rather than
    // vanishing.
    const systems: PobParticleSystem[] = [];
    pob.emitters.forEach((emitter, i) => {
      // The texture descriptor sits inside its emitter's record (+0x9ac), so
      // containment -- not index order -- is what pairs a sheet to an emitter.
      // Wrong pairing puts one emitter's frame grid on another's sheet, which
      // renders as garbage crops. External sheets have no descriptor; those
      // fall back to index order.
      const record = emitter.offset - 0x4d8;
      const owned = sprites.find((sp) => sp.descriptorOffset !== undefined && sp.descriptorOffset >= record && sp.descriptorOffset < record + 0xc90);
      const sprite = owned ?? sprites[i % Math.max(1, sprites.length)];
      const system = new PobParticleSystem(emitter, sprite?.texture, H);
      system.points.position.set((x - POBLoader.GAP) / 2, H * 1.6, 0);
      system.points.name = `emitter ${i}`;
      group.add(system.points);
      systems.push(system);
    });

    if (systems.length) {
      const emitting = pob.emitters.filter((e) => e.params.emissionRate > 0).length;
      api.log(
        `[pob] ${pob.name}: ${systems.length} emitter(s), ${emitting} emitting; ` +
          `rate=${pob.emitters.map((e) => e.params.emissionRate.toFixed(1)).join("/")} ` +
          `cone=${pob.emitters.map((e) => e.params.coneAngle.toFixed(2)).join("/")}`
      );
      // Sweep the emitters along a line and back, so trailing behaviour is
      // visible: a system that leaves a trail looks different from one that
      // does not, and a static emitter hides the difference entirely.
      const travel = Math.max(x - POBLoader.GAP, H * 2);
      let elapsed = 0;
      world.addTickMaterial({
        tick: (delta: number) => {
          const step = Math.min(delta, 0.1);
          elapsed += step;
          // Triangle wave over SWEEP_SECONDS, easing at each end.
          const phase = (elapsed % POBLoader.SWEEP_SECONDS) / POBLoader.SWEEP_SECONDS;
          const back = phase < 0.5 ? phase * 2 : 2 - phase * 2;
          const originX = (back - 0.5) * travel;
          for (const system of systems) system.tick(step, H, originX);
        },
      });
    }

    // The sheets themselves keep showing the curves that drive them.
    const animated = pob.emitters.filter((e) => e.paths.some((p) => p.keys.length > 1));
    if (animated.length && meshes.length) world.addTickMaterial(this.animator(meshes, animated));

    // The colour/alpha ramp: block[0], packed RGBA quads. On PS3 the quad is a
    // big-endian u32, so the bytes come back reversed (see the README).
    const ramp = pob.blocks[0] ? this.rampTexture(pob.blocks[0], pob.bigEndian) : null;
    if (ramp) {
      world.textures[ramp.name] = ramp;
      const width = Math.max(x - POBLoader.GAP, H);
      const strip = new THREE.Mesh(
        POBLoader.plane(width, H / 8),
        new THREE.MeshBasicMaterial({ map: ramp, transparent: true, side: THREE.DoubleSide, depthWrite: false })
      );
      strip.name = "colour ramp";
      strip.position.set(width / 2, -H / 8, 0);
      group.add(strip);
    }

    // The emitter origin, labelled with the system's name.
    const origin = this.createControlPoint(pob.name);
    origin.name = `emitter ${pob.name}`;
    group.add(origin);

    // Centre the row on the origin for the camera.
    group.position.x = -(x - POBLoader.GAP) / 2;
    return world;
  }

  /**
   * Play the file's curves over a looping particle lifetime.
   *
   * Each sprite is driven by its own emitter's paths, so a system with several
   * emitters shows them side by side rather than in lockstep. Slots 0 and 1 are
   * size and alpha (see `POBPathSlot`); the remaining three are not identified,
   * so they are read but not applied rather than invented.
   *
   * A key's value is normalised, so it is mapped onto the path's own
   * `[minValue, maxValue]` -- that range is what makes an explosion grow from 4
   * to 18 units rather than from 0 to 1.
   */
  private animator(meshes: THREE.Mesh[], emitters: POBEmitter[]) {
    const LIFETIME = 2.0;
    let elapsed = 0;

    const sample = (path: POBAnimationPath, t: number): number => {
      const keys = path.keys;
      let normalised: number;
      const last = keys[keys.length - 1];
      if (t <= keys[0].time) normalised = keys[0].value;
      else if (t >= last.time) normalised = last.value;
      else {
        normalised = last.value;
        for (let i = 1; i < keys.length; i++) {
          if (t > keys[i].time) continue;
          const a = keys[i - 1];
          const b = keys[i];
          const span = b.time - a.time;
          // Keys may share a time -- the curves step as well as ramp.
          normalised = span <= 0 ? b.value : a.value + ((t - a.time) / span) * (b.value - a.value);
          break;
        }
      }
      return path.minValue + normalised * (path.maxValue - path.minValue);
    };

    return {
      tick: (delta: number) => {
        elapsed = (elapsed + delta) % LIFETIME;
        const t = elapsed / LIFETIME;
        for (const [i, mesh] of meshes.entries()) {
          // A file usually has one emitter per sheet; where it does not, the
          // sheets share the emitters round-robin rather than going unanimated.
          const paths = emitters[i % emitters.length].paths;
          const material = mesh.material as THREE.MeshBasicMaterial;

          // Alpha is authored 0..255; size is in world units, so it is shown
          // relative to the sheet's own drawn size rather than as an absolute.
          const alpha = paths[POBPathSlot.ALPHA];
          if (alpha && alpha.keys.length) {
            const value = sample(alpha, t);
            material.opacity = Math.max(0, Math.min(1, alpha.maxValue > 1 ? value / 255 : value));
          }

          const size = paths[POBPathSlot.SIZE];
          if (size && size.keys.length > 1 && size.maxValue > 0) {
            const scale = Math.max(0.01, sample(size, t) / size.maxValue);
            mesh.scale.set(scale, scale, 1);
          }
        }
      },
    };
  }

  /** A 1-texel-high strip of the ramp's colours, left to right. */
  private rampTexture(block: POBBlock, bigEndian: boolean): THREE.DataTexture | null {
    const raw = block.asRGBA();
    const count = raw.length >> 2;
    if (!count) return null;
    const data = new Uint8Array(count * 4);
    for (let i = 0; i < count; i++) {
      for (let c = 0; c < 4; c++) data[i * 4 + c] = bigEndian ? raw[i * 4 + 3 - c] : raw[i * 4 + c];
    }
    const texture = new THREE.DataTexture(data as unknown as Uint8ClampedArray<ArrayBuffer>, count, 1, THREE.RGBAFormat);
    texture.name = "colour ramp";
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }
}
