import * as THREE from 'three';

import { threeApp } from '../threeApp';

export class OutlineSelection {
  private static outlineMeshes: THREE.Mesh[] = [];
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

          threeApp.sceneManager.scene.add(outlineMesh);
          threeApp.outlineSelection.addOutlineObject(outlineMesh);
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
  }
}
