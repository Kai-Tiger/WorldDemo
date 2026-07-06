import * as THREE from 'three';

const SAVE_ENDPOINT = '/__terrain-heightmap';
const DEFAULT_RADIUS = 5;
const DEFAULT_STRENGTH = 0.9;
const BRUSH_SEGMENTS = 96;

export function createTerrainEditor(terrain, camera, scene, canvas, input) {
  const editButton = document.querySelector('#edit-terrain');
  const toolbar = document.querySelector('#terrain-editor');
  const closeButton = document.querySelector('#terrain-editor-close');
  const saveButton = document.querySelector('#terrain-editor-save');
  const raiseButton = document.querySelector('#terrain-editor-raise');
  const lowerButton = document.querySelector('#terrain-editor-lower');
  const radiusInput = document.querySelector('#terrain-editor-radius');
  const strengthInput = document.querySelector('#terrain-editor-strength');
  const status = document.querySelector('#terrain-editor-status');
  const heightMap = terrain.getHeightMapData();
  const heightCanvas = document.createElement('canvas');
  const heightCtx = heightCanvas.getContext('2d');
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const brushCursor = createBrushCursor();
  const state = {
    open: false,
    painting: false,
    brush: 'raise',
    radius: DEFAULT_RADIUS,
    strength: DEFAULT_STRENGTH,
    hitPoint: new THREE.Vector3(),
    hasHit: false,
  };

  heightCanvas.width = heightMap.width;
  heightCanvas.height = heightMap.height;
  radiusInput.value = String(DEFAULT_RADIUS);
  strengthInput.value = String(DEFAULT_STRENGTH);
  brushCursor.scale.setScalar(state.radius);
  brushCursor.visible = false;
  scene.add(brushCursor);
  updateBrushButtons();

  editButton.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  saveButton.addEventListener('click', save);
  raiseButton.addEventListener('click', () => setBrush('raise'));
  lowerButton.addEventListener('click', () => setBrush('lower'));
  radiusInput.addEventListener('input', () => {
    state.radius = Number(radiusInput.value);
    brushCursor.scale.setScalar(state.radius);
  });
  strengthInput.addEventListener('input', () => {
    state.strength = Number(strengthInput.value);
  });
  canvas.addEventListener('contextmenu', (event) => {
    if (state.open) event.preventDefault();
  });
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerLeave);

  return {
    isOpen: () => state.open,
  };

  function open() {
    state.open = true;
    toolbar.hidden = false;
    toolbar.setAttribute('aria-hidden', 'false');
    canvas.style.cursor = 'crosshair';
    input.setPointerInputEnabled(false);
    status.textContent = '';
    updateBrushCursorColor();
  }

  function close() {
    state.open = false;
    state.painting = false;
    state.hasHit = false;
    brushCursor.visible = false;
    toolbar.hidden = true;
    toolbar.setAttribute('aria-hidden', 'true');
    canvas.style.cursor = '';
    input.setPointerInputEnabled(true);
  }

  function setBrush(brush) {
    state.brush = brush;
    updateBrushButtons();
    updateBrushCursorColor();
  }

  function updateBrushButtons() {
    raiseButton.classList.toggle('is-active', state.brush === 'raise');
    lowerButton.classList.toggle('is-active', state.brush === 'lower');
  }

  function handlePointerDown(event) {
    if (!state.open || event.button !== 0) return;

    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    state.painting = true;
    updateHit(event);
    paint();
  }

  function handlePointerMove(event) {
    if (!state.open) return;

    updateHit(event);

    if (state.painting) {
      paint();
    }
  }

  function handlePointerUp(event) {
    if (!state.open) return;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    state.painting = false;
  }

  function handlePointerLeave() {
    if (!state.open) return;

    state.painting = false;
    state.hasHit = false;
    brushCursor.visible = false;
  }

  function updateHit(event) {
    const rect = canvas.getBoundingClientRect();

    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    raycaster.setFromCamera(pointer, camera);

    const hits = raycaster.intersectObjects(terrain.group.children, false);
    const hit = hits.find((item) => item.object?.name?.startsWith('TerrainChunk_'));

    if (!hit) {
      state.hasHit = false;
      brushCursor.visible = false;
      return;
    }

    state.hasHit = true;
    state.hitPoint.copy(hit.point);
    updateBrushCursor(hit.point, hit.face?.normal, hit.object);
  }

  function updateBrushCursor(point, localNormal, object) {
    const normal = localNormal
      ? localNormal.clone().transformDirection(object.matrixWorld)
      : new THREE.Vector3(0, 1, 0);

    brushCursor.position.copy(point).addScaledVector(normal, 0.16);
    brushCursor.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    brushCursor.visible = true;
  }

  function paint() {
    if (!state.hasHit) return;

    const direction = state.brush === 'raise' ? 1 : -1;

    terrain.applyHeightBrush(
      state.hitPoint.x,
      state.hitPoint.z,
      state.radius,
      state.strength * direction,
    );
    status.textContent = 'Unsaved';
  }

  async function save() {
    saveButton.disabled = true;
    status.textContent = 'Saving';

    try {
      const blob = await createHeightMapBlob();
      const response = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'image/webp' },
        body: blob,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      status.textContent = 'Saved';
    } catch (error) {
      status.textContent = 'Save failed';
      console.error(error);
    } finally {
      saveButton.disabled = false;
    }
  }

  function createHeightMapBlob() {
    heightCtx.putImageData(new ImageData(heightMap.data, heightMap.width, heightMap.height), 0, 0);

    return new Promise((resolve, reject) => {
      heightCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Heightmap encoding failed'));
          return;
        }

        resolve(blob);
      }, 'image/webp', heightMap.saveQuality);
    });
  }

  function updateBrushCursorColor() {
    brushCursor.material.color.set(state.brush === 'raise' ? 0x94e082 : 0x60b5ff);
  }
}

function createBrushCursor() {
  const geometry = new THREE.RingGeometry(0.94, 1, BRUSH_SEGMENTS);
  const material = new THREE.MeshBasicMaterial({
    color: 0x94e082,
    transparent: true,
    opacity: 0.72,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.name = 'TerrainEditBrushCursor';
  mesh.renderOrder = 1000;

  return mesh;
}
