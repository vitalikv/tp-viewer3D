import { threeApp } from '../../three/threeApp';

export class ApiUiToThree {
  public static setPlanePosition(x: number, y: number, z: number) {
    if (!threeApp.clippingBvh) return;

    threeApp.clippingBvh.setPlanePosition(x, y, z);
    threeApp.sceneManager.render();
  }

  public static setPlaneRotation(x: number, y: number, z: number) {
    if (!threeApp.clippingBvh) return;

    threeApp.clippingBvh.setPlaneRotation(x, y, z);
    threeApp.sceneManager.render();
  }

  public static resetPlane() {
    if (!threeApp.clippingBvh) return;

    threeApp.clippingBvh.resetPlane();
    threeApp.sceneManager.render();
  }

  public static getStateClippingBvh() {
    if (!threeApp.clippingBvh) return;

    const useBVH = threeApp.clippingBvh.getUseBVH();
    const helperBVH = threeApp.clippingBvh.getHelperBVH();
    const model = threeApp.clippingBvh.getModel();
    const wireframe = threeApp.clippingBvh.getWireframe();
    const showPlane = threeApp.clippingBvh.getShowPlane();

    return { useBVH, helperBVH, model, wireframe, showPlane };
  }
}
