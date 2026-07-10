import * as THREE from 'three';
import { createProceduralEnvironmentTexture, VISUAL_ENVIRONMENT } from './visualEnvironment.js';

export async function applyEnvironmentLighting(renderer, scene, hemisphereLight) {
  scene.userData.environmentLighting?.dispose();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const sourceTexture = createProceduralEnvironmentTexture();
  let environmentTarget;

  try {
    environmentTarget = pmremGenerator.fromEquirectangular(sourceTexture);
  } catch (error) {
    sourceTexture.dispose();
    throw error;
  } finally {
    pmremGenerator.dispose();
  }

  const environmentMap = environmentTarget.texture;
  scene.environment = environmentMap;
  scene.environmentIntensity = VISUAL_ENVIRONMENT.environmentMap.intensity;

  if (scene.background?.isColor) {
    scene.background.copy(VISUAL_ENVIRONMENT.sky.horizonColor);
  }

  if (scene.fog) {
    scene.fog.color.copy(VISUAL_ENVIRONMENT.fog.color);
    if (scene.fog.isFog) {
      scene.fog.near = VISUAL_ENVIRONMENT.fog.near;
      scene.fog.far = VISUAL_ENVIRONMENT.fog.far;
    } else if (scene.fog.isFogExp2) {
      scene.fog.density = VISUAL_ENVIRONMENT.fog.density;
    }
  }

  if (hemisphereLight) {
    hemisphereLight.color.copy(VISUAL_ENVIRONMENT.hemisphere.skyColor);
    hemisphereLight.groundColor.copy(VISUAL_ENVIRONMENT.hemisphere.groundColor);
    hemisphereLight.intensity = VISUAL_ENVIRONMENT.hemisphere.intensity;
  }

  scene.traverse((object) => {
    if (!object.isDirectionalLight) return;
    object.color.copy(VISUAL_ENVIRONMENT.sun.color);
    object.intensity = VISUAL_ENVIRONMENT.sun.intensity;
  });

  const lighting = {
    environmentMap,
    sourceTexture,
    dispose() {
      if (scene.environment === environmentMap) {
        scene.environment = null;
      }
      if (scene.userData.environmentLighting === lighting) {
        delete scene.userData.environmentLighting;
      }
      sourceTexture.dispose();
      environmentTarget.dispose();
    },
  };

  scene.userData.environmentLighting = lighting;
  return lighting;
}
