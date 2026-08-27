import * as THREE from "three";

import { api } from "../api";
import { GTF } from "@core/formats/gtf";
import { GXT } from "@core/formats/gxt";
import { GNF } from "@core/formats/gnf";
import { Loader } from ".";
import { facesToCubeTexture, mipmapsToTexture } from "../utils";
import { RcsModel, RcsModelIBO, RcsModelMaterial, RcsModelMesh1, RcsModelMesh5, RcsModelObject, RcsModelPart, RcsModelTexture, RcsModelVBO } from "@core/formats/rcs";
import { RcsModelPS5, RcsModelPS5Material, RcsModelPS5Texture } from "@core/formats/rcs/rcsmodel_ps5";
import { World } from "../worlds";
import { createMaterial, setEnvSettings, GENERATED_NAMES, ONLY_GENERATED_MATERIALS } from "../materials/rcs";
import { rcsHash } from "@core/formats/rcs/ids";
import { channelSlot } from "../materials/rcs/_channels";
import { Stride, StreamKind, streamKind, streamComponents } from "@core/formats/rcs/ids";
import { EnvKey, EnvSettings, parseEnvSettings } from "@core/formats/rcs/envsettings";
import { AttrBinding, bindAttributes } from "../materials/rcs/_bindings";
import { VertexNormalsHelper } from "../helpers/VertexNormalsHelper";
import { invalidateSceneLights } from "../materials/rcs/_generated";



/**
 * Slots whose texture holds colour rather than data.
 *
 * The game authors its colour textures in sRGB. Nothing declared that, so they
 * were sampled as if linear -- every texel already too bright before a light
 * touched it, which is most of why the scene looked washed out. Normal,
 * specular and light maps are *data*, not colour, and must stay linear or
 * their values are wrong.
 *
 * A texture is shared between materials and can serve different roles, so this
 * cannot be decided when the file loads; it is only knowable once the slot is.
 */
const COLOUR_SLOTS = new Set(["map", "emissiveMap", "envMap"]);

/** Tag a texture for the slot it is about to fill. See COLOUR_SLOTS. */
export function encodeForSlot(texture: THREE.Texture, slot: string) {
  const encoding = COLOUR_SLOTS.has(slot) ? THREE.sRGBEncoding : THREE.LinearEncoding;
  if (texture.encoding !== encoding) {
    texture.encoding = encoding;
    texture.needsUpdate = true;
  }
}

/**
 * Bind textures to the Three.js slots the *shaders* name, for slots the
 * material factory left empty.
 *
 * Until now textures reached `make()` as a positional array and each factory
 * destructured it by guesswork (`const [map, lightMap] = textures`). The
 * engine does not work that way: every sampler carries an id, and that id says
 * what the texture is for. Across the 16 shipped tracks the .rcsmodel files
 * name 1591 specular, emissive and normal channels that no factory bound, so
 * those maps were loaded, handed over in an arbitrary slot and dropped --
 * which is why the scene had almost no specular response.
 *
 * This runs *after* the factory, and only fills a slot that is still empty. A
 * factory that deliberately routes a texture somewhere (the animated
 * materials, the ones with hand-read shader evidence) keeps its choice; this
 * only recovers what would otherwise have been discarded.
 *
 * `needsUpdate` is required: the material was already built, and adding a map
 * changes the shader permutation Three compiles for it.
 */
function applyChannelSlots(material: THREE.Material, channels: TextureChannel[]) {
  const target = material as unknown as Record<string, unknown>;
  let bound = 0;
  for (const channel of channels) {
    if (!channel.texture) continue;
    const slot = channelSlot(channel.id);
    if (!slot) continue;
    // Only slots this material type actually has: assigning `specularMap` to a
    // MeshBasicMaterial would be silently ignored, and assigning to a material
    // that never declared the property would not create a valid uniform.
    if (!(slot in target)) continue;
    if (target[slot]) continue;
    encodeForSlot(channel.texture, slot);
    target[slot] = channel.texture;
    bound++;
  }
  // Slots the factory filled itself still need their encoding declared.
  for (const slot of ["map", "emissiveMap", "envMap", "normalMap", "specularMap", "lightMap", "alphaMap", "aoMap"]) {
    const texture = target[slot];
    if (texture instanceof THREE.Texture) encodeForSlot(texture, slot);
  }
  if (bound > 0) material.needsUpdate = true;
}

type TextureChannel = {
  /** The shader's own sampler id for this slot. See materials/rcs/_channels.ts. */
  id: number;
  filename: string;
  texture: THREE.Texture | null;
};

class AsyncMaterial {
  world: World;
  rcsMaterial: RcsModelMaterial | RcsModelPS5Material;
  meshes: THREE.Mesh[] = [];
  textureChannels: TextureChannel[] = [];
  material?: THREE.Material;

  constructor(world: World, material: RcsModelMaterial | RcsModelPS5Material) {
    this.world = world;
    this.rcsMaterial = material;
  }

  get basename(): string {
    const list = this.rcsMaterial.filename.split("/");
    return list[list.length - 1];
  }

  require() {
    api.require(this.rcsMaterial.filename);
  }

  linkMesh(mesh: THREE.Mesh) {
    this.meshes.push(mesh);
  }

  match(filename: string) {
    return this.rcsMaterial.filename == filename;
  }

  registerTexture(id: number, filename: string) {
    this.textureChannels.push({ id, filename, texture: null });
  }

  /** A slot with no file: keeps later channels at their real slot index. */
  registerEmptyChannel(id: number) {
    this.textureChannels.push({ id, filename: "", texture: null });
  }

  /** A slot holding a shader constant rather than a texture. */
  constants = new Map<number, [number, number, number, number]>();
  registerConstant(id: number, value: [number, number, number, number]) {
    this.constants.set(id, value);
    // Still a channel, so later slots keep their real index.
    this.textureChannels.push({ id, filename: "", texture: null });
  }

  /**
   * Called once every channel has been registered. A material finishes here
   * when it is waiting for nothing: either it declares no channels at all, or
   * every channel it declares is an empty slot. Those never receive a texture,
   * so import() is never called for them and they would stay without a shader
   * -- cf_constantcolourglow has two empty channels and nothing else, which
   * left 19 meshes on the default material.
   */
  linked() {
    const waiting = this.textureChannels.some((channel) => channel.filename != "");
    if (!waiting) this.finish();
  }

  async load(buffer: ArrayBuffer) {
    // Nothing to do at the moment
  }

  import(texture: THREE.Texture) {
    let fullyLoaded = true;
    for (let i = 0; i < this.textureChannels.length; i++) {
      if (this.textureChannels[i].filename == texture.name) {
        this.textureChannels[i].texture = texture;
      }
      // Empty channels never receive a texture; they must not hold up finish().
      if (this.textureChannels[i].filename != "" && this.textureChannels[i].texture == null) {
        fullyLoaded = false;
      }
    }

    if (fullyLoaded) this.finish();
  }

  finish() {
    console.log(`Creating shader for ${this.basename}, textures: ${this.textureChannels.map(tc => tc.filename + '=' + (tc.texture ? 'loaded' : 'null')).join(', ')}`);
    const textures = this.textureChannels.map((tc) => tc.texture);
    // The channel ids alongside, for a generated material: its shader binds
    // samplers by texture unit, and the permutation decides which channel id
    // lands on which unit, so position in this array means nothing to it.
    const channelIds = this.textureChannels.map((tc) => tc.id);
    // The vertex streams the linked meshes actually carry.
    //
    // A permutation can be distinguished from another by the ATTRIBUTES it
    // reads as much as by the textures it samples: this material's perms 7 and
    // 12 sample exactly the same three textures and differ only in that 12 also
    // reads SpuVertexColours, the per-vertex baked colour. Without this the
    // choice between them came down to which appeared first in the file.
    //
    // Collected from every linked mesh rather than one: meshes sharing a
    // material can carry different streams, and a variant is only safe to pick
    // if all of them can feed it.
    const streams = new Set<number>();
    let first = true;
    for (const mesh of this.meshes) {
      const s = mesh.geometry?.userData?.rcsStreams as Map<number, THREE.BufferAttribute> | undefined;
      if (!s) continue;
      if (first) {
        for (const id of s.keys()) streams.add(id);
        first = false;
      } else {
        for (const id of [...streams]) if (!s.has(id)) streams.delete(id);
      }
    }
    this.material = createMaterial(this.basename, textures, channelIds, streams);

    // The authored shader constants, by uniform NAME. The channel id is the
    // hash of that name -- the same hash the shader's uniform table carries --
    // so a constant reaches the uniform it belongs to without any positional
    // guesswork. Without this the shader runs on declaredUniforms' invented
    // neutral: Refbrightness at 1.0 instead of the file's 0.2, five times too
    // strong for a reflection term.
    if (this.constants.size) {
      const u = (this.material as unknown as { uniforms?: Record<string, THREE.IUniform> }).uniforms;
      if (u) {
        // The uniform whose NAME hashes to this channel id. The shader declares
        // its uniforms by name and the model names the channel by hash, so
        // hashing the declared names is what joins the two -- there is no
        // positional relationship to exploit.
        const byHash = new Map<number, string>();
        for (const name of Object.keys(u)) {
          byHash.set(rcsHash(name), name);
          // A uniform rcsdump could not name is called after its hash --
          // `u_78575769` -- and that hash IS the channel id, so the join is
          // the hex itself, not rcsHash() of the synthetic name. Without this
          // mt_tunnelrefraction's authored refraction offset (channel
          // 0x78575769, a Type-0 constant in the model) never reached its
          // uniform, which stayed at the invented zero.
          const m = /^u_([0-9a-f]{8})$/.exec(name);
          if (m) byHash.set(parseInt(m[1], 16) >>> 0, name);
        }
        const applied: string[] = [];
        for (const [id, value] of this.constants) {
          const name = byHash.get(id);
          if (!name) continue;
          const target = u[name];
          if (!target) continue;
          const v = target.value as THREE.Vector4 | undefined;
          if (v && typeof v.set === "function") {
            v.set(value[0], value[1], value[2], value[3]);
            applied.push(`${name}=${value[0]}`);
          }
        }
        if (applied.length) {
          (this.material as unknown as { uniformsNeedUpdate: boolean }).uniformsNeedUpdate = true;
          console.log(`[const] ${this.basename}: ${applied.join(" ")}`);
        }
      }
    }
    if (this.basename.startsWith("water")) {
      const m = this.material as unknown as {
        uniforms?: Record<string, { value: unknown }>;
        fragmentShader?: string;
      };
      const tex = (k: string) => {
        const t = m.uniforms?.[k]?.value as THREE.Texture | undefined;
        if (!t) return "none";
        const d = (t.image as { data?: Uint8Array; width?: number })?.data;
        return d && d.length === 4 ? `const[${Array.from(d).join(",")}]` : `real ${t.name || "(unnamed)"}`;
      };
      api.log(`[water] ${this.basename} generated=${!!m.uniforms} channels=${this.textureChannels.filter(c=>c.texture).length}/${this.textureChannels.length}`);
      api.log(`[water]   TEX0=${tex("TEX0")} TEX1=${tex("TEX1")} TEX2=${tex("TEX2")} TEX3=${tex("TEX3")}`);
      api.log(`[water]   meshes=${this.meshes.length} visible=${this.meshes.filter(x=>x.visible).length}`);
      const u = m.uniforms;
      if (u) {
        const v4 = (k: string) => {
          const val = u[k]?.value as { x: number; y: number; z: number; w: number } | undefined;
          return val ? `(${val.x.toFixed(2)},${val.y.toFixed(2)},${val.z.toFixed(2)},${val.w.toFixed(2)})` : "none";
        };
        api.log(`[water]   iblScalePower=${v4("iblScalePower")} time=${v4("time")}`);
        api.log(`[water]   uniforms: ${Object.keys(u).join(",")}`);
      }
    }
    if (this.material) applyChannelSlots(this.material, this.textureChannels);

    if (this.material) {
      this.world.materials[this.material.id] = this.material;
      // A transcribed material carries its own lighting maths, so it needs the
      // scene's lights pushed into its uniforms each frame; Three does that
      // automatically only for its built-in materials.
      const raw = this.material as unknown as {
        attachScene?: (scene: THREE.Scene) => void;
        attachCamera?: (camera: THREE.Camera) => void;
      };
      if (typeof raw.attachScene === "function") raw.attachScene(this.world.scene);
      // Fog and prelit values, if the settings file has already arrived. The
      // two load independently, so whichever lands second does the applying --
      // see the envsettings branch in import() for the other order.
      const env = this.world.envSettings;
      const tunable = this.material as unknown as { applyEnvSettings?: (e: EnvSettings) => void };
      if (env && typeof tunable.applyEnvSettings === "function") tunable.applyEnvSettings(env);
      // A generated shader carries the engine's own viewProj rather than
      // Three's projectionMatrix/modelViewMatrix pair, so it needs the camera
      // to compose one each frame.
      if (typeof raw.attachCamera === "function") raw.attachCamera(this.world.camera);
      // Materials that animate (scrolling water UVs, and so on) expose tick().
      const animated = this.material as unknown as { tick?: (delta: number) => void };
      if (typeof animated.tick === "function") {
        this.world.addTickMaterial(animated as { tick: (delta: number) => void });
      }
      // The sky doubles as a cheap ambient reflection. MeshPhongMaterial
      // combines an envMap with MultiplyOperation by default, which would
      // darken every surface by the sky's own colour, so it is added faintly
      // instead -- and never over a material that set its own envMap from a
      // reflection channel of its own.
      if (this.world.scene.background) {
        const phong = this.material instanceof THREE.MeshPhongMaterial ? this.material : undefined;
        const standard = this.material instanceof THREE.MeshStandardMaterial ? this.material : undefined;
        const material = phong ?? standard;
        if (material && !material.envMap) {
          material.envMap = this.world.scene.background as THREE.Texture;
          if (phong) {
            phong.combine = THREE.AddOperation;
            phong.reflectivity = 0.05;
          }
        }
      }
      // A generated shader reads its vertex inputs as v0..vN, so each mesh
      // needs its streams aliased onto the registers THIS permutation binds
      // them to. The ids come from the material's own binding table; the
      // buffers are shared, so aliasing costs nothing per vertex.
      const attrs = (this.material as unknown as { attributeBindings?: AttrBinding[] }).attributeBindings;
      const gen = this.material as unknown as {
        usesEngineDequantisation?: boolean;
        bindPositionTransform?: (mesh: THREE.Mesh) => void;
      };
      // Debug: show ONLY what a generated shader draws, so a glitch cannot be
      // confused with some other material's. See materials/rcs/index.ts.
      const isGenerated = GENERATED_NAMES.has(this.basename);
      for (const mesh of this.meshes) {
        mesh.material = this.material;
        if (ONLY_GENERATED_MATERIALS && isGenerated) mesh.visible = true;
        // A generated shader dequantises position in the vertex program and
        // multiplies by viewProj alone, with no modelMatrix -- so it has to be
        // handed this mesh's full world transform, which the material composes
        // per draw from matrixWorld. The scene-graph transform is left in place
        // precisely because that is where matrixWorld comes from; clearing it,
        // as this first did, dropped every parent object's contribution.
        if (gen.usesEngineDequantisation && typeof gen.bindPositionTransform === "function") {
          // A generated vertex program multiplies by viewProj alone -- there is
          // no modelMatrix in it -- so the shader has to do the whole transform
          // itself, from positionScale/positionBias. The mesh keeps its own
          // transform only so matrixWorld can be read for those uniforms; Three
          // must not apply it as well.
          //
          // Leaving it applied is not merely redundant. gl_Position comes out
          // right either way (the shader's own transform decides it), but every
          // value DERIVED from the position is then computed from doubly-scaled
          // coordinates -- and the fog distance is one: with raw int16 input the
          // factor collapsed to 0 and every lambertzeroalpha surface rendered as
          // 100% fog colour, which for vineta_k is a dark green.
          // The scene-graph transform STAYS. The shader reads it live from
          // matrixWorld every draw (see bindPositionTransform), which is the
          // only way a mesh under an animated pivot can move: the previous
          // version snapshotted the transform here and cleared the mesh's
          // matrix, so the shader replayed the load-time position forever and
          // the ANIM_TRANSFORM tracks a .vex scene carries never reached it.
          //
          // Three must not ALSO apply the transform. The generated vertex
          // program has no modelMatrix -- it does the whole thing itself -- so
          // the mesh is drawn with its own matrix left in the graph for reading
          // but neutralised for rendering, which onBeforeRender handles by
          // writing the world matrix into the shader's own uniform.
          mesh.matrixAutoUpdate = true;
          gen.bindPositionTransform(mesh);
        }
        if (!attrs) continue;
        const streams = mesh.geometry.userData.rcsStreams as Map<number, THREE.BufferAttribute> | undefined;
        if (!streams) continue;
        // The vertex shader, so an undersized stream is only reported when the
        // program actually reads the components it cannot supply.
        const vs = (this.material as unknown as { vertexShader?: string }).vertexShader;
        const { missing } = bindAttributes(mesh.geometry, attrs, streams, vs);
        if (missing.length) {
          console.warn(
            `[RCSModelLoader] ${this.basename}: no stream for ${missing
              .map((m) => `v${m.reg} (#${m.id.toString(16)} ${m.name})`)
              .join(", ")}`
          );
        }
      }
    }
  }
}

class AsyncTexture {
  world: World;
  rcsTexture: RcsModelTexture | RcsModelPS5Texture;
  asyncMaterials: AsyncMaterial[] = [];
  texture?: THREE.Texture;

  constructor(world: World, rcsTexture: RcsModelTexture | RcsModelPS5Texture) {
    this.world = world;
    this.rcsTexture = rcsTexture;
  }

  require() {
    api.require(this.rcsTexture.filename);
  }

  match(filename: string) {
    return this.rcsTexture.filename == filename;
  }

  /**
   * @param rcsTexture THIS material's own record for the texture, which is not
   * necessarily the one this AsyncTexture was created from.
   *
   * AsyncTextures are pooled by FILENAME, since the same .gtf is shared by many
   * materials and should only be fetched and decoded once. The channel id,
   * though, is a hash of the channel NAME, and the same file is bound under
   * different names by different materials -- vineta_k's aadc_cyan_glow.gtf is
   * `Texture1` to one material and `diffuseTexture` to lambert. Reading the id
   * off the pooled record therefore gave every later material the FIRST
   * material's channel name, so the id never matched what its own shader
   * sampled and the texture silently failed to bind.
   */
  linkAsyncMaterial(asyncMaterial: AsyncMaterial, rcsTexture: RcsModelTexture | RcsModelPS5Texture = this.rcsTexture) {
    const id = "id" in rcsTexture ? rcsTexture.id : 0;
    asyncMaterial.registerTexture(id, rcsTexture.filename);
    this.asyncMaterials.push(asyncMaterial);
  }

  async load(buffer: ArrayBuffer) {
    const fn = this.rcsTexture.filename;
    console.log(`Loading texture ${fn} (${buffer.byteLength} bytes)`);
    let mipmaps;
    if (fn.endsWith(".gnf")) {
      const gnf = await GNF.load(buffer);
      mipmaps = gnf.mipmaps;
    } else if (fn.endsWith(".gxt")) {
      mipmaps = GXT.load(buffer).mipmaps;
    } else {
      mipmaps = GTF.load(buffer).mipmaps;
    }
    this.texture = mipmapsToTexture(mipmaps);
    if (!this.texture) {
      console.warn(`Failed to create texture for ${fn} (${mipmaps.length} mipmaps)`);
      return;
    }
    this.texture.name = fn;
    console.log(`Texture ${fn} created (${mipmaps.length} mipmaps), notifying ${this.asyncMaterials.length} materials`);

    this.world.textures[this.texture.name] = this.texture;
    for (const asyncMaterial of this.asyncMaterials) {
      asyncMaterial.import(this.texture);
    }
  }
}


/**
 * Record the scale and bias that dequantise a mesh's raw int16 positions.
 *
 * Stored on the geometry because that is the only per-mesh thing here that
 * survives: loadMesh5 returns a Group whose child does the drawing, and
 * loadObject replaces each object's `userData` wholesale right after building
 * it, so anything written there is lost.
 */
function tagPositionTransform(root: THREE.Object3D, scale: ArrayLike<number>, bias: ArrayLike<number>) {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    mesh.geometry.userData.rcsPositionScale = [scale[0], scale[1], scale[2]];
    mesh.geometry.userData.rcsPositionBias = [bias[0], bias[1], bias[2]];
  });
}


/**
 * Push a track's own lighting and fog values into the scene.
 *
 * These are the numbers the materials otherwise invent. `Lighting.Sun color`
 * and `Sun direction` drive the directional light the shaders read as
 * directionalLight0*, and `Constant ambient color` is the ambient term; both
 * were previously whatever the Rendering toolbox happened to be set to.
 *
 * The sun colour is deliberately NOT clamped: the shipped values run to 4.0,
 * which is an HDR intensity the tone mapper is expected to bring back down.
 */
function applyEnvSettings(world: World, env: EnvSettings) {
  const sunColour = env.getVec3(EnvKey.sunColour, [1, 1, 1]);
  const sunDir = env.getVec3(EnvKey.sunDirection, [0, -1, 0]);
  const ambient = env.getVec3(EnvKey.constantAmbient, [0, 0, 0]);

  world.scene.traverse((object) => {
    if (object instanceof THREE.AmbientLight) {
      // The track's ambient is strongly tinted -- modesto_heights ships
      // (0.31, 0.26, 0.71), blue at 2.3x the red -- because the engine feeds it
      // to shaders that declare `constantAmbientColour` and balance it against
      // their own lightmap and sun terms. The hand-written materials here are
      // Three's built-ins, which apply an ambient light flatly to everything,
      // so handing them that colour tints the whole scene blue rather than
      // reproducing the engine's look.
      //
      // The intensity is scaled to the value's luminance instead, keeping the
      // brightness the track asks for without the cast. The generated shaders
      // are unaffected either way: none of them read an ambient uniform.
      const luma = 0.2126 * ambient[0] + 0.7152 * ambient[1] + 0.0722 * ambient[2];
      object.color.setRGB(1, 1, 1);
      object.intensity = Math.min(1, luma);
    } else if (object instanceof THREE.DirectionalLight && !object.name.startsWith(".World")) {
      object.color.setRGB(sunColour[0], sunColour[1], sunColour[2]);
      // Intensity is left as the Rendering toolbox has it, and the track's own
      // brightness goes in the COLOUR -- the shipped sun runs to 4.0, an HDR
      // value the tone mapper brings back down. Writing intensity here instead
      // would fight the Directional slider, which sets the same field: the
      // slider would scale an already-4x sun, and at 0 it takes every lit
      // surface to black with no ambient left to catch it.
      if (object.intensity === 0) object.intensity = 1;
      // The file's vector points TOWARD the sun -- vineta_k's is (-2, 0.8, 1),
      // y up, and it lights the ground -- which is also what a Three
      // DirectionalLight's position means, so it is used as-is. It used to be
      // negated here on the belief it was the direction the light travels,
      // and a matching negation in sceneLights() cancelled that for tracks
      // while leaving the default sun (which has no file vector) inverted.
      // The shipped values are tiny (1e-5), so normalise rather than using
      // them as a position directly.
      const len = Math.hypot(sunDir[0], sunDir[1], sunDir[2]) || 1;
      object.position.set(sunDir[0] / len, sunDir[1] / len, sunDir[2] / len).multiplyScalar(1000);
    }
  });

  // The generated materials read the scene's lights through a CACHE, and the
  // cache is only rebuilt when something says the lights moved. Until now the
  // only things that said so were the two Rendering sliders -- so the values
  // set here, which are the track's OWN sun and ambient, never reached a
  // shader: the cache had already been filled from whatever the scene held
  // when the first material was built, before this ran.
  //
  // That is why nudging the Ambient slider "fixed" the shadows and putting it
  // back at zero kept them fixed: the nudge was not changing the ambient, it
  // was invalidating the cache so the track's real values were finally read.
  invalidateSceneLights();
}

export class RCSModelLoader extends Loader {
  asyncMaterials: AsyncMaterial[] = [];
  asyncTextures: AsyncTexture[] = [];
  asyncTextureLookup: { [filename: string]: number } = {};
  skyFilename = "";
  envSettingsFilename = "";
  private world?: World;

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string) {
    this.world = world;
    world.userdata.filename = filename;
    const magic = new DataView(arrayBuffer).getUint32(0, true);
    api.log(`[RCSModelLoader] loading ${filename} (${arrayBuffer.byteLength} bytes, magic=0x${magic.toString(16)})`);
    if (RcsModelPS5.canLoad(arrayBuffer)) {
      const model = RcsModelPS5.load(arrayBuffer);
      api.log(`[RCSModelLoader] PS5/Vita: ${model.shapes.length} shapes, ${model.meshes.length} meshes, ${model.materials.length} materials`);
      this.loadMaterialsPS5(world, model);
      this.loadScenePS5(world, model);
      for (const asyncMaterial of this.asyncMaterials) {
        asyncMaterial.linked();
      }
    } else {
      const model = RcsModel.load(arrayBuffer);
      api.log(`[RCSModelLoader] PS3: ${model.objects.length} objects, ${model.materials.length} materials`);
      // The environment's sky sits beside the model rather than being named by
      // it, so ask for it directly. The name must stay relative: the editor
      // resolves a bare name against the document's own directory, while an
      // absolute path is handed to Uri.parse and never found.
      this.skyFilename = "sky.gtf";
      api.require(this.skyFilename);
      // The environment's own lighting and fog values. Same relative-name rule
      // as the sky: the editor resolves it against the document's directory.
      this.envSettingsFilename = "track.envsettings";
      api.require(this.envSettingsFilename);
      this.loadMaterials(world, model);
      this.loadScene(world, model);
      for (const asyncMaterial of this.asyncMaterials) {
        asyncMaterial.linked();
      }
    }

    // Ambient was 0.6, which is flat and unshadowed: it lifted every surface
    // off black, so nothing was dark enough for a highlight to read against --
    // the scene came out bright and uniformly saturated with no visible
    // specular. Six more directionals at 0.1 from World's constructor add
    // roughly 0.3 on top of these two. Let the directional do the shading and
    // keep ambient as fill.
    //
    // These are DEFAULTS. A track's .envsettings carries the engine's own sun
    // colour, direction and ambient, and applyEnvSettings() overwrites both of
    // these lights when it arrives -- it matches on the types rather than on
    // identity, so adding a second ambient here would double the term it sets.
    // Only one of each is created for that reason.
    //
    // And only when the scene does not already have one. This loader also runs
    // when a .vex scene links an .rcsmodel -- a ship, a billboard -- and that
    // world is NOT fresh: VEXXLoader has already built the file's own lights
    // (or its fallback ambient when the file authors none, as ship.vex does).
    // Adding unconditionally stacked .EnvAmbient on top of the VEX ambient --
    // sceneLights() SUMS ambient lights, so the ship's constantAmbientColour
    // reached 1.25 and the hull washed out white -- and planted a default sun
    // in scenes whose original file never had one to override it.
    let hasAmbient = false;
    let hasSun = false;
    world.scene.traverse((o) => {
      // "Has one" means AUTHORED by the file. VEXXLoader's .FallbackAmbientLight
      // is the viewer's own stand-in for built-in materials and sceneLights()
      // excludes it from the engine ambient -- so it must not suppress
      // .EnvAmbient here, or generated shaders end up with no ambient at all.
      if (o instanceof THREE.AmbientLight && o.name !== ".FallbackAmbientLight") hasAmbient = true;
      // The six .WorldDirectionalLight fill lights are a render setting, not a
      // scene light; sceneLights() ignores them by the same name test.
      else if (o instanceof THREE.DirectionalLight && !o.name.startsWith(".World")) hasSun = true;
    });
    if (!hasAmbient) {
      const ambient = new THREE.AmbientLight(0xffffff, 0.25);
      ambient.name = ".EnvAmbient";
      world.scene.add(ambient);
    }
    if (!hasSun) {
      const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
      dirLight.position.set(1, 2, 3);
      dirLight.name = ".EnvSun";
      world.scene.add(dirLight);
    }
    // Adding lights changes what sceneLights() should return, and materials are
    // built both before and after this point -- so the cache has to be dropped
    // here as well as when the .envsettings arrives.
    invalidateSceneLights();
    return world;
  }

  override async import(buffer: ArrayBuffer, filename: string) {
    // Deliver to EVERY waiting consumer, not just the first match. A model
    // reuses the same .rcsmaterial across many material entries — 01_vineta_k
    // has 805 entries for only 69 distinct files, with jd_simplespecular alone
    // used 192 times. Returning after the first match left 736 of them without
    // their shader, so their meshes kept the default material and the track
    // surface never appeared. The same holds for textures shared between
    // materials.
    if (filename.endsWith(".rcsmaterial")) {
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.match(filename)) await asyncMaterial.load(buffer);
      }
      return;
    }
    if (this.envSettingsFilename && filename === this.envSettingsFilename) {
      // Plain text, latin1: these are authoring files and carry no BOM.
      const text = new TextDecoder("latin1").decode(buffer);
      const env = parseEnvSettings(text);
      if (this.world) {
        this.world.envSettings = env;
        applyEnvSettings(this.world, env);
        // The Environment folder shows these values, so it can only be built
        // once they exist.
        this.world.setupGuiEnvironment();
        // Built from the materials that exist by now, which is why it hangs off
        // the settings arriving rather than the model load: materials stream in
        // asynchronously and the folder would otherwise come up empty.
        this.world.setupGuiUniforms();
        // Hand them to the material layer, which applies them to everything
        // already built AND to everything built later -- materials and this
        // file load independently, and this one usually arrives last.
        setEnvSettings(env);
      }
      api.log(`[RCSModelLoader] envsettings: ${env.values.size} keys, ambient=${env.get(EnvKey.constantAmbient)}, fog=${env.get(EnvKey.fogColour)}`);
      return;
    }
    if (this.skyFilename && filename === this.skyFilename) {
      // The sky is a cube map. Sampled as a flat texture it renders black, so
      // it is built from its six faces and used as the scene background.
      const gtf = GTF.load(buffer);
      const cube = gtf.isCube ? facesToCubeTexture(gtf.faces) : undefined;
      if (cube && this.world) {
        this.world.scene.background = cube;
        api.log(`[RCSModelLoader] sky: ${gtf.faces.length} faces ${gtf.header.width}x${gtf.header.height}`);
      } else {
        api.log(`[RCSModelLoader] sky ${filename} is not a usable cube map`);
      }
      return;
    }
    if (filename.endsWith(".gtf") || filename.endsWith(".gxt") || filename.endsWith(".gnf")) {
      for (const asyncTexture of this.asyncTextures) {
        if (asyncTexture.match(filename)) await asyncTexture.load(buffer);
      }
      return;
    }
  }

  private loadMaterials(world: World, rcs: RcsModel) {
    for (const rcsMaterial of rcs.materials) {
      const asyncMaterial = new AsyncMaterial(world, rcsMaterial);
      this.asyncMaterials.push(asyncMaterial);
      //asyncMaterial.require();

      for (const rcsTexture of rcsMaterial.textures) {
        // Slots that hold no file (the empty lightmap placeholder, and the
        // rgba-constant slots) are skipped — but skipping them silently shifts
        // every later channel down, so a material like and_rocktosand
        //   [blend | (empty lightmap) | rock | sand]
        // would hand make() [blend, rock, sand] with no way to tell that the
        // gap was in the middle. Record the gap instead.
        if (!rcsTexture.filename.startsWith("data")) {
          // A constant channel, not an empty one: type 0 with the colour flag
          // set stores a float4 in place of a path. These are authored shader
          // parameters -- glass_texture's Refbrightness (0.2) and SpecScale
          // (115.0) -- and dropping them left the shader on declaredUniforms'
          // invented 1.0 for each.
          const colour = (rcsTexture as { colour?: [number, number, number, number] | null }).colour;
          if (colour) asyncMaterial.registerConstant(rcsTexture.id, colour);
          else asyncMaterial.registerEmptyChannel(rcsTexture.id);
          continue;
        }
        const asyncTexture = this.loadTexture(world, rcsTexture);
        // This material's own record, not the pooled one: see linkAsyncMaterial.
        asyncTexture.linkAsyncMaterial(asyncMaterial, rcsTexture);
      }
    }
  }

  private loadTexture(world: World, rcsTexture: RcsModelTexture | RcsModelPS5Texture) {
    const filename = rcsTexture.filename;
    if (filename in this.asyncTextureLookup) {
      const index = this.asyncTextureLookup[filename];
      return this.asyncTextures[index];
    }
    const asyncTexture = new AsyncTexture(world, rcsTexture);
    this.asyncTextures.push(asyncTexture);
    this.asyncTextureLookup[filename] = this.asyncTextures.length - 1;
    asyncTexture.require();
    return asyncTexture;
  }

  private loadScene(world: World, rcs: RcsModel) {
    for (const objectData of rcs.objects) {
      const object = this.loadObject(world, rcs, objectData);
      if (object === null) continue;
      world.scene.add(object);
    }
  }

  private loadObject(world: World, rcs: RcsModel, object: RcsModelObject) {
    const position = object.header.position;
    const scale = object.header.scale;
    const materialIndex = object.header.material_id;
    const material = rcs.materials[materialIndex];

    const userData = { externalId: object.header.id };

    const name = `Object_${object.header.id}`;

    let first: THREE.Object3D | null = null;
    if (object.mesh instanceof RcsModelMesh1) first = this.loadMesh1(world, object.mesh, material);
    if (object.mesh instanceof RcsModelMesh5) first = this.loadMesh5(world, object.mesh, material);
    if (first === null) return null;

    first.userData = userData;
    first.name = name;
    first.position.set(position[0], position[1], position[2]);
    first.scale.set(scale[0], scale[1], scale[2]);
    tagPositionTransform(first, scale, position);

    // Most objects are a single mesh, and wrapping those in a group would add a
    // level to the scene graph for nothing.
    if (object.parts.length === 0) return first;

    // The rest of the model: sibling parts, each with its own material and
    // placement, so each is positioned from its own record rather than the
    // object header's.
    const group = new THREE.Group();
    group.userData = userData;
    group.name = name;
    group.add(first);

    object.parts.forEach((part, index) => {
      const mesh = this.loadPart(world, rcs, part);
      mesh.userData = userData;
      mesh.name = `${name}_part${index + 1}`;
      group.add(mesh);
    });

    return group;
  }

  private loadPart(world: World, rcs: RcsModel, part: RcsModelPart): THREE.Object3D {
    const mesh = this.loadMesh5(world, part.mesh, rcs.materials[part.material_id]);
    mesh.position.set(part.position[0], part.position[1], part.position[2]);
    mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
    // The part's scale and bias are what turn the buffer's raw int16 into world
    // space. Three's path applies them as this transform; a generated shader
    // does it itself, in the vertex program, from positionScale/positionBias.
    // Whichever runs, it must run exactly once -- so record them and let the
    // material decide. See GeneratedRcsMaterial.
    //
    // On the GEOMETRY, not on userData: loadMesh5 returns a Group, so the mesh
    // that actually draws is a child, and loadObject overwrites every object's
    // userData wholesale a moment later. Geometry is per-mesh and untouched.
    tagPositionTransform(mesh, part.scale, part.position);
    return mesh;
  }

  loadMesh1(world: World, rcsMesh: RcsModelMesh1, rcsMaterial: RcsModelMaterial): THREE.Mesh {
    const geometry = this.loadBO(rcsMesh.vbo, rcsMesh.ibo);
    //geometry.computeVertexNormals();
    let material = world.materials["_default"];
    if (rcsMaterial.id in world.materials) material = world.materials[rcsMaterial.id];
    const mesh = new THREE.Mesh(geometry, material);
    // Debug view: start hidden, and only a generated material reveals the mesh.
    // Hiding at attach time instead would leave anything still on the default
    // material -- a material that never finished loading -- visible.
    if (ONLY_GENERATED_MATERIALS) mesh.visible = false;
    for (const asyncMaterial of this.asyncMaterials) {
      if (asyncMaterial.rcsMaterial.id == rcsMaterial.id) {
        asyncMaterial.linkMesh(mesh);
        break;
      }
    }
    /*
    const helper = new VertexNormalsHelper( mesh, 1, 0xff0000 );
    helper.name = ".VertexNormalsHelper"
    mesh.add(helper);
    */
    return mesh;
  }

  loadMesh5(world: World, rcsMesh: RcsModelMesh5, rcsMaterial: RcsModelMaterial): THREE.Group {
    const group = new THREE.Group();
    for (const rcsSubMesh of rcsMesh.submeshes) {
      const geometry = this.loadBO(rcsSubMesh.vbo, rcsSubMesh.ibo);
      //geometry.computeVertexNormals();
      let material = world.materials["_default"];
      const mesh = new THREE.Mesh(geometry, material);
      if (ONLY_GENERATED_MATERIALS) mesh.visible = false;
      for (const asyncMaterial of this.asyncMaterials) {
        if (asyncMaterial.rcsMaterial.id == rcsMaterial.id) {
          asyncMaterial.linkMesh(mesh);
          break;
        }
      }
      /*
      const helper = new VertexNormalsHelper( mesh, 1, 0xff0000 );
      helper.name = ".VertexNormalsHelper"
      mesh.add(helper);
      */
      group.add(mesh);
    }
    return group;
  }

  private loadMaterialsPS5(world: World, model: RcsModelPS5) {
    for (const ps5Mat of model.materials) {
      const asyncMaterial = new AsyncMaterial(world, ps5Mat);
      this.asyncMaterials.push(asyncMaterial);

      for (const tex of ps5Mat.textures) {
        if (!tex.filename.startsWith("data")) {
          api.log(`[RCSModelLoader] skipping texture (no data prefix): "${tex.filename}" for material "${ps5Mat.name}"`);
          continue;
        }
        const asyncTexture = this.loadTexture(world, tex);
        // This material's own record, not the pooled one: see linkAsyncMaterial.
        asyncTexture.linkAsyncMaterial(asyncMaterial, tex);
      }
    }
    api.log(`[RCSModelLoader] ${this.asyncMaterials.length} materials, ${this.asyncTextures.length} textures queued`);
  }

  private loadScenePS5(world: World, model: RcsModelPS5) {
    let loaded = 0, skipped = 0;
    for (let i = 0; i < model.shapes.length; i++) {
      const shape = model.shapes[i];
      const mesh  = model.meshes[i];
      if (mesh.ibo.indices.length === 0 || mesh.vbo.positions.length === 0) {
        api.log(`[RCSModelLoader] skip shape[${i}] "${shape.name}": ibo=${mesh.ibo.indices.length} vbo=${mesh.vbo.positions.length}`);
        skipped++;
        continue;
      }
      loaded++;
      if (loaded <= 5 || loaded % 200 === 0) {
        const p = mesh.vbo.positions;
        let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
        for (let j=0;j<p.length;j+=3){if(p[j]<minX)minX=p[j];if(p[j]>maxX)maxX=p[j];if(p[j+1]<minY)minY=p[j+1];if(p[j+1]>maxY)maxY=p[j+1];if(p[j+2]<minZ)minZ=p[j+2];if(p[j+2]>maxZ)maxZ=p[j+2];}
        api.log(`[shape ${i}] "${shape.name}" verts=${p.length/3} idx=${mesh.ibo.indices.length} mat=${shape.material_index} bbox=[${minX.toFixed(0)}..${maxX.toFixed(0)}, ${minY.toFixed(0)}..${maxY.toFixed(0)}, ${minZ.toFixed(0)}..${maxZ.toFixed(0)}]`);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.vbo.positions, 3));
      geometry.setAttribute("normal",   new THREE.Float32BufferAttribute(mesh.vbo.normals, 3));
      geometry.setAttribute("uv",       new THREE.Float32BufferAttribute(mesh.vbo.uvs, 2));

      // Check if this mesh has real vertex colours (not all-white placeholder)
      const hasColors = mesh.vbo.colors.some((v, idx) => idx % 4 < 3 && v !== 255);
      if (hasColors) {
        const colors = mesh.vbo.colors.map(v => v / 255);
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
      }
      geometry.setIndex(mesh.ibo.indices);

      const mat = new THREE.MeshStandardMaterial({
        vertexColors: hasColors,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.0,
      });
      const threeMesh = new THREE.Mesh(geometry, mat);
      threeMesh.name = shape.name;
      if (shape.externalId) threeMesh.userData = { externalId: shape.externalId };

      // Link mesh to its material
      const matIdx = shape.material_index;
      if (matIdx >= 0 && matIdx < model.materials.length) {
        const ps5Mat = model.materials[matIdx];
        for (const asyncMaterial of this.asyncMaterials) {
          if (asyncMaterial.rcsMaterial.id === ps5Mat.id) {
            asyncMaterial.linkMesh(threeMesh);
            break;
          }
        }
      }

      world.scene.add(threeMesh);
    }
    api.log(`[RCSModelLoader] PS5/Vita scene: ${loaded} loaded, ${skipped} skipped (shapes.length=${model.shapes.length}, meshes.length=${model.meshes.length})`);
  }

  loadBO(vbo: RcsModelVBO, ibo: RcsModelIBO) {
    const geometry = new THREE.BufferGeometry();

    if (vbo.has("position")) {
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vbo.attributes["position"], 3));
    }
    if (vbo.has("normal")) {
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(vbo.attributes["normal"], 3));
    }
    if (vbo.has("tangent")) {
      // The VBO stores 4 components per vertex (xyz + handedness in w), which is
      // also what THREE wants. Declaring it as 3 made every tangent read
      // straddle two vertices, so normalMap was silently wrong or dropped —
      // and any material using one drew nothing.
      const tangent = vbo.attributes["tangent"];
      const itemSize = tangent.length / (vbo.attributes["position"].length / 3) === 4 ? 4 : 3;
      geometry.setAttribute("tangent", new THREE.Float32BufferAttribute(tangent, itemSize));
    }
    // The diffuse uv, resolved by stride id rather than by name.
    //
    // The exporter spells this channel many different ways -- Uv1, uv1, map1,
    // Diffuse_uv, diffuseUV, diffuseUVs, Uvset1, cellUV, crowdUV -- and keying
    // off the spelling meant any id we had not named, or had named something
    // not on the list, produced a mesh with no "uv" attribute at all and a
    // texture that could never show. That cost 1360 crowd meshes their UVs and
    // 192 more besides. Ids are the file's own identity for these streams, so
    // they are what we match on; see core/formats/rcs/ids.ts.
    const PREFERRED_UV = [
      Stride.Uv1, Stride.uv1, Stride.map1, Stride.Diffuse_uv,
      Stride.diffuseUV, Stride.diffuseUVs, Stride.Uvset1, Stride.crowdUV,
    ];
    for (const id of PREFERRED_UV) {
      const values = vbo.byId.get(id);
      if (values && !geometry.getAttribute("uv")) {
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(values, 2));
      }
    }
    // Nothing preferred matched: if the mesh carries exactly one texture-
    // coordinate stream, whatever its id, that is unambiguously the one. This
    // is what rescues Uv2/Uv3/Lightmap_uv/cellUV-only meshes (hologram,
    // pb_rooftop_das_g_r and 190 others) without having to name every id first.
    // Meshes with several coordinate sets are left alone rather than guessed at.
    if (!geometry.getAttribute("uv")) {
      // Lightmap_uv is known to be the lightmap's own atlas coordinate, so it
      // is never the diffuse set and does not make the choice ambiguous. That
      // leaves e.g. Lightmap_uv+Uv2 (164 meshes) with exactly one candidate.
      const texCoords = [...vbo.strideById.values()].filter(
        (stride) =>
          streamKind(stride.id, stride.type) === StreamKind.TexCoord &&
          stride.id !== Stride.Lightmap_uv
      );
      if (texCoords.length === 1) {
        const values = vbo.byId.get(texCoords[0].id);
        if (values) geometry.setAttribute("uv", new THREE.Float32BufferAttribute(values, 2));
      }
    }
    if (!geometry.getAttribute("uv2") && vbo.has("map2")) {
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(vbo.attributes["map2"], 2));
    }
    // Three.js reads lightMap from "uv2". Two elements claim that slot: the
    // real lightmap atlas (Lightmap_uv) and a second set also named Uv2 that
    // usually just repeats the diffuse coordinates, so the atlas wins.
    if (vbo.has("Lightmap_uv")) {
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(vbo.attributes["Lightmap_uv"], 2));
    } else if (vbo.has("Uv2")) {
      geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(vbo.attributes["Uv2"], 2));
    }
    if (vbo.has("Uv3")) {
      geometry.setAttribute("uv3", new THREE.Float32BufferAttribute(vbo.attributes["Uv3"], 2));
    }
    if (vbo.has("VertexColour1")) {
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(vbo.attributes["VertexColour1"], 4));
    }
    if (vbo.has("VertexColour2")) {
      geometry.setAttribute("color2", new THREE.Float32BufferAttribute(vbo.attributes["VertexColour2"], 4));
    }

    // Expose every stream under its own id, for generated shaders to bind by.
    //
    // A shader emitted by `rcsdump -g` names its inputs after the RSX registers
    // the program addresses -- `attribute vec4 v2` -- and which stream belongs
    // on which register is the PERMUTATION's choice, recorded in the material's
    // own binding table. It is NOT the order the mesh declares its strides:
    // measured over the amphiseum models, the two disagree on 1177 of 17461
    // streams, with Uv1 and #1aaf7631 swapping places. Binding by stride order
    // would hand the shader the wrong buffers.
    //
    // So the loader stores the streams keyed by id and leaves the register
    // assignment to the material, which is the only thing that knows its
    // permutation. `bindAttributes` in materials/rcs/_bindings.ts does it.
    const streams = new Map<number, THREE.BufferAttribute>();
    for (const [id, stride] of vbo.strideById) {
      const values = vbo.byId.get(id);
      const components = streamComponents(stride.type);
      if (values && components > 0) {
        const attr = new THREE.Float32BufferAttribute(values, components);
        // The stride type, so a shader reading .zw off a 2-component stream can
        // be traced back to the format rather than guessed at.
        attr.name = `#${id.toString(16)} type=0x${stride.type.toString(16)}`;
        streams.set(id, attr);
      } else if (values) {
        console.warn(
          `[RCSModelLoader] stream #${id.toString(16)} has unknown stride type` +
            ` 0x${stride.type.toString(16)}; not bound`
        );
      }
    }
    geometry.userData.rcsStreams = streams;

    geometry.setIndex(ibo.indices);
    return geometry;
  }
}
