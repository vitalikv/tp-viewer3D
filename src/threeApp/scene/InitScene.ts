import { InitModel } from '@/threeApp/model/InitModel';
import { MouseManager } from '@/threeApp/scene/MouseManager';
import { SelectionHandler } from '@/threeApp/selection/SelectionHandler';
import { BVHManager } from '@/threeApp/bvh/BvhManager';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { EffectsManager } from '@/threeApp/scene/EffectsManager';
import { OutlineSelection } from '@/threeApp/selection/OutlineSelection';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { SceneManager } from '@/threeApp/scene/SceneManager';
import { ApiUiToThree } from '@/api/apiLocal/ApiUiToThree';

export class InitScene {
  static async init(options: {
    canvas: HTMLCanvasElement | OffscreenCanvas;
    rect: { width: number; height: number; left: number; top: number };
    initApiUiToThree?: boolean;
    mouseManagerElement?: HTMLElement;
  }) {
    // Инициализация SceneManager
    await SceneManager.inst().init({ canvas: options.canvas, rect: options.rect });

    // Создание всех менеджеров
    InitModel.inst();
    SelectionHandler.inst();
    MouseManager.inst();
    OutlineSelection.inst();
    BVHManager.inst();
    ClippingBvh.inst();
    AnimationManager.inst();

    // Опциональная инициализация ApiUiToThree (только для worker)
    if (options.initApiUiToThree) {
      ApiUiToThree.inst();
    }

    // Инициализация EffectsManager
    EffectsManager.inst().init({
      scene: SceneManager.inst().scene,
      camera: SceneManager.inst().camera,
      renderer: SceneManager.inst().renderer,
    });

    // Инициализация OutlineSelection
    OutlineSelection.inst().init({
      outlinePass: EffectsManager.inst().outlinePass,
      composer: EffectsManager.inst().composer,
    });

    // Инициализация MouseManager (с элементом для основного потока или без для worker)
    let mouseElement = options.mouseManagerElement;
    if (!mouseElement && typeof HTMLCanvasElement !== 'undefined' && options.canvas instanceof HTMLCanvasElement) {
      mouseElement = SceneManager.inst().renderer.domElement;
    }
    if (mouseElement) {
      MouseManager.inst().init(SceneManager.inst().camera, mouseElement);
    } else {
      MouseManager.inst().init(SceneManager.inst().camera);
    }

    BVHManager.inst().init();
    InitModel.inst().setMerge({ merge: true });
  }
}
