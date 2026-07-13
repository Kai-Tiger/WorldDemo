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
    ['flowUv', 2],
    ['disturbanceMask', 1],
    ['waterFade', 1],
    ['junctionMask', 1],
    ['junctionFlowDirection', 2],
    ['viewDistance', 1],
  ]) {
    const type = itemSize === 2 ? 'vec2' : 'float';

    assert.match(material.vertexShader, new RegExp(`attribute ${type} ${attribute};`));
  }

  assert.match(material.fragmentShader, /smoothstep\(0\.35, 1\.8, vWaterDepth\)/);
  assert.match(material.fragmentShader, /smoothstep\(0\.12, 0\.85, perturbedShoreDistance\)/);
  assert.match(material.fragmentShader, /mix\(1\.0 \/ 2\.8, 1\.0, centerMask\)/);
  assert.match(material.fragmentShader, /float flowMeters = vFlowUv\.x - uTime \* localFlowSpeed;/);
  assert.match(material.fragmentShader, /mix\(0\.03, 0\.05, centerMask\)/);
  assert.match(material.fragmentShader, /mix\(0\.08, 0\.11, centerMask\)/);
  assert.match(material.fragmentShader, /mix\(0\.1, 0\.38, fresnel\)/);
  assert.doesNotMatch(material.fragmentShader, /junctionSpecularScale/);
  assert.match(material.fragmentShader, /float broadFlowTone = waterNoise/);
  assert.match(material.fragmentShader, /float localFlowTone = waterNoise2/);
  assert.match(material.fragmentShader, /float foamDriver = clamp/);
  assert.match(material.fragmentShader, /vRapidMask \* 0\.92/);
  assert.match(material.fragmentShader, /vJunctionMask \* 0\.18/);
  assert.match(material.fragmentShader, /float foam = foamDriver \* foamPattern/);
  assert.doesNotMatch(material.fragmentShader, /float broad = sin|float detail = sin/);
  assert.doesNotMatch(material.fragmentShader, /staticShoreFoam|foamThreads/);
  assert.doesNotMatch(material.fragmentShader, /DepthTexture|uDepthTexture|refraction/i);

  material.dispose();
});

test('flowing river material keeps Y junctions continuous and foam inside the shore fade', () => {
  const material = createFlowingRiverMaterial();

  assert.match(material.vertexShader, /varying vec2 vJunctionFlowDirection;/);
  assert.match(material.vertexShader, /varying vec2 vFlowUv;/);
  assert.match(material.fragmentShader, /float junctionBlend = smoothstep\(0\.0, 1\.0, vJunctionMask\);/);
  assert.match(material.fragmentShader, /float centerMask = mix\(stripCenterMask, 1\.0, junctionBlend\);/);
  assert.match(material.fragmentShader, /vec2 junctionDirection = normalize\(vJunctionFlowDirection\);/);
  assert.match(material.fragmentShader, /vec2 flowDomain = vec2\(flowMeters, vFlowUv\.y\);/);
  assert.match(material.fragmentShader, /vec3 normal = getFlowNormal\(flowDomain, surfaceFlowDirection, normalStrength\);/);
  assert.equal(material.fragmentShader.match(/getFlowTone\(flowDomain\)/g)?.length, 1);
  assert.equal(material.fragmentShader.match(/getFoamPattern\(flowDomain\)/g)?.length, 1);
  assert.doesNotMatch(material.fragmentShader, /normalize\(vFlowDirection\)/);
  assert.doesNotMatch(material.fragmentShader, /if \(vJunctionMask|junctionNormal|junctionFlowDomain|stripFlowDomain/);
  assert.match(material.fragmentShader, /float foam = foamDriver \* foamPattern \* shoreAlpha \* vWaterFade;/);
  assert.doesNotMatch(material.fragmentShader, /color \*= mix\(1\.0, 0\.82, junctionBlend\);/);
  assert.doesNotMatch(material.fragmentShader, /alpha \*= mix\(1\.0, 1\.12, junctionBlend\);/);
  assert.doesNotMatch(material.fragmentShader, /alpha = max\(alpha, foam \* 0\.62\);/);

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
