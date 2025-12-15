import { ThreeApp } from '@/threeApp/threeApp';
import { SceneManager } from '@/threeApp/scene/sceneManager';
import { InitModel } from '@/threeApp/model/initModel';
import { ClippingBvh } from '@/threeApp/clipping/clippingBvh';
import { AnimationManager } from '@/threeApp/animation/animationManager';
import { OffscreenCanvasManager } from '@/threeApp/worker/offscreenCanvasManager';

export class ApiUiToThree {
  public static setPlanePosition(x: number, y: number, z: number) {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setPlanePosition', x, y, z });
    } else {
      ClippingBvh.inst().setPlanePosition(x, y, z);
      SceneManager.inst().render();
    }
  }

  public static setPlaneRotation(x: number, y: number, z: number) {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setPlaneRotation', x, y, z });
    } else {
      ClippingBvh.inst().setPlaneRotation(x, y, z);
      SceneManager.inst().render();
    }
  }

  public static resetPlane() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'resetPlane' });
    } else {
      ClippingBvh.inst().resetPlane();
      SceneManager.inst().render();
    }
  }

  public static getStateClippingBvh() {
    const useBVH = ClippingBvh.inst().getUseBVH();
    const helperBVH = ClippingBvh.inst().getHelperBVH();
    const model = ClippingBvh.inst().getModel();
    const wireframe = ClippingBvh.inst().getWireframe();
    const showPlane = ClippingBvh.inst().getShowPlane();

    return { useBVH, helperBVH, model, wireframe, showPlane };
  }

  public static activateClippingBvh() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'activateClippingBvh' });
    } else {
      const model = InitModel.inst().getModel();
      ClippingBvh.inst().initClipping({ model });
      SceneManager.inst().render();
    }
  }

  public static deActivateClippingBvh() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'deActivateClippingBvh' });
    } else {
      ClippingBvh.inst().destroy();
      SceneManager.inst().render();
    }
  }

  public static toggleUseBVH() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleUseBVH' });
      const act = !ClippingBvh.inst().getUseBVH();
      return act;
    } else {
      const act = !ClippingBvh.inst().getUseBVH();
      ClippingBvh.inst().setUseBVH(act);
      return act;
    }
  }

  public static toggleHelperBVH() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleHelperBVH' });
      const act = !ClippingBvh.inst().getHelperBVH();
      return act;
    } else {
      const act = !ClippingBvh.inst().getHelperBVH();
      ClippingBvh.inst().setHelperBVH(act);
      return act;
    }
  }

  public static toggleModel() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleModel' });
      const act = !ClippingBvh.inst().getModel();
      return act;
    } else {
      const act = !ClippingBvh.inst().getModel();
      ClippingBvh.inst().setModel(act);
      return act;
    }
  }

  public static toggleWireframe() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleWireframe' });
      const act = !ClippingBvh.inst().getWireframe();
      return act;
    } else {
      const act = !ClippingBvh.inst().getWireframe();
      ClippingBvh.inst().setWireframe(act);
      return act;
    }
  }

  public static toggleInvertPlane() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleInvertPlane' });
      const act = !ClippingBvh.inst().getInvertPlane();
      return act;
    } else {
      const act = !ClippingBvh.inst().getInvertPlane();
      ClippingBvh.inst().setInvertPlane(act);
      return act;
    }
  }

  public static toggleShowPlane() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'toggleShowPlane' });
      const act = !ClippingBvh.inst().getShowPlane();
      return act;
    } else {
      const act = !ClippingBvh.inst().getShowPlane();
      ClippingBvh.inst().setShowPlane(act);
      return act;
    }
  }

  public static playAnimation() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'playAnimation' });
    } else {
      AnimationManager.inst().play();
    }
  }

  public static pauseAnimation() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'pauseAnimation' });
    } else {
      AnimationManager.inst().pause();
    }
  }

  public static setAnimationPosStart() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationPosStart' });
    } else {
      AnimationManager.inst().setAnimationPosStart();
    }
  }

  public static setAnimationPosEnd() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationPosEnd' });
    } else {
      AnimationManager.inst().setAnimationPosEnd();
    }
  }

  public static resetAnimation() {}

  public static setAnimationIndex(index: number) {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationIndex', index });
    } else {
      AnimationManager.inst().setAnimationIndex(index);
    }
  }

  public static hasAnimations(): boolean {
    return AnimationManager.inst().hasAnimations();
  }

  public static getAnimationMaxDuration(): number {
    return AnimationManager.inst().getAnimationMaxDuration();
  }

  public static setAnimationTime(time: number) {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'setAnimationTime', time });
    } else {
      AnimationManager.inst().setAnimationTime(time);
    }
  }

  public static rebuildAnimationBVH() {
    const isWorker = ThreeApp.inst().isWorker;
    if (isWorker) {
      OffscreenCanvasManager.inst().worker.postMessage({ type: 'rebuildAnimationBVH' });
    } else {
      AnimationManager.inst().rebuildBVHIfNeeded();
    }
  }
}
