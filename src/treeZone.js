import * as THREE from 'three';
import {
  createTreePlacementIterator,
  buildTreeInstancedMeshes,
  shouldKeepTreeForLOD,
} from './treePlacements.js';

export class TreeZone {
  constructor(terrain, treeModels, minX, minZ, maxX, maxZ) {
    this.terrain = terrain;
    this.treeModels = treeModels;
    this.minX = minX;
    this.minZ = minZ;
    this.maxX = maxX;
    this.maxZ = maxZ;

    this.group = new THREE.Group();
    this.group.name = `TreeZone_${minX}_${minZ}`;
    this.group.visible = false;

    this.lod0Group = new THREE.Group();
    this.lod1Group = new THREE.Group();
    this.group.add(this.lod0Group, this.lod1Group);

    this._generator = null;
    this._placements = null;
    this.builtForPosition = null;
  }

  get isGenerating() {
    return this._generator !== null;
  }

  get hasPlacements() {
    return this._placements !== null && this._placements.length > 0;
  }

  get isReady() {
    return this._placements !== null && !this.isGenerating && this.builtForPosition === null;
  }

  get centerX() {
    return (this.minX + this.maxX) / 2;
  }

  get centerZ() {
    return (this.minZ + this.maxZ) / 2;
  }

  startGeneration() {
    this.clear();

    this._generator = createTreePlacementIterator(
      this.terrain,
      this.minX,
      this.minZ,
      this.maxX,
      this.maxZ,
    );
  }

  processGeneration(maxSteps) {
    if (!this._generator) return true;

    const done = this._generator.step(maxSteps);

    if (done) {
      this._placements = this._generator.getPlacements();
      this._generator = null;
    }

    return done;
  }

  rebuildLOD(playerX, playerZ, lodDistances, lodDivisors) {
    if (!this.hasPlacements) return;

    const lod0 = [];
    const lod1 = [];

    for (let i = 0; i < this._placements.length; i += 1) {
      const p = this._placements[i];
      const el = p.matrix.elements;
      const dx = el[12] - playerX;
      const dz = el[14] - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= lodDistances[0]) {
        lod0.push(p);
      } else if (dist <= lodDistances[1] && shouldKeepTreeForLOD(el[12], el[14], lodDivisors[1])) {
        lod1.push(p);
      }
    }

    this.clearGroup(this.lod0Group);
    this.clearGroup(this.lod1Group);

    if (lod0.length > 0) {
      buildTreeInstancedMeshes(lod0, this.treeModels, this.lod0Group);
    }

    if (lod1.length > 0) {
      buildTreeInstancedMeshes(lod1, this.treeModels, this.lod1Group);
    }

    this.group.visible = true;
    this.builtForPosition = { x: playerX, z: playerZ };
  }

  clearGroup(group) {
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  clear() {
    this.clearGroup(this.lod0Group);
    this.clearGroup(this.lod1Group);
    this._generator = null;
    this._placements = null;
    this.builtForPosition = null;
    this.group.visible = false;
  }

  dispose() {
    this.clear();

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
