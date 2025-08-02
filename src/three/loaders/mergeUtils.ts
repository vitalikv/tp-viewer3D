import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class MergeUtils {
  /**
   * Оптимизирует иерархию модели, объединяя геометрии по материалам
   */
  static optimizeModel(model: THREE.Object3D): THREE.Group {
    const mergedGroup = new THREE.Group();
    const meshEntries: Array<{
      mesh: THREE.Mesh;
      worldMatrix: THREE.Matrix4;
    }> = [];

    // Сбор всех мешей с мировыми матрицами
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.updateWorldMatrix(true, false);
        meshEntries.push({
          mesh: child,
          worldMatrix: child.matrixWorld.clone(),
        });
      }
    });

    // Группировка по материалам
    const materialGroups = new Map<
      string,
      {
        material: THREE.Material;
        geometries: THREE.BufferGeometry[];
      }
    >();

    meshEntries.forEach(({ mesh, worldMatrix }) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material, idx) => {
        const key = material.uuid || `mat_${idx}`;

        if (!materialGroups.has(key)) {
          materialGroups.set(key, {
            material,
            geometries: [],
          });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        materialGroups.get(key)!.geometries.push(geometry);
      });
    });

    // Создание объединенных мешей
    materialGroups.forEach(({ material, geometries }) => {
      if (geometries.length === 0) return;

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries, false);
      if (mergedGeometry) {
        mergedGroup.add(new THREE.Mesh(mergedGeometry, material));
      }
    });

    return mergedGroup;
  }

  /**
   * Подготавливает геометрию к мержу: клонирует и применяет трансформации
   */
  private static prepareGeometry(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
    const clonedGeo = geometry.clone();
    clonedGeo.applyMatrix4(matrix);

    // Конвертация в non-indexed для корректного мержа
    if (clonedGeo.index) {
      return clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  /**
   * Рекурсивно очищает ресурсы модели
   */
  static disposeModel(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    });
  }
}
