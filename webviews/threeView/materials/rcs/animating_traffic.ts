import * as THREE from "three";
import { LIGHTMAP_INTENSITY, SPECULAR_COLOR, SPECULAR_SHININESS, MaterialFactory } from "./_abstract";
import { ScrollingMaterial } from "./_animated";

/**
 * data/environments/talons_junction/materials/animating_traffic.rcsmaterial
 *
 *   tex[0] #fd669142                    traffic_atoc.gtf   -> map
 *   tex[1] #576c4bf3                    trafficspec_atoc.gtf   -> map
 *   tex[2] Texture1                     traffic_emmisive_atoc.gtf   -> map
 *   tex[3] lightmap                     (no file)   -> lightMap
 *   tex[4] #7611a2d8                    (no file)   -> map
 *   tex[5] #05fec07d                    (no file)   -> map
 *   tex[6] #549310b8                    (no file)   -> map
 *   tex[7] #1ead5c60                    (no file)   -> map
 *
 * Channel names come from the shader's own sampler table (see _channels.ts),
 * not from the texture filenames, which are unreliable.
 *
 * Permutation: the lit, Ambient, no-shadow, no-spot point of the matrix
 *   (see _abstract.ts). The others are TODO.
 *
 * TODO: this factory maps the material's texture channels onto a Phong
 *   approximation. The shader's own lighting maths has not been transcribed.
 *
 * Animated: verified from permutation 3 disassembly (Backend=Static,
 * FP@001630, crc=254078b4; also checked against permutation 4, same result).
 *
 * VERTEX @001460 (crc=26ea1fee):
 *   001590+0130: MOV R0.w, c464.xxxx
 *   001560+0100: MOV o11(TEX4).y, v2.yyyy
 *   0015d0+0170: MAD o11(TEX4).x, R0.wwww, c463.xxxx, v2.xxxx
 * Uniform table: c463 = hash #906b67ba "time"; c464 = hash #549310b8, an
 * unresolved/unnamed per-material scroll-speed uniform (not a shader literal,
 * not time itself). So:
 *   o11(TEX4).x = c464 * time + v2.x   -- U gets scroll-speed-uniform * time
 *   o11(TEX4).y = v2.y                 -- V is left as the raw base UV
 *
 * FRAGMENT @001630 (crc=254078b4): all three bound textures (diffuse,
 * specular, Texture1/emissive) are sampled with f[TEX4], the scrolled coord,
 * so they scroll together along U only -- V never moves.
 *
 * The scroll speed is a genuine per-material uniform the disassembler can't
 * resolve (not a texture-named slot), so there is no literal to bake in here;
 * ScrollingMaterial's default drift rate stands in for it, on the U axis only.
 */
export const animating_traffic: MaterialFactory = {
  name: "animating_traffic.rcsmaterial",
  minTextures: 1,
  maxTextures: 8,
  make: (textures: THREE.Texture[]) => {
    const [map, map1, map2, lightMap, map3, map4, map5, map6] = textures;
    return new ScrollingMaterial(
      {
        side: THREE.DoubleSide,
        ...(map ? { map: map } : {}),
        ...(map1 ? { map: map1 } : {}),
        ...(map2 ? { map: map2 } : {}),
        ...(lightMap ? { lightMap: lightMap, lightMapIntensity: LIGHTMAP_INTENSITY } : {}),
        ...(map3 ? { map: map3 } : {}),
        ...(map4 ? { map: map4 } : {}),
        ...(map5 ? { map: map5 } : {}),
        ...(map6 ? { map: map6 } : {}),
        specular: new THREE.Color(SPECULAR_COLOR),
        shininess: SPECULAR_SHININESS,
      },
      0.05, // rateU: U is the scrolled axis per the VP trace
      0, // rateV: V stays as the raw base UV, untouched by time
    );
  },
};
