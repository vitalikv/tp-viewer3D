import { SceneManager } from './core/sceneManager';
import { ModelFileLoader } from './loaders/modelFileLoader';
import { ModelLoader } from './loaders/modelLoader';
import { MouseManager } from './mouse/mouseManager';
import { BVHManager } from './bvh/bvhManager';

import { RenderWorker } from './render/initRenderWorker';

class ThreeApp {
  sceneManager: SceneManager;
  modelFileLoader: ModelFileLoader;
  modelLoader: ModelLoader;
  mouseManager: MouseManager;
  bvhManager: BVHManager;

  constructor() {
    this.sceneManager = new SceneManager();
    this.modelFileLoader = new ModelFileLoader();
    this.modelLoader = new ModelLoader();
    this.mouseManager = new MouseManager();
    this.bvhManager = new BVHManager();

    this.mouseManager.init(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer.domElement);

    this.modelLoader.setMerge({ merge: false });
    //this.bvhManager.init();

    // const canvas = document.createElement('canvas');
    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;
    // document.getElementById('container')?.appendChild(canvas);
    // new RenderWorker(canvas);
  }
}

export const threeApp = new ThreeApp();
