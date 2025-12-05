import { SceneManager } from '@/threeApp/scene/sceneManager';
import { InitModel } from '@/threeApp/model/initModel';
import { ClippingBvh } from '@/threeApp/clipping/clippingBvh';
import { AnimationManager } from '@/threeApp/animation/animationManager';

export class ApiUiToThree {
  public static setPlanePosition(x: number, y: number, z: number) {
    ClippingBvh.inst().setPlanePosition(x, y, z);
    SceneManager.inst().render();
  }

  public static setPlaneRotation(x: number, y: number, z: number) {
    ClippingBvh.inst().setPlaneRotation(x, y, z);
    SceneManager.inst().render();
  }

  public static resetPlane() {
    ClippingBvh.inst().resetPlane();
    SceneManager.inst().render();
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
    const model = InitModel.inst().getModel();
    ClippingBvh.inst().initClipping({ model });
    SceneManager.inst().render();
  }

  public static deActivateClippingBvh() {
    ClippingBvh.inst().destroy();
    SceneManager.inst().render();
  }

  public static toggleUseBVH() {
    const act = !ClippingBvh.inst().getUseBVH();
    ClippingBvh.inst().setUseBVH(act);

    return act;
  }

  public static toggleHelperBVH() {
    const act = !ClippingBvh.inst().getHelperBVH();
    ClippingBvh.inst().setHelperBVH(act);

    return act;
  }

  public static toggleModel() {
    const act = !ClippingBvh.inst().getModel();
    ClippingBvh.inst().setModel(act);

    return act;
  }

  public static toggleWireframe() {
    const act = !ClippingBvh.inst().getWireframe();
    ClippingBvh.inst().setWireframe(act);

    return act;
  }

  public static toggleInvertPlane() {
    const act = !ClippingBvh.inst().getInvertPlane();
    ClippingBvh.inst().setInvertPlane(act);

    return act;
  }

  public static toggleShowPlane() {
    const act = !ClippingBvh.inst().getShowPlane();
    ClippingBvh.inst().setShowPlane(act);

    return act;
  }

  public static playAnimation() {
    AnimationManager.inst().play();
  }

  public static pauseAnimation() {
    AnimationManager.inst().pause();
  }

  public static setAnimationPosStart() {
    AnimationManager.inst().setAnimationPosStart();
  }

  public static setAnimationPosEnd() {
    AnimationManager.inst().setAnimationPosEnd();
  }

  public static resetAnimation() {
    //threeApp.animationManager.resetAnimation();
  }

  public static setAnimationIndex(index: number) {
    AnimationManager.inst().setAnimationIndex(index);
  }
}
