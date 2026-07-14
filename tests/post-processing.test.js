import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
  AerialPerspectivePass,
  applyAerialPerspectiveFog,
  createComposerRenderTarget,
  getGtaoExcludedRoots,
  getPhysicalRenderSize,
  getPhysicalTexelSize,
  getPostProcessingPassOrder,
  renderWithGtaoExclusions,
} from '../src/postProcessing.js';
import {
  getShadowCameraFit,
  getShadowCameraSize,
  RENDER_QUALITY_PRESETS,
} from '../src/renderQuality.js';

test('every quality tier resolves unified water before grading and AA', async () => {
  assert.deepEqual(
    getPostProcessingPassOrder(RENDER_QUALITY_PRESETS.performance.postProcessing),
    ['BaseRenderPass', 'UnifiedWaterPass', 'ColorGradePass', 'OutputPass', 'FXAAPass'],
  );
  assert.deepEqual(
    getPostProcessingPassOrder(RENDER_QUALITY_PRESETS.balanced.postProcessing),
    ['BaseRenderPass', 'UnifiedWaterPass', 'GTAOPass', 'AerialPerspectivePass', 'ColorGradePass', 'SMAAPass', 'OutputPass'],
  );
  assert.deepEqual(
    getPostProcessingPassOrder(RENDER_QUALITY_PRESETS.quality.postProcessing),
    ['BaseRenderPass', 'UnifiedWaterPass', 'GTAOPass', 'AerialPerspectivePass', 'ColorGradePass', 'SMAAPass', 'OutputPass'],
  );

  const source = await readFile(new URL('../src/postProcessing.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /TAARenderPass/);
  assert.match(source, /SMAAPass/);
  assert.match(source, /uBloomThreshold/);
  assert.match(source, /setResolutionScale/);
  assert.match(source, /getResolutionScaleRange/);
  assert.match(source, /getTargetFrameMs/);
  assert.match(source, /depthTexture\.image\.width = target\.width/);
});

test('all composer ping-pong targets use independent depth textures', () => {
  const renderer = {
    getSize(target) {
      return target.set(100, 80);
    },
  };
  const firstTarget = createComposerRenderTarget(renderer);
  const secondTarget = firstTarget.clone();

  assert.equal(firstTarget.texture.type, THREE.HalfFloatType);
  assert.equal(firstTarget.depthTexture.isDepthTexture, true);
  assert.equal(secondTarget.depthTexture.isDepthTexture, true);
  assert.equal(firstTarget.depthTexture.format, THREE.DepthFormat);
  assert.equal(firstTarget.depthTexture.type, THREE.UnsignedIntType);
  assert.equal(firstTarget.depthTexture.minFilter, THREE.NearestFilter);
  assert.notEqual(secondTarget.depthTexture, firstTarget.depthTexture);
  assert.equal(secondTarget.width, firstTarget.width);
  assert.equal(secondTarget.height, firstTarget.height);

  firstTarget.dispose();
  secondTarget.dispose();
});

test('aerial perspective reuses base depth, reconstructs world position, and preserves sky', () => {
  const camera = new THREE.PerspectiveCamera(60, 1.5, 0.25, 1800);
  const depthTexture = new THREE.DepthTexture(64, 48);
  const colorTexture = new THREE.Texture();
  const writeBuffer = { name: 'write' };
  const readBuffer = { texture: colorTexture };
  const targets = [];
  let renders = 0;

  camera.position.set(12, 48, -20);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const pass = new AerialPerspectivePass(camera);
  pass.bindSceneDepth(depthTexture);
  pass.render({
    setRenderTarget(target) {
      targets.push(target);
    },
    render() {
      renders += 1;
    },
  }, writeBuffer, readBuffer);

  assert.deepEqual(targets, [writeBuffer]);
  assert.equal(renders, 1);
  assert.equal(pass.material.uniforms.tDiffuse.value, colorTexture);
  assert.equal(pass.material.uniforms.tDepth.value, depthTexture);
  assert.deepEqual(
    pass.material.uniforms.uCameraPosition.value.toArray(),
    camera.position.toArray(),
  );
  assert.match(pass.material.fragmentShader, /uProjectionMatrixInverse/);
  assert.match(pass.material.fragmentShader, /uCameraWorldMatrix/);
  assert.match(pass.material.fragmentShader, /depth >= 0\.99999/);
  assert.match(pass.material.fragmentShader, /averageHeight/);
  assert.match(pass.material.fragmentShader, /sunAlignment/);
  assert.equal(pass.material.uniforms.uNearClearDistance.value, 180);
  assert.equal(pass.material.uniforms.uFullDensityDistance.value, 900);
  assert.equal(pass.material.uniforms.uMinimumHeightDensity.value, 0.18);
  assert.match(pass.material.fragmentShader, /smoothstep\(\s*uNearClearDistance,\s*uFullDensityDistance,\s*viewDistance/);
  assert.match(pass.material.fragmentShader, /max\(viewDistance - uNearClearDistance, 0\.0\)/);
  assert.match(pass.material.fragmentShader, /uMaxOpacity \* \(\s*1\.0 - exp\(-opticalDepth \/ max\(uMaxOpacity, 0\.0001\)\)/);
  assert.match(pass.material.fragmentShader, /mix\(scatterColor, uMieColor, mieWeight\)/);
  assert.doesNotMatch(pass.material.fragmentShader, /scatterColor \+= uMieColor/);

  pass.dispose();
  depthTexture.dispose();
  colorTexture.dispose();
});

test('aerial perspective disables Exp2 fog and performance restores it', () => {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x719bb7, 0.00030);

  applyAerialPerspectiveFog(scene, true);
  assert.equal(scene.fog.density, 0);

  applyAerialPerspectiveFog(scene, false);
  assert.equal(scene.fog.density, 0.00030);
});

test('color-grade texel size follows scaled composer physical dimensions', () => {
  assert.deepEqual(getPhysicalTexelSize(100, 80, 1), { x: 1 / 100, y: 1 / 80 });
  assert.deepEqual(getPhysicalTexelSize(100, 80, 1.25), { x: 1 / 125, y: 1 / 100 });
  assert.deepEqual(getPhysicalTexelSize(100, 80, 1.25 * 0.75), { x: 1 / 93, y: 1 / 75 });
  assert.deepEqual(getPhysicalRenderSize(100, 80, 1.25 * 0.75), { width: 93, height: 75 });
});

test('pre-tonemap grading preserves terrain shadows with neutral contrast and restrained vignette', async () => {
  const source = await readFile(new URL('../src/postProcessing.js', import.meta.url), 'utf8');

  assert.match(source, /uContrast:\s*\{ value: 1\.0 \}/);
  assert.match(source, /uSaturation:\s*\{ value: 1\.03 \}/);
  assert.match(source, /uShadowLift:\s*\{ value: 0\.012 \}/);
  assert.match(source, /uShadowTint:\s*\{ value: new THREE\.Color\(0xf8fbff\) \}/);
  assert.match(source, /uHighlightTint:\s*\{ value: new THREE\.Color\(0xfffaf2\) \}/);
  assert.match(source, /uVignetteStrength:\s*\{ value: 0\.03 \}/);
});

test('GTAO temporarily hides only explicitly excluded roots and always restores visibility', () => {
  const scene = new THREE.Scene();
  const water = new THREE.Group();
  const foam = new THREE.Group();
  const grass = new THREE.Group();

  water.userData.excludeFromGtao = true;
  foam.userData.excludeFromGtao = true;
  foam.visible = false;
  scene.add(water, foam, grass);

  const excludedRoots = getGtaoExcludedRoots(scene);

  assert.deepEqual(excludedRoots, [water, foam]);
  assert.throws(() => renderWithGtaoExclusions(excludedRoots, () => {
    assert.equal(water.visible, false);
    assert.equal(foam.visible, false);
    assert.equal(grass.visible, true);
    throw new Error('render failed');
  }), /render failed/);
  assert.equal(water.visible, true);
  assert.equal(foam.visible, false);
  assert.equal(grass.visible, true);
});

test('quality presets lock resolution, AA, AO, streaming and shadow budgets', () => {
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.pixelRatioCap),
    [1, 1.25, 1.5],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.resolution),
    [
      { minScale: 0.7, maxScale: 1, targetFrameMs: 33.3 },
      { minScale: 0.75, maxScale: 1, targetFrameMs: 33.3 },
      { minScale: 0.85, maxScale: 1, targetFrameMs: 33.3 },
    ],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.postProcessing.antiAliasing),
    ['fxaa', 'smaa', 'smaa'],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.postProcessing.gtaoSamples),
    [0, 6, 12],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.postProcessing.gtaoIntensity),
    [0, 0.20, 0.24],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.postProcessing.aerialPerspective),
    [false, true, true],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.streamingBudgets.totalMs),
    [3, 4, 5],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.shadows.mapSize),
    [1024, 2048, 2048],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => getShadowCameraSize(preset.shadows)),
    [360, 520, 840],
  );
  const sunDirection = new THREE.Vector3(0.48, 0.48, 0.73).normalize();
  const shadowFits = Object.values(RENDER_QUALITY_PRESETS).map((preset) => (
    getShadowCameraFit(preset.shadows, sunDirection, -40, 340, 0.5)
  ));

  for (const fit of shadowFits) {
    const horizontalSunLength = Math.hypot(sunDirection.x, sunDirection.z);
    const projectedHeight = 190.5 * horizontalSunLength;

    assert.equal(fit.centerY, 150);
    assert.ok(fit.halfWidth >= fit.cameraSize * 0.5 + 0.5);
    assert.ok(fit.halfHeight >= fit.halfWidth * Math.abs(sunDirection.y) + projectedHeight);
    assert.ok(fit.halfDepth >= fit.halfWidth * horizontalSunLength + 190.5 * Math.abs(sunDirection.y));
  }
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.terrain.lodSegments),
    [[128, 64], [256, 128, 64], [256, 128, 64]],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.water.reflectionMode),
    ['environment', 'probe', 'planar'],
  );
  assert.ok(
    Object.values(RENDER_QUALITY_PRESETS).every(
      (preset) => !('singleLayerWater' in preset.water),
    ),
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.water.waterInfoPrecision),
    ['packed', 'high', 'high'],
  );
  assert.deepEqual(
    Object.values(RENDER_QUALITY_PRESETS).map((preset) => preset.water.refractionPixels),
    [0, 2, 3],
  );
});

test('render entry gates capture buffers and adapts only internal resolution', async () => {
  const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');

  assert.match(source, /preserveDrawingBuffer:\s*query\.get\('capture'\) === '1'/);
  assert.match(source, /requestAnimationFrame\(animate\)/);
  assert.match(source, /DYNAMIC_RESOLUTION/);
  assert.match(source, /postProcessing\.setResolutionScale/);
  assert.match(source, /const \{ surfaceRoot, effectsRoot \} = unifiedWaterSystem;/);
  assert.match(source, /surfaceRoot,[\s\S]*?effectsRoot,/);
  assert.match(source, /resolveMaterial: postProcessing\.getWaterResolveMaterial\(\)/);
  assert.doesNotMatch(source, /bindWaterSceneBuffers|bindSceneBuffers|singleLayerWater/);
  assert.match(source, /aerialPerspective: quality\.postProcessing\.aerialPerspective/);
  assert.match(source, /Lighting the clear alpine morning/);
  assert.doesNotMatch(source, /renderer\.setPixelRatio\([^\n]*resolutionScale/);
});
