import * as THREE from 'three';
//import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js'; не работает в воркере
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { SceneManager } from '@/threeApp/scene/SceneManager';
import { ContextSingleton } from '@/core/ContextSingleton';
import { AnimationManager } from '@/threeApp/animation/AnimationManager';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { BVHManager } from '@/threeApp/bvh/BvhManager';
import { InitData } from '@/threeApp/model/structure/InitData';
import { InitMergedModel } from '@/threeApp/mergedModel/InitMergedModel';
import { MergeAnimation } from '@/threeApp/mergedModel/MergeAnimation';

export class InitModel extends ContextSingleton<InitModel> {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private isMerge = false;
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

  private findDuplicateGeometries(scene: THREE.Object3D) {
    const geometryMap = new Map();

    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
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
      return false;
    }
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(contents);

    try {
      const jsonData = JSON.parse(jsonString);

      if (jsonData.animations && Array.isArray(jsonData.animations) && jsonData.animations.length > 0) {
        // Модель содержит анимации
      }
    } catch (err) {
      console.error('Ошибка парсинга JSON:', err);
    }

    const merge = this.getMerge();

    const gltf = await this.loader.parseAsync(contents, './public/assets/opt/');

    let model = gltf.scene;

    this.findDuplicateGeometries(model);

    this.initData = new InitData({ structure: gltf.parser.json.extras?.tflex.structure, gltf });

    this.centerModel(model);

    //model = MergeEnvironmentUtils.mergeObj(model);

    if (merge) {
      model = this.modelMerged({ model });
    } else {
      this.simpleModel({ model });
    }

    SceneManager.inst().scene.add(model);
    this.model = model as THREE.Group;
    this.jsonGltf = gltf;

    if (gltf.animations && gltf.animations.length > 0 && AnimationManager.inst()) {
      AnimationManager.inst().initAnimations(gltf.animations, model);
    }

    SceneManager.inst().render();

    return true;
  };

  private centerModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius || maxDim * 0.5;

    SceneManager.inst().cameraManager.zoomCameraToFitModel({ center: new THREE.Vector3(0, 0, 0), radius, maxDim });
  }

  private modelMerged({ model }: { model: THREE.Object3D }): THREE.Group {
    const mergedModel = InitMergedModel.init({ model: model as THREE.Group });

    return mergedModel;
  }

  private simpleModel({ model }: { model: THREE.Object3D }) {
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
