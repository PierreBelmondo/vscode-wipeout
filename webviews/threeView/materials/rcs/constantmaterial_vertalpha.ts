import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

/*
  data/environments/zone_1/materials/constantmaterial_vertalpha.rcsmaterial
  data/environments/zone_2/materials/constantmaterial_vertalpha.rcsmaterial
  data/environments/zone_3/materials/constantmaterial_vertalpha.rcsmaterial
  data/environments/zone_4/materials/constantmaterial_vertalpha.rcsmaterial

  { id: 3117619978, name: 'position', align: 14, type: 53, offset: 0 },
  { id: 3732576027, name: 'normal', align: 14, type: 22, offset: 6 },
  { id: 1955845200, name: 'VertexColour1', align: 14, type: 68, offset: 10 }
*/
export const constantmaterial_vertalpha: MaterialFactory = {
  name: "constantmaterial_vertalpha.rcsmaterial",
  minTextures: 0,
  maxTextures: 0,
  make: (_textures: THREE.Texture[]) => {
    const phongShader = THREE.ShaderLib["phong"];

    let fragmentShader = phongShader.fragmentShader;
    fragmentShader = fragmentShader.replace(
      "diffuseColor = vec4( diffuse, opacity );",
      "diffuseColor = vec4( diffuse, length(vColor.rgb) );"
    );

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
    });
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = fragmentShader;
      shader.vertexShader = phongShader.vertexShader;
    };
    return material;
  },
};
