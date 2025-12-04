import * as THREE from 'three';

import { SelectionAdapter } from './selectionAdapter';
import { MergeModel } from '@/three/mergedModel/mergeModel';
import { SelectionMergedGeometries } from '@/three/selection/selectionMergedGeometries';

export class InitMergedModel {
  public static init({ model }: { model: THREE.Group }) {
    const { group } = MergeModel.processModelWithMerge(model);

    const groupMeshes = group.children[0];
    const groupLines = group.children[1];

    const allMeshes: THREE.Mesh[] = [];
    const allLines: (THREE.Line | THREE.LineSegments)[] = [];

    groupMeshes.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        allMeshes.push(child);
      }
    });

    groupLines.traverse((child) => {
      if (child instanceof THREE.Line || child instanceof THREE.LineSegments) {
        allLines.push(child);
      }
    });

    this.setupBVH(groupMeshes);

    SelectionMergedGeometries.setMergedObjects(allMeshes, allLines);

    SelectionAdapter.initializeCache();

    return group;
  }

  private static setupBVH(obj: THREE.Mesh | THREE.Group | THREE.Object3D) {
    if (!THREE.BufferGeometry.prototype.computeBoundsTree) return;

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry && child.isMesh) {
        child.geometry.computeBoundsTree({ indirect: true });
      }
    });
  }
}
