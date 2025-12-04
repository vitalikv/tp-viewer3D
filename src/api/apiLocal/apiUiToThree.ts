import { SceneManager } from '../../three/scene/sceneManager';
import { ModelLoader } from '../../three/model/modelLoader';
import { ClippingBvh } from '../../three/clipping/clippingBvh';
import { AnimationManager } from '../../three/animation/animationManager';

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
