import * as THREE from 'three';

const CLOUD_LAYERS = [
  { height: 280, planeSize: 900, noiseScale: 1.5, opacity: 0.10, windSpeed: 0.3, textureSize: 512 },
  { height: 200, planeSize: 750, noiseScale: 2.5, opacity: 0.16, windSpeed: 0.6, textureSize: 512 },
  { height: 140, planeSize: 600, noiseScale: 4.0, opacity: 0.20, windSpeed: 1.0, textureSize: 512 },
];

export class Clouds {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Clouds';
    this.layers = [];
  }

  static create() {
    const clouds = new Clouds();

    for (let i = 0; i < CLOUD_LAYERS.length; i += 1) {
      const cfg = CLOUD_LAYERS[i];
      const texture = createCloudTexture(cfg.textureSize, i + 1, cfg.noiseScale);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(2, 2);

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: cfg.opacity,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      });

      const geometry = new THREE.PlaneGeometry(cfg.planeSize, cfg.planeSize);
      const mesh = new THREE.Mesh(geometry, material);

      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = cfg.height;
      mesh.renderOrder = 999;
      mesh.name = `CloudLayer_${i}`;

      clouds.group.add(mesh);
      clouds.layers.push({ mesh, cfg, material });
    }

    return clouds;
  }

  update(elapsedTime, playerX, playerZ) {
    for (let i = 0; i < this.layers.length; i += 1) {
      const layer = this.layers[i];
      const { mesh, cfg, material } = layer;

      mesh.position.x = playerX;
      mesh.position.z = playerZ;

      const rotSpeed = (0.01 + i * 0.005) * elapsedTime;
      mesh.rotation.z += rotSpeed * 0.003;

      const offset = (elapsedTime * cfg.windSpeed) % cfg.textureSize;
      material.map.offset.x = offset * 0.7;
      material.map.offset.y = offset * 0.3;
    }
  }
}

function createCloudTexture(size, seed, scale) {
  const canvas = document.createElement('canvas');

  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = ((x / size) + seed * 0.37) * scale;
      const ny = ((y / size) + seed * 0.61) * scale;
      const value = fbm(nx, ny, 4);
      const alpha = smoothstep(0.50, 0.78, value) * 0.7;

      const idx = (y * size + x) * 4;

      imageData.data[idx] = 255;
      imageData.data[idx + 1] = 255;
      imageData.data[idx + 2] = 255;
      imageData.data[idx + 3] = Math.floor(THREE.MathUtils.clamp(alpha, 0, 1) * 255);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

function hash2(x, z) {
  const value = Math.sin((x * 127.1) + (z * 311.7)) * 43758.5453123;

  return value - Math.floor(value);
}

function noise(x, z) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = x - x0;
  const tz = z - z0;
  const sx = tx * tx * (3 - 2 * tx);
  const sz = tz * tz * (3 - 2 * tz);
  const a = hash2(x0, z0);
  const b = hash2(x0 + 1, z0);
  const c = hash2(x0, z0 + 1);
  const d = hash2(x0 + 1, z0 + 1);
  const top = a + (b - a) * sx;
  const bottom = c + (d - c) * sx;

  return top + (bottom - top) * sz;
}

function fbm(x, z, octaves) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += noise(x * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value / maxValue;
}

function smoothstep(edge0, edge1, value) {
  const t = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);

  return t * t * (3 - 2 * t);
}
