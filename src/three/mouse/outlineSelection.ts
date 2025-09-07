import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';

export class OutlineSelection {
  private outlinePass: OutlinePass;

  public init({ outlinePass }: { outlinePass: OutlinePass }) {
    this.outlinePass = outlinePass;
  }

  private isActivated() {
    return this.outlinePass ? true : false;
  }

  public addOutlineObject(object: THREE.Object3D) {
    if (!this.isActivated()) return;

    if (!this.outlinePass.selectedObjects.includes(object)) {
      this.outlinePass.selectedObjects.push(object);
    }
  }

  public removeOutlineObject(object: THREE.Object3D) {
    if (!this.isActivated()) return;

    const index = this.outlinePass.selectedObjects.indexOf(object);
    if (index !== -1) {
      this.outlinePass.selectedObjects.splice(index, 1);
    }
  }

  public clearOutlineObjects() {
    if (!this.isActivated()) return;

    this.outlinePass.selectedObjects = [];
  }
}
