import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFlowingRiverMaterial,
} from '../src/flowingRiverMaterial.js';
import {
  FLOWING_RIVER_DEEP_COLOR,
  FLOWING_RIVER_FOAM_COLOR,
  FLOWING_RIVER_SEDIMENT_COLOR,
  FLOWING_RIVER_SHALLOW_COLOR,
} from '../src/waterPalette.js';

test('flowing river material consumes the terrain-aware river geometry contract', () => {
  const material = createFlowingRiverMaterial();

  for (const [attribute, itemSize] of [
    ['waterDepth', 1],
    ['shoreDistance', 1],
    ['flowSpeed', 1],
    ['rapidMask', 1],
    ['flowDirection', 2],
    ['disturbanceMask', 1],
    ['waterFade', 1],
    ['junctionMask', 1],
    ['viewDistance', 1],
  ]) {
    const type = itemSize === 2 ? 'vec2' : 'float';

    assert.match(material.vertexShader, new RegExp(`attribute ${type} ${attribute};`));
  }

  assert.match(material.fragmentShader, /smoothstep\(0\.35, 1\.8, vWaterDepth\)/);
  assert.match(material.fragmentShader, /smoothstep\(0\.12, 0\.85, perturbedShoreDistance\)/);
  assert.match(material.fragmentShader, /mix\(1\.0 \/ 2\.8, 1\.0, centerMask\)/);
  assert.match(material.fragmentShader, /float flowMeters = vUv\.x - uTime \* localFlowSpeed;/);
  assert.match(material.fragmentShader, /mix\(0\.03, 0\.05, centerMask\)/);
  assert.match(material.fragmentShader, /mix\(0\.08, 0\.11, centerMask\)/);
  assert.match(material.fragmentShader, /mix\(0\.1, 0\.38, fresnel\)/);
  assert.match(material.fragmentShader, /float broadFlowTone = waterNoise/);
  assert.match(material.fragmentShader, /float localFlowTone = waterNoise2/);
  assert.match(material.fragmentShader, /float foamDriver = clamp/);
  assert.match(material.fragmentShader, /vRapidMask \* 0\.92/);
  assert.match(material.fragmentShader, /vJunctionMask \* 0\.72/);
  assert.match(material.fragmentShader, /float foam = foamDriver \* foamBody \* foamBreaks/);
  assert.doesNotMatch(material.fragmentShader, /float broad = sin|float detail = sin/);
  assert.doesNotMatch(material.fragmentShader, /staticShoreFoam|foamThreads/);
  assert.doesNotMatch(material.fragmentShader, /DepthTexture|uDepthTexture|refraction/i);

  material.dispose();
});

test('flowing river material uses the fixed forest river palette', () => {
  const material = createFlowingRiverMaterial();

  assert.equal(material.uniforms.uShallowColor.value.getHex(), FLOWING_RIVER_SHALLOW_COLOR);
  assert.equal(material.uniforms.uDeepColor.value.getHex(), FLOWING_RIVER_DEEP_COLOR);
  assert.equal(material.uniforms.uFoamColor.value.getHex(), FLOWING_RIVER_FOAM_COLOR);
  assert.equal(material.uniforms.uSedimentColor.value.getHex(), FLOWING_RIVER_SEDIMENT_COLOR);
  assert.equal(FLOWING_RIVER_SHALLOW_COLOR, 0x61776c);
  assert.equal(FLOWING_RIVER_DEEP_COLOR, 0x172f39);
  assert.equal(FLOWING_RIVER_FOAM_COLOR, 0xd7e1dc);
  assert.equal(FLOWING_RIVER_SEDIMENT_COLOR, 0x858575);

  material.dispose();
});
