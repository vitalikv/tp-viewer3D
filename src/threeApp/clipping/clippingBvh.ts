import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper, CONTAINED } from 'three-mesh-bvh';
import { SceneManager } from '@/threeApp/scene/sceneManager';
import { ContextSingleton } from '@/threeApp/core/ContextSingleton';

type MeshBVHEntry = {
  mesh: THREE.Mesh;
  bvh: MeshBVH;
  helper?: MeshBVHHelper;
};

export class ClippingBvh extends ContextSingleton<ClippingBvh> {
  private model: THREE.Object3D | null = null;
  private meshBvhs: MeshBVHEntry[] = [];
  private clippingPlanes: THREE.Plane[] = [];
  private planeMesh: THREE.Mesh | null = null;
  private outlineLines: THREE.LineSegments | null = null;
  private lines: THREE.LineSegments[] = [];
  private wireframeModel: THREE.Object3D | null = null;
  private actHelperBVH: boolean = false;

  private tempVector = new THREE.Vector3();
  private tempVector1 = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();
  private tempVector3 = new THREE.Vector3();
  private tempLine = new THREE.Line3();
  private inverseMatrix = new THREE.Matrix4();
  private localPlane = new THREE.Plane();
  private posPlane = new THREE.Vector3(50, 50, 50);
  private rotPlane = new THREE.Vector3(0, 0, 0);

  private modelBoundingBox: THREE.Box3 | null = null;
  private matPlane1 = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.3, color: 0x80deea, depthWrite: false });
  private matPlane2 = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, stencilWrite: true, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.ZeroStencilOp, stencilZFail: THREE.ZeroStencilOp, stencilZPass: THREE.ZeroStencilOp, transparent: true, opacity: 0.0 });

  private params = {
    useBVH: true,
    helperBVH: false,
    helperDepth: 10,
    wireframeDisplay: false,
    displayModel: true,
    invertPlane: false,
    showPlane: true,
  };

  public initClipping({ model }: { model: THREE.Object3D }) {
    this.destroy();

    this.model = model;

    this.clippingPlanes.push(new THREE.Plane());

    this.calculateModelBounds(model);

    this.createPlaneMesh();
    this.createOutlineLines();

    this.compositeModelBvh(model);
    if (this.params.wireframeDisplay) this.createWireframe(model);
    if (this.params.helperBVH) this.createHelperBvh();
  }

  private calculateModelBounds(model: THREE.Object3D) {
    this.modelBoundingBox = new THREE.Box3();
    this.modelBoundingBox.setFromObject(model);
  }

  private createWireframe(model: THREE.Object3D) {
    if (this.wireframeModel) return;

    const materialMesh = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true, transparent: true, opacity: 0.01, depthWrite: false });

    const cloneModel = (obj: THREE.Object3D) => {
      let clone: THREE.Object3D;

      if (obj instanceof THREE.Mesh) {
        clone = new THREE.Mesh(obj.geometry, materialMesh);
      } else if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
        return new THREE.Group();
      } else {
        clone = new THREE.Group();
      }

      clone.name = obj.name + '_wireframe';
      clone.position.copy(obj.position);
      clone.rotation.copy(obj.rotation);
      clone.scale.copy(obj.scale);
      clone.visible = obj.visible;

      obj.children.forEach((child) => {
        const childClone = cloneModel(child);
        if (childClone) {
          clone.add(childClone);
        }
      });

      return clone;
    };

    this.wireframeModel = cloneModel(model);
    SceneManager.inst().scene.add(this.wireframeModel);
  }

  private createPlaneMesh() {
    const material = this.params.showPlane ? this.matPlane1 : this.matPlane2;

    this.planeMesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
    this.planeMesh.scale.setScalar(1.5);
    (this.planeMesh.material as THREE.MeshBasicMaterial).color.set(0x80deea);
    this.planeMesh.renderOrder = 2;
    SceneManager.inst().scene.add(this.planeMesh);

    this.setPlanePosition(this.posPlane.x, this.posPlane.y, this.posPlane.z);
    this.setPlaneRotation(this.rotPlane.x, this.rotPlane.y, this.rotPlane.z);
  }

  public getClippingPlanes() {
    return this.clippingPlanes;
  }

  private createOutlineLines() {
    const lineGeometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(new Float32Array(300000), 3);
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeometry.setAttribute('position', positionAttr);

    this.outlineLines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial());
    (this.outlineLines.material as THREE.LineBasicMaterial).color.set(0xff0000);
    this.outlineLines.frustumCulled = false;
    this.outlineLines.renderOrder = 3;

    SceneManager.inst().scene.add(this.outlineLines);
  }

  private compositeModelBvh(modelRoot: THREE.Object3D) {
    modelRoot.updateMatrixWorld(true);

    const meshes: THREE.Mesh[] = [];
    this.lines.length = 0;

    modelRoot.traverse((child) => {
      if (child instanceof THREE.LineSegments && child.visible) {
        child.visible = false;
        this.lines.push(child);
      }
      if (child instanceof THREE.Mesh && child.visible) {
        meshes.push(child);
      }
    });

    this.meshBvhs = [];

    for (const mesh of meshes) {
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (!geom.attributes.position) continue;

      let bvh = null;
      if (geom.boundsTree) {
        bvh = geom.boundsTree;
      } else {
        bvh = new MeshBVH(geom, { maxLeafTris: 3, indirect: true });
        (geom as any).boundsTree = bvh;
      }

      this.assignClippingToMaterial(mesh.material);

      if (bvh) this.meshBvhs.push({ mesh, bvh, helper: null });
    }
  }

  private createHelperBvh() {
    if (this.actHelperBVH) return;

    this.actHelperBVH = true;

    this.meshBvhs.forEach((item) => {
      const helper = new MeshBVHHelper(item.mesh, parseInt(String(this.params.helperDepth)));
      helper.visible = true;
      helper.depth = parseInt(String(this.params.helperDepth));
      helper.update();

      item.helper = helper;

      SceneManager.inst().scene.add(helper);
    });
  }

  private assignClippingToMaterial(mat: THREE.Material | THREE.Material[]) {
    if (!this.clippingPlanes.length) return;

    const materials = Array.isArray(mat) ? mat : [mat];

    materials.forEach((material) => {
      if ('clippingPlanes' in material) {
        (material as any).clippingPlanes = this.clippingPlanes;
        (material as any).needsUpdate = true;
      }
    });
  }

  public performClipping() {
    if (!this.meshBvhs.length || !this.outlineLines || !this.clippingPlanes || !this.planeMesh) return;

    const clippingPlaneWorld = this.clippingPlanes[0];
    clippingPlaneWorld.normal.set(0, 0, this.params.invertPlane ? 1 : -1);
    clippingPlaneWorld.constant = 0;
    clippingPlaneWorld.applyMatrix4(this.planeMesh.matrixWorld);

    this.outlineLines.position.copy(clippingPlaneWorld.normal).multiplyScalar(-0.00001);

    const posAttr = this.outlineLines.geometry.attributes.position as THREE.BufferAttribute;
    let index = 0;
    const maxVerts = posAttr.count;

    for (const entry of this.meshBvhs) {
      const mesh = entry.mesh;
      const bvh = entry.bvh;

      this.inverseMatrix.copy(mesh.matrixWorld).invert();
      this.localPlane.copy(clippingPlaneWorld).applyMatrix4(this.inverseMatrix);

      bvh.shapecast({
        intersectsBounds: (box: THREE.Box3) => (this.params.useBVH ? this.localPlane.intersectsBox(box) : CONTAINED),
        intersectsTriangle: (tri: any) => {
          let count = 0;

          this.tempLine.start.copy(tri.a);
          this.tempLine.end.copy(tri.b);
          if (this.localPlane.intersectLine(this.tempLine, this.tempVector)) {
            this.tempVector.applyMatrix4(mesh.matrixWorld);
            if (index < maxVerts) posAttr.setXYZ(index, this.tempVector.x, this.tempVector.y, this.tempVector.z);
            index++;
            count++;
          }

          this.tempLine.start.copy(tri.b);
          this.tempLine.end.copy(tri.c);
          if (this.localPlane.intersectLine(this.tempLine, this.tempVector)) {
            this.tempVector.applyMatrix4(mesh.matrixWorld);
            if (index < maxVerts) posAttr.setXYZ(index, this.tempVector.x, this.tempVector.y, this.tempVector.z);
            index++;
            count++;
          }

          this.tempLine.start.copy(tri.c);
          this.tempLine.end.copy(tri.a);
          if (this.localPlane.intersectLine(this.tempLine, this.tempVector)) {
            this.tempVector.applyMatrix4(mesh.matrixWorld);
            if (index < maxVerts) posAttr.setXYZ(index, this.tempVector.x, this.tempVector.y, this.tempVector.z);
            index++;
            count++;
          }

          if (count === 3) {
            this.tempVector1.fromBufferAttribute(posAttr as any, index - 3);
            this.tempVector2.fromBufferAttribute(posAttr as any, index - 2);
            this.tempVector3.fromBufferAttribute(posAttr as any, index - 1);

            if (this.tempVector3.equals(this.tempVector1) || this.tempVector3.equals(this.tempVector2)) {
              count--;
              index--;
            } else if (this.tempVector1.equals(this.tempVector2)) {
              posAttr.setXYZ(index - 2, this.tempVector3.x, this.tempVector3.y, this.tempVector3.z);
              count--;
              index--;
            }
          }

          if (count !== 2) index -= count;
        },
      });
    }

    this.outlineLines.geometry.setDrawRange(0, index);
    posAttr.needsUpdate = true;
  }

  public destroy() {
    this.model = null;

    this.clippingPlanes.length = 0;

    if (this.planeMesh) {
      this.disposeObj(this.planeMesh);
      this.planeMesh.removeFromParent();
      this.planeMesh = null;
    }

    if (this.outlineLines) {
      this.disposeObj(this.outlineLines);
      this.outlineLines.removeFromParent();
      this.outlineLines = null;
    }

    if (this.wireframeModel) {
      this.wireframeModel.removeFromParent();
      this.disposeObj(this.wireframeModel);
      this.wireframeModel = null;
    }

    this.meshBvhs.forEach((entry) => {
      const material = entry.mesh.material;
      const helper = entry.helper;

      if (material) {
        const materials = Array.isArray(material) ? material : [material];
        materials.forEach((material) => {
          this.disposeMaterial(material);
        });
      }
      if (helper) {
        this.disposeObj(helper);
        helper.removeFromParent();
      }
    });
    this.meshBvhs.length = 0;

    this.lines.forEach((line) => {
      line.visible = true;
    });
    this.lines.length = 0;
  }

  private disposeObj(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) && child.geometry) {
        child.geometry.dispose();

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];

          materials.forEach((material) => this.disposeMaterial(material));
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material) {
    material.dispose();

    Object.keys(material).forEach((key: string) => {
      const value = (material as any)[key];
      if (value?.isTexture) {
        value.dispose();
      }
    });
  }

  public setPlanePosition(x: number, y: number, z: number) {
    this.posPlane.set(x, y, z);

    if (!this.planeMesh || !this.modelBoundingBox) return;

    const center = new THREE.Vector3();
    this.modelBoundingBox.getCenter(center);
    const size = new THREE.Vector3();
    this.modelBoundingBox.getSize(size);

    const normalizedX = x / 50 - 1;
    const normalizedY = y / 50 - 1;
    const normalizedZ = z / 50 - 1;

    const posX = center.x + normalizedX * (size.x / 2);
    const posY = center.y + normalizedY * (size.y / 2);
    const posZ = center.z + normalizedZ * (size.z / 2);

    this.planeMesh.position.set(posX, posY, posZ);
    this.planeMesh.updateMatrixWorld();
  }

  public setPlaneRotation(x: number, y: number, z: number) {
    this.rotPlane.set(x, y, z);

    if (!this.planeMesh) return;

    const rotX = (x * Math.PI) / 180;
    const rotY = (y * Math.PI) / 180;
    const rotZ = (z * Math.PI) / 180;

    this.planeMesh.rotation.set(rotX, rotY, rotZ);
    this.planeMesh.updateMatrixWorld();
  }

  public resetPlane() {
    if (!this.planeMesh || !this.modelBoundingBox) return;

    this.setPlanePosition(50, 50, 50);
    this.setPlaneRotation(0, 0, 0);
  }

  public getUseBVH() {
    return this.params.useBVH;
  }

  public setUseBVH(enabled: boolean) {
    this.params.useBVH = enabled;
    this.performClipping();
    SceneManager.inst().render();
  }

  public getHelperBVH() {
    return this.params.helperBVH;
  }

  public setHelperBVH(enabled: boolean) {
    this.params.helperBVH = enabled;

    if (this.params.helperBVH) {
      this.createHelperBvh();

      this.meshBvhs.forEach((item) => {
        if (item.helper) item.helper.visible = true;
      });
    } else {
      this.meshBvhs.forEach((item) => {
        if (item.helper) item.helper.visible = false;
      });
    }

    this.performClipping();
    SceneManager.inst().render();
  }

  public getModel() {
    return this.params.displayModel;
  }

  public setModel(enabled: boolean) {
    this.params.displayModel = enabled;

    this.meshBvhs.forEach((item) => {
      item.mesh.visible = this.params.displayModel;
    });

    this.performClipping();
    SceneManager.inst().render();
  }

  public getWireframe() {
    return this.params.wireframeDisplay;
  }

  public setWireframe(enabled: boolean) {
    this.params.wireframeDisplay = enabled;

    if (this.params.wireframeDisplay) {
      this.createWireframe(this.model);
    }

    if (this.wireframeModel) {
      this.wireframeModel.traverse((obj) => {
        obj.visible = this.params.wireframeDisplay;
      });
    }

    this.performClipping();
    SceneManager.inst().render();
  }

  public getInvertPlane() {
    return this.params.invertPlane;
  }

  public setInvertPlane(enabled: boolean) {
    this.params.invertPlane = enabled;
    this.performClipping();
    SceneManager.inst().render();
  }

  public getShowPlane() {
    return this.params.showPlane;
  }

  public setShowPlane(enabled: boolean) {
    this.params.showPlane = enabled;

    const material = this.params.showPlane ? this.matPlane1 : this.matPlane2;
    if (this.planeMesh) {
      this.planeMesh.material = material;
    }

    this.performClipping();
    SceneManager.inst().render();
  }
}
