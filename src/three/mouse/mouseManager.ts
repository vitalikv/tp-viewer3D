import * as THREE from 'three';

import { threeApp } from '../threeApp';
import { SelectedByData } from '../loaders/data/selectedByData';
import { SelectedMergedByData } from '../loaders/data/selectedMergedByData';
import { SelectionManager } from './selectionManager';
//import { SelectionManager } from './selectionManagerMesh';

export class MouseManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private selectedObj: { objectId: any; g: any; color: any } = { objectId: null, g: null, color: null };
  private activedObj = { items: [] };
  private isDown = false;
  private isMove = false;
  private originalMaterials: Map<string, THREE.Material> = new Map();
  selectionManager: SelectionManager;

  public init(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.0;
    this.raycaster.params.Points.threshold = 0.0;
    this.raycaster.far = 1000;
    this.raycaster.firstHitOnly = true;

    this.mouse = new THREE.Vector2();

    this.selectionManager = new SelectionManager(scene);

    this.domElement.addEventListener('pointerdown', this.pointerDown);
    this.domElement.addEventListener('pointermove', this.pointerMove);
    this.domElement.addEventListener('pointerup', this.pointerUp);

    window.addEventListener('keydown', this.keyDown);
  }

  private keyDown = (event) => {
    //if (event.code === 'Delete') this.deleteSelectedObj();
    //if (event.code === 'Enter') this.addWindow();
    if (event.code === 'Delete') this.hideModel();
  };

  private pointerDown = (event: MouseEvent) => {
    this.isDown = true;
  };

  private pointerMove = (event: MouseEvent) => {
    if (!this.isDown) return;
    this.isMove = true;

    this.calculateMousePosition(event);
    this.updateRaycaster();
  };

  private pointerUp = async (event: MouseEvent) => {
    if (!this.isMove) {
      this.clearSelection();

      this.resetActivedObj();

      this.calculateMousePosition(event);
      this.updateRaycaster();

      let { obj, intersect } = await this.intersectObj({ event });

      const mode = threeApp.modelLoader.getMerge() ? 'mege' : 'tflex';

      if (obj && mode === 'my') {
        await this.mySelect(obj);
      } else if (obj && mode === 'tflex') {
        this.tflexSelect(obj);
      } else if (intersect && mode === 'mege') {
        this.changeColor({ intersect });
      }
    }

    this.isDown = false;
    this.isMove = false;
  };

  private calculateMousePosition(event: MouseEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateRaycaster() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private async intersectObj({ event }: { event: MouseEvent }) {
    let obj: null | THREE.Mesh | THREE.Object3D;
    let intersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> | null;
    obj = null;
    intersect = null;

    if (event.button === 2) return { obj, intersect };

    this.calculateMousePosition(event);
    this.updateRaycaster();

    const model = threeApp.modelLoader.getModel();
    if (!model) return { obj, intersect };

    const intersects = this.raycaster.intersectObjects([model], true);
    //const intersects = this.raycaster.intersectObjects(createModel.meshesWinds, true);

    if (intersects.length > 0) {
      intersect = intersects[0];
      obj = intersect.object;
    }

    return { obj, intersect };
  }

  // мой вариант выделения (нужно доделывать, не все части выделяются)
  private async mySelect(obj) {
    while (obj.parent && !(obj.parent instanceof THREE.Object3D)) {
      obj = obj.parent;
    }

    const targetObject = obj.parent instanceof THREE.Object3D ? obj.parent : obj;

    if (targetObject instanceof THREE.Mesh || targetObject instanceof THREE.Object3D) {
      obj = targetObject;
    }

    console.log('parentNode', obj);

    const selectObjs = async (obj) => {
      const nodeId = await this.findNodeId(obj.uuid);
      console.log('nodeId', nodeId);

      const color = obj.userData.structureData ? 0x00ff00 : 0xff0000;
      const material = new THREE.MeshStandardMaterial({ color, transparent: true, emissive: 0x00ff00, emissiveIntensity: 0.2, opacity: 0.8 });
      const baseMat2 = new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false, opacity: 0.1 });

      obj.traverse((child) => {
        if (child.isMesh) {
          this.setActivedObj({ obj: child });
          child.material = material;
        }
        if (child.isLine) {
          this.setActivedObj({ obj: child });
          child.material = baseMat2;
        }
      });

      if (obj.userData.structureData) {
        const json2 = threeApp.modelLoader.json2;
        const fragment_guid = obj.userData.structureData.fragment_guid.toLowerCase();
        const result = json2.find((item) => item.fragment_guid == fragment_guid);
        console.log(result, obj.userData.structureData.fragment_guid);

        if (result) {
          this.resetActivedObj();

          const guid = result.guid;
          const results2 = json2.filter((item) => item.guid === guid);
          console.log('guids', results2, obj.userData.structureData.description, obj.userData.structureData.number);

          if (results2) {
            const model = threeApp.modelLoader.getModel();

            results2.forEach((element) => {
              const fragment_guid = element.fragment_guid.toLowerCase();

              model.traverse((obj) => {
                if (obj.userData.structureData && obj.userData.structureData.fragment_guid.toLowerCase() === fragment_guid) {
                  let count = 0;

                  obj.traverse((child) => {
                    count++;
                    if (child.isMesh) {
                      this.setActivedObj({ obj: child });
                      child.material = material;
                    }
                    if (child.isLine) {
                      this.setActivedObj({ obj: child });
                      child.material = baseMat2;
                    }
                  });
                }
              });
            });
          }
        }
      }
    };

    if (obj.userData.childrenNodeIds && obj.userData.childrenNodeIds.length > 0) {
      const gltf = threeApp.modelLoader.getJsonGltf();

      for (let i = 0; i < obj.userData.childrenNodeIds.length; i++) {
        const nodeId = obj.userData.childrenNodeIds[i];
        const threeNode = await gltf.parser.getDependency('node', nodeId);
        const nodeInScene = gltf.scene.getObjectByProperty('uuid', threeNode.uuid);
        selectObjs(nodeInScene);
      }
    } else {
      selectObjs(obj);
    }

    console.log('userData.structureData', obj.userData.structureData);
  }

  private tflexSelect(obj) {
    let objs = SelectedByData.getSelectedNode({ obj });
    const color = 0x00ff00;
    const material = new THREE.MeshStandardMaterial({ color, transparent: true, emissive: 0x00ff00, emissiveIntensity: 0.2, opacity: 0.8 });
    const baseMat2 = new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false, opacity: 0.1 });

    if (objs.length === 0) objs = [obj]; // если нет в структуре gltf

    objs.forEach((obj) => {
      obj.traverse((child) => {
        if (child.isMesh) {
          this.setActivedObj({ obj: child });
          child.material = material;
        }
        if (child.isLine) {
          this.setActivedObj({ obj: child });
          child.material = baseMat2;
        }
      });
    });
  }

  private async findNodeId(targetUuid) {
    const gltf = threeApp.modelLoader.getJsonGltf();
    const nodes = gltf.parser.json.nodes;

    for (let nodeId = 0; nodeId < nodes.length; nodeId++) {
      try {
        const obj = await gltf.parser.getDependency('node', nodeId);
        if (obj && obj.uuid === targetUuid) {
          return nodeId;
        }
      } catch (error) {
        continue;
      }
    }
    return null;
  }

  // ----
  private changeColor({ intersect }: { intersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> }) {
    if (!intersect || !intersect.object) return;

    const isMesh = intersect.object instanceof THREE.Mesh;
    const isLine = intersect.object instanceof THREE.Line || intersect.object instanceof THREE.LineSegments;
    console.log(999, intersect.object);
    if (!isMesh && !isLine) return;
    //if (!intersect.object.geometry || !intersect.object.geometry.attributes.objectId) return;

    // const faceIndex = intersect.faceIndex;
    // const geometry = intersect.object.geometry;
    // const objectId = geometry.attributes.objectId.array[faceIndex];
    // const clickedUuid = geometry.userData.uuids[objectId];
    // const parentUuid = geometry.userData.parentUuids[objectId];

    // console.log(objectId, 'Clicked object uuid:', clickedUuid, geometry.userData);

    // // Сначала сбрасываем все выделения
    // this.clearSelection();

    // Выделяем объекты по UUID
    // this.highlightObjectsWithUuid(clickedUuid);
    // this.highlightLinesWithUuid(clickedUuid);

    this.selectionManager.handleObjectClick(intersect);
  }

  private highlightObjectsWithUuid(targetUuid: string) {
    // Используем Set для быстрого доступа вместо traverse
    threeApp.modelLoader.mergedMeshes.forEach((mesh) => {
      const geometry = mesh.geometry;
      if (geometry.userData?.uuids && geometry.userData?.vertexOffsets) {
        this.highlightPartsWithUuidInGeometry(geometry, targetUuid);
      }
    });
  }

  private highlightLinesWithUuid(targetUuid: string) {
    // Используем Set для быстрого доступа вместо traverse
    threeApp.modelLoader.mergedLines.forEach((line) => {
      const geometry = line.geometry;
      if (geometry.userData?.uuids) {
        const { uuids } = geometry.userData;

        if (uuids.includes(targetUuid)) {
          // Сохраняем оригинальный материал если еще не сохранен
          const lineKey = line.uuid;
          if (!this.originalMaterials.has(lineKey)) {
            this.originalMaterials.set(lineKey, line.material);
          }

          const highlightMaterial = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            depthTest: false,
            opacity: 0.1,
          });
          line.material = highlightMaterial;
        }
      }
    });
  }

  private highlightPartsWithUuidInGeometry(geometry: THREE.BufferGeometry, targetUuid: string) {
    const highlightAttr = geometry.attributes.highlight;
    const { vertexOffsets, vertexCounts, uuids, parentUuids } = geometry.userData;

    if (!highlightAttr) return;

    for (let objId = 0; objId < parentUuids.length; objId++) {
      if (parentUuids[objId] === targetUuid) {
        const vertexStart = vertexOffsets[objId];
        const vertexCount = vertexCounts[objId];

        // Устанавливаем флаг выделения для всех вершин объекта
        for (let i = vertexStart; i < vertexStart + vertexCount; i++) {
          highlightAttr.setX(i, 1); // 1 = выделено
        }

        highlightAttr.needsUpdate = true;
        geometry.userData.needsHighlightUpdate = true;
      }
    }
  }

  private clearAllHighlights() {
    // Очищаем выделения в мешах
    threeApp.modelLoader.mergedMeshes.forEach((mesh) => {
      const geometry = mesh.geometry;
      const highlightAttr = geometry.attributes.highlight;

      if (highlightAttr) {
        // Сбрасываем все выделения в атрибуте
        for (let i = 0; i < highlightAttr.count; i++) {
          highlightAttr.setX(i, 0); // 0 = не выделено
        }
        highlightAttr.needsUpdate = true;
        geometry.userData.needsHighlightUpdate = true;
      }
    });

    // Восстанавливаем оригинальные материалы линий
    threeApp.modelLoader.mergedLines.forEach((line) => {
      const lineKey = line.uuid;
      if (this.originalMaterials.has(lineKey)) {
        line.material = this.originalMaterials.get(lineKey);
        this.originalMaterials.delete(lineKey);
      }
    });
  }

  private updateHighlightMaterials() {
    // Обновляем материалы только для мешей, которым это нужно
    threeApp.modelLoader.mergedMeshes.forEach((mesh) => {
      const geometry = mesh.geometry;

      if (geometry.userData?.needsHighlightUpdate) {
        this.applyHighlightMaterial(mesh);
        geometry.userData.needsHighlightUpdate = false;
      }
    });
  }

  private applyHighlightMaterial(mesh: THREE.Mesh) {
    const geometry = mesh.geometry;
    const highlightAttr = geometry.attributes.highlight;

    if (!highlightAttr) return;

    // Проверяем, есть ли выделенные вершины
    let hasHighlight = false;
    for (let i = 0; i < highlightAttr.count; i++) {
      if (highlightAttr.getX(i) > 0.5) {
        hasHighlight = true;
        break;
      }
    }

    const meshKey = mesh.uuid;

    if (hasHighlight) {
      // Сохраняем оригинальный материал если еще не сохранен
      if (!this.originalMaterials.has(meshKey)) {
        this.originalMaterials.set(meshKey, mesh.material);
      }

      // Применяем материал выделения
      if (!(mesh.material instanceof THREE.MeshStandardMaterial) || (mesh.material as THREE.MeshStandardMaterial).emissive?.getHex() !== 0x00ff00) {
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          transparent: true,
          emissive: 0x00ff00,
          emissiveIntensity: 0.2,
          opacity: 0.8,
        });
      }
    } else {
      // Возвращаем оригинальный материал
      if (this.originalMaterials.has(meshKey)) {
        mesh.material = this.originalMaterials.get(meshKey);
        this.originalMaterials.delete(meshKey);
      }
    }
  }

  public clearSelection() {
    this.clearAllHighlights();
    this.updateHighlightMaterials();
  }

  // ----
  private getActivedObj() {
    return this.activedObj;
  }
  private setActivedObj({ obj }: { obj: any }) {
    if (!obj) return;

    obj.traverse((child) => {
      if (child.isMesh || child.isLine) {
        this.activedObj.items.push({ obj: child, mat: child.material });

        if (child.isMesh && threeApp.effectsManager && threeApp.effectsManager.enabled) {
          threeApp.outlineSelection.addOutlineObject(child);
        }
      }
    });
  }

  private resetActivedObj() {
    const activedObj = this.getActivedObj();
    activedObj.items.forEach((item) => {
      item.obj.material = item.mat;
    });

    if (threeApp.effectsManager && threeApp.effectsManager.enabled) {
      threeApp.outlineSelection.clearOutlineObjects();
    }

    this.clearActivedObj();
  }

  private clearActivedObj() {
    this.activedObj.items.length = 0;
  }
  // ----

  private hideModel() {
    console.log(this.scene, this.scene.children[3]);
    this.scene.children[3].visible = false;
  }
}
