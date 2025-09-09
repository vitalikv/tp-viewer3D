import * as THREE from 'three';

import { threeApp } from '../threeApp';

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
      this.resetSelectedObj();
      this.resetActivedObj();

      this.calculateMousePosition(event);
      this.updateRaycaster();

      let { obj, intersect } = await this.intersectObj({ event });

      if (obj && 1 == 1) {
        console.log('parentNode', obj);

        const selectObjs = async (obj) => {
          const nodeId = await this.findNodeId(obj.uuid);
          console.log('nodeId', nodeId);

          const color = obj.userData.structureData ? 0x00ff00 : 0xff0000;
          const material = new THREE.MeshStandardMaterial({ color, transparent: true, emissive: 0x00ff00, emissiveIntensity: 0.2, opacity: 0.8 });
          const baseMat2 = new THREE.LineBasicMaterial({ color, transparent: true, depthTest: false, opacity: 0.1 });
          //const material = new THREE.MeshStandardMaterial({ color, depthTest: false, transparent: true });
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

                      //console.log('шт: ', count, obj.userData.structureData.description, obj.userData.structureData.number);
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
      } else if (intersect) {
        console.log('2222', intersect);

        if (!intersect || !intersect.object) return;
        if (!(intersect.object instanceof THREE.Mesh)) return;

        const material = new THREE.MeshStandardMaterial({ color: 0xff0000, depthTest: false, transparent: true });

        const obj = intersect.object as THREE.Mesh;

        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            this.setActivedObj({ obj: child });
            child.material = material;
          }
        });

        //this.changeColor({ intersect });
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

    if (intersects.length > 0 && 1 === 2) {
      intersect = intersects[0];
      const object = intersect.object;
      console.log('object', object.userData);

      if (object.userData.nodeId || object.userData.parentNodeId) {
        const gltf = threeApp.modelLoader.getJsonGltf();
        const nodeId = object.userData.nodeId ? object.userData.nodeId : object.userData.parentNodeId;

        const threeNode = await gltf.parser.getDependency('node', nodeId);
        const nodeInScene = gltf.scene.getObjectByProperty('uuid', threeNode.uuid);

        return { obj: nodeInScene, intersect };
      }
    }

    if (intersects.length > 0) {
      intersect = intersects[0];
      let object = intersect.object;

      while (object.parent && !(object.parent instanceof THREE.Object3D)) {
        object = object.parent;
      }

      const targetObject = object.parent instanceof THREE.Object3D ? object.parent : object;

      if (targetObject instanceof THREE.Mesh || targetObject instanceof THREE.Object3D) {
        obj = targetObject;
      }
    }

    return { obj, intersect };
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

  private changeColor({ intersect }: { intersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> }) {
    if (!intersect || !intersect.object) return;
    if (!(intersect.object instanceof THREE.Mesh)) return;
    if (!intersect.object.geometry || !intersect.object.geometry.attributes.objectId) return;
    const faceIndex = intersect.faceIndex;
    const g = intersect.object.geometry;
    const objectId = g.attributes.objectId.array[faceIndex];

    console.log(intersect, faceIndex, objectId);

    this.setColor({ g, objectId });
  }

  setColor({ g, objectId, color = { x: 0, y: 1, z: 0 } }) {
    const colorAttr = g.attributes.color;
    let vertexStart = 0;

    let color2 = null;

    g.userData.gs.forEach((geom, idx) => {
      const vertexCount = geom.attributes.position.count;
      if (idx === objectId) {
        if (!color2) {
          color2 = { x: 0, y: 0, z: 0 };
          color2.x = colorAttr.array[vertexStart * 3];
          color2.y = colorAttr.array[vertexStart * 3 + 1];
          color2.z = colorAttr.array[vertexStart * 3 + 2];
        }
        for (let i = vertexStart; i < vertexStart + vertexCount; i++) {
          colorAttr.setXYZ(i, color.x, color.y, color.z);
        }
      }
      vertexStart += vertexCount;
    });
    colorAttr.needsUpdate = true;

    this.setSelectedObj({ g, objectId, color: color2 });
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

  private getSelectedObj() {
    return this.selectedObj;
  }

  private setSelectedObj({ g, objectId, color }: { g: any; objectId: any; color: any }) {
    this.selectedObj.g = g;
    this.selectedObj.objectId = objectId;
    this.selectedObj.color = color;
  }

  private clearSelectedObj() {
    this.setSelectedObj({ g: null, objectId: null, color: null });
  }

  private resetSelectedObj() {
    const selectedObj = this.getSelectedObj();

    if (selectedObj.g) {
      console.log(selectedObj.color);
      this.setColor({ g: selectedObj.g, objectId: selectedObj.objectId, color: selectedObj.color });
    }

    this.clearSelectedObj();
  }

  private hideModel() {
    console.log(this.scene, this.scene.children[3]);
    this.scene.children[3].visible = false;
  }
}
