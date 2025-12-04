import { SceneManager } from '@/threeApp/scene/sceneManager';
import { ModelLoader } from '@/threeApp/model/modelLoader';
import { ClippingBvh } from '@/threeApp/clipping/clippingBvh';
import { AnimationManager } from '@/threeApp/animation/animationManager';

export class ApiUiToThree {
  public static setPlanePosition(x: number, y: number, z: number) {
    if (!ClippingBvh.inst()) return;

    ClippingBvh.inst().setPlanePosition(x, y, z);
    SceneManager.inst().render();
  }

  public static setPlaneRotation(x: number, y: number, z: number) {
    if (!ClippingBvh.inst()) return;

    ClippingBvh.inst().setPlaneRotation(x, y, z);
    SceneManager.inst().render();
  }

  public static resetPlane() {
    if (!ClippingBvh.inst()) return;

    ClippingBvh.inst().resetPlane();
    SceneManager.inst().render();
  }

  public static getStateClippingBvh() {
    if (!ClippingBvh.inst()) return;

    const useBVH = ClippingBvh.inst().getUseBVH();
    const helperBVH = ClippingBvh.inst().getHelperBVH();
    const model = ClippingBvh.inst().getModel();
    const wireframe = ClippingBvh.inst().getWireframe();
    const showPlane = ClippingBvh.inst().getShowPlane();

    return { useBVH, helperBVH, model, wireframe, showPlane };
  }

  public static activateClippingBvh() {
    if (!ClippingBvh.inst()) return;

    const model = ModelLoader.inst().getModel();
    ClippingBvh.inst().initClipping({ model });
    SceneManager.inst().render();
  }

  public static deActivateClippingBvh() {
    if (!ClippingBvh.inst()) return;

    ClippingBvh.inst().destroy();
    SceneManager.inst().render();
  }

  public static toggleUseBVH() {
    if (!ClippingBvh.inst()) return;

    const act = !ClippingBvh.inst().getUseBVH();
    ClippingBvh.inst().setUseBVH(act);

    return act;
  }

  public static toggleHelperBVH() {
    if (!ClippingBvh.inst()) return;

    const act = !ClippingBvh.inst().getHelperBVH();
    ClippingBvh.inst().setHelperBVH(act);

    return act;
  }

  public static toggleModel() {
    if (!ClippingBvh.inst()) return;

    const act = !ClippingBvh.inst().getModel();
    ClippingBvh.inst().setModel(act);

    return act;
  }

  public static toggleWireframe() {
    if (!ClippingBvh.inst()) return;

    const act = !ClippingBvh.inst().getWireframe();
    ClippingBvh.inst().setWireframe(act);

    return act;
  }

  public static toggleInvertPlane() {
    if (!ClippingBvh.inst()) return;

    const act = !ClippingBvh.inst().getInvertPlane();
    ClippingBvh.inst().setInvertPlane(act);

    return act;
  }

  public static toggleShowPlane() {
    if (!ClippingBvh.inst()) return;

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
