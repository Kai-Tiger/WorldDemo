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
  assert.match(material.fragmentShader, /smoothstep\(\s+0\.03,\s+0\.32,\s+vShoreDistance \+ foamShoreNoise\s+\)/);
  assert.match(material.fragmentShader, /float primaryFlowMeters = vFlowUv\.x - uTime \* 0\.85;/);
  assert.match(material.fragmentShader, /float detailFlowMeters = vFlowUv\.x - uTime \* 1\.15;/);
  assert.match(material.fragmentShader, /vec2 macroFlowDomain = vec2\(primaryFlowMeters, vFlowUv\.y\);/);
  assert.match(material.fragmentShader, /0\.89100652,\s+0\.45399050/);
  assert.match(material.fragmentShader, /0\.85716730,\s+-0\.51503807/);
  assert.doesNotMatch(material.fragmentShader, /centerSpeedScale|localFlowSpeed/);
  assert.doesNotMatch(material.fragmentShader, /uTime \* (?:vFlowSpeed|centerMask)/);
  assert.match(material.fragmentShader, /mix\(0\.055, 0\.075, centerMask\)/);
  assert.match(material.fragmentShader, /mix\(0\.13, 0\.16, centerMask\)/);
  assert.match(material.fragmentShader, /maximumSurfaceSlope = mix\(0\.14, 0\.25, normalFeatureMask\)/);
  assert.match(material.fragmentShader, /vec3 reflectedEnergy = waterFresnel \* foamSpecularAttenuation \* 0\.26;/);
  assert.match(material.fragmentShader, /volume \* \(1\.0 - reflectedEnergy\)\s+\+ reflection \* reflectedEnergy/);
  assert.doesNotMatch(material.fragmentShader, /junctionSpecularScale/);
  assert.match(material.fragmentShader, /float broadFlowTone = waterNoise/);
  assert.match(material.fragmentShader, /float localFlowTone = waterNoise/);
  assert.match(material.fragmentShader, /macroFlowDomain \* vec2\(0\.14, 0\.32\)/);
  assert.match(material.fragmentShader, /middleFlowDomain \* vec2\(0\.75, 1\.60\)/);
  assert.match(material.fragmentShader, /microFlowDomain \* vec2\(2\.20, 4\.20\)/);
  assert.match(material.fragmentShader, /-0\.05,\s+0\.08/);
  assert.match(material.fragmentShader, /flowTone \* mix\(0\.75, 0\.55, depthMask\)/);
  assert.match(material.fragmentShader, /max\(vRapidMask, vJunctionMask \* 0\.35\)/);
  assert.match(material.vertexShader, /vWorldNormal = normalize\(mat3\(modelMatrix\) \* normal\);/);
  assert.match(material.fragmentShader, /vec3 geometricNormal = normalize\(vWorldNormal\);/);
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
  assert.match(material.fragmentShader, /float macroRoughness = mix\(0\.22, 0\.32, rapidSurface\);/);
  assert.match(material.fragmentShader, /float microRoughness = mix\(0\.09, 0\.12, rapidSurface\);/);
  assert.match(material.fragmentShader, /mix\(macroRoughness, 0\.78, foam\)/);
  assert.match(material.fragmentShader, /mix\(microRoughness, 0\.82, foam\)/);
  assert.match(material.fragmentShader, /evaluateWaterSpecular\(/);
  assert.match(material.fragmentShader, /macroSpecular \* 0\.65\s+\+ microSpecular \* 0\.35/);
  assert.match(material.fragmentShader, /mix\(\s+vec3\(1\.0\),\s+uSunReflectionColor,\s+0\.35\s+\)/);
  assert.match(material.fragmentShader, /directSpecular \/= vec3\(1\.0\) \+ directSpecular \/ 1\.35;/);
  assert.doesNotMatch(material.fragmentShader, /pow\(max\(dot\(normal, halfDirection\)/);
  assert.match(material.fragmentShader, /float baseFoamDriver = clamp/);
  assert.match(material.fragmentShader, /smoothstep\(0\.08, 0\.82, vRapidMask\)/);
  assert.match(material.fragmentShader, /hydraulicSupport = shallowFoamSupport\s+\* movingFoamSupport\s+\* 0\.22/);
  assert.match(material.fragmentShader, /vJunctionMask \* 0\.08/);
  const baseFoamDriverSource = material.fragmentShader.slice(
    material.fragmentShader.indexOf('float baseFoamDriver = clamp('),
    material.fragmentShader.indexOf('float wakeHydraulic ='),
  );
  assert.doesNotMatch(baseFoamDriverSource, /vDisturbanceMask/);
  assert.match(material.fragmentShader, /macroFlowDomain \* vec2\(0\.28, 0\.82\)/);
  assert.match(material.fragmentShader, /float foamMass = smoothstep\(\s+0\.46,\s+0\.82,/);
  assert.match(material.fragmentShader, /middleFlowDomain \* vec2\(0\.75, 1\.80\)/);
  assert.match(material.fragmentShader, /float foamBreakup = smoothstep\(\s+0\.36,\s+0\.78,/);
  assert.match(material.fragmentShader, /microFlowDomain \* vec2\(1\.55, 3\.20\)/);
  assert.match(material.fragmentShader, /float foamPattern = foamMass \* foamBreakup;/);
  assert.doesNotMatch(material.fragmentShader, /foamMass \* mix\(/);
  assert.match(material.fragmentShader, /foamPattern \*= mix\(0\.18, 1\.0, foamFleck\);/);
  assert.match(material.fragmentShader, /foamPattern \+= foamMass \* foamFleck \* 0\.10;/);
  assert.match(material.fragmentShader, /float getWakePattern\(/);
  assert.match(material.fragmentShader, /anchoredFlowDomain \* vec2\(0\.72, 3\.60\)/);
  assert.match(material.fragmentShader, /float wakeHydraulic = max\(/);
  assert.match(material.fragmentShader, /smoothstep\(0\.28, 0\.72, vRapidMask\)/);
  assert.match(material.fragmentShader, /float wakeEnvelope = smoothstep\(0\.04, 0\.14, vDisturbanceMask\);/);
  assert.match(material.fragmentShader, /float wakeShelter = smoothstep\(0\.18, 0\.34, vDisturbanceMask\);/);
  assert.match(material.fragmentShader, /1\.0 - wakeShelter/);
  assert.match(material.fragmentShader, /float wakePattern = getWakePattern\(vFlowUv, foamPattern\);/);
  assert.match(material.fragmentShader, /\* \(1\.0 - wakeEnvelope \* wakeHydraulic\)/);
  assert.match(material.fragmentShader, /float wakeFoamMask = wakeShear \* wakePattern \* 0\.38;/);
  assert.match(material.fragmentShader, /float foam = foamMask;/);
  assert.match(material.fragmentShader, /float foamCore = foamCoreMask;/);
  assert.match(
    material.fragmentShader,
    /baseFoamMask \* 0\.50\s+\+ foamCore \* 0\.36\s+\+ wakeFoamMask \* 0\.28/,
  );
  assert.match(material.fragmentShader, /0\.0,\s+0\.86/);
  assert.match(material.fragmentShader, /float foamSpecularAttenuation = 1\.0 - foam \* 0\.88;/);
  assert.match(material.fragmentShader, /color \+= directSpecular \* foamSpecularAttenuation \* 0\.40;/);
  assert.equal(material.fragmentShader.match(/vDisturbanceMask/g)?.length, 3);
  assert.doesNotMatch(material.fragmentShader, /float broad = sin|float detail = sin/);
  assert.doesNotMatch(material.fragmentShader, /ridge/i);
  assert.doesNotMatch(material.fragmentShader, /staticShoreFoam|foamThreads/);
  assert.doesNotMatch(material.fragmentShader, /featureMask/);
  assert.equal(material.uniforms.uSceneColor.value, null);
  assert.equal(material.uniforms.uSceneDepth.value, null);
  assert.deepEqual(material.uniforms.uSceneResolution.value.toArray(), [1, 1]);
  assert.equal(material.uniforms.uRefractionPixels.value, 0);
  assert.deepEqual(
    material.uniforms.uTerminalLakeBoundary.value.toArray(),
    [690, -340, 20, 4],
  );
  assert.match(material.fragmentShader, /uniform vec4 uTerminalLakeBoundary;/);
  assert.match(material.fragmentShader, /float terminalLakeSignedDistance = distance\(/);
  assert.match(material.fragmentShader, /float terminalLakeFade = smoothstep\(/);
  assert.match(material.fragmentShader, /float effectiveWaterFade = min\(vWaterFade, terminalLakeFade\);/);
  assert.match(
    material.fragmentShader,
    /if \(effectiveWaterFade <= 0\.0001\) \{\s+discard;\s+\}/,
  );
  assert.equal(material.defines.USE_SINGLE_LAYER_WATER, undefined);

  material.dispose();
});

test('flowing river single-layer optics validates depth and composites coverage once', () => {
  const material = createFlowingRiverMaterial();
  const vertexShader = material.vertexShader;
  const fragmentShader = material.fragmentShader;

  assert.match(vertexShader, /varying float vWaterViewDepth;/);
  assert.match(vertexShader, /vWaterViewDepth = -viewPosition\.z;/);
  assert.match(fragmentShader, /#ifdef USE_SINGLE_LAYER_WATER/);
  assert.match(fragmentShader, /uniform sampler2D uSceneColor;/);
  assert.match(fragmentShader, /uniform sampler2D uSceneDepth;/);
  assert.match(fragmentShader, /float getLinearViewDepth\(float depth\)/);
  assert.match(fragmentShader, /uCameraFar\s+- depth \* \(uCameraFar - uCameraNear\)/);
  assert.match(fragmentShader, /vec3 viewNormal = normalize\(mat3\(viewMatrix\) \* surfaceNormal\);/);
  assert.match(fragmentShader, /vec2 safeMinimum = inverseResolution \* 0\.5;/);
  assert.match(fragmentShader, /float depthIsBehindWater = step\(/);
  assert.match(fragmentShader, /1\.0 - step\(0\.999999, refractedRawDepth\)/);
  assert.match(fragmentShader, /float depthContinuity = 1\.0 - step\(/);
  assert.match(fragmentShader, /max\(vWaterDepth, 0\.0\) \/ surfaceFacing/);
  assert.match(fragmentShader, /0\.0,\s+6\.0/);
  assert.match(fragmentShader, /vec3 absorption = vec3\(0\.28, 0\.11, 0\.055\);/);
  assert.match(fragmentShader, /vec3 scattering = vec3\(0\.014, 0\.028, 0\.040\);/);
  assert.match(fragmentShader, /mix\(uDeepColor, uShallowColor, 0\.50\)/);
  assert.match(fragmentShader, /transmittance = exp\(/);
  assert.match(fragmentShader, /const float phaseG = 0\.15;/);
  assert.match(fragmentShader, /return refractedScene \* transmittance/);
  assert.match(fragmentShader, /out float waterThickness/);
  assert.match(fragmentShader, /waterThickness = clamp\(opticalPathLength, 0\.0, 6\.0\);/);
  assert.match(fragmentShader, /vec3 volume = getSingleLayerWaterVolume\(/);
  assert.match(fragmentShader, /float depthCoverage = mix\(\s+0\.78,\s+1\.0,/);
  assert.match(fragmentShader, /max\(\s+shoreAlpha \* depthCoverage,\s+foamShoreAlpha \* foamCoverage\s+\) \* effectiveWaterFade \* viewDistanceFade/);
  assert.match(fragmentShader, /mix\(undistortedScene, foggedWaterColor, coverage\),\s+1\.0/);
  assert.doesNotMatch(fragmentShader, /mix\(undistortedScene, foggedWaterColor, alpha\)/);
  assert.match(fragmentShader, /gl_FragColor = vec4\(foggedWaterColor, alpha\);/);
  assert.match(fragmentShader, /foamShoreAlpha \* foamCoverage \* \(1\.0 - alpha\) \* 0\.55/);
  assert.match(fragmentShader, /alpha \*= effectiveWaterFade \* viewDistanceFade;/);
  assert.doesNotMatch(fragmentShader, /gl_FragColor = vec4\(color, alpha\);/);

  material.dispose();
});

test('flowing river reflection always samples the procedural environment', () => {
  const material = createFlowingRiverMaterial();
  const shader = material.fragmentShader;

  assert.match(shader, /vec3 getFlowingWaterReflection\(/);
  assert.match(shader, /texture2D\(\s+uWaterEnvironmentMap,\s+waterEquirectUv\(reflectionDirection\)\s+\)/);
  assert.match(shader, /vec3 reflection = getFlowingWaterReflection\(/);
  assert.doesNotMatch(shader, /getTieredWaterReflection/);
  assert.doesNotMatch(shader, /uWaterReflectionProbe|uWaterPlanarReflection/);
  assert.doesNotMatch(shader, /textureCube|texture2DProj/);

  material.dispose();
});

test('flowing river material keeps Y junctions continuous and foam inside the shore fade', () => {
  const material = createFlowingRiverMaterial();

  assert.match(material.vertexShader, /varying vec2 vJunctionFlowDirection;/);
  assert.match(material.vertexShader, /varying vec2 vFlowUv;/);
  assert.match(material.fragmentShader, /float junctionBlend = smoothstep\(0\.0, 1\.0, vJunctionMask\);/);
  assert.match(material.fragmentShader, /float centerMask = mix\(stripCenterMask, 1\.0, junctionBlend\);/);
  assert.match(material.fragmentShader, /vec2 junctionDirection = normalize\(vJunctionFlowDirection\);/);
  assert.match(material.fragmentShader, /vec2 macroFlowDomain = vec2\(primaryFlowMeters, vFlowUv\.y\);/);
  assert.match(material.fragmentShader, /vec3 normal = getFlowNormal\(\s+macroFlowDomain,\s+middleFlowDomain,\s+microFlowDomain,/);
  assert.equal(material.fragmentShader.match(/getFlowTone\(macroFlowDomain, middleFlowDomain\)/g)?.length, 1);
  assert.match(material.fragmentShader, /getFoamPattern\(\s+macroFlowDomain,\s+middleFlowDomain,\s+microFlowDomain\s+\)/);
  assert.doesNotMatch(material.fragmentShader, /normalize\(vFlowDirection\)/);
  assert.doesNotMatch(material.fragmentShader, /if \(vJunctionMask|junctionNormal|junctionFlowDomain|stripFlowDomain/);
  assert.match(material.fragmentShader, /float foam = foamMask;/);
  assert.match(material.fragmentShader, /foamShoreAlpha \* foamCoverage/);
  assert.match(material.fragmentShader, /vJunctionMask \* 0\.08/);
  assert.doesNotMatch(material.fragmentShader, /vJunctionMask \* 0\.10/);
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
  assert.equal(FLOWING_RIVER_SHALLOW_COLOR, 0x4b756b);
  assert.equal(FLOWING_RIVER_DEEP_COLOR, 0x123945);
  assert.equal(FLOWING_RIVER_FOAM_COLOR, 0xd5e7e7);
  assert.equal(FLOWING_RIVER_SEDIMENT_COLOR, 0x858575);

  material.dispose();
});
