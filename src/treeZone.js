import * as THREE from 'three';
import { createTreePlacementIterator, buildTreeInstancedMeshes } from './treePlacements.js';

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

    this._generator = null;
    this._placements = null;
    this.built = false;
  }

  get isGenerating() {
    return this._generator !== null;
  }

  get isReady() {
    return this._placements !== null && !this.isGenerating && !this.built;
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

  buildInstances() {
    if (!this._placements || this._placements.length === 0) {
      this.built = true;
      return;
    }

    this.clearGroup();
    buildTreeInstancedMeshes(this._placements, this.treeModels, this.group);

    this.group.visible = true;
    this.built = true;
  }

  clearGroup() {
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }

  clear() {
    this.clearGroup();
    this._generator = null;
    this._placements = null;
    this.built = false;
    this.group.visible = false;
  }

  dispose() {
    this.clear();

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
