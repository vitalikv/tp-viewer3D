import * as THREE from 'three';
import { SceneManager } from '../scene/sceneManager';

export class ModelWorker {
  private worker: Worker;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: any; // Замените на ваш тип контролов
  private loadingElement: HTMLElement;
  private materialsCache: Record<string, THREE.Material> = {};

  constructor() {
    this.worker = new Worker(new URL('workers/gltfWorker.ts', import.meta.url), { type: 'module' });
    const sceneManager = SceneManager.inst();
    if (!sceneManager.scene || !sceneManager.camera || !sceneManager.controls) {
      throw new Error('SceneManager must be initialized before creating ModelWorker');
    }
    this.scene = sceneManager.scene;
    this.camera = sceneManager.camera;
    this.controls = sceneManager.controls;
    // this.loadingElement = loadingElement;
    console.log(this.worker, this.scene);
    this.setupWorkerListeners();
  }

  private setupWorkerListeners(): void {
    this.worker.onmessage = (e) => {
      const { type, data } = e.data;

      switch (type) {
        case 'model_loaded':
          this.handleModelLoaded(data);
          break;
        case 'loading_progress':
          this.handleLoadingProgress(data);
          break;
        case 'error':
          this.handleError(data);
          break;
        default:
          console.warn(`Unknown message type: ${type}`);
      }
    };
  }

  private handleModelLoaded({ objectsData, materialsData }: { objectsData: any[]; materialsData: any[] }): void {
    // Создаем материалы
    this.createMaterials(materialsData);

    // Создаем и иерархию объектов
    const { objectsMap, rootObjects } = this.createObjects(objectsData);
    this.buildHierarchy(objectsData, objectsMap);

    // Добавляем на сцену и центрируем
    this.addToScene(rootObjects);
    this.centerScene(rootObjects);

    // this.loadingElement.textContent = `Загружено: ${objectsData.length} объектов`;
  }

  private createMaterials(materialsData: any[]): void {
    materialsData.forEach((materialData) => {
      const material = this.createMaterialByType(materialData);
      this.applyMaterialProperties(material, materialData);
      this.materialsCache[materialData.uuid] = material;
    });
  }

  private createMaterialByType(materialData: any): THREE.Material {
    switch (materialData.type) {
      case 'MeshStandard':
        return new THREE.MeshStandardMaterial();
      case 'MeshPhong':
        return new THREE.MeshPhongMaterial();
      case 'MeshBasic':
        return new THREE.MeshBasicMaterial();
      case 'MeshPhysical':
        return new THREE.MeshPhysicalMaterial();
      case 'MeshLambert':
        return new THREE.MeshLambertMaterial();
      case 'LineBasic':
        return new THREE.LineBasicMaterial();
      default:
        return new THREE.MeshStandardMaterial();
    }
  }

  private applyMaterialProperties(material: THREE.Material, materialData: any): void {
    material.color.setHex(materialData.color);

    for (const [key, value] of Object.entries(materialData.options)) {
      if (key in material) {
        try {
          (material as any)[key] = value;
        } catch (e) {
          console.warn(`Failed to set material property ${key}:`, e);
        }
      }
    }

    if (materialData.map) {
      const texLoader = new THREE.TextureLoader();
      (material as any).map = texLoader.load(materialData.map);
      material.needsUpdate = true;
    }
  }

  private createObjects(objectsData: any[]): {
    objectsMap: Map<string, THREE.Object3D>;
    rootObjects: THREE.Object3D[];
  } {
    const objectsMap = new Map<string, THREE.Object3D>();
    const rootObjects: THREE.Object3D[] = [];

    objectsData.forEach((objData) => {
      const object = this.createObject(objData);
      if (object) {
        objectsMap.set(objData.uuid, object);
        if (!objData.parentUuid) {
          rootObjects.push(object);
        }
      }
    });

    return { objectsMap, rootObjects };
  }

  private createObject(objData: any): THREE.Object3D | null {
    if (objData.type === 'Mesh' || objData.type === 'InstancedMesh' || objData.type === 'Line' || objData.type === 'LineSegments') {
      const geometry = this.createGeometry(objData.geometryData);
      return this.createMeshObject(objData, geometry);
    }

    return this.createBasicObject(objData);
  }

  private createGeometry(geometryData: any): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    // Восстанавливаем атрибуты
    for (const [key, attrData] of Object.entries(geometryData.attributes)) {
      const { array, itemSize, type, normalized } = attrData as any;
      geometry.setAttribute(key, new THREE.BufferAttribute(this.createTypedArray(array, type), itemSize, normalized));
    }

    // Восстанавливаем index
    if (geometryData.index) {
      const { array, type } = geometryData.index;
      geometry.setIndex(new THREE.BufferAttribute(this.createTypedArray(array, type), 1));
    }

    return geometry;
  }

  private createTypedArray(array: number[], type: string): ArrayLike<number> {
    switch (type) {
      case 'Float32Array':
        return new Float32Array(array);
      case 'Uint16Array':
        return new Uint16Array(array);
      case 'Uint32Array':
        return new Uint32Array(array);
      case 'Int8Array':
        return new Int8Array(array);
      case 'Int16Array':
        return new Int16Array(array);
      case 'Int32Array':
        return new Int32Array(array);
      default:
        return new Float32Array(array);
    }
  }

  private createMeshObject(objData: any, geometry: THREE.BufferGeometry): THREE.Object3D {
    if (objData.type === 'Mesh') {
      const meshMaterials = objData.materialUuids.map((uuid: string) => this.materialsCache[uuid]);
      return new THREE.Mesh(geometry, meshMaterials.length > 1 ? meshMaterials : meshMaterials[0]);
    }

    if (objData.type === 'Line' || objData.type === 'LineSegments') {
      const material = this.materialsCache[objData.materialUuids[0]];
      const Constructor = objData.type === 'Line' ? THREE.Line : THREE.LineSegments;
      return new Constructor(geometry, material);
    }

    if (objData.type === 'InstancedMesh') {
      const material = this.materialsCache[objData.materialUuids[0]];
      const mesh = new THREE.InstancedMesh(geometry, material, objData.count);

      const matricesArray = new Float32Array(objData.matricesArray);
      for (let i = 0; i < objData.count; i++) {
        const matrix = new THREE.Matrix4().fromArray(matricesArray, i * 16);
        mesh.setMatrixAt(i, matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    }

    return new THREE.Object3D();
  }

  private createBasicObject(objData: any): THREE.Object3D {
    const object = new THREE.Object3D();
    object.uuid = objData.uuid;
    object.position.fromArray(objData.position);
    object.rotation.fromArray(objData.rotation);
    object.scale.fromArray(objData.scale);
    object.name = objData.name;
    return object;
  }

  private buildHierarchy(objectsData: any[], objectsMap: Map<string, THREE.Object3D>): void {
    objectsData.forEach((objData) => {
      const object = objectsMap.get(objData.uuid);
      if (object && objData.parentUuid) {
        const parent = objectsMap.get(objData.parentUuid);
        parent?.add(object);
      }
    });
  }

  private addToScene(objects: THREE.Object3D[]): void {
    objects.forEach((obj) => this.scene.add(obj));
  }

  private centerScene(objects: THREE.Object3D[]): void {
    const box = new THREE.Box3().setFromObject(this.scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    this.scene.position.sub(center);
    this.camera.position.z = size.length() * 1.5;
    this.controls.update();
  }

  private handleLoadingProgress(progress: number): void {
    // this.loadingElement.textContent = `Загрузка: ${progress}%`;
    console.log(`Загрузка: ${progress}%`);
  }

  private handleError(error: string): void {
    // this.loadingElement.textContent = `Ошибка: ${error}`;
    console.error('Ошибка загрузки модели:', error);
  }

  public loadModel(file: File): void {
    if (!file.name.match(/\.(glb|gltf)$/i)) {
      // this.loadingElement.textContent = 'Пожалуйста, выберите файл .glb или .gltf';
      return;
    }

    // this.loadingElement.textContent = 'Загрузка...';

    const reader = new FileReader();
    reader.onload = (event) => {
      this.worker.postMessage(
        {
          type: 'load_model',
          buffer: event.target?.result,
          filename: file.name,
        },
        [event.target?.result as ArrayBuffer]
      );
    };
    reader.readAsArrayBuffer(file);
  }

  public dispose(): void {
    this.worker.terminate();
    Object.values(this.materialsCache).forEach((material) => material.dispose());
  }
}
