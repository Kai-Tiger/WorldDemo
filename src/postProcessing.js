import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { VISUAL_ENVIRONMENT } from './visualEnvironment.js';

const COLOR_GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.0 },
    uSaturation: { value: 1.02 },
    uShadowTint: { value: new THREE.Color(0xf8fbff) },
    uHighlightTint: { value: new THREE.Color(0xfffaf2) },
    uShadowLift: { value: 0.015 },
    uTexelSize: { value: new THREE.Vector2(1, 1) },
    uSharpenStrength: { value: 0.08 },
    uBloomStrength: { value: 0.06 },
    uBloomThreshold: { value: 1.05 },
    uVignetteStrength: { value: 0.03 },
  },
  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uContrast;
    uniform float uSaturation;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    uniform float uShadowLift;
    uniform vec2 uTexelSize;
    uniform float uSharpenStrength;
    uniform float uBloomStrength;
    uniform float uBloomThreshold;
    uniform float uVignetteStrength;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 center = color.rgb;
      vec3 sharpColor = center;

      if (uSharpenStrength > 0.0001 || uBloomStrength > 0.0001) {
        vec3 blur = (
          texture2D(tDiffuse, vUv + vec2(uTexelSize.x, 0.0)).rgb
          + texture2D(tDiffuse, vUv - vec2(uTexelSize.x, 0.0)).rgb
          + texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y)).rgb
          + texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y)).rgb
        ) * 0.25;
        sharpColor = max(center + (center - blur) * uSharpenStrength, vec3(0.0));
        sharpColor += max(blur - vec3(uBloomThreshold), vec3(0.0)) * uBloomStrength;
      }

      float luma = dot(sharpColor, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = mix(vec3(luma), sharpColor, uSaturation);

      graded = (graded - 0.5) * uContrast + 0.5;
      graded *= mix(uShadowTint, uHighlightTint, smoothstep(0.18, 0.82, luma));
      graded += uShadowLift * (1.0 - smoothstep(0.02, 0.42, luma));
      vec2 centeredUv = vUv * 2.0 - 1.0;
      float vignette = 1.0 - dot(centeredUv, centeredUv) * uVignetteStrength;
      graded *= clamp(vignette, 0.72, 1.0);

      gl_FragColor = vec4(max(graded, vec3(0.0)), color.a);
    }
  `,
};

const COPY_COLOR_DEPTH_SHADER = {
  uniforms: {
    tColor: { value: null },
    tDepth: { value: null },
  },
  vertexShader: `
    void main() {
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tColor;
    uniform sampler2D tDepth;

    void main() {
      ivec2 pixel = ivec2(gl_FragCoord.xy);
      gl_FragColor = texelFetch(tColor, pixel, 0);
      gl_FragDepth = texelFetch(tDepth, pixel, 0).r;
    }
  `,
};

export function configureRenderer(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = VISUAL_ENVIRONMENT.exposure;
}

export function createPostProcessing(
  renderer,
  scene,
  camera,
  quality,
  { waterRoots = [], bindWaterSceneBuffers = null } = {},
) {
  let singleLayerWaterEnabled = quality.water?.singleLayerWater === true;
  const composer = singleLayerWaterEnabled
    ? new EffectComposer(renderer, createComposerRenderTarget(renderer, true))
    : new EffectComposer(renderer);
  const rendererSize = renderer.getSize(new THREE.Vector2());
  const resolvedWaterRoots = waterRoots.filter(Boolean);
  let logicalWidth = rendererSize.x;
  let logicalHeight = rendererSize.y;
  let basePixelRatio = renderer.getPixelRatio();
  let activeQuality = quality;
  let resolutionScale = clampResolutionScale(1, activeQuality);
  let colorGradePass = null;
  let antiAliasingPass = null;

  composer.setPixelRatio(basePixelRatio * resolutionScale);
  applyQualityPreset(quality);

  return {
    composer,
    resize(width, height) {
      logicalWidth = Math.max(1, width);
      logicalHeight = Math.max(1, height);
      composer.setSize(logicalWidth, logicalHeight);
      syncPhysicalResolutions();
    },
    applyQualityPreset,
    setPixelRatio(nextPixelRatio) {
      basePixelRatio = Number.isFinite(nextPixelRatio)
        ? Math.max(0.1, nextPixelRatio)
        : 1;
      applyComposerResolution();
    },
    setResolutionScale(nextScale) {
      const clampedScale = clampResolutionScale(nextScale, activeQuality);

      if (clampedScale !== resolutionScale) {
        resolutionScale = clampedScale;
        applyComposerResolution();
      }

      return resolutionScale;
    },
    getResolutionScale() {
      return resolutionScale;
    },
    getResolutionScaleRange() {
      return activeQuality.resolution;
    },
    getTargetFrameMs() {
      return activeQuality.resolution?.targetFrameMs ?? 33.3;
    },
    getRenderSize(target = new THREE.Vector2()) {
      const { width, height } = getPhysicalRenderSize(
        logicalWidth,
        logicalHeight,
        basePixelRatio * resolutionScale,
      );

      return target.set(width, height);
    },
    render(deltaTime) {
      composer.render(deltaTime);
    },
    dispose() {
      clearPasses(composer);
      composer.dispose();
    },
  };

  function applyQualityPreset(nextQuality) {
    clearPasses(composer);
    colorGradePass = null;
    antiAliasingPass = null;
    activeQuality = nextQuality;
    resolutionScale = clampResolutionScale(resolutionScale, activeQuality);
    const nextSingleLayerWaterEnabled = nextQuality.water?.singleLayerWater === true;

    if (nextSingleLayerWaterEnabled !== singleLayerWaterEnabled) {
      singleLayerWaterEnabled = nextSingleLayerWaterEnabled;
      composer.reset(createComposerRenderTarget(renderer, singleLayerWaterEnabled));
    }

    composer.setPixelRatio(basePixelRatio * resolutionScale);

    const settings = nextQuality.postProcessing;

    for (const passName of getPostProcessingPassOrder(
      settings,
      singleLayerWaterEnabled,
    )) {
      if (passName === 'RenderPass') composer.addPass(new RenderPass(scene, camera));
      if (passName === 'BaseRenderPass') {
        composer.addPass(createBaseRenderPass(scene, camera, resolvedWaterRoots));
      }
      if (passName === 'WaterCompositePass') {
        composer.addPass(new WaterCompositePass(
          scene,
          camera,
          resolvedWaterRoots,
          bindWaterSceneBuffers,
        ));
      }
      if (passName === 'GTAOPass') composer.addPass(createGtaoPass(scene, camera, settings));
      if (passName === 'ColorGradePass') {
        colorGradePass = new ShaderPass(COLOR_GRADE_SHADER);
        colorGradePass.uniforms.uSharpenStrength.value = settings.sharpenStrength ?? 0;
        colorGradePass.uniforms.uBloomStrength.value = settings.bloomStrength ?? 0;
        colorGradePass.uniforms.uBloomThreshold.value = settings.bloomThreshold ?? 1;
        composer.addPass(colorGradePass);
      }
      if (passName === 'SMAAPass') {
        antiAliasingPass = new SMAAPass();
        composer.addPass(antiAliasingPass);
      }
      if (passName === 'OutputPass') composer.addPass(new OutputPass());
      if (passName === 'FXAAPass') {
        antiAliasingPass = new FXAAPass();
        composer.addPass(antiAliasingPass);
      }
    }

    composer.setSize(logicalWidth, logicalHeight);
    syncPhysicalResolutions();
  }

  function applyComposerResolution() {
    composer.setPixelRatio(basePixelRatio * resolutionScale);
    composer.setSize(logicalWidth, logicalHeight);
    syncPhysicalResolutions();
  }

  function syncPhysicalResolutions() {
    for (const target of [composer.renderTarget1, composer.renderTarget2]) {
      const depthTexture = target.depthTexture;

      if (
        depthTexture
        && (
          depthTexture.image.width !== target.width
          || depthTexture.image.height !== target.height
        )
      ) {
        depthTexture.image.width = target.width;
        depthTexture.image.height = target.height;
        depthTexture.needsUpdate = true;
      }
    }

    const { width, height } = getPhysicalRenderSize(
      logicalWidth,
      logicalHeight,
      basePixelRatio * resolutionScale,
    );
    const { x, y } = getPhysicalTexelSize(
      logicalWidth,
      logicalHeight,
      basePixelRatio * resolutionScale,
    );

    colorGradePass?.uniforms.uTexelSize.value.set(x, y);
    antiAliasingPass?.setSize(width, height);
  }
}

export function getPostProcessingPassOrder(settings, singleLayerWater = false) {
  return [
    ...(singleLayerWater
      ? ['BaseRenderPass', 'WaterCompositePass']
      : ['RenderPass']),
    ...(settings.gtao ? ['GTAOPass'] : []),
    'ColorGradePass',
    ...(settings.antiAliasing === 'smaa' ? ['SMAAPass'] : []),
    'OutputPass',
    ...(settings.antiAliasing === 'fxaa' ? ['FXAAPass'] : []),
  ];
}

export function createComposerRenderTarget(renderer, withDepthTexture) {
  const size = renderer.getSize(new THREE.Vector2());
  const depthTexture = withDepthTexture
    ? new THREE.DepthTexture(size.x, size.y, THREE.UnsignedIntType)
    : null;

  if (depthTexture) {
    depthTexture.format = THREE.DepthFormat;
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;
    depthTexture.generateMipmaps = false;
    depthTexture.name = 'EffectComposer.depth1';
  }

  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    depthTexture,
  });

  target.texture.name = 'EffectComposer.color1';
  return target;
}

export function createBaseRenderPass(scene, camera, waterRoots) {
  const pass = new RenderPass(scene, camera);
  const renderBase = pass.render.bind(pass);

  pass.render = (...args) => renderWithGtaoExclusions(
    waterRoots,
    () => renderBase(...args),
  );

  return pass;
}

export class WaterCompositePass extends Pass {
  constructor(scene, camera, waterRoots, bindSceneBuffers) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.waterRootSet = new Set(waterRoots);
    this.bindSceneBuffers = bindSceneBuffers;
    this.copyMaterial = new THREE.ShaderMaterial({
      ...COPY_COLOR_DEPTH_SHADER,
      uniforms: THREE.UniformsUtils.clone(COPY_COLOR_DEPTH_SHADER.uniforms),
      depthTest: true,
      depthFunc: THREE.AlwaysDepth,
      depthWrite: true,
      blending: THREE.NoBlending,
      toneMapped: false,
    });
    this.fullScreenQuad = new FullScreenQuad(this.copyMaterial);
    this.needsSwap = true;
  }

  render(renderer, writeBuffer, readBuffer) {
    if (!readBuffer.depthTexture || !writeBuffer.depthTexture) {
      throw new Error('WaterCompositePass requires composer depth textures.');
    }

    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousBackground = this.scene.background;
    const previousMatrixWorldAutoUpdate = this.scene.matrixWorldAutoUpdate;
    const previousShadowAutoUpdate = renderer.shadowMap?.autoUpdate;
    const nonWaterRoots = this.scene.children.filter(
      (child) => !this.waterRootSet.has(child),
    );
    const visibility = nonWaterRoots.map((root) => root.visible);

    try {
      this.copyMaterial.uniforms.tColor.value = readBuffer.texture;
      this.copyMaterial.uniforms.tDepth.value = readBuffer.depthTexture;
      renderer.setRenderTarget(writeBuffer);
      renderer.autoClear = false;
      this.fullScreenQuad.render(renderer);

      this.bindSceneBuffers?.({
        colorTexture: readBuffer.texture,
        depthTexture: readBuffer.depthTexture,
        width: readBuffer.width,
        height: readBuffer.height,
        camera: this.camera,
      });

      nonWaterRoots.forEach((root) => { root.visible = false; });
      this.scene.background = null;
      this.scene.matrixWorldAutoUpdate = false;
      if (renderer.shadowMap) renderer.shadowMap.autoUpdate = false;
      renderer.render(this.scene, this.camera);
    } finally {
      if (renderer.shadowMap) {
        renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      }
      this.scene.matrixWorldAutoUpdate = previousMatrixWorldAutoUpdate;
      this.scene.background = previousBackground;
      nonWaterRoots.forEach((root, index) => {
        root.visible = visibility[index];
      });
      renderer.autoClear = previousAutoClear;
      renderer.setRenderTarget(previousTarget);
    }
  }

  dispose() {
    this.copyMaterial.dispose();
    this.fullScreenQuad.dispose();
  }
}

export function getPhysicalTexelSize(width, height, effectivePixelRatio) {
  const renderSize = getPhysicalRenderSize(width, height, effectivePixelRatio);

  return { x: 1 / renderSize.width, y: 1 / renderSize.height };
}

export function getPhysicalRenderSize(width, height, effectivePixelRatio) {
  return {
    width: Math.max(1, Math.floor(width * effectivePixelRatio)),
    height: Math.max(1, Math.floor(height * effectivePixelRatio)),
  };
}

function createGtaoPass(scene, camera, settings) {
  const samples = Math.max(1, Math.round(settings.gtaoSamples ?? 8));
  const denoiseSamples = Math.max(1, Math.round(settings.gtaoDenoiseSamples ?? samples));
  const resolutionScale = THREE.MathUtils.clamp(settings.gtaoResolutionScale ?? 1, 0.25, 1);
  const pass = new GTAOPass(scene, camera, 1, 1, undefined, {
    radius: 2.6,
    distanceExponent: 1.6,
    thickness: 1.1,
    scale: 0.38,
    samples,
  }, {
    radius: 4,
    radiusExponent: 1.8,
    samples: denoiseSamples,
  });
  const resizeGtao = pass.setSize.bind(pass);
  const renderGtao = pass.render.bind(pass);
  const excludedRoots = getGtaoExcludedRoots(scene);

  pass.setSize = (width, height) => {
    resizeGtao(
      Math.max(1, Math.floor(width * resolutionScale)),
      Math.max(1, Math.floor(height * resolutionScale)),
    );
  };
  pass.render = (...args) => renderWithGtaoExclusions(
    excludedRoots,
    () => renderGtao(...args),
  );
  pass.output = GTAOPass.OUTPUT.Default;
  pass.blendIntensity = settings.gtaoIntensity ?? 0.32;

  return pass;
}

export function getGtaoExcludedRoots(scene) {
  const excludedRoots = [];

  scene.traverse((object) => {
    if (object.userData.excludeFromGtao === true) excludedRoots.push(object);
  });

  return excludedRoots;
}

export function renderWithGtaoExclusions(excludedRoots, render) {
  const visibility = excludedRoots.map((root) => root.visible);

  try {
    excludedRoots.forEach((root) => { root.visible = false; });
    return render();
  } finally {
    excludedRoots.forEach((root, index) => { root.visible = visibility[index]; });
  }
}

function clampResolutionScale(scale, quality) {
  const minScale = quality.resolution?.minScale ?? 1;
  const maxScale = quality.resolution?.maxScale ?? 1;
  const resolvedScale = Number.isFinite(scale) ? scale : maxScale;

  return THREE.MathUtils.clamp(resolvedScale, minScale, maxScale);
}

function clearPasses(composer) {
  for (const pass of composer.passes) {
    pass.dispose?.();
  }

  composer.passes.length = 0;
}
