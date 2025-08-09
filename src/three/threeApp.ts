import { SceneManager } from './core/sceneManager';
import { ModelFileLoader } from './loaders/modelFileLoader';
import { ModelLoader } from './loaders/modelLoader';
import { MouseManager } from './mouse/mouseManager';
import { BVHManager } from './bvh/bvhManager';

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

    this.modelLoader.setMerge({ merge: true });
    this.bvhManager.init();
  }
}

export const threeApp = new ThreeApp();
