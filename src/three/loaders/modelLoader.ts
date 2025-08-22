import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';
import { MergeMeshes } from './mergeMeshes';
import { MergeEnvironmentUtils } from './mergeEnvironmentUtils';

import { threeApp } from '../threeApp';

export class ModelLoader {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private isMerge = false;
  private isWorker = false;
  private model;
  private jsonGltf;
  public json2;

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

        this.centerModel(model);

        model = MergeEnvironmentUtils.mergeObj(model);

        if (merge) {
          model = MergeMeshes.processModelWithMerge(model);
          threeApp.bvhManager.setupBVH(model);
        }

        console.log(gltf, contents);

        const structure = gltf.parser.json.extras.tflex.structure;
        const nodesMap = new Map(); // Для быстрого поиска structure по nodeId

        // Строим карту: nodeId => structureElement
        structure.forEach((item) => {
          if (item.nodes) {
            item.nodes.forEach((nodeId) => {
              nodesMap.set(nodeId, item);
            });
          }
        });

        gltf.parser.json.nodes.forEach(async (node, index) => {
          if (nodesMap.has(index)) {
            const threeObj = await gltf.parser.getDependency('node', index);
            if (threeObj) {
              threeObj.userData.nodeId = index;
              threeObj.userData.structureData = nodesMap.get(index);

              threeObj.traverse((node) => {
                if (threeObj !== node) node.userData.parentNodeId = index;
              });
            }
          }
        });

        threeApp.sceneManager.scene.add(model);
        this.model = model;
        this.jsonGltf = gltf;

        threeApp.sceneManager.renderer.render(threeApp.sceneManager.scene, threeApp.sceneManager.camera);
        // console.log(threeApp.sceneManager.renderer.info.programs);
        // console.log(threeApp.sceneManager.renderer.info.render);
        // console.log(threeApp.sceneManager.renderer.info.memory);

        const nodeId = 1340;
        const targetNode = gltf.parser.json.nodes[nodeId];
        const threeNode = await gltf.parser.getDependency('node', nodeId);
        const nodeInScene = gltf.scene.getObjectByProperty('uuid', threeNode.uuid);

        // console.log(targetNode, threeNode, nodeInScene);

        // if (nodeInScene) {
        //   model.traverse((obj) => {
        //     if (obj === threeNode) {
        //       console.log('Найден при обходе сцены!', obj);
        //       //nodeInScene.removeFromParent();

        //       obj.children.forEach(async (node, index) => {
        //         node.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        //         //node.material.color = new THREE.Color(0xff0000);
        //       });
        //     }
        //   });
        // }
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
    const response = await fetch('./assets/ТРР-1-000 - Транспортер - A.1.json'); // путь к вашему файлу

    const jsonData = await response.json();
    console.log('Загруженный JSON:', jsonData);

    this.json2 = jsonData;

    return jsonData;
  }
}
