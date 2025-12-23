import * as THREE from 'three';
import { ContextSingleton } from '@/core/ContextSingleton';
import { SceneManager } from '@/threeApp/scene/SceneManager';
import { InitModel } from '@/threeApp/model/InitModel';
import { MouseManager } from '@/threeApp/scene/MouseManager';
import { SelectionHandler } from '@/threeApp/selection/SelectionHandler';
import { BVHManager } from '@/threeApp/bvh/bvhManager';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { EffectsManager } from '@/threeApp/scene/EffectsManager';
import { OutlineSelection } from '@/threeApp/selection/OutlineSelection';
import { WatermarkCanvas, IWatermarkParams } from '@/watermark/WatermarkCanvas';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { ViewCube } from '@/threeApp/scene/ViewCube';
import { OffscreenCanvasManager } from '@/threeApp/worker/offscreenCanvasManager';

export class ThreeApp extends ContextSingleton<ThreeApp> {
  public isWorker = true;

  async init() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    const rect = canvas.getBoundingClientRect();
    const rectParams = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    };

    //this.initWatermark();

    if (this.isWorker) {
      OffscreenCanvasManager.inst().init({ canvas });
    } else {
      await SceneManager.inst().init({ canvas, rect: rectParams });
      InitModel.inst();
      SelectionHandler.inst();
      MouseManager.inst();
      OutlineSelection.inst();
      BVHManager.inst();
      ClippingBvh.inst();
      AnimationManager.inst();

      EffectsManager.inst().init({ scene: SceneManager.inst().scene, camera: SceneManager.inst().camera, renderer: SceneManager.inst().renderer });
      OutlineSelection.inst().init({ outlinePass: EffectsManager.inst().outlinePass, composer: EffectsManager.inst().composer });
      MouseManager.inst().init(SceneManager.inst().camera, SceneManager.inst().renderer.domElement);
      BVHManager.inst().init();
      InitModel.inst().setMerge({ merge: true });

      const resizeHandler = () => {
        const rect = canvas.getBoundingClientRect();
        SceneManager.inst().setClientRect({ width: rect.width, height: rect.height, left: rect.left, top: rect.top });
        SceneManager.inst().cameraManager.resize();
      };
      const resizeObserver = new ResizeObserver(resizeHandler);
      resizeObserver.observe(canvas);
    }

    const container = document.getElementById('container');
    if (this.isWorker) {
      this.initViewCubeWorker(container);
    } else {
      new ViewCube({ container, controls: SceneManager.inst().controls, animate: () => SceneManager.inst().render() });
    }
  }

  private initWatermark() {
    const params: IWatermarkParams = {
      activated: true, // вкл/выкл watermark
      contentType: 'datetime', // 'datetime' | 'text' показывать время или текст
      text: '', // если указанно в contentType: 'text', то можно задать свой текст
      textColor: '#000000', // цвет текста
      opacityText: 0.7, // прозрачность текста
      opacityLogo: 0.3, // прозрачность логотипа
      fontSize: 16, // размер текста
      width: 150,
      height: 100,
      urlLogo: './assets/watermark/application.svg', // ссылка на логотип
      //urlLogo: 'https://static.tildacdn.com/tild6339-3233-4234-a137-643165663664/logo_rosatom.png',
      scaleLogo: 2, // насколько увеличить логотип (масштаб)
      padding: 0,
      spacing: 100, // отступы логотипов друг от друга
    };

    WatermarkCanvas.setParams(params);
  }

  private initViewCubeWorker(container) {
    const camera = new THREE.PerspectiveCamera();
    const gizmoPos = new THREE.Vector3();
    const listeners = new Map();

    const addListener = (event, callback) => {
      const arr = listeners.get(event) || [];
      arr.push(callback);
      listeners.set(event, arr);
    };

    const removeListener = (event, callback) => {
      const arr = listeners.get(event);
      if (!arr) return;
      const idx = arr.indexOf(callback);
      if (idx >= 0) {
        arr.splice(idx, 1);
      }
    };

    const dispatch = (event) => {
      const arr = listeners.get(event);
      if (!arr) return;
      arr.forEach((cb) => cb());
    };

    const controlsProxy = {
      object: camera,
      _gizmos: { position: gizmoPos },
      addEventListener: addListener,
      removeEventListener: removeListener,
      update: () => {},
    } as any;

    const viewCube = new ViewCube({
      container,
      controls: controlsProxy,
      animate: () => {},
      onOrientationChange: ({ position, quaternion, up }) => {
        OffscreenCanvasManager.inst().setCameraPose({ position, quaternion, up });
      },
    });

    OffscreenCanvasManager.inst().onCameraState((data) => {
      camera.position.fromArray(data.position);
      camera.quaternion.fromArray(data.quaternion);
      camera.up.fromArray(data.up);
      gizmoPos.fromArray(data.gizmoPosition || [0, 0, 0]);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      dispatch('change');
      viewCube.updateViewCube();
    });
  }
}
