import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';

class GLTFWorker {
  private loader: THREE.GLTFLoader;
  private materialsMap: Map<string, THREE.Material>;

  constructor() {
    this.loader = new GLTFLoader();
    this.materialsMap = new Map();
    self.onmessage = this.handleMessage.bind(this);
  }

  private handleMessage(e: MessageEvent) {
    const { type, buffer } = e.data;
    if (type === 'load_model') {
      this.loadModel(buffer).catch((error) => {
        self.postMessage({
          type: 'error',
          data: `Model loading failed: ${error.message}`,
        });
      });
    }
  }

  private async loadModel(buffer: ArrayBuffer) {
    try {
      const gltf = await this.parseGLTF(buffer);
      const { objectsData, materialsData } = await this.serializeScene(gltf.scene);

      self.postMessage({
        type: 'model_loaded',
        data: { objectsData, materialsData },
      });
    } catch (error) {
      throw new Error(`Model processing failed: ${error.message}`);
    }
  }

  private parseGLTF(buffer: ArrayBuffer): Promise<THREE.GLTF> {
    return new Promise((resolve, reject) => {
      this.loader.parse(buffer, '', resolve, (xhr) => {
        if (xhr.lengthComputable) {
          self.postMessage({
            type: 'loading_progress',
            data: ((xhr.loaded / xhr.total) * 100).toFixed(2),
          });
        }
      });
    });
  }

  private async serializeScene(scene: THREE.Scene) {
    this.materialsMap.clear();
    const objectsData: any[] = [];
    const materialsData: any[] = [];

    const serializeNode = (node: THREE.Object3D, parentUuid: string | null = null) => {
      const nodeData: any = {
        uuid: node.uuid,
        type: node.type,
        name: node.name || 'unnamed',
        parentUuid,
        position: node.position.toArray(),
        rotation: node.rotation.toArray(),
        scale: node.scale.toArray(),
      };

      // Обработка геометрии и материалов
      if (this.isRenderable(node)) {
        if (node.geometry) {
          nodeData.geometryData = this.serializeGeometry(node.geometry);
        }

        if (node.material) {
          nodeData.materialUuids = this.processMaterials(node.material);
        }

        if ((node as THREE.InstancedMesh).isInstancedMesh) {
          this.serializeInstancedMesh(node as THREE.InstancedMesh, nodeData);
        }
      }

      // Рекурсивная обработка детей
      node.children.forEach((child) => {
        objectsData.push(serializeNode(child, node.uuid));
      });

      return nodeData;
    };

    // Обработка корневых объектов
    scene.children.forEach((child) => {
      objectsData.push(serializeNode(child));
    });

    // Сериализация материалов
    this.materialsMap.forEach((material) => {
      materialsData.push(this.serializeMaterial(material));
    });

    return { objectsData, materialsData };
  }

  private isRenderable(node: THREE.Object3D): boolean {
    return (node as THREE.Mesh).isMesh || (node as THREE.Line).isLine || (node as THREE.LineSegments).isLineSegments || (node as THREE.InstancedMesh).isInstancedMesh;
  }

  private processMaterials(material: THREE.Material | THREE.Material[]): string[] {
    const materials = Array.isArray(material) ? material : [material];
    return materials
      .map((m) => {
        if (!m || !m.uuid) return '';
        if (!this.materialsMap.has(m.uuid)) {
          this.materialsMap.set(m.uuid, m);
        }
        return m.uuid;
      })
      .filter(Boolean);
  }

  private serializeGeometry(geometry: THREE.BufferGeometry) {
    const geometryData: {
      attributes: Record<
        string,
        {
          array: number[];
          itemSize: number;
          type: string;
          normalized: boolean;
        }
      >;
      index: {
        array: number[];
        type: string;
        normalized: boolean;
      } | null;
    } = {
      attributes: {},
      index: null,
    };

    // Сериализация индексов
    if (geometry.index) {
      geometryData.index = {
        array: Array.from(geometry.index.array),
        type: geometry.index.array.constructor.name,
        normalized: geometry.index.normalized || false,
      };
    }

    // Сериализация атрибутов с правильной типизацией
    Object.entries(geometry.attributes).forEach(([name, attr]) => {
      const bufferAttr = attr as THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
      if (!bufferAttr || !('array' in bufferAttr)) return;

      geometryData.attributes[name] = {
        array: Array.from(bufferAttr.array),
        itemSize: bufferAttr.itemSize,
        type: bufferAttr.array.constructor.name,
        normalized: bufferAttr.normalized || false,
      };
    });

    return geometryData;
  }

  private serializeInstancedMesh(mesh: THREE.InstancedMesh, nodeData: any) {
    const matricesArray = new Float32Array(mesh.count * 16);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, new THREE.Matrix4()).toArray(matricesArray, i * 16);
    }
    nodeData.matricesArray = Array.from(matricesArray);
    nodeData.count = mesh.count;
  }

  private serializeMaterial(material: THREE.Material) {
    const type = this.getMaterialType(material);
    const materialData: any = {
      type,
      uuid: material.uuid,
      color: (material as any).color?.getHex() || 0xffffff,
      options: {},
    };

    // Сохраняем цвет для всех типов материалов
    if ('color' in material) {
      materialData.color = (material as any).color.getHex();
    }

    // Копируем только нужные свойства
    Object.entries(material).forEach(([key, value]) => {
      if (key !== 'uuid' && key !== 'type' && key !== 'color' && key !== 'map') {
        materialData.options[key] = value;
      }
    });

    return materialData;
  }

  private getMaterialType(material: THREE.Material): string {
    if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) return 'MeshStandard';
    if ((material as THREE.MeshPhongMaterial).isMeshPhongMaterial) return 'MeshPhong';
    if ((material as THREE.MeshBasicMaterial).isMeshBasicMaterial) return 'MeshBasic';
    if ((material as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) return 'MeshPhysical';
    if ((material as THREE.MeshLambertMaterial).isMeshLambertMaterial) return 'MeshLambert';
    if ((material as THREE.LineBasicMaterial).isLineBasicMaterial) return 'LineBasic';
    return 'MeshStandard';
  }
}

const worker = new GLTFWorker();
