/**
 * @typedef {Object} RenderQualityPreset
 * @property {string} label
 * @property {number} pixelRatioCap
 * @property {Object} resolution
 * @property {Object} postProcessing
 * @property {Object} shadows
 * @property {Object} terrain
 * @property {Object} vegetation
 * @property {Object} grass
 * @property {Object} trees
 * @property {Object} water
 * @property {string} textureTier
 */

/** @type {Readonly<Record<string, RenderQualityPreset>>} */
export const RENDER_QUALITY_PRESETS = Object.freeze({
  performance: createPreset({
    label: 'Performance',
    pixelRatioCap: 1,
    resolution: [0.7, 1],
    shaderQuality: 'low',
    textureAnisotropy: 2,
    textureTier: '1k',
    streamingBudgetMs: 3,
    shadows: [1024, 160, 180, 1, 30, 100, 120],
    terrainRadius: [2, 3],
    terrainSegments: [128, 64],
    terrainBudgetMs: 1.5,
    vegetation: [90, 260, 150, 6],
    grassDistances: [16, 40, 90],
    grassRatios: [0.6, 0.18, 0.03],
    grassBudgetMs: 0.75,
    treeBudgetMs: 0.75,
    water: ['environment', 0.5, 0, false],
    antiAliasing: 'fxaa',
    gtao: false,
    gtaoSamples: 0,
    gtaoResolutionScale: 0.5,
    bloom: [0, 1.1],
    sharpenStrength: 0,
  }),
  balanced: createPreset({
    label: 'Balanced',
    pixelRatioCap: 1.25,
    resolution: [0.75, 1],
    shaderQuality: 'medium',
    textureAnisotropy: 4,
    textureTier: '2k',
    streamingBudgetMs: 4,
    shadows: [2048, 200, 260, 1, 0, 160, 190],
    terrainRadius: [3, 4],
    terrainSegments: [256, 128, 64],
    terrainBudgetMs: 2,
    vegetation: [110, 380, 220, 8],
    grassDistances: [18, 45, 105],
    grassRatios: [0.72, 0.16, 0.03],
    grassBudgetMs: 1,
    treeBudgetMs: 1,
    water: ['probe', 0.5, 0, true],
    antiAliasing: 'smaa',
    gtao: true,
    gtaoSamples: 6,
    gtaoResolutionScale: 0.5,
    gtaoIntensity: 0.28,
    bloom: [0.06, 1.05],
    sharpenStrength: 0.08,
  }),
  quality: createPreset({
    label: 'Quality',
    pixelRatioCap: 1.5,
    resolution: [0.85, 1],
    shaderQuality: 'high',
    textureAnisotropy: 8,
    textureTier: 'hero-4k',
    streamingBudgetMs: 5,
    shadows: [2048, 250, 420, 2, 0, 240, 280],
    terrainRadius: [4, 5],
    terrainSegments: [256, 128, 64],
    terrainBudgetMs: 2.5,
    vegetation: [180, 520, 320, 10],
    grassDistances: [24, 65, 150],
    grassRatios: [1, 0.4, 0.1],
    grassBudgetMs: 1.25,
    treeBudgetMs: 1.25,
    water: ['planar', 0.5, 2, true],
    antiAliasing: 'smaa',
    gtao: true,
    gtaoSamples: 12,
    gtaoResolutionScale: 1,
    gtaoIntensity: 0.32,
    bloom: [0.1, 1],
    sharpenStrength: 0.12,
  }),
});

export const DEFAULT_RENDER_QUALITY = 'balanced';

export function getRenderQualityPreset(key) {
  return RENDER_QUALITY_PRESETS[key] ?? RENDER_QUALITY_PRESETS[DEFAULT_RENDER_QUALITY];
}

function createPreset({
  label,
  pixelRatioCap,
  resolution,
  shaderQuality,
  textureAnisotropy,
  textureTier,
  streamingBudgetMs,
  shadows,
  terrainRadius,
  terrainSegments,
  terrainBudgetMs,
  vegetation,
  grassDistances,
  grassRatios,
  grassBudgetMs,
  treeBudgetMs,
  water,
  antiAliasing,
  gtao,
  gtaoSamples,
  gtaoResolutionScale,
  gtaoIntensity = 0,
  bloom,
  sharpenStrength,
}) {
  return Object.freeze({
    label,
    pixelRatioCap,
    resolution: Object.freeze({
      minScale: resolution[0],
      maxScale: resolution[1],
      targetFrameMs: 33.3,
    }),
    shaderQuality,
    textureAnisotropy,
    textureTier,
    streamingBudgets: Object.freeze({ totalMs: streamingBudgetMs }),
    shadows: Object.freeze({
      mapSize: shadows[0],
      cameraSize: shadows[1],
      distance: shadows[2],
      cascadeCount: shadows[3],
      updateHz: shadows[4],
      casterEnableDistance: shadows[5],
      casterDisableDistance: shadows[6],
    }),
    terrain: Object.freeze({
      loadRadius: terrainRadius[0],
      unloadRadius: terrainRadius[1],
      lodSegments: Object.freeze(terrainSegments),
      useShadowProxy: true,
      buildBudgetMs: terrainBudgetMs,
    }),
    vegetation: Object.freeze({
      grassDistance: vegetation[0],
      treeDistance: vegetation[1],
      impostorStart: vegetation[2],
      fadeDistance: vegetation[3],
    }),
    grass: Object.freeze({
      lodDistances: Object.freeze(grassDistances),
      keepRatios: Object.freeze(grassRatios),
      updateBudgetMs: grassBudgetMs,
    }),
    trees: Object.freeze({ updateBudgetMs: treeBudgetMs }),
    water: Object.freeze({
      reflectionMode: water[0],
      reflectionScale: water[1],
      reflectionUpdateFrames: water[2],
      depthShoreline: water[3],
    }),
    postProcessing: Object.freeze({
      antiAliasing,
      gtao,
      gtaoSamples,
      gtaoDenoiseSamples: gtaoSamples,
      gtaoResolutionScale,
      gtaoIntensity,
      bloomStrength: bloom[0],
      bloomThreshold: bloom[1],
      sharpenStrength,
    }),
  });
}
