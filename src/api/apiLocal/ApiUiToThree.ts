import * as THREE from 'three';
import { ContextSingleton } from '@/core/ContextSingleton';
import { SceneManager } from '@/threeApp/scene/SceneManager';
import { InitModel } from '@/threeApp/model/InitModel';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { OffscreenCanvasManager } from '@/threeApp/worker/OffscreenCanvasManager';

export class ApiUiToThree extends ContextSingleton<ApiUiToThree> {
  private isInWorker(): boolean {
    return typeof window === 'undefined' && typeof self !== 'undefined';
  }

  private shouldUseWorker(): boolean {
    if (this.isInWorker()) {
      return false;
    }

    const manager = OffscreenCanvasManager.inst();
    return manager && manager.worker !== undefined;
  }

  public setPlanePosition(x: number, y: number, z: number) {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setPlanePosition', x, y, z });
    } else {
      ClippingBvh.inst().setPlanePosition(x, y, z);
      SceneManager.inst().render();
    }
  }

  public setPlaneRotation(x: number, y: number, z: number) {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setPlaneRotation', x, y, z });
    } else {
      ClippingBvh.inst().setPlaneRotation(x, y, z);
      SceneManager.inst().render();
    }
  }

  public resetPlane() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'resetPlane' });
    } else {
      ClippingBvh.inst().resetPlane();
      SceneManager.inst().render();
    }
  }

  public getStateClippingBvh() {
    const useBVH = ClippingBvh.inst().getUseBVH();
    const helperBVH = ClippingBvh.inst().getHelperBVH();
    const model = ClippingBvh.inst().getModel();
    const wireframe = ClippingBvh.inst().getWireframe();
    const showPlane = ClippingBvh.inst().getShowPlane();

    return { useBVH, helperBVH, model, wireframe, showPlane };
  }

  public activateClippingBvh() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'activateClippingBvh' });
    } else {
      const model = InitModel.inst().getModel();
      ClippingBvh.inst().initClipping({ model });
      SceneManager.inst().render();
    }
  }

  public deActivateClippingBvh() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'deActivateClippingBvh' });
    } else {
      ClippingBvh.inst().destroy();
      SceneManager.inst().render();
    }
  }

  public toggleUseBVH() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleUseBVH' });
      const act = !ClippingBvh.inst().getUseBVH();
      return act;
    } else {
      const act = !ClippingBvh.inst().getUseBVH();
      ClippingBvh.inst().setUseBVH(act);
      return act;
    }
  }

  public toggleHelperBVH() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleHelperBVH' });
      const act = !ClippingBvh.inst().getHelperBVH();
      return act;
    } else {
      const act = !ClippingBvh.inst().getHelperBVH();
      ClippingBvh.inst().setHelperBVH(act);
      return act;
    }
  }

  public toggleModel() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleModel' });
      const act = !ClippingBvh.inst().getModel();
      return act;
    } else {
      const act = !ClippingBvh.inst().getModel();
      ClippingBvh.inst().setModel(act);
      return act;
    }
  }

  public toggleWireframe() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleWireframe' });
      const act = !ClippingBvh.inst().getWireframe();
      return act;
    } else {
      const act = !ClippingBvh.inst().getWireframe();
      ClippingBvh.inst().setWireframe(act);
      return act;
    }
  }

  public toggleInvertPlane() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleInvertPlane' });
      const act = !ClippingBvh.inst().getInvertPlane();
      return act;
    } else {
      const act = !ClippingBvh.inst().getInvertPlane();
      ClippingBvh.inst().setInvertPlane(act);
      return act;
    }
  }

  public toggleShowPlane() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleShowPlane' });
      const act = !ClippingBvh.inst().getShowPlane();
      return act;
    } else {
      const act = !ClippingBvh.inst().getShowPlane();
      ClippingBvh.inst().setShowPlane(act);
      return act;
    }
  }

  public playAnimation() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'playAnimation' });
    } else {
      AnimationManager.inst().play();
    }
  }

  public pauseAnimation() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'pauseAnimation' });
    } else {
      AnimationManager.inst().pause();
    }
  }

  public setAnimationPosStart() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationPosStart' });
    } else {
      AnimationManager.inst().setAnimationPosStart();
    }
  }

  public setAnimationPosEnd() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationPosEnd' });
    } else {
      AnimationManager.inst().setAnimationPosEnd();
    }
  }

  public resetAnimation() {}

  public setAnimationIndex(index: number) {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationIndex', index });
    } else {
      AnimationManager.inst().setAnimationIndex(index);
    }
  }

  public hasAnimations(): boolean {
    return AnimationManager.inst().hasAnimations();
  }

  public getAnimationMaxDuration(): number {
    return AnimationManager.inst().getAnimationMaxDuration();
  }

  public setAnimationTime(time: number) {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationTime', time });
    } else {
      AnimationManager.inst().setAnimationTime(time);
    }
  }

  public rebuildAnimationBVH() {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'rebuildAnimationBVH' });
    } else {
      AnimationManager.inst().rebuildBVHIfNeeded();
    }
  }

  public toggleCamera(type: 'Perspective' | 'Orthographic') {
    if (this.shouldUseWorker()) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleCamera', cameraType: type });
    } else {
      SceneManager.inst().cameraManager.setCamera({ type });
    }
  }

  public getCameraType(): 'Perspective' | 'Orthographic' {
    if (this.shouldUseWorker()) {
      return 'Perspective';
    } else {
      const camera = SceneManager.inst().cameraManager.getActiveCamera();
      return camera instanceof THREE.PerspectiveCamera ? 'Perspective' : 'Orthographic';
    }
  }
}
