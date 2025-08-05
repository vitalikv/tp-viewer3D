import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MergeMeshes } from './mergeMeshes';

import { threeApp } from '../threeApp';

export class ModelLoader {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private isMerge = false;
  private isWorker = false;

  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('three/examples/jsm/libs/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  public setMerge({ merge }: { merge: boolean }) {
    this.isMerge = merge;
  }

  private getMerge() {
    return this.isMerge;
  }

  public setWorker({ worker }: { worker: boolean }) {
    this.isWorker = worker;
  }

  private getWorker() {
    return this.isWorker;
  }

  public handleFileLoad = (e) => {
    const contents = e.target.result;

    const merge = this.getMerge();
    console.log('merge', merge);

    this.loader.parse(
      contents,
      '',
      (gltf) => {
        let model = gltf.scene;

        this.centerModel(model);

        if (merge) {
          model = MergeMeshes.processModelWithMerge(model);
        }

        threeApp.sceneManager.scene.add(model);

        threeApp.bvhManager.setupBVH(model);

        threeApp.sceneManager.renderer.render(threeApp.sceneManager.scene, threeApp.sceneManager.camera);
        console.log(threeApp.sceneManager.renderer.info.programs);
        console.log(threeApp.sceneManager.renderer.info.render);
        console.log(threeApp.sceneManager.renderer.info.memory);
      },
      (error) => {
        console.error('ошибка загрузки:', error);
      }
    );
  };

  private centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Настраиваем камеру под размер модели
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    threeApp.sceneManager.camera.position.z = maxDim * 1.5;
    threeApp.sceneManager.controls.target.copy(center);
    threeApp.sceneManager.controls.update();
  }
}
