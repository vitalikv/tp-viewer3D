import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MergeMeshes } from './mergeMeshes';
import { MergeEnvironmentUtils } from '../model/mergeEnvironmentUtils';
import { GltfStructure } from '../model/gltfStructure';

import { threeApp } from '../threeApp';

import { InitData } from './data/InitData';

export class ModelLoader {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private isMerge = false;
  private isWorker = false;
  private model;
  private jsonGltf;
  public json2;
  public initData: InitData;
  public mergedMeshes: Set<THREE.Mesh> = new Set();
  public mergedLines: Set<THREE.Line | THREE.LineSegments> = new Set();

  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('three/examples/jsm/libs/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);

    this.loadJSON();
  }

  getJsonGltf() {
    return this.jsonGltf;
  }

  getModel() {
    return this.model;
  }

  public setMerge({ merge }: { merge: boolean }) {
    this.isMerge = merge;
  }

  public getMerge() {
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

    // Конвертируем ArrayBuffer в строку
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(contents);

    // Парсим JSON
    try {
      const jsonData = JSON.parse(jsonString);
      console.log('Распарсенный JSON:', jsonData);
    } catch (err) {
      console.error('Ошибка парсинга JSON:', err);
    }

    const merge = this.getMerge();
    console.log('merge', merge);

    this.loader.parse(
      contents,
      '',
      async (gltf) => {
        let model = gltf.scene;

        this.initData = new InitData({ structure: gltf.parser.json.extras.tflex.structure, gltf });

        this.centerModel(model);

        //model = MergeEnvironmentUtils.mergeObj(model);

        if (merge) {
          const { mergedMeshes, mergedLines } = MergeMeshes.processModelWithMerge(model);
          const group = new THREE.Group();
          group.add(...mergedMeshes, ...mergedLines);
          model = group;

          mergedMeshes.forEach((mesh) => this.mergedMeshes.add(mesh));
          mergedLines.forEach((line) => this.mergedLines.add(line));
        }

        threeApp.bvhManager.setupBVH(model);
        //console.log(gltf, contents);

        threeApp.sceneManager.scene.add(model);
        this.model = model;
        this.jsonGltf = gltf;

        if (1 === 2) {
          const gltfStructure = new GltfStructure();
          gltfStructure.initStructure({ gltf });
          //await gltfStructure.selectedNode({ gltf, model, nodeId: 759 });
        }

        threeApp.sceneManager.renderer.render(threeApp.sceneManager.scene, threeApp.sceneManager.camera);
        // console.log(threeApp.sceneManager.renderer.info.programs);
        // console.log(threeApp.sceneManager.renderer.info.render);
        // console.log(threeApp.sceneManager.renderer.info.memory);
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

  async loadJSON() {
    const response = await fetch('./assets/СЕ-00-00 - Сборка - A.1 (1).json'); // путь к вашему файлу
    //const response = await fetch('./assets/ТРР-1-000 - Транспортер - A.1 (5).json');
    //const response = await fetch('./assets/ТРДДФ-1-000 - Двигатель - A.1.json');

    const jsonData = await response.json();
    console.log('Загруженный JSON:', jsonData);

    this.json2 = jsonData;

    return jsonData;
  }

  public dispose() {
    this.mergedMeshes.clear();
    this.mergedLines.clear();
    //this.originalMaterials.clear();
  }
}
