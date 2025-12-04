import * as THREE from 'three';

import { OutlineSelection as OutlineSelectionMain } from '../selection/outlineSelection';
import { SceneManager } from '../scene/sceneManager';

interface OutlineMeshData {
  outlineMesh: THREE.Mesh;
  originalMesh: THREE.Mesh;
  groupIndex: number;
  targetUuid: string;
  originalGeometry: THREE.BufferGeometry;
  group: { start: number; count: number };
}

export class OutlineSelection {
  private static outlineMeshes: THREE.Mesh[] = [];
  private static outlineMeshData: OutlineMeshData[] = [];
  private static outlineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.0 });

  public static createOutlineMeshes(targetUuid: string, mergedMeshes: Map<string, THREE.Mesh[]>) {
    const targetMeshes = mergedMeshes.get(targetUuid) || [];

    targetMeshes.forEach((originalObject) => {
      if (!(originalObject instanceof THREE.Mesh)) return;

      const geometry = originalObject.geometry;

      if (!geometry.userData?.groups || !geometry.userData?.parentUuids) return;

      const { groups, parentUuids } = geometry.userData;
      const highlightGroupIndices: number[] = [];

      parentUuids.forEach((uuid: string, index: number) => {
        if (uuid === targetUuid) {
          highlightGroupIndices.push(index);
        }
      });

      if (highlightGroupIndices.length === 0) return;

      highlightGroupIndices.forEach((groupIndex) => {
        const group = groups[groupIndex];
        if (!group) return;

        const outlineGeometry = this.createGeometryForGroup(geometry, group);

        if (outlineGeometry) {
          const outlineMesh = new THREE.Mesh(outlineGeometry, this.outlineMaterial);
          // outlineMesh.position.copy(originalObject.position);
          // outlineMesh.rotation.copy(originalObject.rotation);
          // outlineMesh.scale.copy(originalObject.scale);
          // outlineMesh.matrix.copy(originalObject.matrix);
          // outlineMesh.matrixWorld.copy(originalObject.matrixWorld);

          const worldMatrix = originalObject.matrixWorld.clone();
          outlineMesh.applyMatrix4(worldMatrix);
          outlineMesh.matrixAutoUpdate = false;

          this.outlineMeshes.push(outlineMesh);

          // Сохраняем связь между outline мешем и оригинальным объектом
          this.outlineMeshData.push({
            outlineMesh,
            originalMesh: originalObject,
            groupIndex,
            targetUuid,
            originalGeometry: geometry,
            group,
          });

          SceneManager.inst().scene.add(outlineMesh);
          OutlineSelectionMain.inst().addOutlineObject(outlineMesh);
        }
      });
    });
  }

  private static createGeometryForGroup(originalGeometry: THREE.BufferGeometry, group: { start: number; count: number }) {
    if (!originalGeometry.index || group.count === 0) return null;

    const indexAttr = originalGeometry.index;
    const positionAttr = originalGeometry.getAttribute('position');

    if (!positionAttr) return null;

    const newGeometry = new THREE.BufferGeometry();

    const newIndices: number[] = [];
    const newPositions: number[] = [];

    const indexMap = new Map<number, number>();
    let newVertexCount = 0;

    for (let i = 0; i < group.count; i++) {
      const originalIndex = indexAttr.getX(group.start + i);

      if (!indexMap.has(originalIndex)) {
        indexMap.set(originalIndex, newVertexCount);

        const x = positionAttr.getX(originalIndex);
        const y = positionAttr.getY(originalIndex);
        const z = positionAttr.getZ(originalIndex);

        newPositions.push(x, y, z);
        newVertexCount++;
      }

      newIndices.push(indexMap.get(originalIndex)!);
    }

    newGeometry.setIndex(newIndices);
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));

    const normalAttr = originalGeometry.getAttribute('normal');
    if (normalAttr) {
      const newNormals: number[] = [];
      for (const originalIndex of indexMap.keys()) {
        const nx = normalAttr.getX(originalIndex);
        const ny = normalAttr.getY(originalIndex);
        const nz = normalAttr.getZ(originalIndex);
        newNormals.push(nx, ny, nz);
      }
      newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
    }

    return newGeometry;
  }

  public static clearOutlineMeshes() {
    this.outlineMeshes.forEach((mesh) => {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      mesh.removeFromParent();
    });

    this.outlineMeshes.length = 0;
    this.outlineMeshData.length = 0;
  }

  /**
   * Обновляет позиции outline мешей на основе текущих позиций оригинальных объектов
   * Вызывается после обновления анимации
   */
  public static updateOutlineMeshes() {
    if (this.outlineMeshData.length === 0) return;

    this.outlineMeshData.forEach((data) => {
      const { outlineMesh, originalMesh, originalGeometry, group } = data;

      // Обновляем мировую матрицу оригинального меша
      originalMesh.updateMatrixWorld(true);

      // Пересоздаем геометрию outline на основе обновленной геометрии оригинального меша
      const updatedOutlineGeometry = this.createGeometryForGroup(originalGeometry, group);

      if (updatedOutlineGeometry) {
        // Удаляем старую геометрию
        if (outlineMesh.geometry) {
          outlineMesh.geometry.dispose();
        }

        // Устанавливаем новую геометрию
        outlineMesh.geometry = updatedOutlineGeometry;

        // Сбрасываем матрицу и применяем новую мировую матрицу
        outlineMesh.matrix.identity();
        outlineMesh.applyMatrix4(originalMesh.matrixWorld);
      }
    });
  }
}
