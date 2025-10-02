import * as THREE from 'three';
import { SelectionAdapter } from './selectionAdapter';

export class SelectionManager {
  private static originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private static mergedMeshes: Map<string, THREE.Mesh[]> = new Map();
  private static mergedLines: Map<string, (THREE.Line | THREE.LineSegments)[]> = new Map();
  private static objectByUuid: Map<string, THREE.Object3D> = new Map();
  private static meshMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, emissive: 0x00ff00, emissiveIntensity: 0.2, opacity: 0.8 });
  private static lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, depthTest: false, opacity: 0.1 });

  public static setMergedObjects(meshes: THREE.Mesh[], lines: (THREE.Line | THREE.LineSegments)[]) {
    this.mergedMeshes.clear();
    this.mergedLines.clear();
    this.objectByUuid.clear();

    meshes.forEach((mesh) => {
      this.objectByUuid.set(mesh.uuid, mesh);

      const geometry = mesh.geometry;
      if (geometry?.userData?.parentUuids) {
        const parentUuids = geometry.userData.parentUuids;

        parentUuids.forEach((parentUuid: string) => {
          if (!this.mergedMeshes.has(parentUuid)) {
            this.mergedMeshes.set(parentUuid, []);
          }
          this.mergedMeshes.get(parentUuid)!.push(mesh);
        });
      }
    });

    lines.forEach((line) => {
      this.objectByUuid.set(line.uuid, line);

      const geometry = line.geometry;
      if (geometry?.userData?.parentUuids) {
        const parentUuids = geometry.userData.parentUuids;

        parentUuids.forEach((parentUuid: string) => {
          if (!this.mergedLines.has(parentUuid)) {
            this.mergedLines.set(parentUuid, []);
          }
          this.mergedLines.get(parentUuid)!.push(line);
        });
      }
    });
  }

  public static handleObjectClick(intersect: THREE.Intersection<THREE.Object3D>) {
    if (!intersect || !intersect.object || !intersect.faceIndex) return;

    const mesh = intersect.object as THREE.Mesh;
    const geometry = mesh.geometry;

    if (!geometry.userData?.groups) return;

    const faceIndex = intersect.faceIndex;
    const groupIndex = this.findGroupByFaceIndex(geometry.groups, faceIndex);

    if (groupIndex === -1) return;

    const clickedUuid = geometry.userData.uuids[groupIndex];
    const clickedParentUuid = geometry.userData.parentUuids?.[groupIndex] || '';

    console.time('getSelectedNode');
    const objs = SelectionAdapter.getSelectedNode({ uuid: clickedUuid, parentUuid: clickedParentUuid });
    console.timeEnd('getSelectedNode');

    console.time('setMergedObjects');
    this.clearSelection();
    this.selectedByUuid(clickedParentUuid);

    for (const element of objs) {
      if (!element.uuid) continue;
      this.selectedByUuid(element.uuid);
    }
    console.timeEnd('setMergedObjects');
  }

  private static findGroupByFaceIndex(groups: THREE.Group[], faceIndex: number): number {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const startFace = group.start / 3;
      const endFace = startFace + group.count / 3;

      if (faceIndex >= startFace && faceIndex < endFace) {
        return i;
      }
    }
    return -1;
  }

  public static selectedByUuid(targetUuid: string) {
    const targetMeshes = this.mergedMeshes.get(targetUuid) || [];
    const targetLines = this.mergedLines.get(targetUuid) || [];

    [...targetMeshes, ...targetLines].forEach((mesh) => {
      const geometry = mesh.geometry;

      if (!geometry.userData?.groups) return;

      const { groups, parentUuids } = geometry.userData;

      const highlightGroupIndices: number[] = [];
      parentUuids.forEach((uuid: string, index: number) => {
        if (uuid === targetUuid) {
          highlightGroupIndices.push(index);
        }
      });

      if (highlightGroupIndices.length === 0) return;

      if (!this.originalMaterials.has(mesh.uuid)) {
        this.originalMaterials.set(mesh.uuid, mesh.material);
      }

      const materials: THREE.Material[] = [];
      const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (let i = 0; i < groups.length; i++) {
        if (highlightGroupIndices.includes(i)) {
          const material = mesh.isLine ? this.lineMaterial : this.meshMaterial;
          materials.push(material);
        } else {
          const materialIndex = Math.min(i, originalMaterials.length - 1);
          materials.push(originalMaterials[materialIndex]);
        }
      }

      mesh.material = materials;
    });
  }

  public static clearSelection() {
    this.originalMaterials.forEach((originalMaterial, objectUuid) => {
      const object = this.objectByUuid.get(objectUuid);

      if (object) {
        object.material = originalMaterial;
      }
    });

    this.originalMaterials.clear();
  }
}
