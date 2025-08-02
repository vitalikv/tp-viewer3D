import * as THREE from 'three';

export class MouseManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private selectedObj: { objectId: any; g: any; color: any } = { objectId: null, g: null, color: null };
  private isDown = false;
  private isMove = false;
  private planeMath: THREE.Mesh;
  private offset = new THREE.Vector3();

  public init(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.1;
    this.raycaster.params.Points.threshold = 0.1;
    this.raycaster.far = 100;

    this.mouse = new THREE.Vector2();

    this.domElement.addEventListener('pointerdown', this.pointerDown);
    this.domElement.addEventListener('pointermove', this.pointerMove);
    this.domElement.addEventListener('pointerup', this.pointerUp);

    window.addEventListener('keydown', this.keyDown);

    this.planeMath = this.initPlaneMath();
  }

  private initPlaneMath() {
    const geometry = new THREE.PlaneGeometry(10000, 10000);
    const material = new THREE.MeshPhongMaterial({ color: 0xffff00, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    material.visible = false;
    const planeMath = new THREE.Mesh(geometry, material);
    planeMath.rotation.set(-Math.PI / 2, 0, 0);
    this.scene.add(planeMath);

    return planeMath;
  }

  private keyDown = (event) => {
    //if (event.code === 'Delete') this.deleteSelectedObj();
    //if (event.code === 'Enter') this.addWindow();
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

  private pointerUp = (event: MouseEvent) => {
    if (!this.isMove) {
      this.resetSelectedObj();

      this.calculateMousePosition(event);
      this.updateRaycaster();

      let { intersect } = this.intersectObj({ event });

      this.changeColor({ intersect });
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

  private intersectObj({ event }: { event: MouseEvent }) {
    let obj: null | THREE.Mesh | THREE.Object3D;
    let intersect: THREE.Intersection<THREE.Object3D<THREE.Object3DEventMap>> | null;
    obj = null;
    intersect = null;

    if (event.button === 2) return { obj, intersect };

    this.calculateMousePosition(event);
    this.updateRaycaster();

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    //const intersects = this.raycaster.intersectObjects(createModel.meshesWinds, true);

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
}
