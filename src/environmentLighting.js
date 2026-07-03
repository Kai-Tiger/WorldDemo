import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const HDR_ENVIRONMENT_PATH = '/assets/environment/outdoor.hdr';

export async function applyEnvironmentLighting(renderer, scene, hemisphereLight) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);

  pmremGenerator.compileEquirectangularShader();

  try {
    const hdrTexture = await new RGBELoader().loadAsync(HDR_ENVIRONMENT_PATH);
    const environmentMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;

    scene.environment = environmentMap;
    if (hemisphereLight) {
      hemisphereLight.intensity = 0.9;
    }

    hdrTexture.dispose();
  } catch (error) {
    console.warn(`HDR environment not loaded from ${HDR_ENVIRONMENT_PATH}; using scene lights only.`);
  } finally {
    pmremGenerator.dispose();
  }
}
