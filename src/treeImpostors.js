import * as THREE from 'three';

export const TREE_IMPOSTOR_SAMPLE_RATE = 0.35;
export const TREE_IMPOSTOR_ATLAS_COLUMNS = 4;
export const TREE_IMPOSTOR_ATLAS_ROWS = 1;

const ATLAS_WIDTH = 1024;
const ATLAS_HEIGHT = 512;
const CELL_WIDTH = ATLAS_WIDTH / TREE_IMPOSTOR_ATLAS_COLUMNS;
const CELL_HEIGHT = ATLAS_HEIGHT / TREE_IMPOSTOR_ATLAS_ROWS;
const IMPOSTOR_ALPHA_TEST = 0.12;

export function createTreeImpostorAtlas(renderer, treeModels) {
  const renderTarget = new THREE.WebGLRenderTarget(ATLAS_WIDTH, ATLAS_HEIGHT, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
    stencilBuffer: false,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const ambient = new THREE.HemisphereLight(0xc6d8e1, 0x4d5849, 2.1);
  const sun = new THREE.DirectionalLight(0xffe4bd, 3.25);
  const previousTarget = renderer.getRenderTarget();
  const previousClearColor = renderer.getClearColor(new THREE.Color());
  const previousClearAlpha = renderer.getClearAlpha();
  const previousScissorTest = renderer.getScissorTest();
  const previousViewport = renderer.getViewport(new THREE.Vector4());
  const previousScissor = renderer.getScissor(new THREE.Vector4());
  const previousLodSettings = treeModels.map((model) => ({
    viewer: model.lodUniforms?.uTreeLodViewerPosition.value.clone(),
    impostorStart: model.lodUniforms?.uTreeImpostorStart.value,
  }));

  renderTarget.texture.name = 'TreeImpostorAtlas';
  renderTarget.texture.generateMipmaps = true;
  renderTarget.texture.minFilter = THREE.LinearMipmapLinearFilter;
  renderTarget.texture.magFilter = THREE.LinearFilter;
  scene.add(ambient, sun);
  sun.position.set(4, 8, 6);

  for (const model of treeModels) {
    model.lodUniforms?.uTreeLodViewerPosition.value.set(0, 0);
    if (model.lodUniforms) model.lodUniforms.uTreeImpostorStart.value = 1e6;
  }

  renderer.setRenderTarget(renderTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.setScissorTest(true);

  for (let index = 0; index < Math.min(treeModels.length, 4); index += 1) {
    const model = treeModels[index];
    const preview = new THREE.Group();
    const row = Math.floor(index / TREE_IMPOSTOR_ATLAS_COLUMNS);
    const column = index % TREE_IMPOSTOR_ATLAS_COLUMNS;

    for (const source of model.meshes) {
      const mesh = new THREE.Mesh(source.geometry, source.material);

      mesh.frustumCulled = false;
      preview.add(mesh);
    }

    scene.add(preview);
    frameTreeModel(camera, model);
    renderer.setViewport(column * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
    renderer.setScissor(column * CELL_WIDTH, row * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
    renderer.clear(true, true, false);
    renderer.render(scene, camera);
    scene.remove(preview);
  }

  renderer.setRenderTarget(previousTarget);
  renderer.setClearColor(previousClearColor, previousClearAlpha);
  renderer.setViewport(previousViewport);
  renderer.setScissor(previousScissor);
  renderer.setScissorTest(previousScissorTest);

  for (let index = 0; index < treeModels.length; index += 1) {
    const uniforms = treeModels[index].lodUniforms;
    const previous = previousLodSettings[index];

    if (!uniforms || !previous.viewer) continue;
    uniforms.uTreeLodViewerPosition.value.copy(previous.viewer);
    uniforms.uTreeImpostorStart.value = previous.impostorStart;
  }

  return {
    texture: renderTarget.texture,
    renderTarget,
    material: createTreeImpostorMaterial(renderTarget.texture),
    dispose() {
      this.material.dispose();
      renderTarget.dispose();
    },
  };
}

function frameTreeModel(camera, model) {
  const halfWidth = Math.max(model.width * 0.6, 0.5);
  const verticalPadding = model.height * 0.06;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.bottom = model.baseY - verticalPadding;
  camera.top = model.baseY + model.height + verticalPadding;
  camera.position.set(0, model.baseY + model.height * 0.5, model.depth * 2 + model.width + 5);
  camera.lookAt(0, model.baseY + model.height * 0.5, 0);
  camera.updateProjectionMatrix();
}

export function shouldCreateTreeImpostor(placement) {
  const x = placement.matrix.elements[12];
  const z = placement.matrix.elements[14];
  const value = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;

  return value - Math.floor(value) < TREE_IMPOSTOR_SAMPLE_RATE;
}

export function createTreeImpostorMesh(placements, treeModels, atlas) {
  const selected = placements.filter((placement) => (
    placement.modelIndex < 4 && shouldCreateTreeImpostor(placement)
  ));

  if (selected.length === 0) return null;

  const geometry = new THREE.InstancedBufferGeometry();
  const positions = new Float32Array([
    -0.5, 0, 0,
    0.5, 0, 0,
    0.5, 1, 0,
    -0.5, 1, 0,
  ]);
  const uvs = new Float32Array([
    0, 0,
    1, 0,
    1, 1,
    0, 1,
  ]);
  const instancePositions = new Float32Array(selected.length * 3);
  const instanceSizes = new Float32Array(selected.length * 2);
  const instanceAtlasIndices = new Float32Array(selected.length);
  const instanceTints = new Float32Array(selected.length * 3);
  const scale = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const position = new THREE.Vector3();

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  for (let index = 0; index < selected.length; index += 1) {
    const placement = selected[index];
    const model = treeModels[placement.modelIndex];

    placement.matrix.decompose(position, rotation, scale);
    instancePositions.set([position.x, position.y, position.z], index * 3);
    instanceSizes.set([
      model.width * scale.x,
      model.height * scale.y,
    ], index * 2);
    instanceAtlasIndices[index] = placement.modelIndex;
    instanceTints.set([
      placement.tint.r,
      placement.tint.g,
      placement.tint.b,
    ], index * 3);
  }

  geometry.setAttribute(
    'instancePosition',
    new THREE.InstancedBufferAttribute(instancePositions, 3),
  );
  geometry.setAttribute('instanceSize', new THREE.InstancedBufferAttribute(instanceSizes, 2));
  geometry.setAttribute(
    'instanceAtlasIndex',
    new THREE.InstancedBufferAttribute(instanceAtlasIndices, 1),
  );
  geometry.setAttribute('instanceTint', new THREE.InstancedBufferAttribute(instanceTints, 3));
  geometry.instanceCount = selected.length;
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, atlas.material);

  mesh.name = 'TreeImpostorInstances';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

export function createTreeImpostorMaterial(texture) {
  return new THREE.ShaderMaterial({
    name: 'TreeImpostorMaterial',
    uniforms: {
      fogColor: { value: new THREE.Color() },
      fogDensity: { value: 0.00024 },
      fogNear: { value: 1 },
      fogFar: { value: 2400 },
      map: { value: texture },
      uViewerPosition: { value: new THREE.Vector2() },
      uImpostorStart: { value: 220 },
      uFadeDistance: { value: 8 },
      uTreeDistance: { value: 700 },
    },
    vertexShader: `
      attribute vec3 instancePosition;
      attribute vec2 instanceSize;
      attribute float instanceAtlasIndex;
      attribute vec3 instanceTint;
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vViewerDistance;
      uniform vec2 uViewerPosition;
      #include <fog_pars_vertex>

      void main() {
        vec3 cameraRight = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[0][2]));
        vec3 worldPosition = instancePosition;
        worldPosition += cameraRight * position.x * instanceSize.x;
        worldPosition.y += position.y * instanceSize.y;

        float atlasColumn = mod(instanceAtlasIndex, 4.0);
        vUv = vec2((uv.x + atlasColumn) * 0.25, uv.y);
        vTint = instanceTint;
        vViewerDistance = distance(instancePosition.xz, uViewerPosition);
        vec4 mvPosition = viewMatrix * vec4(worldPosition, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #ifdef USE_FOG
          vFogDepth = -mvPosition.z;
        #endif
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform float uImpostorStart;
      uniform float uFadeDistance;
      uniform float uTreeDistance;
      varying vec2 vUv;
      varying vec3 vTint;
      varying float vViewerDistance;
      #include <fog_pars_fragment>

      float ditherThreshold(vec2 pixel) {
        return fract(52.9829189 * fract(dot(floor(pixel), vec2(0.06711056, 0.00583715))));
      }

      void main() {
        vec4 texel = texture2D(map, vUv);
        float nearFade = smoothstep(
          uImpostorStart - uFadeDistance,
          uImpostorStart + uFadeDistance,
          vViewerDistance
        );
        float farFade = 1.0 - smoothstep(
          uTreeDistance - uFadeDistance,
          uTreeDistance,
          vViewerDistance
        );
        float alpha = texel.a * nearFade * farFade;

        if (alpha < ${IMPOSTOR_ALPHA_TEST.toFixed(2)} || alpha < ditherThreshold(gl_FragCoord.xy)) discard;
        gl_FragColor = vec4(texel.rgb * vTint, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    fog: true,
    side: THREE.DoubleSide,
    depthWrite: true,
    transparent: false,
  });
}

export function updateTreeImpostorUniforms(atlas, viewerPosition, settings) {
  if (!atlas) return;

  const uniforms = atlas.material.uniforms;

  uniforms.uViewerPosition.value.set(viewerPosition.x, viewerPosition.z);
  uniforms.uImpostorStart.value = settings.impostorStart;
  uniforms.uFadeDistance.value = settings.fadeDistance;
  uniforms.uTreeDistance.value = settings.treeDistance;
}
