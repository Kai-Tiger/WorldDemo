import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  createUnifiedWaterAttributeMaterial,
  createUnifiedWaterResolveMaterial,
  createWaterInfoRenderTarget,
  resolveWaterInfoEncoding,
  UnifiedWaterPass,
  WATER_INFO_ENCODING_HALF_FLOAT,
  WATER_INFO_ENCODING_PACKED,
} from '../src/unifiedWaterPass.js';

test('water info target provides two nearest-filtered attachments and depth', () => {
  const target = createWaterInfoRenderTarget(160, 90, {
    encoding: WATER_INFO_ENCODING_HALF_FLOAT,
  });

  assert.equal(target.width, 160);
  assert.equal(target.height, 90);
  assert.equal(target.textures.length, 2);
  assert.equal(target.textures[0].type, THREE.HalfFloatType);
  assert.equal(target.textures[0].format, THREE.RGBAFormat);
  assert.equal(target.textures[0].internalFormat, 'RGBA16F');
  assert.equal(target.textures[1].type, THREE.UnsignedByteType);
  assert.equal(target.textures[1].format, THREE.RGBAFormat);
  assert.equal(target.textures[1].internalFormat, 'RGBA8');

  for (const texture of target.textures) {
    assert.equal(texture.minFilter, THREE.NearestFilter);
    assert.equal(texture.magFilter, THREE.NearestFilter);
    assert.equal(texture.generateMipmaps, false);
    assert.equal(texture.colorSpace, THREE.NoColorSpace);
  }

  assert.equal(target.depthTexture.isDepthTexture, true);
  assert.equal(target.depthTexture.type, THREE.UnsignedIntType);
  assert.equal(target.depthTexture.format, THREE.DepthFormat);
  assert.equal(target.depthTexture.minFilter, THREE.NearestFilter);
  assert.equal(target.depthTexture.magFilter, THREE.NearestFilter);
  assert.equal(target.samples, 0);
  assert.equal(
    target.userData.waterInfoEncoding,
    WATER_INFO_ENCODING_HALF_FLOAT,
  );

  target.dispose();
});

test('water info encoding auto-selects half float or packed RGBA8', () => {
  const halfRenderer = {
    extensions: { has: (name) => name === 'EXT_color_buffer_float' },
  };
  const packedRenderer = {
    extensions: { has: () => false },
  };

  assert.equal(
    resolveWaterInfoEncoding(halfRenderer),
    WATER_INFO_ENCODING_HALF_FLOAT,
  );
  assert.equal(
    resolveWaterInfoEncoding(packedRenderer),
    WATER_INFO_ENCODING_PACKED,
  );

  const target = createWaterInfoRenderTarget(12, 8, {
    renderer: packedRenderer,
  });

  assert.equal(target.textures[0].type, THREE.UnsignedByteType);
  assert.equal(target.textures[0].internalFormat, 'RGBA8');
  assert.equal(target.textures[1].type, THREE.UnsignedByteType);
  assert.equal(target.textures[1].internalFormat, 'RGBA8');
  assert.equal(target.userData.waterInfoEncoding, WATER_INFO_ENCODING_PACKED);
  assert.throws(
    () => resolveWaterInfoEncoding(null, 'unknown'),
    /Unsupported water info encoding/,
  );

  target.dispose();
});

test('water attribute material writes the documented MRT contract', () => {
  const material = createUnifiedWaterAttributeMaterial({
    encoding: WATER_INFO_ENCODING_PACKED,
    maxDepth: 11,
  });

  assert.equal(material.glslVersion, THREE.GLSL3);
  assert.equal(material.transparent, false);
  assert.equal(material.depthTest, true);
  assert.equal(material.depthWrite, true);
  assert.equal(material.blending, THREE.NoBlending);
  assert.equal(material.toneMapped, false);
  assert.equal(material.defines.WATER_INFO_PACKED, 1);
  assert.equal(material.uniforms.uMaxDepth.value, 11);
  assert.match(
    material.fragmentShader,
    /layout\(location = 0\) out vec4 waterOpticsOutput/,
  );
  assert.match(
    material.fragmentShader,
    /layout\(location = 1\) out vec4 waterMaterialOutput/,
  );
  assert.match(material.vertexShader, /in float shoreDistanceMeters;/);
  assert.match(material.vertexShader, /in float shoreFoamMask;/);
  assert.match(material.vertexShader, /in float riverInfluence;/);
  assert.match(material.vertexShader, /vFlowUv = flowUv;/);
  assert.doesNotMatch(material.vertexShader, /vFlowUv = flowUv \+/);
  assert.doesNotMatch(material.vertexShader, /mouthInfluence/);
  assert.match(
    material.fragmentShader,
    /float shoreAa = max\(fwidth\(vShoreDistanceMeters\), 0\.015\);/,
  );
  assert.match(
    material.fragmentShader,
    /float coverage = smoothstep\(0\.0, shoreAa, vShoreDistanceMeters\);/,
  );
  assert.deepEqual(
    Object.keys(material.defaultAttributeValues).filter((name) => ![
      'color',
      'uv',
      'uv1',
    ].includes(name)),
    [
      'waterDepth',
      'shoreDistanceMeters',
      'shoreFoamMask',
      'flowUv',
      'flowDirection',
      'junctionFlowDirection',
      'flowSpeed',
      'riverInfluence',
      'rapidMask',
      'junctionMask',
      'disturbanceMask',
      'reflectionTier',
    ],
  );
  assert.deepEqual(material.defaultAttributeValues.shoreFoamMask, [1]);
  assert.match(material.fragmentShader, /encodeOctahedron/);
  assert.match(material.fragmentShader, /float getNaturalWaterHeight/);
  assert.match(material.fragmentShader, /vec2 getNaturalWaterSlope/);
  assert.match(material.fragmentShader, /float riverTravel = uTime/);
  assert.match(material.vertexShader, /vWorldPositionXZ = worldPosition\.xz/);
  assert.match(
    material.fragmentShader,
    /float lakeSurfaceHeight = getNaturalWaterHeight\(lakeFlowDomain\)/,
  );
  assert.match(
    material.fragmentShader,
    /float riverSurfaceHeight = getNaturalWaterHeight\(riverFlowDomain\)/,
  );
  assert.doesNotMatch(material.fragmentShader, /surfaceFlowDomain = mix/);
  assert.match(material.fragmentShader, /getLakeDualWaveNormal\(\s*vWorldPositionXZ/);
  assert.match(
    material.fragmentShader,
    /\? normalize\(vFlowDirection\)\s*:\s*lakeAxis/,
  );
  assert.match(material.fragmentShader, /shoreFoam \*= vShoreFoamMask/);
  assert.doesNotMatch(material.fragmentShader, /float riverPhase/);
  assert.match(
    material.fragmentShader,
    /vec3 lakeDetailNormal = getLakeDualWaveNormal/,
  );
  assert.match(material.fragmentShader, /vec3 riverDetailNormal = normalize/);
  assert.doesNotMatch(
    material.fragmentShader,
    /normalize\(mix\(\s*vec2\(0\.72, 0\.69\)/,
  );

  material.dispose();
});

test('unified lake water keeps the pre-unification multi-phase motion cues', () => {
  const attributeMaterial = createUnifiedWaterAttributeMaterial();
  const resolveMaterial = createUnifiedWaterResolveMaterial();

  assert.match(
    attributeMaterial.vertexShader,
    /waveA[\s\S]*uTime \* 0\.95[\s\S]*\* 0\.055/,
  );
  assert.match(
    attributeMaterial.vertexShader,
    /waveB[\s\S]*uTime \* 0\.76[\s\S]*\* 0\.04/,
  );
  assert.match(
    attributeMaterial.vertexShader,
    /\(waveA \+ waveB\)[\s\S]*lakeWaveWeight[\s\S]*mouthWaveSuppression/,
  );
  assert.match(attributeMaterial.fragmentShader, /vec3 getLakeDualWaveNormal/);
  for (const frequency of ['1.15', '0.82', '2.10', '1.62']) {
    assert.match(attributeMaterial.fragmentShader, new RegExp(`uTime \\* ${frequency}`));
  }
  assert.match(
    attributeMaterial.fragmentShader,
    /mix\(\s*lakeDetailNormal,\s*riverDetailNormal,\s*riverBlend\s*\)/,
  );
  assert.match(
    resolveMaterial.fragmentShader,
    /planarUv \+= viewNormal\.xy[\s\S]*10\.0[\s\S]*uResolution/,
  );
  assert.match(resolveMaterial.fragmentShader, /float getLakeSunSparkle/);
  assert.match(resolveMaterial.fragmentShader, /float coverageWidth = max\(fwidth/);
  assert.match(
    resolveMaterial.fragmentShader,
    /mix\(lakeSunSparkle, baseSunSpecular, riverInfluence\)/,
  );

  attributeMaterial.dispose();
  resolveMaterial.dispose();
});

test('unified river foam restores patterned hydraulic and sheltered wake gating', () => {
  const material = createUnifiedWaterAttributeMaterial();
  const shader = material.fragmentShader;

  assert.match(material.vertexShader, /vDisturbanceMask = clamp\(disturbanceMask/);
  assert.match(shader, /float getFoamPattern/);
  assert.match(shader, /float getWakePattern/);
  assert.match(shader, /smoothstep\(\s*0\.45,\s*1\.15,\s*vWaterDepth\s*\)/);
  assert.match(shader, /smoothstep\(0\.65, 1\.35, vFlowSpeed\)/);
  assert.match(shader, /smoothstep\(\s*0\.08,\s*0\.82,\s*vRapidMask\s*\)/);
  assert.match(shader, /vJunctionMask \* 0\.08/);
  assert.match(shader, /smoothstep\(0\.04, 0\.14, vDisturbanceMask\)/);
  assert.match(shader, /smoothstep\(0\.18, 0\.34, vDisturbanceMask\)/);
  assert.match(shader, /wakeEnvelope[\s\S]*\(1\.0 - wakeShelter\)/);
  assert.match(shader, /getWakePattern\(vFlowUv, foamPattern\)/);
  assert.match(shader, /shoreFoam \*= \(1\.0 - riverBlend\)/);
  assert.match(
    shader,
    /float riverFoamWeight = vRiverInfluence \* vRiverInfluence/,
  );
  assert.match(shader, /riverFoam = clamp\([\s\S]*?\) \* riverFoamWeight/);
  assert.match(shader, /mix\(roughness, 0\.78, foam\)/);
  assert.doesNotMatch(shader, /max\(vDisturbanceMask, vJunctionMask/);
  assert.doesNotMatch(shader, /\+ vDisturbanceMask \* 0\.12/);
  assert.doesNotMatch(shader, /vRapidMask \* \(0\.42/);
  assert.doesNotMatch(shader, /vDisturbanceMask \* 0\.34/);
  assert.doesNotMatch(shader, /vJunctionMask \* 0\.22/);

  material.dispose();
});

test('half-float framebuffer failure falls back to packed water info', () => {
  const previousWarn = console.warn;
  const warnings = [];
  let currentTarget = null;
  const renderer = {
    extensions: { has: () => true },
    initRenderTarget() {},
    getRenderTarget: () => currentTarget,
    setRenderTarget(target) { currentTarget = target; },
    getContext: () => ({
      FRAMEBUFFER: 0x8d40,
      FRAMEBUFFER_COMPLETE: 0x8cd5,
      checkFramebufferStatus: () => 0x8cdd,
    }),
  };

  console.warn = (...args) => warnings.push(args);
  try {
    const pass = new UnifiedWaterPass({
      renderer,
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
    });

    assert.equal(pass.encoding, WATER_INFO_ENCODING_PACKED);
    assert.equal(pass.infoTarget.textures[0].type, THREE.UnsignedByteType);
    assert.equal(pass.attributeMaterial.defines.WATER_INFO_PACKED, 1);
    assert.equal(pass.resolveMaterial.defines.WATER_INFO_PACKED, 1);
    assert.equal(warnings.length, 1);
    pass.dispose();
  } finally {
    console.warn = previousWarn;
  }
});

test('water resolve material consumes both attributes and preserves scene depth', () => {
  const material = createUnifiedWaterResolveMaterial();

  assert.equal(material.glslVersion, THREE.GLSL3);
  assert.equal(material.transparent, false);
  assert.equal(material.depthTest, true);
  assert.equal(material.depthFunc, THREE.AlwaysDepth);
  assert.equal(material.depthWrite, true);
  assert.equal(material.blending, THREE.NoBlending);
  assert.equal(material.toneMapped, false);

  for (const uniform of [
    'tSceneColor',
    'tSceneDepth',
    'tWaterOptics',
    'tWaterMaterial',
    'tWaterDepth',
    'uProjectionMatrixInverse',
    'uCameraWorldMatrix',
    'uPlanarTextureMatrix',
  ]) {
    assert.ok(material.uniforms[uniform], `missing ${uniform}`);
  }

  assert.match(material.fragmentShader, /decodeOctahedron/);
  assert.match(material.fragmentShader, /reconstructWorldPosition/);
  assert.match(material.fragmentShader, /sampleReflection/);
  assert.match(material.fragmentShader, /gl_FragDepth = sceneDepth/);

  material.dispose();
});

test('unified water pass resizes and disposes its owned resources', () => {
  const pass = new UnifiedWaterPass({
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    encoding: WATER_INFO_ENCODING_PACKED,
  });
  let targetDisposed = false;
  let attributeDisposed = false;
  let resolveDisposed = false;

  pass.setSize(81.9, 46.2);
  assert.equal(pass.infoTarget.width, 81);
  assert.equal(pass.infoTarget.height, 46);
  assert.equal(pass.infoTarget.depthTexture.image.width, 81);
  assert.equal(pass.infoTarget.depthTexture.image.height, 46);
  assert.deepEqual(
    pass.resolveMaterial.uniforms.uResolution.value.toArray(),
    [81, 46],
  );

  pass.infoTarget.addEventListener('dispose', () => { targetDisposed = true; });
  pass.attributeMaterial.addEventListener('dispose', () => {
    attributeDisposed = true;
  });
  pass.resolveMaterial.addEventListener('dispose', () => {
    resolveDisposed = true;
  });
  pass.dispose();

  assert.equal(targetDisposed, true);
  assert.equal(attributeDisposed, true);
  assert.equal(resolveDisposed, true);
});

test('unified water pass runs attributes, resolve and effects then restores state', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  const surface = new THREE.Group();
  const effects = new THREE.Group();
  const terrain = new THREE.Group();
  const hidden = new THREE.Group();
  const originalBackground = new THREE.Color(0x123456);
  const originalTarget = { name: 'original-target' };
  const writeBuffer = {
    texture: { name: 'write-color' },
    depthTexture: { name: 'write-depth' },
    width: 64,
    height: 48,
  };
  const readBuffer = {
    texture: { name: 'read-color' },
    depthTexture: { name: 'read-depth' },
    width: 64,
    height: 48,
  };
  const events = [];
  let currentTarget = originalTarget;
  let clearColor = new THREE.Color(0x456789);
  let clearAlpha = 0.65;
  let sceneRenderCount = 0;
  let failOnAttributeRender = false;

  hidden.visible = false;
  scene.background = originalBackground;
  scene.add(surface, effects, terrain, hidden);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  const renderer = {
    autoClear: true,
    shadowMap: { autoUpdate: true },
    getRenderTarget: () => currentTarget,
    setRenderTarget(target) {
      currentTarget = target;
      events.push(['target', target]);
    },
    getClearColor(target) {
      return target.copy(clearColor);
    },
    getClearAlpha() {
      return clearAlpha;
    },
    setClearColor(color, alpha = clearAlpha) {
      clearColor = new THREE.Color(color);
      clearAlpha = alpha;
      events.push(['clear-color', clearColor.getHex(), clearAlpha]);
    },
    clear(color, depth, stencil) {
      events.push(['clear', color, depth, stencil]);
    },
    render(renderedObject) {
      if (renderedObject !== scene) {
        events.push(['resolve']);
        assert.equal(currentTarget, writeBuffer);
        return;
      }

      sceneRenderCount += 1;
      if (sceneRenderCount === 1 || failOnAttributeRender) {
        events.push(['attributes']);
        assert.equal(currentTarget, pass.infoTarget);
        assert.equal(scene.overrideMaterial, pass.attributeMaterial);
        assert.equal(surface.visible, true);
        assert.equal(effects.visible, false);
        assert.equal(terrain.visible, false);
        assert.equal(hidden.visible, false);
        if (failOnAttributeRender) throw new Error('attribute render failed');
        return;
      }

      events.push(['effects']);
      assert.equal(currentTarget, writeBuffer);
      assert.equal(scene.overrideMaterial, null);
      assert.equal(surface.visible, false);
      assert.equal(effects.visible, true);
      assert.equal(terrain.visible, false);
      assert.equal(hidden.visible, false);
    },
  };
  const pass = new UnifiedWaterPass({
    scene,
    camera,
    surfaceRoots: [surface],
    effectRoots: [effects],
    encoding: WATER_INFO_ENCODING_PACKED,
    width: 64,
    height: 48,
  });

  pass.setTime(1.25);
  pass.setQuality({
    refractionPixels: 3,
    reflectionMode: 2,
    reflectionStrength: 0.8,
  });
  pass.render(renderer, writeBuffer, readBuffer);

  assert.deepEqual(
    events.filter((event) => [
      'attributes',
      'resolve',
      'effects',
    ].includes(event[0])).map((event) => event[0]),
    ['attributes', 'resolve', 'effects'],
  );
  assert.equal(pass.attributeMaterial.uniforms.uTime.value, 1.25);
  assert.equal(pass.resolveMaterial.uniforms.uTime.value, 1.25);
  assert.equal(pass.resolveMaterial.uniforms.uRefractionPixels.value, 3);
  assert.equal(pass.resolveMaterial.uniforms.uReflectionMode.value, 2);
  assert.equal(pass.resolveMaterial.uniforms.tSceneColor.value, readBuffer.texture);
  assert.equal(pass.resolveMaterial.uniforms.tSceneDepth.value, readBuffer.depthTexture);
  assert.equal(
    pass.resolveMaterial.uniforms.tWaterOptics.value,
    pass.infoTarget.textures[0],
  );
  assert.equal(currentTarget, originalTarget);
  assert.equal(renderer.autoClear, true);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(scene.background, originalBackground);
  assert.equal(scene.matrixWorldAutoUpdate, true);
  assert.equal(scene.overrideMaterial, null);
  assert.equal(surface.visible, true);
  assert.equal(effects.visible, true);
  assert.equal(terrain.visible, true);
  assert.equal(hidden.visible, false);
  assert.equal(clearColor.getHex(), 0x456789);
  assert.equal(clearAlpha, 0.65);

  sceneRenderCount = 0;
  failOnAttributeRender = true;
  assert.throws(
    () => pass.render(renderer, writeBuffer, readBuffer),
    /attribute render failed/,
  );
  assert.equal(currentTarget, originalTarget);
  assert.equal(renderer.autoClear, true);
  assert.equal(renderer.shadowMap.autoUpdate, true);
  assert.equal(scene.background, originalBackground);
  assert.equal(scene.matrixWorldAutoUpdate, true);
  assert.equal(scene.overrideMaterial, null);
  assert.equal(surface.visible, true);
  assert.equal(effects.visible, true);
  assert.equal(terrain.visible, true);
  assert.equal(hidden.visible, false);
  assert.equal(clearColor.getHex(), 0x456789);
  assert.equal(clearAlpha, 0.65);

  pass.dispose();
});
