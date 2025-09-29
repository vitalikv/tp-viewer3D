import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class MergeMeshes {
  private static readonly MAX_VERTICES_PER_GEOMETRY = 350000;
  private static readonly tempVector = new THREE.Vector3(); // Переиспользуемый вектор

  public static processModelWithMerge(model) {
    const { mergedMeshes, mergedLines } = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    const group = new THREE.Group();
    group.add(...mergedMeshes, ...mergedLines);

    return group;
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
          materialGroups.set(key, { material: material, geometries: [], uuids: [] });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        geometry.userData.uuid = mesh.parent.uuid ? mesh.parent.uuid : mesh.uuid;

        materialGroups.get(key).geometries.push(geometry);
        materialGroups.get(key).uuids.push(mesh.uuid);
      });
    });

    const mergedMeshes = [];
    materialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      const geometryChunks = this.splitGeometriesIfNeeded(group.geometries);
      geometryChunks.forEach((chunkGeometries) => {
        if (chunkGeometries.length === 0) return;

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(chunkGeometries, false);

        if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
          const mergedMesh = new THREE.Mesh(mergedGeometry, group.material);
          mergedMeshes.push(mergedMesh);

          this.setGeomAttribute({ geometries: chunkGeometries, mergedGeometry, uuids: group.uuids });

          // Очищаем временные геометрии
          chunkGeometries.forEach((geom) => geom.dispose());
        }
      });

      // Очищаем исходные геометрии
      group.geometries.forEach((geom) => geom.dispose());
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
            uuids: [],
          });
        }

        const geometry = this.prepareLineGeometry(line.geometry, worldMatrix);
        //geometry.userData.uuid = line.parent.uuid ? line.parent.uuid : line.uuid;
        geometry.userData.uuid = line.uuid;

        lineMaterialGroups.get(key).geometries.push(geometry);
        lineMaterialGroups.get(key).uuids.push(line.uuid);
      });
    });

    const mergedLines = [];
    lineMaterialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      const geometryChunks = this.splitGeometriesIfNeeded(group.geometries);
      geometryChunks.forEach((chunkGeometries) => {
        if (chunkGeometries.length === 0) return;

        const mergedGeometry = BufferGeometryUtils.mergeGeometries(chunkGeometries, false);

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
            geometries: chunkGeometries,
            mergedGeometry,
            uuids: group.uuids,
          });

          // Очищаем временные геометрии
          chunkGeometries.forEach((geom) => geom.dispose());
        }
      });

      // Очищаем исходные геометрии
      group.geometries.forEach((geom) => geom.dispose());
    });

    return mergedLines;
  }

  private static splitGeometriesIfNeeded(geometries) {
    const chunks = [];
    let currentChunk = [];
    let currentVertexCount = 0;

    for (const geometry of geometries) {
      const vertexCount = geometry.attributes.position.count;

      if (vertexCount > this.MAX_VERTICES_PER_GEOMETRY) {
        console.log('Geometry too large, skipping:', vertexCount);
        continue;
      }

      if (currentVertexCount + vertexCount > this.MAX_VERTICES_PER_GEOMETRY) {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentVertexCount = 0;
        }
      }

      currentChunk.push(geometry);
      currentVertexCount += vertexCount;
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }

    return chunks;
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

  private static setGeomAttribute({ geometries, mergedGeometry, uuids = [] }) {
    const vertexOffsets = [];
    const vertexCounts = [];
    const faceObjectIds = [];
    const mergedUuids = [];

    let vertexOffset = 0;
    let totalFaces = 0;

    // Создаем атрибут для выделения (0 - не выделено, 1 - выделено)
    const highlightAttributeArray = new Float32Array(mergedGeometry.attributes.position.count);

    geometries.forEach((geom, objId) => {
      const geomVertexCount = geom.attributes.position?.count || 0;
      const objectUuid = geom.userData?.uuid || (uuids.length > objId ? uuids[objId] : null) || `obj_${objId}`;

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
      uuids: mergedUuids,
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
