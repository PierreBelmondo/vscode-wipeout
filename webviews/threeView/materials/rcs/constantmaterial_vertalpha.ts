import * as THREE from "three";
import { MaterialFactory } from "./_abstract";

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
