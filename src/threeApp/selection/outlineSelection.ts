import * as THREE from 'three';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { ContextSingleton } from '@/threeApp/core/ContextSingleton';

export class OutlineSelection extends ContextSingleton<OutlineSelection> {
  private outlinePass: OutlinePass;
  private composer: EffectComposer;

  public init({ outlinePass, composer }: { outlinePass: OutlinePass; composer: EffectComposer }) {
    this.outlinePass = outlinePass;
    this.composer = composer;
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

    this.composer.renderer.setRenderTarget(this.outlinePass.renderTargetMaskBuffer);
    this.composer.renderer.clear();
    this.composer.renderer.setRenderTarget(null);
  }
}
