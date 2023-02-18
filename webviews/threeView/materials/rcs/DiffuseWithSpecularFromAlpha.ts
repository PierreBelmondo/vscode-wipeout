import * as THREE from "three";

// Compatible with:
// "detonator_diffuse_with_specular_from_alpha_n_vcol"

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
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

void main(void) {
    vec3 diffuse = vec3(1.,1.,1.);
    vec3 emissive = vec3(0.);
    vec3 specular = vec3(1.,1.,1.);
    float shininess = 0.5;
    float opacity = 1.;

    if (bloomActive) {
        diffuse = vec3(0.);
        specular = vec3(0.);
    }

    #include <clipping_planes_fragment>

    vec4 diffuseColor = vec4( diffuse, opacity );
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;

    #include <logdepthbuf_fragment>
    #include <map_fragment>

    float wo_specular = diffuseColor.a;
    diffuseColor.a = 1.0;

    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <specularmap_fragment>
    #include <normal_fragment_begin>
    #include <normal_fragment_maps>
    #include <emissivemap_fragment>
    
    shininess = wo_specular;
    specularStrength = wo_specular;

    // accumulation
    #include <lights_phong_fragment>
    #include <lights_fragment_begin>
    #include <lights_fragment_maps>
    #include <lights_fragment_end>

    // modulation
    #include <aomap_fragment>

    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

    #include <envmap_fragment>
    #include <output_fragment>
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
    #include <premultiplied_alpha_fragment>
    #include <dithering_fragment>
}
`;

type Parameters = {
  name: string;
  map?: THREE.Texture | null;
};

function rcsDiffuseWithSpecularFromAlpha(parameters: Parameters) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib["common"],
    THREE.UniformsLib["lights"],
    {
      bloomActive: { value: false },
      map: { value: parameters.map },
    },
  ]);

  const material = new THREE.ShaderMaterial({
    lights: true,
    defines: {
      USE_MAP: true,
      USE_UV: true,
    },
    uniforms,
    vertexShader,
    fragmentShader,
  });
  material.name = parameters.name;
  return material;
}

export { rcsDiffuseWithSpecularFromAlpha };
