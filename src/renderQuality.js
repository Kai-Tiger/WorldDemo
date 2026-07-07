export const RENDER_QUALITY_PRESETS = {
  performance: {
    label: 'Performance',
    pixelRatioCap: 1,
    shadowMapSize: 1024,
    terrain: {
      loadRadius: 1,
      unloadRadius: 2,
    },
    postProcessing: {
      taa: false,
      gtao: false,
    },
  },
  balanced: {
    label: 'Balanced',
    pixelRatioCap: 1.25,
    shadowMapSize: 1024,
    terrain: {
      loadRadius: 1,
      unloadRadius: 2,
    },
    postProcessing: {
      taa: false,
      gtao: false,
    },
  },
  quality: {
    label: 'Quality',
    pixelRatioCap: 2,
    shadowMapSize: 2048,
    terrain: {
      loadRadius: 2,
      unloadRadius: 3,
    },
    postProcessing: {
      taa: true,
      taaSampleLevel: 2,
      gtao: true,
      gtaoSamples: 12,
    },
  },
};

export const DEFAULT_RENDER_QUALITY = 'balanced';

export function getRenderQualityPreset(key) {
  return RENDER_QUALITY_PRESETS[key] ?? RENDER_QUALITY_PRESETS[DEFAULT_RENDER_QUALITY];
}
