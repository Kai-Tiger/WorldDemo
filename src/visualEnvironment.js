import * as THREE from 'three';

/**
 * @typedef {Object} VisualEnvironmentState
 * @property {THREE.Vector3} sunDirection
 * @property {THREE.Color} sunColor
 * @property {THREE.Color} fogColor
 * @property {number} fogDensity
 * @property {number} exposure
 * @property {Object} sun
 * @property {Object} sky
 * @property {Object} fog
 * @property {Object} hemisphere
 * @property {Object} environmentMap
 */

const ENVIRONMENT_MAP_WIDTH = 1024;
const ENVIRONMENT_MAP_HEIGHT = 512;
const SUN_DIRECTION = new THREE.Vector3(0.48, 0.48, 0.73).normalize();
const SUN_COLOR = new THREE.Color('#ffd9aa');
const SUN_GLOW_COLOR = new THREE.Color('#f6c995');
const SKY_ZENITH_COLOR = new THREE.Color('#3f77b8');
const SKY_HORIZON_COLOR = new THREE.Color('#9bbdd0');
const SKY_GROUND_COLOR = new THREE.Color('#343c35');
const FOG_COLOR = new THREE.Color('#91a3aa');
const FOG_DENSITY = 0.00135;

/** @type {VisualEnvironmentState} */
export const VISUAL_ENVIRONMENT = Object.freeze({
  name: 'cold-wet-mountain-morning',
  timeOfDay: 'early-morning',
  weather: 'cold-mist',
  exposure: 1.14,
  sunDirection: SUN_DIRECTION,
  sunColor: SUN_COLOR,
  sunGlowColor: SUN_GLOW_COLOR,
  skyZenith: SKY_ZENITH_COLOR,
  skyHorizon: SKY_HORIZON_COLOR,
  fogColor: FOG_COLOR,
  fogDensity: FOG_DENSITY,
  sun: Object.freeze({
    direction: SUN_DIRECTION,
    color: SUN_COLOR,
    glowColor: SUN_GLOW_COLOR,
    intensity: 3.1,
  }),
  sky: Object.freeze({
    zenithColor: SKY_ZENITH_COLOR,
    horizonColor: SKY_HORIZON_COLOR,
    groundColor: SKY_GROUND_COLOR,
    cloudColor: new THREE.Color('#d5dad7'),
    cloudShadowColor: new THREE.Color('#718087'),
    cloudCover: 0.5,
  }),
  fog: Object.freeze({
    color: FOG_COLOR,
    near: 420,
    far: 1700,
    density: FOG_DENSITY,
    heightFalloff: 0.018,
  }),
  hemisphere: Object.freeze({
    skyColor: new THREE.Color('#91b4c3'),
    groundColor: new THREE.Color('#465044'),
    intensity: 1.32,
  }),
  environmentMap: Object.freeze({
    width: ENVIRONMENT_MAP_WIDTH,
    height: ENVIRONMENT_MAP_HEIGHT,
    intensity: 0.82,
    sunRadiance: 24,
  }),
});

export function createProceduralEnvironmentTexture(environment = VISUAL_ENVIRONMENT) {
  const { width, height, sunRadiance } = environment.environmentMap;
  const data = new Uint16Array(width * height * 4);
  const sunDirection = environment.sun.direction;
  const zenith = environment.sky.zenithColor;
  const horizon = environment.sky.horizonColor;
  const ground = environment.sky.groundColor;
  const sunColor = environment.sun.glowColor;
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    const v = (y + 0.5) / height;
    const latitude = (v - 0.5) * Math.PI;
    const directionY = Math.sin(latitude);
    const horizontalLength = Math.cos(latitude);
    const skyHeight = Math.pow(THREE.MathUtils.clamp(directionY, 0, 1), 0.48);
    const groundHeight = THREE.MathUtils.clamp(-directionY, 0, 1);
    const horizonHaze = Math.exp(-Math.abs(directionY) * 8.5);

    for (let x = 0; x < width; x += 1) {
      const u = (x + 0.5) / width;
      const longitude = (u - 0.5) * Math.PI * 2;
      const directionX = horizontalLength * Math.cos(longitude);
      const directionZ = horizontalLength * Math.sin(longitude);
      const sunDot = Math.max(
        directionX * sunDirection.x
          + directionY * sunDirection.y
          + directionZ * sunDirection.z,
        0,
      );

      let red;
      let green;
      let blue;

      if (directionY >= 0) {
        red = THREE.MathUtils.lerp(horizon.r, zenith.r, skyHeight);
        green = THREE.MathUtils.lerp(horizon.g, zenith.g, skyHeight);
        blue = THREE.MathUtils.lerp(horizon.b, zenith.b, skyHeight);
      } else {
        const groundBlend = Math.pow(groundHeight, 0.28);
        red = THREE.MathUtils.lerp(horizon.r * 0.55, ground.r, groundBlend);
        green = THREE.MathUtils.lerp(horizon.g * 0.55, ground.g, groundBlend);
        blue = THREE.MathUtils.lerp(horizon.b * 0.55, ground.b, groundBlend);
      }

      const hazeAmount = horizonHaze * 0.22;
      red = THREE.MathUtils.lerp(red, horizon.r * 0.8, hazeAmount);
      green = THREE.MathUtils.lerp(green, horizon.g * 0.8, hazeAmount);
      blue = THREE.MathUtils.lerp(blue, horizon.b * 0.8, hazeAmount);

      const sunGlow = Math.pow(sunDot, 72) * 1.7 + Math.pow(sunDot, 640) * 5.5;
      const sunDisc = smoothstep(Math.cos(THREE.MathUtils.degToRad(1.25)), Math.cos(THREE.MathUtils.degToRad(0.38)), sunDot);
      const sunLight = sunGlow + sunDisc * sunRadiance;

      data[offset] = THREE.DataUtils.toHalfFloat(red + sunColor.r * sunLight);
      data[offset + 1] = THREE.DataUtils.toHalfFloat(green + sunColor.g * sunLight);
      data[offset + 2] = THREE.DataUtils.toHalfFloat(blue + sunColor.b * sunLight);
      data[offset + 3] = THREE.DataUtils.toHalfFloat(1);
      offset += 4;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.HalfFloatType);
  texture.name = 'ColdWetMorningEnvironment';
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}

function smoothstep(edge0, edge1, value) {
  const amount = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}
