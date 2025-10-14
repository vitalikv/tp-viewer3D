import * as THREE from 'three';

import { threeApp } from '../threeApp';
import { SelectedByData } from '../loaders/data/selectedByData';
import { SelectionAdapter } from '../mergedModel/selectionAdapter';
import { SelectionManager } from '../mergedModel/selectionManager';
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

    this.domElement.addEventListener('pointerdown', this.pointerDown);
    this.domElement.addEventListener('pointermove', this.pointerMove);
    this.domElement.addEventListener('pointerup', this.pointerUp);

    window.addEventListener('keydown', this.keyDown);
  }

  private keyDown = (event) => {
    //if (event.code === 'Delete') this.deleteSelectedObj();
    if (event.code === 'Space') this.addWindow();
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
      SelectionManager.clearSelection();

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
        this.tflexMergedSelect({ intersect });
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
    console.time('getSelectedNode');
    let objs = SelectedByData.getSelectedNode({ obj });
    console.timeEnd('getSelectedNode');
    const color = 0x00ff00;
    const material = new THREE.MeshStandardMaterial({ color, transparent: true, emissive: 0x00ff00, emissiveIntensity: 0.2, opacity: 0.8 });
    const baseMat2 = new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false, opacity: 0.1 });

    material.clippingPlanes = threeApp.clippingBvh.getClippingPlanes();

    if (objs.length === 0) objs = [obj]; // если нет в структуре gltf
    console.time('setMergedObjects');
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
    console.timeEnd('setMergedObjects');
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
  private tflexMergedSelect({ intersect }: { intersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> }) {
    if (!intersect || !intersect.object) return;

    const isMesh = intersect.object instanceof THREE.Mesh;
    const isLine = intersect.object instanceof THREE.Line || intersect.object instanceof THREE.LineSegments;
    console.log(999, intersect.object);
    if (!isMesh && !isLine) return;
    //if (!intersect.object.geometry || !intersect.object.geometry.attributes.objectId) return;

    SelectionManager.handleObjectClick(intersect);
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

  private addWindow() {
    // BF1718AF-ADC3-4D9A-882D-79064818655B двигатель
    // 46963348-9A3E-47D8-B69A-72B18A288B7D приметивы
    SelectionManager.selectedByFragmentGuid({ fragment_guid: 'BF1718AF-ADC3-4D9A-882D-79064818655B' });
  }
}
