import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils';

export class MergeEnvironmentUtils {
  public static mergeObj(obj: THREE.Object3D) {
    const { mergedGeomMesh, mergedGeomLine } = this.mergeGeometries(obj);

    const group = new THREE.Group();

    if (mergedGeomMesh) {
      const materialMesh = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });
      const mesh = new THREE.Mesh(mergedGeomMesh, materialMesh);
      group.add(mesh);
    }

    if (mergedGeomLine) {
      const materialLine = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
      const line = new THREE.LineSegments(mergedGeomLine, materialLine);
      group.add(line);
    }

    obj.removeFromParent();
    this.disposeObj(obj);

    return group;
  }

  private static mergeGeometries(obj: THREE.Object3D) {
    const { geomMesh, geomLine } = this.getGeometries(obj);

    const mergedGeomMesh = geomMesh.length > 0 ? BufferGeometryUtils.mergeGeometries(geomMesh) : null;
    const mergedGeomLine = geomLine.length > 0 ? BufferGeometryUtils.mergeGeometries(geomLine) : null;

    return { mergedGeomMesh, mergedGeomLine };
  }

  private static getGeometries(object: THREE.Object3D) {
    const geomMesh: THREE.BufferGeometry[] = [];
    const geomLine: THREE.BufferGeometry[] = [];

    object.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.updateWorldMatrix(true, false);
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);
        geomMesh.push(geometry);
      }

      if ((child as THREE.LineSegments).isLineSegments) {
        const line = child as THREE.LineSegments;
        line.updateWorldMatrix(true, false);
        const geometry = this.applyWorldTransformToGeometry(line.geometry, line.matrixWorld);
        geomLine.push(geometry);
      }
    });

    return { geomMesh, geomLine };
  }

  private static applyWorldTransformToGeometry(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
    const cloned = geometry.clone();

    if (cloned.attributes.position) {
      const positionAttribute = cloned.attributes.position;
      const positions = positionAttribute.array as Float32Array;
      const vector = new THREE.Vector3();

      for (let i = 0; i < positions.length; i += 3) {
        vector.set(positions[i], positions[i + 1], positions[i + 2]);
        vector.applyMatrix4(matrix);
        positions[i] = vector.x;
        positions[i + 1] = vector.y;
        positions[i + 2] = vector.z;
      }
      positionAttribute.needsUpdate = true;
    }

    if (cloned.attributes.normal) {
      const normalAttribute = cloned.attributes.normal;
      const normals = normalAttribute.array as Float32Array;
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
      const vector = new THREE.Vector3();

      for (let i = 0; i < normals.length; i += 3) {
        vector.set(normals[i], normals[i + 1], normals[i + 2]);
        vector.applyMatrix3(normalMatrix).normalize();
        normals[i] = vector.x;
        normals[i + 1] = vector.y;
        normals[i + 2] = vector.z;
      }
      normalAttribute.needsUpdate = true;
    }

    return cloned;
  }

  private static disposeObj(obj: THREE.Object3D) {
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

  private static disposeMaterial(material: THREE.Material) {
    material.dispose();

    Object.keys(material).forEach((key: string) => {
      const value = (material as any)[key];
      if (value?.isTexture) {
        value.dispose();
      }
    });
  }
}
