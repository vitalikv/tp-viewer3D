import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, MeshBVHHelper } from 'three-mesh-bvh';

import { SceneManager } from '@/threeApp/scene/sceneManager';
import { ContextSingleton } from '@/core/ContextSingleton';

export class BVHManager extends ContextSingleton<BVHManager> {
  public init() {
    if (!THREE.BufferGeometry.prototype.computeBoundsTree) {
      THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
      THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
      THREE.Mesh.prototype.raycast = acceleratedRaycast;
    }
  }

  public setupBVH(obj: THREE.Mesh | THREE.Group | THREE.Object3D) {
    if (!THREE.BufferGeometry.prototype.computeBoundsTree) return;

    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.geometry.computeBoundsTree({ indirect: true });
        //child.geometry.boundsTree = new MeshBVH(mesh.geometry, { maxLeafTris: 3, indirect: true });
      }
    });

    //this.addBVHHelper(obj);
  }

  private addBVHHelper(obj: THREE.Mesh | THREE.Group | THREE.Object3D) {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const helper = new MeshBVHHelper(child);
        helper.color.set(0x0000ff);
        SceneManager.inst().scene.add(helper);
      }
    });
  }
}
