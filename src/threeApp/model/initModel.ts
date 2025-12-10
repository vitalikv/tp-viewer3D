import * as THREE from 'three';
//import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js'; не работает в воркере
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { SceneManager } from '@/threeApp/scene/sceneManager';
import { ContextSingleton } from '@/core/ContextSingleton';
import { AnimationManager } from '@/threeApp/animation/animationManager';
import { ClippingBvh } from '@/threeApp/clipping/clippingBvh';
import { BVHManager } from '@/threeApp/bvh/bvhManager';
import { InitData } from '@/threeApp/model/structure/InitData';
import { InitMergedModel } from '@/threeApp/mergedModel/initMergedModel';
import { MergeEnvironment } from '@/threeApp/mergedModel/mergeEnvironment';
import { MergeAnimation } from '@/threeApp/mergedModel/mergeAnimation';

export class InitModel extends ContextSingleton<InitModel> {
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
    super();
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

  public handleFileLoad = async (contents) => {
    if (this.getModel()) {
      console.log('модель уже загружена');
      return false;
    }
    console.log('contents', contents);
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(contents);

    try {
      const jsonData = JSON.parse(jsonString);
      const generator = jsonData.asset.generator;
      console.log('Распарсенный JSON:', generator, jsonData);

      if (jsonData.animations && Array.isArray(jsonData.animations) && jsonData.animations.length > 0) {
        console.log(` Модель содержит анимации. Количество анимаций: ${jsonData.animations.length}`);
      } else {
        console.log(' Модель не содержит анимаций');
      }
    } catch (err) {
      console.error('Ошибка парсинга JSON:', err);
    }

    const merge = this.getMerge();
    console.log('merge', merge);

    const gltf = await this.loader.parseAsync(contents, './public/assets/opt/');

    let model = gltf.scene;

    const duplicateGeoms = this.findDuplicateGeometries(model);
    console.log('Дублирующиеся геометрии:', duplicateGeoms);

    this.initData = new InitData({ structure: gltf.parser.json.extras?.tflex.structure, gltf });

    this.centerModel(model);

    //model = MergeEnvironmentUtils.mergeObj(model);

    if (merge) {
      model = this.modelMerged({ model });
      console.log('модель смержена на клиенте');
    } else {
      this.simpleModel({ model });
      console.log('модель без мержа');
    }

    SceneManager.inst().scene.add(model);
    this.model = model;
    this.jsonGltf = gltf;

    if (gltf.animations && gltf.animations.length > 0 && AnimationManager.inst()) {
      AnimationManager.inst().initAnimations(gltf.animations, model);
      console.log('🎬 Анимации инициализированы');
    }

    SceneManager.inst().render();

    return true;
  };

  private centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius || maxDim * 0.5;

    SceneManager.inst().cameraManager.zoomCameraToFitModel({ center: new THREE.Vector3(0, 0, 0), radius, maxDim });
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
            material.clippingPlanes = ClippingBvh.inst().getClippingPlanes();
          });
        }
      }
    });

    BVHManager.inst().setupBVH(model);
  }

  private async loadJSON() {
    //return;
    //const response = await fetch('./assets/СЕ-00-00 - Сборка - A.1 (1).json');
    const url = new URL('/assets/ТРР-1-000 - Транспортер - A.1 (5).json', import.meta.url);
    const response = await fetch(url);
    //const response = await fetch('./assets/ТРДДФ-1-000 - Двигатель - A.1.json');
    //const response = await fetch('./assets/РП.00.00 - Редуктор планетарный  - A.1.json');

    const jsonData = await response.json();
    console.log('Загруженный JSON:', jsonData);

    this.json2 = jsonData;
  }

  public dispose() {
    this.mergedMeshes.clear();
    this.mergedLines.clear();

    MergeAnimation.clearAnimationData();

    if (AnimationManager.inst()) {
      AnimationManager.inst().dispose();
    }
  }
}
