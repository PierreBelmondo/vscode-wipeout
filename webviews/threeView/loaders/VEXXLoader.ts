import * as THREE from "three";

import { api } from "../api";
import { GTF } from "@core/formats/gtf";
import { Loader } from ".";
import { isFrontEndScene, parseScreenSetting, SKIN_XML, DEFAULT_SCREEN_SETTING } from "../frontendSkin";
import { MeshSkyMaterial } from "../materials/MeshSkyMaterial";
import { MeshVexxPSPBasicMaterial } from "../materials/MeshVexxPSPBasicMaterial";
import { MeshVexxPSPMaterial } from "../materials/MeshVexxPSPMaterial";
import { MeshCausticMaterial } from "../materials/MeshCausticMaterial";
import { MeshVexxSeaMaterial } from "../materials/MeshVexxSeaMaterial";
import { facesToCubeTexture, mipmapsToTexture } from "../utils";
import { RCSModelLoader } from "./RCSMODELLoader";
import { World } from "../worlds";

import { GU_TYPE_INT8, GU_TYPE_INT16, type MeshData } from "@core/formats/vexx/primitive/mesh";


function meshDataToGeometry(geo: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(geo.positions, 3));
  if (geo.normals && geo.normalMeta) {
    const { type, itemSize, normalized } = geo.normalMeta;
    if (type === GU_TYPE_INT8)       geometry.setAttribute("normal", new THREE.Int8BufferAttribute(geo.normals as Int8Array, itemSize, normalized));
    else if (type === GU_TYPE_INT16) geometry.setAttribute("normal", new THREE.Int16BufferAttribute(geo.normals as Int16Array, itemSize, normalized));
    else                             geometry.setAttribute("normal", new THREE.Float32BufferAttribute(geo.normals as Float32Array, itemSize));
  }
  if (geo.uvs && geo.uvMeta) {
    const { type, itemSize } = geo.uvMeta;
    // PSP GU UV encoding: Int8/Int16 bytes are unsigned values where the signed-max+1
    // maps to UV=1.0 (Int8: 0..128→0..1 ÷128; Int16: 0..32768→0..1 ÷32768).
    // Reinterpret as unsigned and decode to float so the shader receives correct [0,1] UVs.
    if (type === GU_TYPE_INT8) {
      const raw = new Uint8Array((geo.uvs as Int8Array).buffer, (geo.uvs as Int8Array).byteOffset, geo.uvs.length);
      const f32 = new Float32Array(raw.length);
      for (let i = 0; i < raw.length; i++) f32[i] = raw[i] / 128;
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(f32, itemSize));
    } else if (type === GU_TYPE_INT16) {
      const raw = new Uint16Array((geo.uvs as Int16Array).buffer, (geo.uvs as Int16Array).byteOffset, geo.uvs.length);
      const f32 = new Float32Array(raw.length);
      for (let i = 0; i < raw.length; i++) f32[i] = raw[i] / 32768;
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(f32, itemSize));
    } else {
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(geo.uvs as Float32Array, itemSize));
    }
  }
  if (geo.colors) {
    // The PSP's baked lighting. Three multiplies this into the material colour
    // when `vertexColors` is set, which is what the GE's texture function does
    // with it -- see MeshVexxPSPMaterial.
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(geo.colors, 4));
  }
  geometry.setIndex(Array.from(geo.indices));
  return geometry;
}

import { Vexx } from "@core/formats/vexx";
import { VexxNode, VexxNodeMatrix } from "@core/formats/vexx/node";
import { VexxNodeAirbrake } from "@core/formats/vexx/v4/airbrake";
import { VexxNodeAmbientLight } from "@core/formats/vexx/v4/ambient_light";
import { VexxNodeAnimTransform, VEXX_KEYFRAME_FLOAT32 } from "@core/formats/vexx/v4/anim_transform";
import { Vexx3NodeAnimTransform } from "@core/formats/vexx/v3/anim_transform";
import { VexxNodeCamera } from "@core/formats/vexx/v4/camera";
import { VexxNodeCollision } from "@core/formats/vexx/v4/collision";
import { VexxNodeEngineFire } from "@core/formats/vexx/v4/engine_fire";
import { VexxNodeEngineFlare } from "@core/formats/vexx/v4/engine_flare";
import { VexxNodeLodGroup } from "@core/formats/vexx/v4/lod_group";
import { VexxNodeMesh, type VexxRenderState } from "@core/formats/vexx/v4/mesh";
import { Vexx3NodeMesh } from "@core/formats/vexx/v3/mesh";
import { VexxNodeSea } from "@core/formats/vexx/v4/sea";
import { VexxNodeSeaReflect } from "@core/formats/vexx/v4/sea_reflect";
import { VexxNodeShipColisionFx } from "@core/formats/vexx/v4/ship_colision_fx";
import { VexxNodeShipMuzzle } from "@core/formats/vexx/v4/ship_muzzle";
import { VexxNodeSkycube } from "@core/formats/vexx/v4/skycube";
import { VexxNodeSound } from "@core/formats/vexx/v4/sound";
import { VexxNodeSpeaker } from "@core/formats/vexx/v4/speaker";
import { VexxNodeSpeedupPad } from "@core/formats/vexx/v4/speedup_pad";
import { VexxNodeStartPosition } from "@core/formats/vexx/v4/start_position";
import { VexxNodeTrail } from "@core/formats/vexx/v4/trail";
import { VexxNodeTransform } from "@core/formats/vexx/v4/transform";
import { VexxNodeWeaponPad } from "@core/formats/vexx/v4/weapon_pad";
import { VexxNodeDirectionalLight } from "@core/formats/vexx/v4/directional_light";
import { VexxNodeDynamicShadowOccluder } from "@core/formats/vexx/v4/dynamic_shadow_occluder";
import { VexxNodeFogCube } from "@core/formats/vexx/v4/fog_cube";
import { VexxNodeShadow } from "@core/formats/vexx/v4/shadow";
import { VexxNodeWoPoint } from "@core/formats/vexx/v4/wo_point";
import { VexxNodeWoSpot } from "@core/formats/vexx/v4/wo_spot";
import { VexxNodeWoTrack } from "@core/formats/vexx/v4/wo_track";
import { VexxNodeBlob } from "@core/formats/vexx/v4/blob";
import { VexxNodeAbsorb } from "@core/formats/vexx/v6/absorb";
import { VexxNodeWingTip } from "@core/formats/vexx/v6/wingtip";

// ─── Material factory ─────────────────────────────────────────────────────────
//
// Maps VexxNodeMeshMaterial.renderFlags → THREE.Material.
//
// renderFlags bit meanings (confirmed from texture filename conventions):
//   0x0080  GLOW  — emissive / unlit surface
//   0x0100  BLEND — alpha blend  (src_alpha, 1-src_alpha)
//   0x0200  ADD   — additive     (1, 1)
//   0x0800  KEY   — alpha test   (cutout transparency)
//   0x2000  SHINE — shinemap / specular pass
//
// ADD and BLEND are mutually exclusive.  GLOW may combine with ADD (ADD_GLOW).
// All transparent/emissive materials are rendered unlit (MeshBasicMaterial)
// because they are particle/FX layers that must ignore scene lighting.
// Opaque geometry (no blend bits) uses MeshVexxPSPMaterial (Phong + PSP alpha fix).
/**
 * The renderFlags makeMeshMaterial expects, with the blend/alpha-test bits
 * taken from the chunk's own state.
 *
 * Only those bits are replaced: GLOW (0x80) and SHINE (0x2000) select which
 * material class to build and are the material record's to give, while blend
 * and cutout are per chunk. Keeping one flag word means makeMeshMaterial and
 * the material cache key are unchanged.
 */
function chunkRenderFlags(rs: VexxRenderState, materialFlags: number): number {
  let flags = materialFlags & ~0x0b00;
  if (rs.blend === "additive") flags |= 0x0200;
  else if (rs.blend === "alpha") flags |= 0x0100;
  if (rs.alphaTest) flags |= 0x0800;
  return flags;
}

function makeMeshMaterial(map: THREE.Texture, renderFlags: number, isV4: boolean, envMap?: THREE.Texture, hasNormals = false, alphaRef?: number, hasColors = false): THREE.Material {
  const isAdd   = !!(renderFlags & 0x0200);
  const isBlend = !!(renderFlags & 0x0100);
  const isGlow  = !!(renderFlags & 0x0080);
  const isShine = !!(renderFlags & 0x2000);

  if (isAdd) {
    // Additive blend — weapons, shields, boost, lasers
    return new MeshVexxPSPBasicMaterial({
      map,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  if (isBlend) {
    // Alpha blend — HUD overlays, explosion gradients, GLOW_BLEND effects
    return new MeshVexxPSPBasicMaterial({
      map,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
  }

  if (isGlow) {
    // Emissive / unlit — neon signs, glowing rocks, animated displays
    return new MeshVexxPSPBasicMaterial({ map });
  }

  if (isShine) {
    // Shinemap — the primary texture on shiny geometry (ship bodies, trophies,
    // weapons).  On PSP hardware the GE sampled a separate envtest*.tga via
    // sphere-mapping to add the reflection; we blend it in via envMap.
    //
    // IMPORTANT: do NOT use alphaTest here.  On shinemap textures the alpha
    // channel encodes gloss intensity (not cutout transparency), so alphaTest
    // would punch invisible holes in low-gloss areas of the ship hull.
    const mat = new THREE.MeshPhongMaterial({
      map,
      shininess: 80,
      specular: new THREE.Color(0x888888),
      side: THREE.DoubleSide,
    });
    if (envMap) {
      mat.envMap = envMap;
      mat.reflectivity = 0.5;
    }
    // PSP alpha correction (0-128 → 0-1)
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        diffuseColor.a = min(1.0, diffuseColor.a * 2.0); // PSP alpha is 0-128`
      );
    };
    return mat;
  }

  // Standard opaque (with or without KEY alpha test which MeshVexxPSPMaterial handles).
  // hasNormals controls flatShading: geometry without a normal attribute needs
  // flatShading:true so Three.js derives face normals; geometry with normals uses
  // flatShading:false so the per-vertex normals from the file are respected.
  if (isV4) {
    return new MeshVexxPSPMaterial(map, hasNormals, alphaRef, hasColors);
  }
  return new THREE.MeshPhongMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide });
}

/**
 * Does this object hang under something the scene animates?
 *
 * VEXXLoader marks the groups it builds for ANIM_TRANSFORM and AIRBRAKE nodes,
 * because a mesh under one of those is positioned relative to a pivot that
 * moves, rather than placed in the world outright.
 */
function hasAnimatedAncestor(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (node.userData?.animatedPivot) return true;
  }
  return false;
}

/** A VEXX MESH node whose geometry lives in a companion .rcsmodel. */
type RcsMeshRef = {
  vexxMesh: VexxNodeMesh;
  object: THREE.Object3D;
};

/**
 * The .rcsmodel companion of a .vex scene: it holds the geometry, while the
 * .vex holds the scene graph that places it.
 */
class RcsCompanion {
  meshRefs: RcsMeshRef[] = [];
  world: World;

  constructor(world: World) {
    this.world = world;
  }

  addMeshRef(ref: RcsMeshRef) {
    this.meshRefs.push(ref);
  }

  async load(buffer: ArrayBuffer, filename: string) {
    // A loader PER FILE. It accumulates the materials of the model it loads, so
    // reusing one across a ship and its engineflare re-resolved every ship
    // material on the flare's pass -- rebuilding shaders and reassigning
    // mesh.material on meshes that were already finished.
    await new RCSModelLoader().loadFromBuffer(this.world, buffer, filename);

    // Reparent each loaded object under the VEXX MESH node that references it.
    //
    // Index the objects first: walking scene.children while calling
    // scene.remove() mutates the very array being iterated, so every object
    // sitting right after a reparented one was skipped and left at the scene
    // root with the VEXX node's transform never applied. On a ship (8 objects)
    // that is easy to miss; on 01_vineta_k/track it drops most of the track.
    const byExternalId = new Map<number, THREE.Object3D[]>();
    for (const object of this.world.scene.children) {
      const id = object.userData.externalId;
      // 0 is a valid id, so test for presence rather than truthiness.
      if (id === undefined || id === null) continue;
      const list = byExternalId.get(id);
      if (list) list.push(object);
      else byExternalId.set(id, [object]);
    }

    for (const meshRef of this.meshRefs) {
      const objects = byExternalId.get(meshRef.vexxMesh.externalId);
      if (!objects) continue;
      for (const object of objects) {
        this.world.scene.remove(object);

        // The .rcsmodel object header holds a WORLD-space placement, and
        // rendering the .rcsmodel on its own puts every object — pads included
        // — exactly where it belongs. The VEXX node it hangs under carries its
        // own transform, so simply re-parenting applies a placement that is
        // already baked in a second time: it moved the track pads 34–40 units
        // and tilted them with the node's rotation.
        //
        // Cancel the parent chain so the world placement survives — but only
        // under a STATIC parent. Where an ancestor is animated the node is a
        // pivot the animation swings the mesh around (an AIRBRAKE is exactly
        // this: an identity node sitting at the hinge, which the airbrake
        // slider rotates). There the header position is the offset from that
        // pivot and has to stay a local offset, or the mesh swings through a
        // wildly wrong arc.
        if (!hasAnimatedAncestor(meshRef.object)) {
          meshRef.object.updateWorldMatrix(true, false);
          object.applyMatrix4(new THREE.Matrix4().copy(meshRef.object.matrixWorld).invert());
        }

        meshRef.object.add(object);
        // Layers are assigned while the .vex loads, which is before this
        // .rcsmodel arrives — so the geometry would keep layer 0 while the
        // camera only enables the layers the VEXX nodes were put on, and stay
        // invisible. Inherit the layer of the node that owns it.
        const layers = meshRef.object.layers.mask;
        object.layers.mask = layers;
        object.traverse((sub) => { sub.layers.mask = layers; });
      }
    }
  }

}

export class VEXXLoader extends Loader {
  rcsCompanion?: RcsCompanion;
  /** Kept for the sibling files loaded after the scene itself. */
  private _world?: World;
  /** Set by the scene walk when an ENGINE_FLARE node needs its geometry. */
  private _needsEngineFlare = false;
  private _engineFlareLoaded = false;

  override async loadFromBuffer(world: World, arrayBuffer: ArrayBuffer, filename: string) {
    world.userdata.filename = filename;
    this._world = world;

    const vexx = Vexx.load(arrayBuffer);
    this.loadTextures(world, vexx);
    // Builds the scene graph, and registers a mesh ref for every MESH node
    // whose geometry lives in the companion .rcsmodel -- so this has to run
    // before that companion is loaded below, or there is nothing to reparent
    // the geometry onto.
    this.loadScene(world, vexx);

    // Everything the scene needs alongside itself. They are independent of one
    // another, so they load concurrently; each reports its own failure and none
    // can leave another waiting.
    const pending: Promise<void>[] = [this.loadSky(world, "sky.gtf")];
    // The front-end background is drawn as an edge-detected white page rather
    // than as shaded geometry (see FrontEndEdgePass). skin.xml decides both
    // which scenes get that treatment and with what parameters; until it
    // arrives, fall back to the values the shipped game uses.
    if (isFrontEndScene(filename)) {
      world.userdata.screenSetting = DEFAULT_SCREEN_SETTING;
      world.settings.frontendEdges = true;
      pending.push(this.loadSkin(world, SKIN_XML));
    }
    if (this.rcsCompanion) pending.push(this.loadRcsCompanion(filename.replace(".vex", ".rcsmodel")));
    await Promise.all(pending);

    await this.loadPendingEngineFlare();

    return world;
  }

  /**
   * Load engineflare.vex, if an ENGINE_FLARE node has asked for it.
   *
   * Separate from the scene load because the node that asks is not always in
   * the file being loaded: on the HD ships the `engine_flare` locator lives in
   * locators.vex, a sibling loaded after ship.vex returns. Running this only at
   * the end of loadFromBuffer therefore checked the flag before anything had
   * set it, and the flames never loaded -- so every .vex load calls this once
   * it has finished, and the flag makes sure the file is fetched only once.
   */
  async loadPendingEngineFlare() {
    if (!this._needsEngineFlare || this._engineFlareLoaded) return;
    this._engineFlareLoaded = true;
    await this.loadVexx("engineflare.vex", true);
  }

  /**
   * A sibling .vex, loaded into the scene this loader already built.
   *
   * It gets its OWN companion. A ship loads several .vex files -- the hull, its
   * locators, engineflare -- and each names its own .rcsmodel; sharing one
   * companion put the flare's mesh refs into the hull's, which had already
   * loaded and reparented, so the flare geometry arrived with nothing waiting
   * for it. Material ids collide across those files too (ship.rcsmodel and
   * engineflare.rcsmodel both open with 0xb4ae4852), so keeping a loader per
   * file is what stops one .vex's materials being matched against another's.
   */
  async loadVexx(filename: string, engineflare = false) {
    const world = this._world;
    if (!world) return;
    const outer = this.rcsCompanion;
    this.rcsCompanion = undefined;
    let object: THREE.Object3D;
    try {
      const vexx = Vexx.load(await api.fetchFile(filename));
      // Registers this file's MESH nodes against the fresh companion above.
      object = this.loadNode(world, vexx.root);
    } catch (e) {
      api.log(`[vexx] ${filename} failed: ${(e as Error).message}`);
      this.rcsCompanion = outer;
      return;
    }
    if (engineflare) {
      world.scene.traverse((locator: THREE.Object3D) => {
        if (locator.name == "engine_flare") {
          for (const child of object.children) locator.add(child);
        }
      });
    } else {
      world.scene.add(object);
    }
    // This file's own companion geometry, exactly as the scene has.
    if (this.rcsCompanion) await this.loadRcsCompanion(filename.replace(".vex", ".rcsmodel"));
    this.rcsCompanion = outer;

    // This file may itself carry the ENGINE_FLARE node -- locators.vex does on
    // the HD ships. Guarded against recursion by the loaded flag, which is set
    // before engineflare.vex is fetched.
    await this.loadPendingEngineFlare();
  }

  /** The .rcsmodel holding the geometry for this scene's MESH nodes. */
  private async loadRcsCompanion(filename: string) {
    const world = this._world;
    if (!world) return;
    if (!this.rcsCompanion) this.rcsCompanion = new RcsCompanion(world);
    try {
      await this.rcsCompanion.load(await api.fetchFile(filename), filename);
    } catch (e) {
      api.log(`[rcsmodel] ${filename} failed: ${(e as Error).message}`);
    }
  }

  /** The front-end's screen settings. */
  private async loadSkin(world: World, filename: string) {
    try {
      const skin = new TextDecoder().decode(await api.fetchFile(filename));
      world.userdata.screenSetting = parseScreenSetting(skin, "Main Menu");
      world.settings.frontendEdges = isFrontEndScene(world.userdata.filename ?? "", skin);
    } catch (e) {
      api.log(`[skin] ${filename} failed, keeping defaults: ${(e as Error).message}`);
    }
  }

  /**
   * The environment sky is a cube map. Sampled as a flat texture it renders
   * black, so it is rebuilt from its six faces and used as the background.
   *
   * Once per scene: the companion .rcsmodel asks for the sky too, so without
   * this a ship requested it twice -- and on a ship, where no sky sits beside
   * the file, that is two failures rather than one.
   */
  private async loadSky(world: World, filename: string) {
    if (world.userdata.skyRequested) return;
    world.userdata.skyRequested = true;
    let gtf;
    try {
      gtf = GTF.load(await api.fetchFile(filename));
    } catch (e) {
      api.log(`[sky] ${filename} unavailable: ${(e as Error).message}`);
      return;
    }
    api.log(`[sky] loaded: isCube=${gtf.isCube} faces=${gtf.faces.length} ${gtf.header.width}x${gtf.header.height} ${gtf.header.formatName} mips=${gtf.mipmaps.length}`);
    if (!gtf.isCube) {
      api.log(`[VEXXLoader] sky.gtf is not a cube map`);
      return;
    }
    const cube = facesToCubeTexture(gtf.faces);
    if (!cube) {
      api.log(`[VEXXLoader] sky.gtf has ${gtf.faces.length} faces, cannot build a cube`);
      return;
    }
    world.scene.background = cube;
    api.log(`[sky] background set`);
  }

  /**
   * Note that this MESH node's geometry lives in the companion .rcsmodel.
   *
   * Only records the reference: the companion is loaded once the whole scene
   * has been walked, so it finds every ref waiting for it. Requesting the file
   * here instead -- as this did -- raced the walk, and the reparenting ran
   * against whichever refs happened to exist when the bytes arrived.
   */
  require(world: World, object3d: THREE.Object3D, node: VexxNodeMesh) {
    if (this.rcsCompanion === undefined) this.rcsCompanion = new RcsCompanion(world);
    this.rcsCompanion.addMeshRef({ vexxMesh: node, object: object3d });
  }

  private loadTextures(world: World, vexx: Vexx) {
    const causticTextures: THREE.Texture[] = [];

    for (const vexxTexture of vexx.textures) {
      if (vexxTexture.mipmaps.length === 0) continue;
      const texture = mipmapsToTexture(vexxTexture.mipmaps);
      texture.name = vexxTexture.name;
      world.textures[vexxTexture.properties.id] = texture;

      // Detect PSP sphere/environment map (envtest*.tga) — always present in
      // ship files at tex slot 1.  Store a sphere-mapped clone for use by
      // shinemap materials.
      const basename = vexxTexture.name.replace(/\\/g, "/").split("/").pop() ?? "";
      if (/^envtest/i.test(basename) && !world.userdata.envMap) {
        const envTex = texture.clone();
        envTex.mapping = THREE.EquirectangularReflectionMapping;
        envTex.needsUpdate = true;
        world.userdata.envMap = envTex;
      }

      // Collect caustic frame textures (Data/Tex/caustics/save.XX.tga)
      if (/caustics[/\\]save\.\d+/i.test(vexxTexture.name)) {
        causticTextures.push(texture);
      }
    }

    if (causticTextures.length > 0) {
      world.userdata.causticTextures = causticTextures;
    }
  }

  private loadScene(world: World, vexx: Vexx) {
    const object = this.loadNode(world, vexx.root);
    world.scene.add(object);

    // Fallback: if the file defines no ambient light, add a neutral one
    let hasAmbient = false;
    world.scene.traverse((obj) => { if (obj instanceof THREE.AmbientLight) hasAmbient = true; });
    if (!hasAmbient) {
      const fallback = new THREE.AmbientLight(0xffffff, 1.0);
      fallback.name = ".FallbackAmbientLight";
      world.scene.add(fallback);
    }
  }

  public loadNode(world: World, node: VexxNode): THREE.Object3D {
    let object: THREE.Object3D;
    let layer: string | null = null;
    let layerGroup: string | undefined;

    switch (node.typeName) {
      case "ABSORB": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeAbsorb);
        layer = "Ship abosrbs";
        break;
      case "AIRBRAKE":
        object = this.loadAirbrake(world, node as VexxNodeAirbrake);
        break;
      case "AMBIENT_LIGHT":
        object = this.loadAmbientLight(world, node as VexxNodeAmbientLight);
        break;
      case "ANIMATION_TRIGGER":
        object = this.loadControlPointMatrix(world, node as VexxNodeMatrix);
        layer = "Animation triggers";
        break;
      case "ANIM_TRANSFORM":
        object = this.loadAnimTransform(world, node as VexxNodeAnimTransform | Vexx3NodeAnimTransform);
        break;
      case "BLOB":
        object = this.loadBlob(world, node as VexxNodeBlob);
        layer = "Blobs";
        break;
      case "CAMERA":
        object = this.loadCamera(world, node as VexxNodeCamera);
        layer = "Cameras";
        break;
      case "CANON_FLASH": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "CLOUD_CUBE": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Clouds";
        break;
      case "CLOUD_GROUP": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Clouds";
        break;
      case "CURVE_SHAPE": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Curve";
        break;
      case "DIRECTIONAL_LIGHT":
        object = this.loadDirectionalLight(world, node as VexxNodeDirectionalLight);
        layer = "Lights";
        break;
      case "DYNAMIC_POINT_LIGHT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Lights";
        break;
      case "DYNAMIC_SHADOW_OCCLUDER":
        object = this.loadDynamicShadowOccluder(world, node as VexxNodeDynamicShadowOccluder);
        layer = "Shadow occluders";
        break;
      case "ENGINE_FIRE": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeEngineFire);
        layer = "Ship engine fire";
        break;
      case "ENGINE_FLARE": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeEngineFlare);
        // Loaded after the walk, not here: a ship has several flare nodes and
        // the file is the same one for all of them. It also has to attach to
        // the `engine_flare` locators, which only exist once the walk is done.
        this._needsEngineFlare = true;
        layer = "Ship engine flare";
        break;
      case "EXIT_GLOW": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "CAGE_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Cage collisions";
        layerGroup = "Collisions";
        break;
      case "FLOOR_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Floor collisions";
        layerGroup = "Collisions";
        break;
      case "MAG_FLOOR_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Mag floor collisions";
        layerGroup = "Collisions";
        break;
      case "FOG_CUBE":
        object = this.loadFogCube(world, node as VexxNodeFogCube);
        layer = "Fog";
        break;
      case "GATE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "GRID_CAMERA":
        object = this.loadNodeGeneric(world, node);
        layer = "Cameras";
        break;
      case "GROUP":
        object = this.loadNodeGeneric(world, node);
        break;
      case "LENS_FLARE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "LOD_GROUP":
        object = this.loadLodGroup(world, node as VexxNodeLodGroup);
        break;
      case "MESH":
        object = node instanceof Vexx3NodeMesh
          ? this.loadMeshV3(world, node)
          : this.loadMesh(world, node as VexxNodeMesh);
        break;
      case "MESH_NODE_GHOST": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "NURBS_SURFACE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "PARTICLE_SYSTEM": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "POINT_LIGHT": // TODO
        object = this.loadNodeGeneric(world, node);
        layer = "Lights";
        break;
      case "QUAKE": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "RESET_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Reset collisions";
        layerGroup = "Collisions";
        break;
      case "SEA":
        object = this.loadMesh(world, node as VexxNodeSea);
        layer = "Sea";
        break;
      case "SEAWEED":
        object = this.loadMesh(world, node as VexxNodeMesh);
        layer = "Seaweed";
        break;
      case "SEA_REFLECT":
        object = this.loadMesh(world, node as VexxNodeSeaReflect);
        layer = "Sea reflect";
        break;
      case "SECTION": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "SHADOW":
        object = this.loadShadow(world, node as VexxNodeShadow);
        layer = "Shadows";
        break;
      case "SHIP_COLLISION_FX": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeShipColisionFx);
        layer = "Ship collisions";
        break;
      case "SHIP_MUZZLE":
        object = this.loadControlPointMatrix(world, node as VexxNodeShipMuzzle);
        layer = "Ship muzzle";
        break;
      case "SKYCUBE":
        object = this.loadMesh(world, node as VexxNodeSkycube);
        layer = "Skybox";
        break;
      case "SOUND": // TODO
        object = this.loadSound(world, node as VexxNodeSound);
        layer = "Sounds";
        break;
      case "SPEAKER": // TODO
        object = this.loadSpeaker(world, node);
        layer = "Sounds";
        break;
      case "SPEEDUP_PAD":
        object = this.loadMesh(world, node as VexxNodeSpeedupPad);
        layer = "Pads";
        break;
      case "START_POSITION":
        object = this.loadControlPointMatrix(world, node as VexxNodeStartPosition);
        layer = "Start position";
        break;
      case "TEXTURE":
        throw new Error("This should not happen");
      case "TEXTURE_BLOB": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "TRACK_WALL_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Track wall collisions";
        layerGroup = "Collisions";
        break;
      case "TRAIL":
        object = this.loadControlPointMatrix(world, node as VexxNodeTrail);
        break;
      case "TRANSFORM":
        object = this.loadTransform(world, node as VexxNodeTransform);
        break;
      case "UNUSED_1": // TODO ?
        object = this.loadNodeGeneric(world, node);
        break;
      case "WALL_COLLISION":
        object = this.loadCollision(world, node as VexxNodeCollision);
        layer = "Wall collisions";
        layerGroup = "Collisions";
        break;
      case "WEAPON_PAD":
        object = this.loadMesh(world, node as VexxNodeWeaponPad);
        layer = "Pads";
        break;
      case "WEATHER_POSITION": // TODO
        object = this.loadNodeGeneric(world, node);
        break;
      case "WORLD":
        object = this.loadNodeGeneric(world, node);
        break;
      case "WO_POINT":
        object = this.loadWoPoint(world, node as VexxNodeWoPoint);
        layer = "WO Points";
        break;
      case "WO_SPOT":
        object = this.loadWoSpot(world, node as VexxNodeWoSpot);
        layer = "WO Spots";
        break;
      case "WO_TRACK":
        object = this.loadWoTrack(world, node as VexxNodeWoTrack);
        layer = "WO Tracks";
        break;
      case "WING_TIP": // TODO
        object = this.loadControlPointMatrix(world, node as VexxNodeWingTip);
        layer = "Ship wing tips";
        break;
      default:
        console.warn(`Unexpected node type ${node.typeName} ${node.name}`);
        object = this.loadNodeGeneric(world, node);
        break;
    }

    if (!("format" in object.userData)) {
      // Merge rather than replace: loaders set their own userData flags before
      // returning (animatedPivot, externalId), and assigning a fresh object
      // here would drop them.
      object.userData.format = "VEXX";
      object.userData.type = node.typeName;
    }

    if (layer) {
      const layerId = world.getLayer(layer, layerGroup);
      object.layers.set(layerId);
      object.traverse((subobj) => {
        subobj.layers.set(layerId);
      });
    }

    return object;
  }

  private loadNodeGeneric(world: World, node: VexxNode): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;
    for (const child of node.children) {
      if (child.typeName == "TEXTURE") continue;
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadTransform(world: World, node: VexxNodeTransform): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);

    const obj = this.loadNodeGeneric(world, node);
    obj.name = node.name;
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadLodGroup(world: World, node: VexxNodeLodGroup): THREE.Object3D {
    const lod = new THREE.LOD();
    lod.name = node.name;
    let i = 0;
    for (let child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      const distance = node.lodDistances[i] ?? 100 * i;
      lod.addLevel(object, distance);
      i++;
    }
    return lod;
  }

  private loadAmbientLight(world: World, node: VexxNodeAmbientLight): THREE.AmbientLight {
    const color = new THREE.Color(node.rgba[0], node.rgba[1], node.rgba[2]);
    const intensity = node.rgba[3];
    return new THREE.AmbientLight(color, intensity);
  }

  private loadAnimTransform(world: World, node: VexxNodeAnimTransform | Vexx3NodeAnimTransform): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;
    // A moving pivot: meshes below this are placed relative to it, not in the
    // world. See hasAnimatedAncestor.
    group.userData.animatedPivot = true;

    // Keys are frame numbers at 60fps — convert to seconds for Three.js
    const FPS = 60;

    const animTracks: THREE.KeyframeTrack[] = [];

    if (node.track1) {
      // track1 values are rest + (raw/32767 * scale) — already include the rest position offset.
      const times = node.track1.keys.map(k => k / FPS);
      const posTrack = new THREE.VectorKeyframeTrack(".position", times, node.track1.values, THREE.InterpolateLinear);
      animTracks.push(posTrack);
    } else if (node.has_position) {
      group.position.set(node.x, node.y, node.z);
    }

    if (node.track2) {
      // track2 = rotation animation, in one of two encodings (node.keyframeFormat):
      //   5 = float32 unit quaternions stored (w, x, y, z)
      //   0 = int16 XYZ of a unit quaternion; W = sqrt(1 - x²-y²-z²)
      // THREE.QuaternionKeyframeTrack wants (x, y, z, w) either way.
      const times = node.track2.keys.map(k => k / FPS);
      const quatValues: number[] = [];
      // v3 has no keyframeFormat field; it is always the int16 encoding.
      const keyframeFormat = "keyframeFormat" in node ? node.keyframeFormat : 0;
      if (keyframeFormat == VEXX_KEYFRAME_FLOAT32) {
        for (let i = 0; i < node.track2.values.length; i += 4) {
          const w = node.track2.values[i];
          const x = node.track2.values[i + 1];
          const y = node.track2.values[i + 2];
          const z = node.track2.values[i + 3];
          quatValues.push(x, y, z, w);
        }
      } else {
        for (let i = 0; i < node.track2.values.length; i += 3) {
          const x = node.track2.values[i];
          const y = node.track2.values[i + 1];
          const z = node.track2.values[i + 2];
          const w = Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z));
          quatValues.push(x, y, z, w);
        }
      }
      const rotTrack = new THREE.QuaternionKeyframeTrack(".quaternion", times, quatValues, THREE.InterpolateLinear);
      animTracks.push(rotTrack);
    }

    if (animTracks.length > 0) {
      const duration = Math.max(...animTracks.map(t => t.times[t.times.length - 1] ?? 0));
      const clip = new THREE.AnimationClip(group.name, duration, animTracks);
      const mixer = new THREE.AnimationMixer(group);
      const action = mixer.clipAction(clip);
      action.play();
      mixer.update(0);  // snap to first keyframe immediately
      world.addAction(group.name, action, mixer);
    }

    for (const child of node.children) {
      const object = this.loadNode(world, child);
      if (object === null) continue;
      group.add(object);
    }
    return group;
  }

  private loadMesh(world: World, node: VexxNodeMesh): THREE.Object3D {
    if (node.isExternal) {
      const group = new THREE.Group();
      group.name = node.name;
      group.userData = { format: "VEXX", type: "MESH/RCS" };
      this.require(world, group, node as VexxNodeMesh);
      return group;
    }


    const group = new THREE.Group();
    group.name = node.name;

    for (let i = 0; i < node.chunks.length; i++) {
      const chunk = node.chunks[i];
      if (chunk.parseError) continue;

      const geo = chunk.toMeshData();
      if (geo.positions.length === 0) continue;

      const geometry = meshDataToGeometry(geo);

      const chunkHeader = chunk.header;
      const vexxMat = node.materials[chunkHeader.id];
      const textureId = vexxMat.textureId;
      // The CHUNK's own flags, not the material's, when the format carries
      // them: the GE reads the chunk word (see VexxNodeMeshChunkHeader.signature
      // and Material_ApplyRenderState in boot.bin), and the two disagree on
      // 19,382 of 93,187 chunks -- a material marked merely "glow" is drawn
      // alpha-tested by half its chunks and plain by the other half. The
      // material's renderFlags stays the fallback for v3, whose chunk header
      // has no such word.
      const rs = chunkHeader.renderState;
      const renderFlags = rs ? chunkRenderFlags(rs, vexxMat.renderFlags) : vexxMat.renderFlags;
      // The chunk's own alpha-test reference. The file uses 0x00 and 0x7f, and
      // 0x00 is the common one -- a cutout that keeps every texel the artist
      // did not paint fully transparent, which a fixed 0.5 was eating into.
      const alphaRef = rs?.alphaTest ? rs.alphaRef : undefined;
      const hasNormals = geo.normals !== null;
      // The chunk's baked vertex lighting, when it has one.
      const hasColors = geo.colors !== null;
      // Include hasNormals in the cache key: geometry with and without normals
      // needs different flatShading settings and must not share a material.
      const matKey = `${node.typeName}:${textureId}:${renderFlags}${hasNormals ? ":N" : ""}${hasColors ? ":C" : ""}${alphaRef !== undefined ? `:a${alphaRef}` : ""}`;
      let material = world.materials["_default"];
      if (matKey in world.materials) {
        material = world.materials[matKey];
      } else if (textureId in world.textures) {
        const map = world.textures[textureId];
        if (node instanceof VexxNodeSea || node instanceof VexxNodeSeaReflect) {
          material = new MeshVexxSeaMaterial(map);
          material.name = `SeaMaterial_${textureId}`;
          world.addTickMaterial(material as MeshVexxSeaMaterial);
        } else if (node.typeName === "SKYCUBE") {
          material = new MeshSkyMaterial(map);
          material.name = "SkyMaterial_" + textureId;
        } else {
          material = makeMeshMaterial(map, renderFlags, node.typeInfo.version <= 4, world.userdata.envMap, hasNormals, alphaRef, hasColors);
          material.name = `VexxMaterial_${textureId}_0x${renderFlags.toString(16)}`;
        }
        world.materials[matKey] = material;
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = node.name + "__" + i;
      mesh.renderOrder = node.typeName == "SKYCUBE" ? 0 : 1;
      if (node.typeName == "SKYCUBE") mesh.frustumCulled = false;
      mesh.layers.set(0);
      group.add(mesh);
    }

    // Add caustic overlay to track meshes; the shader's depth fade handles visibility
    const causticMaps = world.userdata.causticTextures as THREE.Texture[] | undefined;
    if (node.typeName === "MESH" && causticMaps && causticMaps.length > 0) {
      // Reuse a single caustic material for all underwater meshes
      if (!world.materials["_caustic"]) {
        const mat = new MeshCausticMaterial(causticMaps);
        mat.name = "CausticOverlay";
        world.materials["_caustic"] = mat;
        world.addTickMaterial(mat);
      }
      const causticMat = world.materials["_caustic"];

      const baseMeshes = group.children.filter((c): c is THREE.Mesh => c instanceof THREE.Mesh);
      for (const child of baseMeshes) {
        const overlay = new THREE.Mesh(child.geometry, causticMat);
        overlay.name = child.name + "__caustic";
        overlay.renderOrder = 2;
        overlay.layers.set(0);
        group.add(overlay);
      }
    }

    return group;
  }

  private loadMeshV3(world: World, node: Vexx3NodeMesh): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    for (let i = 0; i < node.chunks.length; i++) {
      const chunk = node.chunks[i];
      if (chunk.parseError) continue;

      const geo = chunk.toMeshData();
      if (geo.positions.length === 0) continue;

      const geometry = meshDataToGeometry(geo);

      const vexxMat = node.materials[chunk.header.id];
      const textureId = vexxMat.textureId;
      const renderFlags = vexxMat.renderFlags;
      const hasNormals = geo.normals !== null;
      const matKey = `${node.typeName}:${textureId}:${renderFlags}${hasNormals ? ":N" : ""}`;
      let material = world.materials["_default"];
      if (matKey in world.materials) {
        material = world.materials[matKey];
      } else if (textureId in world.textures) {
        const map = world.textures[textureId].clone();
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.needsUpdate = true;
        material = makeMeshMaterial(map, renderFlags, true, world.userdata.envMap, hasNormals);
        material.name = `VexxMaterial_${textureId}_0x${renderFlags.toString(16)}`;
        world.materials[matKey] = material;
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = node.name + "__" + i;
      mesh.layers.set(0);
      group.add(mesh);
    }

    return group;
  }

  private loadCollision(world: World, node: VexxNodeCollision): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    for (const block of node.blocks) {
      const geometry = new THREE.BufferGeometry();

      if (block.blocks.length != 3) {
        console.log(`Cannot load collision "${node.name}"`);
        continue;
      }
      if (block.blocks[0].points == null) {
        console.log(`Cannot load collision "${node.name}"`);
        continue;
      }
      if (block.blocks[2].points == null) {
        console.log(`Cannot load collision "${node.name}"`);
        continue;
      }

      const attr = new THREE.Float32BufferAttribute(block.blocks[0].points, 3);
      geometry.setAttribute("position", attr);
      geometry.setIndex(Array.from(block.blocks[2].points));

      const material = world.materials["_defaultCollision"];
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 2;
      mesh.layers.set(2);
      group.add(mesh);
    }

    return group;
  }

  private loadCamera(world: World, node: VexxNodeCamera): THREE.Object3D {
    const camera = new THREE.PerspectiveCamera(45, 1.33, 32, 34);
    camera.name = node.name;

    const helper = new THREE.CameraHelper(camera);
    helper.matrix = new THREE.Matrix4();
    helper.name = `.CameraHelper_${camera.name}`
    camera.add(helper);

    const control = this.createControlPoint(node.name);
    camera.add(control);

    return camera;
  }

  private loadSound(world: World, node: VexxNodeSound): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadSpeaker(world: World, node: VexxNodeSpeaker): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadAirbrake(world: World, node: VexxNodeAirbrake): THREE.Object3D {
    const object = this.loadNodeGeneric(world, node);
    object.name = node.name;
    // The hinge the airbrake slider rotates: the mesh under it must keep its
    // offset from this pivot. See hasAnimatedAncestor.
    object.userData.animatedPivot = true;
    world.addAirbrake(object);
    return object;
  }

  private loadWoPoint(world: World, node: VexxNodeWoPoint): THREE.Object3D {
    const color = new THREE.Color(node.rgba[0], node.rgba[1], node.rgba[2]);
    const light = new THREE.PointLight(color, node.rgba[3], node.farAttenuation);
    light.name = node.name;
    const helper = new THREE.PointLightHelper(light, 1);
    light.add(helper);
    return light;
  }

  private loadWoSpot(world: World, node: VexxNodeWoSpot): THREE.Object3D {
    const color = new THREE.Color(node.rgba[0], node.rgba[1], node.rgba[2]);
    const light = new THREE.SpotLight(color, node.rgba[3], node.farAttenuation, node.outerConeAngle);
    light.name = node.name;
    const helper = new THREE.SpotLightHelper(light);
    light.add(helper);
    return light;
  }

  private loadDirectionalLight(world: World, node: VexxNodeDirectionalLight): THREE.Object3D {
    const color = new THREE.Color(node.rgba[0], node.rgba[1], node.rgba[2]);
    const light = new THREE.DirectionalLight(color, node.rgba[3]);
    light.name = node.name;
    const helper = new THREE.DirectionalLightHelper(light, 1);
    light.add(helper);
    return light;
  }

  private loadShadow(world: World, node: VexxNodeShadow): THREE.Object3D {
    const geometry = new THREE.SphereGeometry(node.radius, 8, 6);
    const material = new MeshVexxPSPBasicMaterial({ color: 0x888800, wireframe: true, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = node.name;
    return mesh;
  }

  private loadDynamicShadowOccluder(world: World, node: VexxNodeDynamicShadowOccluder): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    if (node.vertices.length === 0) return group;

    const positions: number[] = [];
    const indices: number[] = [];

    for (const face of node.faces) {
      const faceVerts = face.indices.length;
      if (faceVerts < 3) continue;

      const baseIndex = positions.length / 3;
      for (const vi of face.indices) {
        const v = node.vertices[vi];
        if (!v) continue;
        positions.push(v[0], v[1], v[2]);
      }

      // Fan-triangulate the convex face polygon
      for (let i = 1; i < faceVerts - 1; i++) {
        indices.push(baseIndex, baseIndex + i, baseIndex + i + 1);
      }
    }

    if (indices.length === 0) return group;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new MeshVexxPSPBasicMaterial({ color: 0x0088ff, wireframe: true, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = node.name;
    group.add(mesh);
    return group;
  }

  private loadFogCube(world: World, node: VexxNodeFogCube): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    const z0 = node.fogZones[0];
    const color0 = new THREE.Color(z0.color[0], z0.color[1], z0.color[2]);

    // The volumeMatrix diagonal is < 1 world-unit, so the visual box uses a
    // fixed reference size. The parent TRANSFORM handles world-space placement.
    const REF = 20;
    const makeBox = (size: number, color: THREE.Color, opacity: number) => {
      const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
      return new THREE.LineSegments(edges, mat);
    };

    group.add(makeBox(REF, color0, 0.9));

    // Inner box for zone[1] when it differs from zone[0]
    const z1 = node.fogZones[1];
    const z1Differs =
      z1.color[0] !== z0.color[0] ||
      z1.color[1] !== z0.color[1] ||
      z1.color[2] !== z0.color[2] ||
      z1.near !== z0.near ||
      z1.far !== z0.far;
    if (z1Differs) {
      const color1 = new THREE.Color(z1.color[0], z1.color[1], z1.color[2]);
      group.add(makeBox(REF * 0.7, color1, 0.6));
    }

    // Apply the translation from volumeMatrix (local offset within parent TRANSFORM).
    // The scale components are not spatial extents — skip them.
    const [px, py, pz] = node.position;
    group.position.set(px, py, pz);

    // Store fog parameters so the layer toggle can apply scene-level fog.
    group.userData = {
      format: "VEXX",
      type: "FOG_CUBE",
      fogZone0: { color: color0.clone(), near: z0.near, far: z0.far },
    };

    return group;
  }

  private loadWoTrack(world: World, node: VexxNodeWoTrack): THREE.Object3D {
    const group = new THREE.Group();
    group.name = node.name;

    const pts = node.circuitPoints;
    if (pts.length === 0) return group;

    // Expose track points for camera follow mode.
    world.userdata.woTrackPoints = pts;

    // All lanes are sequential segments of one continuous circuit — draw as a
    // single closed loop (last point is adjacent to first).
    const positions: number[] = [];
    for (const p of pts) positions.push(p.position[0], p.position[1], p.position[2]);
    positions.push(pts[0].position[0], pts[0].position[1], pts[0].position[2]); // close

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00ffff }));
    line.name = `${node.name}.circuit`;
    group.add(line);

    return group;
  }

  private loadControlPointMatrix(world: World, node: VexxNodeMatrix): THREE.Object3D {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(node.matrix);
    const obj = this.createControlPoint(node.name);
    obj.name = node.name;
    obj.applyMatrix4(matrix);
    return obj;
  }

  private loadControlPoint(world: World, node: VexxNode): THREE.Object3D {
    return this.createControlPoint(node.name);
  }

  private loadBlob(world: World, node: VexxNodeBlob): THREE.Object3D {
    if (node.mipmaps.length === 0) {
      return this.createControlPoint(node.name);
    }
    const texture = mipmapsToTexture(node.mipmaps);
    texture.name = node.name;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    material.name = `BlobMaterial_${node.name}`;

    const geometry = new THREE.PlaneGeometry(node.width, node.height);
    geometry.rotateX(-Math.PI / 2); // lay flat (XZ plane)

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = node.name;
    mesh.renderOrder = 2;
    return mesh;
  }
}
