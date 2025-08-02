import { SceneManager } from './core/sceneManager';
import { FileUtils } from './utils/fileUtils';
import { ModelLoader } from './loaders/modelLoader';
import { MouseManager } from './mouse/mouseManager';

class ThreeApp {
  sceneManager: SceneManager;
  fileUtils: FileUtils;
  modelLoader: ModelLoader;
  mouseManager: MouseManager;

  constructor() {
    this.sceneManager = new SceneManager();
    this.fileUtils = new FileUtils();
    this.modelLoader = new ModelLoader();
    this.mouseManager = new MouseManager();

    this.mouseManager.init(this.sceneManager.scene, this.sceneManager.camera, this.sceneManager.renderer.domElement);
  }
}

export const threeApp = new ThreeApp();
