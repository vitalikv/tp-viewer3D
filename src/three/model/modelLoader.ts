import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';
import { threeApp } from '../threeApp';
import { InitData } from '../loaders/data/InitData';
import { InitMergedModel } from '../mergedModel/initMergedModel';
import { MergeEnvironmentUtils } from './mergeEnvironmentUtils';
import { GltfStructure } from './gltfStructure';

import { SelectionManager } from '../mergedModel/selectionManager';
import { SelectionAdapter } from '../mergedModel/selectionAdapter';
import { MergeModel } from '../mergedModel/mergeModel';
import { MergeAnimation } from '../mergedModel/mergeAnimation';

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

  public getJsonGltf() {
    return this.jsonGltf;
  }

  public getModel() {
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

  private findDuplicateGeometries(scene) {
    const geometryMap = new Map();

    scene.traverse((object) => {
      if (object.isMesh && object.geometry) {
        const geometry = object.geometry;
        const geometryId = geometry.uuid;

        if (!geometryMap.has(geometryId)) {
          geometryMap.set(geometryId, {
            geometry: geometry,
            meshes: [],
            type: geometry.type,
            vertexCount: geometry.attributes.position?.count || 0,
          });
        }

        geometryMap.get(geometryId).meshes.push(object);
      }
    });

    // Фильтруем только дублирующиеся геометрии
    const duplicates = Array.from(geometryMap.values())
      .filter((entry) => entry.meshes.length > 1)
      .sort((a, b) => b.meshes.length - a.meshes.length);

    return duplicates;
  }

  public handleFileLoad = async (e) => {
    const contents = e.target.result;

    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(contents);

    let generator = '';

    try {
      const jsonData = JSON.parse(jsonString);
      generator = jsonData.asset.generator;
      console.log('Распарсенный JSON:', generator, jsonData);

      // Проверка наличия анимаций в модели
      if (jsonData.animations && Array.isArray(jsonData.animations) && jsonData.animations.length > 0) {
        console.log(`✅ Модель содержит анимации. Количество анимаций: ${jsonData.animations.length}`);
      } else {
        console.log('ℹ️ Модель не содержит анимаций');
      }
    } catch (err) {
      console.error('Ошибка парсинга JSON:', err);
    }

    const merge = this.getMerge();
    console.log('merge', merge);

    const gltf = await this.loader.parseAsync(contents, './public/assets/opt/');

    let model = gltf.scene;

    // Использование
    const duplicateGeoms = this.findDuplicateGeometries(model);
    console.log('Дублирующиеся геометрии:', duplicateGeoms);

    this.initData = new InitData({ structure: gltf.parser.json.extras?.tflex.structure, gltf });

    this.centerModel(model);

    //model = MergeEnvironmentUtils.mergeObj(model);

    const typeGenerator = /Optimized/.test(generator);

    if (typeGenerator) {
      this.modelOptimized({ model });
      console.log('модель оптимизированная на nodejs');
    } else if (merge) {
      model = this.modelMerged({ model });
      console.log('модель смержена на клиенте');
    } else {
      this.simpleModel({ model });
      console.log('модель без мержа');
    }

    threeApp.sceneManager.scene.add(model);
    this.model = model;
    this.jsonGltf = gltf;

    if (gltf.animations && gltf.animations.length > 0 && threeApp.animationManager) {
      threeApp.animationManager.initAnimations(gltf.animations, model);
      console.log('🎬 Анимации инициализированы');
    }

    // if (1 === 2) {
    //   const gltfStructure = new GltfStructure();
    //   gltfStructure.initStructure({ gltf });
    //   //await gltfStructure.selectedNode({ gltf, model, nodeId: 759 });
    // }

    threeApp.sceneManager.render();
    //threeApp.sceneManager.renderer.render(threeApp.sceneManager.scene, threeApp.sceneManager.camera);
    // console.log(threeApp.sceneManager.renderer.info.programs);
    // console.log(threeApp.sceneManager.renderer.info.render);
    // console.log(threeApp.sceneManager.renderer.info.memory);
  };

  private centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius || maxDim * 0.5;

    threeApp.sceneManager.cameraManager.zoomCameraToFitModel({ center: new THREE.Vector3(0, 0, 0), radius, maxDim });
  }

  private modelOptimized({ model }) {
    threeApp.bvhManager.setupBVH(model);

    const group = model.children[0];
    const groupMeshes = group.children[0];
    const groupLines = group.children[1];
    const allMeshes: THREE.Mesh[] = [];
    const allLines: (THREE.Line | THREE.LineSegments)[] = [];

    model.updateMatrixWorld(true);

    groupMeshes.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allMeshes.push(child);

        const geometry = child.geometry;
        if (geometry.userData.groups) {
          const { groups } = geometry.userData;
          geometry.groups = groups;
        }
      }
    });

    groupLines.traverse((child) => {
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        allLines.push(child);

        const geometry = child.geometry;
        if (geometry.userData.groups) {
          const { groups } = geometry.userData;
          geometry.groups = groups;
        }
      }
    });

    allMeshes.forEach((mesh) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material) => {
        material.clippingPlanes = threeApp.clippingBvh.getClippingPlanes();
      });
    });

    SelectionManager.setMergedObjects(allMeshes, allLines);

    SelectionAdapter.initializeCache();
  }

  private modelMerged({ model }) {
    model = InitMergedModel.init({ model });

    return model;
  }

  private simpleModel({ model }) {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material;

        if (material) {
          const materials = Array.isArray(material) ? material : [material];
          materials.forEach((material) => {
            material.clippingPlanes = threeApp.clippingBvh.getClippingPlanes();
          });
        }
      }
    });

    threeApp.bvhManager.setupBVH(model);
  }

  private async loadJSON() {
    //return;
    //const response = await fetch('./assets/СЕ-00-00 - Сборка - A.1 (1).json');
    const response = await fetch('./assets/ТРР-1-000 - Транспортер - A.1 (5).json');
    //const response = await fetch('./assets/ТРДДФ-1-000 - Двигатель - A.1.json');
    //const response = await fetch('./assets/РП.00.00 - Редуктор планетарный  - A.1.json');

    const jsonData = await response.json();
    console.log('Загруженный JSON:', jsonData);

    this.json2 = jsonData;
  }

  public dispose() {
    this.mergedMeshes.clear();
    this.mergedLines.clear();

    // Очистка данных анимации для смерженной модели
    MergeAnimation.clearAnimationData();

    // Очистка анимаций
    if (threeApp.animationManager) {
      threeApp.animationManager.dispose();
    }

    //this.originalMaterials.clear();
  }
}
