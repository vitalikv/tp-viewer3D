import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper, CONTAINED } from 'three-mesh-bvh';
import { threeApp } from '../threeApp';

type MeshBVHEntry = {
  mesh: THREE.Mesh;
  bvh: MeshBVH;
  helper?: MeshBVHHelper;
};

export class ClippingBvh {
  private clock: THREE.Clock | null = null;

  private meshBvhs: MeshBVHEntry[] = [];
  private clippingPlanes: THREE.Plane[] | [] = [];
  private planeMesh: THREE.Mesh | null = null;
  private outlineLines: THREE.LineSegments | null = null;
  private lines: THREE.LineSegments[] | [] = [];
  private wireframeModel: THREE.Object3D;

  private outputElement: HTMLElement | null = null;
  private time = 0;

  private tempVector = new THREE.Vector3();
  private tempVector1 = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();
  private tempVector3 = new THREE.Vector3();
  private tempLine = new THREE.Line3();
  private inverseMatrix = new THREE.Matrix4();
  private localPlane = new THREE.Plane();

  private params = {
    useBVH: true,
    helperDisplay: false,
    helperDepth: 10,
    wireframeDisplay: false,
    displayModel: true,
    animate: true,
    invert: false,
  };

  public initClipping({ model }) {
    this.params.animate = true;
    this.clock = new THREE.Clock();
    this.lines = [];

    this.clippingPlanes = [new THREE.Plane()];

    this.createPlaneMesh();
    this.createOutlineLines();

    this.compositeModelBvh(model);
    this.createWireframe(model);
  }

  private createWireframe(model: THREE.Object3D) {
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
    threeApp.sceneManager.scene.add(this.wireframeModel);
  }

  private createPlaneMesh() {
    this.planeMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ZeroStencilOp,
        stencilZFail: THREE.ZeroStencilOp,
        stencilZPass: THREE.ZeroStencilOp,
      })
    );
    this.planeMesh.scale.setScalar(1.5);
    (this.planeMesh.material as THREE.MeshBasicMaterial).color.set(0x80deea);
    this.planeMesh.renderOrder = 2;
    threeApp.sceneManager.scene.add(this.planeMesh);
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

    // Добавим в сцену сразу в мировом пространстве (чтобы писать туда мировые координаты)
    threeApp.sceneManager.scene.add(this.outlineLines);
  }

  //Строим BVH для каждого Mesh.
  private compositeModelBvh(modelRoot) {
    modelRoot.updateMatrixWorld(true);

    // найдем все меши
    const meshes: THREE.Mesh[] = [];
    modelRoot.traverse((c) => {
      if ((c as THREE.LineSegments).isLineSegments && c.visible) {
        c.visible = false;
        this.lines.push(c);
      }
      if ((c as THREE.Mesh).isMesh) meshes.push(c as THREE.Mesh);
    });

    this.meshBvhs = [];

    for (const mesh of meshes) {
      const geom = mesh.geometry as THREE.BufferGeometry;
      if (!geom.attributes.position) continue;

      let bvh = null;
      if (geom.boundsTree) {
        bvh = geom.boundsTree;
      } else {
        // строим BVH
        const bvh = new MeshBVH(geom, { maxLeafTris: 3 });
        (geom as any).boundsTree = bvh;
      }

      const helper = this.crBvhHelper(mesh);

      // назначаем плоскости обрезки на материалы, чтобы модель реально резалась
      this.assignClippingToMaterial(mesh.material);

      // store
      if (bvh) this.meshBvhs.push({ mesh, bvh, helper });
    }
  }

  private crBvhHelper(mesh) {
    const helper = new MeshBVHHelper(mesh, parseInt(String(this.params.helperDepth)));
    helper.visible = false;
    helper.depth = parseInt(String(this.params.helperDepth));
    helper.update();
    threeApp.sceneManager.scene.add(helper);

    return helper;
  }

  /** Поддержка массива материалов и одиночного материала */
  private assignClippingToMaterial(mat: THREE.Material | THREE.Material[]) {
    if (!this.clippingPlanes) return;
    const apply = (m: any) => {
      // Material не имеет в типе clippingPlanes, поэтому cast to any
      m.clippingPlanes = this.clippingPlanes;
      m.needsUpdate = true;
    };

    if (Array.isArray(mat)) {
      for (const m of mat) apply(m);
    } else {
      apply(mat as any);
    }
  }

  public render = () => {
    requestAnimationFrame(this.render);
    if (!this.clock) return;

    const delta = Math.min(this.clock.getDelta(), 0.03);
    if (this.params.animate) {
      this.time += delta;
      this.animatePlane();
    }

    this.performClipping();

    threeApp.sceneManager.render();
  };

  private animatePlane() {
    if (!this.planeMesh) return;

    this.planeMesh.position.set(Math.sin(0.25 * this.time) * 0.525, 0, 0);
    this.planeMesh.rotation.set(0, Math.PI / 2, 0);

    this.planeMesh.updateMatrixWorld();
  }

  private performClipping() {
    if (!this.meshBvhs.length || !this.outlineLines || !this.clippingPlanes || !this.planeMesh) return;

    // вычисляем мировую плоскость
    const clippingPlaneWorld = this.clippingPlanes[0];
    clippingPlaneWorld.normal.set(0, 0, this.params.invert ? 1 : -1);
    clippingPlaneWorld.constant = 0;
    clippingPlaneWorld.applyMatrix4(this.planeMesh.matrixWorld);

    // общая позиция для чуть-сдвига линий (чтобы не z-fight)
    this.outlineLines.position.copy(clippingPlaneWorld.normal).multiplyScalar(-0.00001);

    const posAttr = this.outlineLines.geometry.attributes.position as THREE.BufferAttribute;
    let index = 0;
    const maxVerts = posAttr.count;

    const startTime = performance.now();

    for (const entry of this.meshBvhs) {
      const mesh = entry.mesh;
      const bvh = entry.bvh;

      // переводим плоскость в локальное пространство меша для shapecast
      this.inverseMatrix.copy(mesh.matrixWorld).invert();
      this.localPlane.copy(clippingPlaneWorld).applyMatrix4(this.inverseMatrix);

      // shapecast по BVH меша
      bvh.shapecast({
        intersectsBounds: (box) => (this.params.useBVH ? this.localPlane.intersectsBox(box) : CONTAINED),
        intersectsTriangle: (tri) => {
          let count = 0;

          // AB
          this.tempLine.start.copy(tri.a);
          this.tempLine.end.copy(tri.b);
          if (this.localPlane.intersectLine(this.tempLine, this.tempVector)) {
            // !!!!! ВАЖНО: преобразовать точку в мировые координаты перед записью
            this.tempVector.applyMatrix4(mesh.matrixWorld);
            if (index < maxVerts) posAttr.setXYZ(index, this.tempVector.x, this.tempVector.y, this.tempVector.z);
            index++;
            count++;
          }

          // BC
          this.tempLine.start.copy(tri.b);
          this.tempLine.end.copy(tri.c);
          if (this.localPlane.intersectLine(this.tempLine, this.tempVector)) {
            this.tempVector.applyMatrix4(mesh.matrixWorld);
            if (index < maxVerts) posAttr.setXYZ(index, this.tempVector.x, this.tempVector.y, this.tempVector.z);
            index++;
            count++;
          }

          // CA
          this.tempLine.start.copy(tri.c);
          this.tempLine.end.copy(tri.a);
          if (this.localPlane.intersectLine(this.tempLine, this.tempVector)) {
            this.tempVector.applyMatrix4(mesh.matrixWorld);
            if (index < maxVerts) posAttr.setXYZ(index, this.tempVector.x, this.tempVector.y, this.tempVector.z);
            index++;
            count++;
          }

          // корректировка трёх пересечений (как в оригинале)
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

    // выставляем диапазон отрисовки
    this.outlineLines.geometry.setDrawRange(0, index);
    posAttr.needsUpdate = true;

    const delta = performance.now() - startTime;
    if (this.outputElement) this.outputElement.innerText = `${delta.toFixed(3)}ms`;
  }

  //---

  // Метод для полного уничтожения (если нужно пересоздать)
  public destroy() {
    this.disableClipping();

    // Дополнительная очистка
    this.meshBvhs = [];
    this.clippingPlanes = [];
    this.clock = null;

    this.lines.forEach((line) => {
      line.visible = true;
    });

    this.lines = [];

    this.params.animate = false;
    threeApp.sceneManager.render();
  }

  private disableClipping() {
    // Удаляем плоскость отсечения из сцены
    if (this.planeMesh) {
      this.disposeObj(this.planeMesh);
      this.planeMesh.removeFromParent();
      this.planeMesh = null;
    }

    // Удаляем контуры из сцены
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

    // Удаляем BVH хелперы из сцены
    this.meshBvhs.forEach((entry) => {
      if (entry.helper) {
        this.disposeObj(entry.helper);
        entry.helper.removeFromParent();
      }
    });

    // Очищаем плоскости отсечения у всех материалов
    this.removeClippingFromMaterials();
  }

  // Вспомогательный метод для удаления clipping planes из материалов
  private removeClippingFromMaterials() {
    // Проходим по всем мешам и убираем clipping planes
    this.meshBvhs.forEach((entry) => {
      const mesh = entry.mesh;
      const mat = mesh.material;

      if (Array.isArray(mat)) {
        mat.forEach((m) => {
          (m as any).clippingPlanes = [];
          (m as any).needsUpdate = true;
        });
      } else {
        (mat as any).clippingPlanes = [];
        (mat as any).needsUpdate = true;
      }
    });
  }

  //----

  private disposeObj(obj: THREE.Object3D) {
    obj.traverse((child: THREE.Object3D | THREE.LineSegments | THREE.Line) => {
      if ((child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) && child.geometry) {
        child.geometry.dispose();

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m: THREE.Material) => this.disposeMaterial(m));
          } else {
            this.disposeMaterial(child.material);
          }
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
}
