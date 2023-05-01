import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/materials/ships/detonator_diffuse_with_specular_from_alpha_n_vcol.rcsmaterial
  
  { id: 3117619978, name: 'position', align: 22, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 22, type: 22, offset: 6 },
  { id: 3689280535, name: 'tangent', align: 22, type: 68, offset: 10 },
  { id: 1955845200, name: 'VertexColour1', align: 22, type: 68, offset: 14 },
  { id: 1114772732, name: 'Uv1', align: 22, type: 35, offset: 18 }
*/
export const detonator_diffuse_with_specular_from_alpha_n_vcol: MaterialFactory = {
  name: "detonator_diffuse_with_specular_from_alpha_n_vcol.rcsmaterial",
  minTextures: 2,
  maxTextures: 2,
  make: (textures: THREE.Texture[]) => {
    // texture[0] = diffuse_with_specular_from_alpha
    // texture[1] = normal ?
    const uniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib["common"],
      THREE.UniformsLib["lights"],
      {
        bloomActive: { value: false },
        map: { value: textures[0] },
        normalMap: { value: textures[1] },
        roughnessMap: { value: textures[1] },
        diffuse: { value: new THREE.Color(0xffffff) },
        emissive: { value: new THREE.Color(0x000000) },
        specular: { value: new THREE.Color(0x101010) },
        shininess: { value: 100.0 },
        metalness: { value: 100.0 },
        roughness: { value: 0.0 },
      },
    ]);

    return new THREE.ShaderMaterial({
      vertexColors: true,
      lights: true,
      defines: {
        USE_MAP: true,
        USE_NORMALMAP: true,
        USE_UV: true,
      },
      uniforms,
      vertexShader,
      fragmentShader,
    });
  },
};

const vertexShader = `
#define PHONG
varying vec3 vViewPosition;

#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

void main() {
  #include <uv_vertex>
  #include <uv2_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>

  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>

  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>
  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>

  vViewPosition = - mvPosition.xyz;

  #include <worldpos_vertex>
  #include <envmap_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
}
`;

const fragmentShader = `
#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
uniform float metalness;
uniform float roughness;

uniform bool bloomActive;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main(void) {
  #include <clipping_planes_fragment>

  vec4 diffuseColor = vec4( diffuse, opacity );
  ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
  vec3 totalEmissiveRadiance = emissive;

  #include <logdepthbuf_fragment>
  #include <map_fragment>

  float wo_specular = diffuseColor.a;
  diffuseColor.a = 0.0;

  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <roughnessmap_fragment>
  #include <metalnessmap_fragment>
  #include <specularmap_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>
  #include <emissivemap_fragment>
  
  specularStrength = wo_specular * 50.0;

  // accumulation
  #include <lights_phong_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>

  // modulation
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
  if (bloomActive) {
    outgoingLight = vec3(0.,0.,0.);
  }

  #include <envmap_fragment>
  #include <output_fragment>
  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}
`;
