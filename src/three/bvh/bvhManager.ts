import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, MeshBVHHelper } from 'three-mesh-bvh';

import { threeApp } from '../threeApp';

export class BVHManager {
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
      if (child.geometry && THREE.Mesh) {
        child.geometry.computeBoundsTree({ indirect: true });
        //child.geometry.boundsTree = new MeshBVH(mesh.geometry);
      }
    });

    //this.addBVHHelper(obj);
  }

  private addBVHHelper(obj: THREE.Mesh | THREE.Group | THREE.Object3D) {
    obj.traverse((child) => {
      if (child.geometry) {
        const helper = new MeshBVHHelper(child);
        helper.color.set(0x0000ff);
        threeApp.sceneManager.scene.add(helper);
      }
    });
  }
}
