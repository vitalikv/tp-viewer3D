import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class MergeMeshes {
  private static readonly tempVector = new THREE.Vector3(); // Переиспользуемый вектор

  public static processModelWithMerge(model) {
    const { mergedMeshes, mergedLines } = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    // const group = new THREE.Group();
    // group.add(...mergedMeshes, ...mergedLines);

    return { mergedMeshes, mergedLines };
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
            // ИЗМЕНЕНО: Добавляем массивы для сохранения оригинальных UUID и parent UUID
            originalUuids: [],
            originalParentUuids: [],
          });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        // ИСПРАВЛЕНО: Сохраняем оригинальный UUID и parent UUID
        const originalUuid = mesh.uuid;
        const originalParentUuid = mesh.parent?.uuid || '';

        geometry.userData.uuid = originalUuid;
        geometry.userData.parentUuid = originalParentUuid;

        materialGroups.get(key).geometries.push(geometry);
        // ДОБАВЛЕНО: Сохраняем оригинальный UUID и parent UUID в отдельные массивы
        materialGroups.get(key).originalUuids.push(originalUuid);
        materialGroups.get(key).originalParentUuids.push(originalParentUuid);
      });
    });

    const mergedMeshes = [];
    materialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      // ИЗМЕНЕНО: Сохраняем UUID и parent UUID перед мерджем на случай если они потеряются
      const savedUuids = [...group.originalUuids];
      const savedParentUuids = [...group.originalParentUuids];

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, false);

      if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
        const mergedMesh = new THREE.Mesh(mergedGeometry, group.material);
        mergedMeshes.push(mergedMesh);

        // ИЗМЕНЕНО: Передаем сохраненные UUID и parent UUID
        this.setGeomAttribute({
          geometries: group.geometries,
          mergedGeometry,
          originalUuids: savedUuids,
          originalParentUuids: savedParentUuids,
        });

        // Очищаем исходные геометрии
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
            // ИЗМЕНЕНО: Добавляем массивы для сохранения оригинальных UUID и parent UUID
            originalUuids: [],
            originalParentUuids: [],
          });
        }

        const geometry = this.prepareLineGeometry(line.geometry, worldMatrix);
        // ИСПРАВЛЕНО: Сохраняем оригинальный UUID и parent UUID
        const originalUuid = line.uuid;
        const originalParentUuid = line.parent?.uuid || '';

        geometry.userData.uuid = originalUuid;
        geometry.userData.parentUuid = originalParentUuid;

        lineMaterialGroups.get(key).geometries.push(geometry);
        // ДОБАВЛЕНО: Сохраняем оригинальный UUID и parent UUID в отдельные массивы
        lineMaterialGroups.get(key).originalUuids.push(originalUuid);
        lineMaterialGroups.get(key).originalParentUuids.push(originalParentUuid);
      });
    });

    const mergedLines = [];
    lineMaterialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      // ИЗМЕНЕНО: Сохраняем UUID и parent UUID перед мерджем
      const savedUuids = [...group.originalUuids];
      const savedParentUuids = [...group.originalParentUuids];

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, false);

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
        // ИЗМЕНЕНО: Передаем сохраненные UUID и parent UUID
        this.setGeomAttribute({
          geometries: group.geometries,
          mergedGeometry,
          originalUuids: savedUuids,
          originalParentUuids: savedParentUuids,
        });

        // Очищаем исходные геометрии
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

  // ИЗМЕНЕНО: Добавлен параметр originalParentUuids
  private static setGeomAttribute({ geometries, mergedGeometry, originalUuids = [], originalParentUuids = [] }) {
    const vertexOffsets = [];
    const vertexCounts = [];
    const faceObjectIds = [];
    const mergedUuids = [];
    const mergedParentUuids = [];

    let vertexOffset = 0;
    let totalFaces = 0;

    // Создаем атрибут для выделения (0 - не выделено, 1 - выделено)
    const highlightAttributeArray = new Float32Array(mergedGeometry.attributes.position.count);

    geometries.forEach((geom, objId) => {
      const geomVertexCount = geom.attributes.position?.count || 0;

      // ИСПРАВЛЕНО: Используем сохраненные UUID или берем из geometry.userData
      const objectUuid = originalUuids[objId] || geom.userData?.uuid || `obj_${objId}`;
      const objectParentUuid = originalParentUuids[objId] || geom.userData?.parentUuid || '';

      let geomFaceCount = 0;
      if (geom.index && geom.index.count) {
        geomFaceCount = Math.floor(geom.index.count / 3);
      } else if (geom.attributes.position && geom.attributes.position.count) {
        geomFaceCount = Math.floor(geom.attributes.position.count / 3);
      }

      for (let i = 0; i < geomFaceCount; i++) {
        faceObjectIds.push(objId);
        totalFaces++;
      }

      // Заполняем атрибут выделения нулями
      const vertexStart = vertexOffset;
      const vertexEnd = vertexStart + geomVertexCount;
      for (let i = vertexStart; i < vertexEnd; i++) {
        highlightAttributeArray[i] = 0; // По умолчанию не выделено
      }

      vertexOffsets.push(vertexOffset);
      vertexCounts.push(geomVertexCount);
      mergedUuids.push(objectUuid);
      mergedParentUuids.push(objectParentUuid);
      vertexOffset += geomVertexCount;
    });

    if (faceObjectIds.length > 0) {
      const objectIdAttribute = new THREE.BufferAttribute(new Uint32Array(faceObjectIds), 1);
      mergedGeometry.setAttribute('objectId', objectIdAttribute);
    }

    // Добавляем атрибут выделения
    const highlightAttribute = new THREE.BufferAttribute(highlightAttributeArray, 1);
    mergedGeometry.setAttribute('highlight', highlightAttribute);

    mergedGeometry.userData = {
      vertexOffsets,
      vertexCounts,
      objectCount: geometries.length,
      uuids: mergedUuids, // ТЕПЕРЬ: Здесь будут правильные оригинальные UUID
      parentUuids: mergedParentUuids, // ДОБАВЛЕНО: Массив parent UUID
      actualFaceCount: totalFaces,
      highlightAttribute: highlightAttribute, // Сохраняем ссылку для быстрого доступа
    };
  }

  private static disposeHierarchy(node) {
    if (node.isMesh || node.isLine || node.isLineSegments) {
      if (node.geometry) {
        node.geometry.dispose();
      }
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    }

    // Очищаем детей рекурсивно
    for (let i = node.children.length - 1; i >= 0; i--) {
      this.disposeHierarchy(node.children[i]);
    }
  }
}
