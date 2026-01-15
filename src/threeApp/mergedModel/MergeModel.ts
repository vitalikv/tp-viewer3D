import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { MergeAnimation } from '@/threeApp/mergedModel/MergeAnimation';

export class MergeModel {
  private static readonly tempVector = new THREE.Vector3();

  public static processModelWithMerge(model: THREE.Object3D) {
    // Создаем виртуальную иерархию узлов для анимации ПЕРЕД мержем
    const animationRoot = MergeAnimation.createAnimationHierarchy(model);

    const { mergedMeshes, mergedLines } = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    const group = new THREE.Group();
    const groupMeshes = new THREE.Group();
    const groupLines = new THREE.Group();

    if (mergedMeshes.length > 0) groupMeshes.add(...mergedMeshes);
    if (mergedLines.length > 0) groupLines.add(...mergedLines);

    group.add(groupMeshes, groupLines);

    // Связываем виртуальную иерархию со смерженной моделью через originalUuids
    MergeAnimation.linkAnimationHierarchyToMergedModel(animationRoot, mergedMeshes, mergedLines);

    // Сохраняем ссылку на виртуальную иерархию в группе
    (group as any).userData.animationRoot = animationRoot;
    (group as any).userData.uuidToGroupMap = MergeAnimation.getUuidToGroupMap();

    return { group };
  }

  private static mergeGeometriesWithMaterials(model: THREE.Object3D) {
    const meshEntries: { mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }[] = [];
    const lineEntries: { line: THREE.Line | THREE.LineSegments; worldMatrix: THREE.Matrix4; isLineSegments: boolean }[] = [];

    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.updateWorldMatrix(true, false);
        meshEntries.push({
          mesh: child,
          worldMatrix: child.matrixWorld.clone(),
        });
      }

      if ((child instanceof THREE.Line || child instanceof THREE.LineSegments) && child.geometry) {
        child.updateWorldMatrix(true, false);
        lineEntries.push({
          line: child,
          worldMatrix: child.matrixWorld.clone(),
          isLineSegments: child instanceof THREE.LineSegments,
        });
      }
    });

    const mergedMeshes: THREE.Mesh[] = [];
    if (meshEntries.length > 0) {
      const meshResults = this.mergeMeshGeometries(meshEntries);
      mergedMeshes.push(...meshResults);
    }

    const mergedLines: (THREE.Line | THREE.LineSegments)[] = [];
    if (lineEntries.length > 0) {
      const lineResults = this.mergeLineGeometries(lineEntries);
      mergedLines.push(...lineResults);
    }

    return { mergedMeshes, mergedLines };
  }

  private static mergeMeshGeometries(meshEntries: { mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }[]) {
    const materialGroups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; originalUuids: string[]; originalParentUuids: string[] }>();

    meshEntries.forEach(({ mesh, worldMatrix }) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material, idx) => {
        material.clippingPlanes = ClippingBvh.inst().getClippingPlanes();

        const key = material.uuid || `mat_${idx}`;

        if (!materialGroups.has(key)) {
          materialGroups.set(key, {
            material: material,
            geometries: [],
            originalUuids: [],
            originalParentUuids: [],
          });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        const originalUuid = mesh.uuid;
        const originalParentUuid = mesh.parent?.uuid || '';

        geometry.userData = {
          uuid: originalUuid,
          parentUuid: originalParentUuid,
          originalUserData: mesh.userData,
        };

        materialGroups.get(key)!.geometries.push(geometry);
        materialGroups.get(key)!.originalUuids.push(originalUuid);
        materialGroups.get(key)!.originalParentUuids.push(originalParentUuid);
      });
    });

    const mergedMeshes: THREE.Mesh[] = [];
    materialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, true);

      if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
        const mergedMesh = new THREE.Mesh(mergedGeometry, group.material);
        mergedMeshes.push(mergedMesh);

        this.setGeomAttribute({
          geometries: group.geometries,
          mergedGeometry,
          originalUuids: group.originalUuids,
          originalParentUuids: group.originalParentUuids,
          mergedObject: mergedMesh,
        });

        group.geometries.forEach((geom) => geom.dispose());
      }
    });

    return mergedMeshes;
  }

  private static mergeLineGeometries(lineEntries: { line: THREE.Line | THREE.LineSegments; worldMatrix: THREE.Matrix4; isLineSegments: boolean }[]): (THREE.Line | THREE.LineSegments)[] {
    const lineMaterialGroups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[]; isLineSegments: boolean; originalUuids: string[]; originalParentUuids: string[] }>();

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
            originalParentUuids: [],
          });
        }

        const geometry = this.prepareLineGeometry(line.geometry, worldMatrix);
        const originalUuid = line.uuid;
        const originalParentUuid = line.parent?.uuid || '';

        geometry.userData = {
          uuid: originalUuid,
          parentUuid: originalParentUuid,
          originalUserData: line.userData,
        };

        lineMaterialGroups.get(key)!.geometries.push(geometry);
        lineMaterialGroups.get(key)!.originalUuids.push(originalUuid);
        lineMaterialGroups.get(key)!.originalParentUuids.push(originalParentUuid);
      });
    });

    const mergedLines: (THREE.Line | THREE.LineSegments)[] = [];
    lineMaterialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      const mergedGeometry = this.mergeLineGeometriesWithBreaks(group.geometries);

      if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
        // Клонируем оригинальный материал и устанавливаем vertexColors
        const lineMaterial = (group.material as THREE.LineBasicMaterial).clone();
        lineMaterial.vertexColors = true;

        let mergedLine: THREE.Line | THREE.LineSegments;
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
          originalParentUuids: group.originalParentUuids,
          mergedObject: mergedLine,
        });

        group.geometries.forEach((geom) => geom.dispose());
      }
    });

    return mergedLines;
  }

  private static mergeLineGeometriesWithBreaks(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geometries.length === 0) {
      return new THREE.BufferGeometry();
    }

    if (geometries.length === 1) {
      const cloned = geometries[0].clone();
      // Если геометрия одна и нет групп, создаем группу
      if (!cloned.groups || cloned.groups.length === 0) {
        const indexCount = cloned.index ? cloned.index.count : cloned.attributes.position.count;
        if (indexCount > 0) {
          cloned.addGroup(0, indexCount, 0);
        }
      }
      return cloned;
    }

    const BREAK_VALUE_SIGNED = -1;
    const BREAK_VALUE_UNSIGNED = 4294967295;
    const MAX_UINT16 = 65535;

    // Собираем все позиции и цвета
    const positions: number[] = [];
    const colors: number[] = [];
    const hasColors = geometries.some((geo) => geo.attributes.color);

    geometries.forEach((geometry) => {
      const posAttr = geometry.attributes.position;
      if (posAttr) {
        const posArray = posAttr.array;
        for (let i = 0; i < posArray.length; i += 3) {
          positions.push(posArray[i], posArray[i + 1], posArray[i + 2]);
        }
      }

      if (hasColors) {
        const colorAttr = geometry.attributes.color;
        if (colorAttr) {
          const colorArray = colorAttr.array;
          for (let i = 0; i < colorArray.length; i += 3) {
            colors.push(colorArray[i], colorArray[i + 1], colorArray[i + 2]);
          }
        } else {
          // Если у геометрии нет цветов, добавляем белый
          const posCount = geometry.attributes.position.count;
          for (let i = 0; i < posCount; i++) {
            colors.push(1, 1, 1);
          }
        }
      }
    });

    // Собираем индексы с сохранением разрывов и создаем группы
    const indices: number[] = [];
    const groups: { start: number; count: number; materialIndex: number }[] = [];
    let vertexOffset = 0;
    let indexOffset = 0;
    let needsUint32 = false;

    geometries.forEach((geometry, geomIndex) => {
      const indexAttr = geometry.index;
      const positionCount = geometry.attributes.position.count;
      const groupStart = indexOffset;
      let groupCount = 0;

      if (indexAttr) {
        const indexArray = indexAttr.array;
        const indexCount = indexAttr.count;

        for (let i = 0; i < indexCount; i++) {
          let indexValue: number;

          if (indexArray instanceof Uint16Array) {
            indexValue = indexArray[i];
          } else if (indexArray instanceof Uint32Array) {
            indexValue = indexArray[i];
          } else {
            indexValue = indexArray[i];
          }

          // Проверяем на разрыв
          if (indexValue === BREAK_VALUE_UNSIGNED || indexValue === BREAK_VALUE_SIGNED) {
            indices.push(BREAK_VALUE_UNSIGNED);
            needsUint32 = true;
            groupCount++;
          } else {
            const newIndex = vertexOffset + indexValue;
            indices.push(newIndex);
            groupCount++;
            if (newIndex > MAX_UINT16) {
              needsUint32 = true;
            }
          }
        }

        // Создаем группу для этой геометрии
        groups.push({
          start: groupStart,
          count: groupCount,
          materialIndex: geomIndex,
        });

        indexOffset += groupCount;
      } else {
        // Если нет индексов, создаем последовательные индексы
        for (let i = 0; i < positionCount; i++) {
          const newIndex = vertexOffset + i;
          indices.push(newIndex);
          groupCount++;
          if (newIndex > MAX_UINT16) {
            needsUint32 = true;
          }
        }

        // Создаем группу для этой геометрии
        groups.push({
          start: groupStart,
          count: groupCount,
          materialIndex: geomIndex,
        });

        indexOffset += groupCount;
      }

      // Добавляем разрыв между геометриями (кроме последней)
      if (geomIndex < geometries.length - 1) {
        indices.push(BREAK_VALUE_UNSIGNED);
        needsUint32 = true;
        indexOffset += 1;
      }

      vertexOffset += positionCount;
    });

    // Создаем результирующую геометрию
    const mergedGeometry = new THREE.BufferGeometry();

    // Позиции
    const positionArray = new Float32Array(positions);
    mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

    // Цвета
    if (hasColors && colors.length > 0) {
      const colorArray = new Float32Array(colors);
      mergedGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    }

    // Индексы
    if (indices.length > 0) {
      let indexArray: Uint16Array | Uint32Array;
      if (needsUint32) {
        indexArray = new Uint32Array(indices);
      } else {
        indexArray = new Uint16Array(indices);
      }
      mergedGeometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
    }

    // Добавляем группы в геометрию
    groups.forEach((group) => {
      mergedGeometry.addGroup(group.start, group.count, group.materialIndex);
    });

    return mergedGeometry;
  }

  private static prepareGeometry(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
    const clonedGeo = geometry.clone();
    clonedGeo.applyMatrix4(matrix);

    if (clonedGeo.index) {
      clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  private static prepareLineGeometry(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
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

    // Для линий сохраняем индексы с разрывами, не вызываем toNonIndexed()
    // Если геометрия одна и нет групп, создаем группы
    if (!clonedGeo.index && clonedGeo.attributes.position) {
      const positionCount = clonedGeo.attributes.position.count;
      if (positionCount > 0) {
        const indices = new Uint16Array(positionCount);
        for (let i = 0; i < positionCount; i++) {
          indices[i] = i;
        }
        clonedGeo.setIndex(new THREE.BufferAttribute(indices, 1));
      }
    }

    return clonedGeo;
  }

  private static setGeomAttribute({
    geometries,
    mergedGeometry,
    originalUuids = [],
    originalParentUuids = [],
    mergedObject,
  }: {
    geometries: THREE.BufferGeometry[];
    mergedGeometry: THREE.BufferGeometry;
    originalUuids: string[];
    originalParentUuids: string[];
    mergedObject?: THREE.Mesh | THREE.Line | THREE.LineSegments;
  }) {
    mergedGeometry.userData = {
      groups: mergedGeometry.groups,
      uuids: originalUuids,
      parentUuids: originalParentUuids,
      objectCount: geometries.length,
    };

    // Создаем маппинг UUID -> group index для применения анимаций
    if (mergedObject && mergedGeometry.groups) {
      MergeAnimation.createUuidToGroupMapping(geometries, mergedGeometry, originalUuids, mergedObject);
    }
  }

  private static disposeHierarchy(node: THREE.Object3D) {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.LineSegments) {
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
