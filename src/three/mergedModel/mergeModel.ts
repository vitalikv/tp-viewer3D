import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class MergeModel {
  private static readonly tempVector = new THREE.Vector3();

  public static processModelWithMerge(model) {
    const { mergedMeshes, mergedLines } = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    const group = new THREE.Group();
    const groupMeshes = new THREE.Group();
    const groupLines = new THREE.Group();
    groupMeshes.add(...mergedMeshes);
    groupLines.add(...mergedLines);
    group.add(groupMeshes, groupLines);

    return { group };
  }

  private static mergeGeometriesWithMaterials(model) {
    const meshEntries = [];
    const lineEntries = [];

    model.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.updateWorldMatrix(true, false);
        meshEntries.push({
          mesh: child,
          worldMatrix: child.matrixWorld.clone(),
        });
      }

      if ((child.isLine || child.isLineSegments) && child.geometry) {
        child.updateWorldMatrix(true, false);
        lineEntries.push({
          line: child,
          worldMatrix: child.matrixWorld.clone(),
          isLineSegments: child.isLineSegments,
        });
      }
    });

    const mergedMeshes = [];
    if (meshEntries.length > 0) {
      const meshResults = this.mergeMeshGeometries(meshEntries);
      mergedMeshes.push(...meshResults);
    }

    const mergedLines = [];
    if (lineEntries.length > 0) {
      const lineResults = this.mergeLineGeometries(lineEntries);
      mergedLines.push(...lineResults);
    }

    return { mergedMeshes, mergedLines };
  }

  private static mergeMeshGeometries(meshEntries) {
    const materialGroups = new Map();

    meshEntries.forEach(({ mesh, worldMatrix }) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material, idx) => {
        const key = material.uuid || `mat_${idx}`;

        if (!materialGroups.has(key)) {
          materialGroups.set(key, {
            material: material,
            geometries: [],
            originalUuids: [],
            originalParentUuids: [], // ДОБАВЛЕНО: массив для parentUuid
          });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        const originalUuid = mesh.uuid;
        const originalParentUuid = mesh.parent?.uuid || ''; // ДОБАВЛЕНО: получаем parentUuid

        // Сохраняем UUID и parentUuid в userData каждой геометрии
        geometry.userData = {
          uuid: originalUuid,
          parentUuid: originalParentUuid, // ДОБАВЛЕНО: сохраняем parentUuid
          originalUserData: mesh.userData,
        };

        materialGroups.get(key).geometries.push(geometry);
        materialGroups.get(key).originalUuids.push(originalUuid);
        materialGroups.get(key).originalParentUuids.push(originalParentUuid); // ДОБАВЛЕНО: сохраняем parentUuid
      });
    });

    const mergedMeshes = [];
    materialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      // ВАЖНО: useGroups: true сохраняет группы геометрий
      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, true);

      if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
        const mergedMesh = new THREE.Mesh(mergedGeometry, group.material);
        mergedMeshes.push(mergedMesh);

        // Сохраняем информацию о группах, UUID и parentUuid
        this.setGeomAttribute({
          geometries: group.geometries,
          mergedGeometry,
          originalUuids: group.originalUuids,
          originalParentUuids: group.originalParentUuids, // ДОБАВЛЕНО: передаем parentUuid
        });

        group.geometries.forEach((geom) => geom.dispose());
      }
    });

    return mergedMeshes;
  }

  private static mergeLineGeometries(lineEntries) {
    const lineMaterialGroups = new Map();

    lineEntries.forEach(({ line, worldMatrix, isLineSegments }) => {
      const materials = Array.isArray(line.material) ? line.material : [line.material];

      materials.forEach((material, idx) => {
        const typeKey = isLineSegments ? 'segments' : 'line';
        const key = `${material.uuid || `line_mat_${idx}`}_${typeKey}`;

        if (!lineMaterialGroups.has(key)) {
          lineMaterialGroups.set(key, {
            material: material,
            geometries: [],
            isLineSegments: isLineSegments,
            originalUuids: [],
            originalParentUuids: [], // ДОБАВЛЕНО: массив для parentUuid
          });
        }

        const geometry = this.prepareLineGeometry(line.geometry, worldMatrix);
        const originalUuid = line.uuid;
        const originalParentUuid = line.parent?.uuid || ''; // ДОБАВЛЕНО: получаем parentUuid

        geometry.userData = {
          uuid: originalUuid,
          parentUuid: originalParentUuid, // ДОБАВЛЕНО: сохраняем parentUuid
          originalUserData: line.userData,
        };

        lineMaterialGroups.get(key).geometries.push(geometry);
        lineMaterialGroups.get(key).originalUuids.push(originalUuid);
        lineMaterialGroups.get(key).originalParentUuids.push(originalParentUuid); // ДОБАВЛЕНО: сохраняем parentUuid
      });
    });

    const mergedLines = [];
    lineMaterialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      // ВАЖНО: useGroups: true для линий тоже
      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, true);

      if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
        const lineMaterial = new THREE.LineBasicMaterial({
          vertexColors: true,
          color: group.material.color || 0xffffff,
        });

        let mergedLine;
        if (group.isLineSegments) {
          mergedLine = new THREE.LineSegments(mergedGeometry, lineMaterial);
        } else {
          mergedLine = new THREE.Line(mergedGeometry, lineMaterial);
        }

        mergedLines.push(mergedLine);
        this.setGeomAttribute({
          geometries: group.geometries,
          mergedGeometry,
          originalUuids: group.originalUuids,
          originalParentUuids: group.originalParentUuids, // ДОБАВЛЕНО: передаем parentUuid
        });

        group.geometries.forEach((geom) => geom.dispose());
      }
    });

    return mergedLines;
  }

  private static prepareGeometry(geometry, matrix) {
    const clonedGeo = geometry.clone();
    clonedGeo.applyMatrix4(matrix);

    if (clonedGeo.index) {
      clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  private static prepareLineGeometry(geometry, matrix) {
    const clonedGeo = geometry.clone();

    if (clonedGeo.attributes.position) {
      const positionAttribute = clonedGeo.attributes.position;
      const positions = positionAttribute.array;

      for (let i = 0; i < positions.length; i += 3) {
        this.tempVector.set(positions[i], positions[i + 1], positions[i + 2]);
        this.tempVector.applyMatrix4(matrix);
        positions[i] = this.tempVector.x;
        positions[i + 1] = this.tempVector.y;
        positions[i + 2] = this.tempVector.z;
      }
      positionAttribute.needsUpdate = true;
    }

    if (clonedGeo.index) {
      clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  // ДОБАВЛЕНО: параметр originalParentUuids
  private static setGeomAttribute({ geometries, mergedGeometry, originalUuids = [], originalParentUuids = [] }) {
    // Сохраняем информацию о группах, UUID и parentUuid
    mergedGeometry.userData = {
      groups: mergedGeometry.groups, // Группы из Three.js
      uuids: originalUuids, // UUID каждой исходной геометрии
      parentUuids: originalParentUuids, // ДОБАВЛЕНО: parentUuid каждой исходной геометрии
      objectCount: geometries.length,
    };

    // console.log('Merged geometry groups:', mergedGeometry.groups);
    // console.log('Merged geometry uuids:', originalUuids);
    // console.log('Merged geometry parentUuids:', originalParentUuids); // ДОБАВЛЕНО: логируем parentUuid
  }

  private static disposeHierarchy(node) {
    if (node.isMesh || node.isLine || node.isLineSegments) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    }

    for (let i = node.children.length - 1; i >= 0; i--) {
      this.disposeHierarchy(node.children[i]);
    }
  }
}
