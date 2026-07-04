import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const HDR_ENVIRONMENT_PATH = '/assets/environment/outdoor.hdr';
const ENVIRONMENT_MAP_WIDTH = 512;
const ENVIRONMENT_MAP_HEIGHT = 256;

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
    const fallbackTexture = createOutdoorEnvironmentTexture();
    const environmentMap = pmremGenerator.fromEquirectangular(fallbackTexture).texture;

    scene.environment = environmentMap;
    if (hemisphereLight) {
      hemisphereLight.intensity = 1.05;
    }

    fallbackTexture.dispose();
    console.warn(`HDR environment not loaded from ${HDR_ENVIRONMENT_PATH}; using procedural outdoor environment.`);
  } finally {
    pmremGenerator.dispose();
  }
}

function createOutdoorEnvironmentTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = ENVIRONMENT_MAP_WIDTH;
  canvas.height = ENVIRONMENT_MAP_HEIGHT;

  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, ENVIRONMENT_MAP_HEIGHT);

  gradient.addColorStop(0, '#8fc9ff');
  gradient.addColorStop(0.38, '#d8ecff');
  gradient.addColorStop(0.55, '#f7e7c8');
  gradient.addColorStop(1, '#465334');
  context.fillStyle = gradient;
  context.fillRect(0, 0, ENVIRONMENT_MAP_WIDTH, ENVIRONMENT_MAP_HEIGHT);

  const sunGradient = context.createRadialGradient(
    ENVIRONMENT_MAP_WIDTH * 0.78,
    ENVIRONMENT_MAP_HEIGHT * 0.34,
    0,
    ENVIRONMENT_MAP_WIDTH * 0.78,
    ENVIRONMENT_MAP_HEIGHT * 0.34,
    ENVIRONMENT_MAP_WIDTH * 0.22,
  );
  sunGradient.addColorStop(0, 'rgba(255, 244, 205, 0.95)');
  sunGradient.addColorStop(0.28, 'rgba(255, 230, 180, 0.34)');
  sunGradient.addColorStop(1, 'rgba(255, 230, 180, 0)');
  context.fillStyle = sunGradient;
  context.fillRect(0, 0, ENVIRONMENT_MAP_WIDTH, ENVIRONMENT_MAP_HEIGHT);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}
