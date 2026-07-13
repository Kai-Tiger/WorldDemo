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
  assert.match(material.fragmentShader, /float primaryFlowMeters = vFlowUv\.x - uTime \* 0\.85;/);
  assert.match(material.fragmentShader, /float detailFlowMeters = vFlowUv\.x - uTime \* 1\.15;/);
  assert.match(material.fragmentShader, /vec2 primaryFlowDomain = vec2\(primaryFlowMeters, vFlowUv\.y\);/);
  assert.match(material.fragmentShader, /-vFlowUv\.y \+ 7\.6/);
  assert.doesNotMatch(material.fragmentShader, /centerSpeedScale|localFlowSpeed/);
  assert.doesNotMatch(material.fragmentShader, /uTime \* (?:vFlowSpeed|centerMask)/);
  assert.match(material.fragmentShader, /mix\(0\.03, 0\.05, centerMask\)/);
  assert.match(material.fragmentShader, /mix\(0\.075, 0\.095, centerMask\)/);
  assert.match(material.fragmentShader, /vec3 reflectedEnergy = waterFresnel \* foamSpecularAttenuation;/);
  assert.match(material.fragmentShader, /color = color \* \(1\.0 - reflectedEnergy\) \+ reflection \* reflectedEnergy;/);
  assert.doesNotMatch(material.fragmentShader, /junctionSpecularScale/);
  assert.match(material.fragmentShader, /float broadFlowTone = waterNoise/);
  assert.match(material.fragmentShader, /float localFlowTone = waterNoise/);
  assert.match(material.fragmentShader, /primaryFlowDomain \* vec2\(0\.11, 0\.30\)/);
  assert.match(material.fragmentShader, /detailFlowDomain \* vec2\(0\.24, 0\.68\)/);
  assert.match(material.fragmentShader, /-0\.03,\s+0\.04/);
  assert.match(material.fragmentShader, /flowTone \* mix\(1\.0, 0\.55, depthMask\)/);
  assert.match(material.fragmentShader, /max\(vRapidMask, vJunctionMask \* 0\.35\)/);
  assert.match(material.fragmentShader, /normalize\(cross\(\s+dFdx\(vWorldPosition\),\s+dFdy\(vWorldPosition\)\s+\)\)/);
  assert.match(material.fragmentShader, /flowTangent - geometricNormal \* dot\(flowTangent, geometricNormal\)/);
  assert.match(material.fragmentShader, /cross\(flowTangent, geometricNormal\)/);
  assert.match(material.fragmentShader, /if \(!gl_FrontFacing\) \{\s+normal = -normal;/);
  assert.match(material.fragmentShader, /clamp\(abs\(normal\.y\), 0\.0, 1\.0\)/);
  assert.match(material.fragmentShader, /float distributionGGX\(/);
  assert.match(material.fragmentShader, /float visibilitySmithGGXCorrelated\(/);
  assert.match(material.fragmentShader, /vec3 fresnelSchlick\(/);
  assert.match(material.fragmentShader, /vec3 waterF0 = vec3\(0\.02037\);/);
  assert.match(material.fragmentShader, /vec3 normalDx = dFdx\(normal\);/);
  assert.match(material.fragmentShader, /vec3 normalDy = dFdy\(normal\);/);
  assert.match(material.fragmentShader, /float calmRoughness = mix\(0\.24, 0\.18, centerMask\);/);
  assert.match(material.fragmentShader, /float rapidRoughness = mix\(0\.36, 0\.28, centerMask\);/);
  assert.match(material.fragmentShader, /roughness = mix\(roughness, 0\.72, foam\);/);
  assert.match(material.fragmentShader, /evaluateWaterSpecular\(/);
  assert.match(material.fragmentShader, /\* uSunReflectionColor \* uSunIntensity;/);
  assert.doesNotMatch(material.fragmentShader, /pow\(max\(dot\(normal, halfDirection\)/);
  assert.match(material.fragmentShader, /float foamDriver = clamp/);
  assert.match(material.fragmentShader, /vRapidMask \* 0\.72/);
  assert.match(material.fragmentShader, /vJunctionMask \* 0\.10/);
  assert.match(material.fragmentShader, /smoothstep\(0\.18, 0\.58, vDisturbanceMask\)/);
  assert.match(material.fragmentShader, /primaryFlowDomain \* vec2\(0\.18, 0\.55\)/);
  assert.match(material.fragmentShader, /detailFlowDomain \* vec2\(0\.42, 1\.10\)/);
  assert.match(material.fragmentShader, /float foam = foamDriver \* foamPattern/);
  assert.match(material.fragmentShader, /mix\(color, uFoamColor, foam \* 0\.58\)/);
  assert.match(material.fragmentShader, /foam \* \(1\.0 - alpha\) \* 0\.35/);
  assert.match(material.fragmentShader, /float foamSpecularAttenuation = 1\.0 - foam \* 0\.9;/);
  assert.match(material.fragmentShader, /color \+= directSpecular \* foamSpecularAttenuation;/);
  assert.equal(material.fragmentShader.match(/vDisturbanceMask/g)?.length, 2);
  assert.doesNotMatch(material.fragmentShader, /float broad = sin|float detail = sin/);
  assert.doesNotMatch(material.fragmentShader, /staticShoreFoam|foamThreads/);
  assert.doesNotMatch(material.fragmentShader, /featureMask/);
  assert.doesNotMatch(material.fragmentShader, /DepthTexture|uDepthTexture|refraction/i);

  material.dispose();
});

test('flowing river reflection samples only the selected tier', () => {
  const material = createFlowingRiverMaterial();
  const shader = material.fragmentShader;
  const planarBranch = shader.indexOf('if (uWaterReflectionMode > 1.5)');
  const probeBranch = shader.indexOf('else if (uWaterReflectionMode > 0.5)');
  const environmentBranch = shader.indexOf('else {', probeBranch);

  assert.ok(planarBranch > -1);
  assert.ok(probeBranch > planarBranch);
  assert.ok(environmentBranch > probeBranch);
  assert.ok(shader.indexOf('uWaterPlanarReflection', planarBranch) < probeBranch);
  assert.ok(shader.indexOf('uWaterReflectionProbe', probeBranch) < environmentBranch);
  assert.ok(shader.indexOf('uWaterEnvironmentMap', environmentBranch) > environmentBranch);
  assert.doesNotMatch(shader, /vec3 environmentReflection|vec3 probeReflection|vec3 planarReflection/);
  assert.equal(shader.match(/texture2DProj\(/g)?.length, 1);
  assert.equal(shader.match(/textureCube\(/g)?.length, 1);

  material.dispose();
});

test('flowing river material keeps Y junctions continuous and foam inside the shore fade', () => {
  const material = createFlowingRiverMaterial();

  assert.match(material.vertexShader, /varying vec2 vJunctionFlowDirection;/);
  assert.match(material.vertexShader, /varying vec2 vFlowUv;/);
  assert.match(material.fragmentShader, /float junctionBlend = smoothstep\(0\.0, 1\.0, vJunctionMask\);/);
  assert.match(material.fragmentShader, /float centerMask = mix\(stripCenterMask, 1\.0, junctionBlend\);/);
  assert.match(material.fragmentShader, /vec2 junctionDirection = normalize\(vJunctionFlowDirection\);/);
  assert.match(material.fragmentShader, /vec2 primaryFlowDomain = vec2\(primaryFlowMeters, vFlowUv\.y\);/);
  assert.match(material.fragmentShader, /vec3 normal = getFlowNormal\(\s+primaryFlowDomain,\s+detailFlowDomain,/);
  assert.equal(material.fragmentShader.match(/getFlowTone\(primaryFlowDomain, detailFlowDomain\)/g)?.length, 1);
  assert.match(material.fragmentShader, /getFoamPattern\(\s+primaryFlowDomain,\s+detailFlowDomain\s+\)/);
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
