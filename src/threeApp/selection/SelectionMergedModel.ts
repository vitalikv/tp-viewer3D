import * as THREE from 'three';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { SelectionAdapter } from '@/threeApp/mergedModel/SelectionAdapter';
import { OutlineMergedModel } from '@/threeApp/selection/OutlineMergedModel';
import { SceneManager } from '@/threeApp/scene/SceneManager';

export class SelectionMergedModel {
  private static originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private static mergedMeshes: Map<string, THREE.Mesh[]> = new Map();
  private static mergedLines: Map<string, (THREE.Line | THREE.LineSegments)[]> = new Map();
  private static objectByUuid: Map<string, THREE.Object3D> = new Map();
  private static meshMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, emissive: 0x00ff00, emissiveIntensity: 0.2, opacity: 0.8 });
  private static lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, depthTest: false, opacity: 0.1 });

  public static setMergedObjects(meshes: THREE.Mesh[], lines: (THREE.Line | THREE.LineSegments)[]) {
    this.meshMaterial.clippingPlanes = ClippingBvh.inst().getClippingPlanes();
    this.meshMaterial.needsUpdate = true;

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
    const groupIndex = this.findGroupByFaceIndex(geometry.userData.groups, faceIndex);

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

  private static findGroupByFaceIndex(groups: { start: number; count: number }[], faceIndex: number) {
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

    OutlineMergedModel.createOutlineMeshes(targetUuid, this.mergedMeshes);

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

      //this.testOffsetPositionGroups({ geometry, groups, highlightGroupIndices });

      if (!this.originalMaterials.has(mesh.uuid)) {
        this.originalMaterials.set(mesh.uuid, mesh.material);
      }

      const materials: THREE.Material[] = [];
      const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      for (let i = 0; i < groups.length; i++) {
        if (highlightGroupIndices.includes(i)) {
          const material = mesh instanceof THREE.Line || mesh instanceof THREE.LineSegments ? this.lineMaterial : this.meshMaterial;
          materials.push(material);
        } else {
          const materialIndex = Math.min(i, originalMaterials.length - 1);
          materials.push(originalMaterials[materialIndex]);
        }
      }

      mesh.material = materials;
    });
  }

  public static selectedByFragmentGuid({ fragment_guid }: { fragment_guid: string }) {
    this.clearSelection();
    const nodes = SelectionAdapter.selectedObj3dByFragmentGuid({ fragment_guid });

    for (const element of nodes) {
      if (!element.uuid) continue;
      this.selectedByUuid(element.uuid);
    }

    SceneManager.inst().render();
  }

  public static clearSelection() {
    this.originalMaterials.forEach((originalMaterial, objectUuid) => {
      const object = this.objectByUuid.get(objectUuid);

      if (object && (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments)) {
        object.material = originalMaterial;
      }
    });

    this.originalMaterials.clear();

    OutlineMergedModel.clearOutlineMeshes();
    console.log('----------');
  }

  private static testOffsetPositionGroups({ geometry, groups, highlightGroupIndices }) {
    const positionAttr = geometry.attributes.position;
    if (positionAttr && groups.length > 0) {
      const vertexIndices = new Set<number>();

      highlightGroupIndices.forEach((groupIndex) => {
        if (groupIndex >= 0 && groupIndex < groups.length) {
          const group = groups[groupIndex];
          if (group && group.count > 0) {
            if (geometry.index) {
              const indexAttr = geometry.index;
              for (let i = group.start; i < group.start + group.count; i++) {
                vertexIndices.add(indexAttr.getX(i));
              }
            } else {
              for (let i = group.start; i < group.start + group.count; i++) {
                vertexIndices.add(i);
              }
            }
          }
        }
      });

      if (vertexIndices.size > 0) {
        const positions = positionAttr.array as Float32Array;
        const vertexPositions: { x: number; y: number; z: number; index: number }[] = [];

        vertexIndices.forEach((vertexIndex) => {
          const xIndex = vertexIndex * 3;
          const yIndex = vertexIndex * 3 + 1;
          const zIndex = vertexIndex * 3 + 2;

          if (xIndex < positions.length && yIndex < positions.length && zIndex < positions.length) {
            const x = positions[xIndex];
            const y = positions[yIndex];
            const z = positions[zIndex];

            vertexPositions.push({ x, y, z, index: vertexIndex });
          }
        });

        if (vertexPositions.length > 0) {
          let minX = Infinity,
            minY = Infinity,
            minZ = Infinity;
          let maxX = -Infinity,
            maxY = -Infinity,
            maxZ = -Infinity;

          vertexPositions.forEach((v) => {
            minX = Math.min(minX, v.x);
            minY = Math.min(minY, v.y);
            minZ = Math.min(minZ, v.z);
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
            maxZ = Math.max(maxZ, v.z);
          });

          const center = new THREE.Vector3((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);

          const rotationMatrix = new THREE.Matrix4().makeRotationX(Math.PI / 2);
          const tempVector = new THREE.Vector3();

          vertexPositions.forEach((v) => {
            tempVector.set(v.x - center.x, v.y - center.y, v.z - center.z);

            tempVector.applyMatrix4(rotationMatrix);

            tempVector.add(center);
            tempVector.y += 1;

            const xIndex = v.index * 3;
            const yIndex = v.index * 3 + 1;
            const zIndex = v.index * 3 + 2;

            positions[xIndex] = tempVector.x;
            positions[yIndex] = tempVector.y;
            positions[zIndex] = tempVector.z;
          });
        }

        positionAttr.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
      }
    }
  }
}
