import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { threeApp } from '../threeApp';

export class MergeModel {
  private static readonly tempVector = new THREE.Vector3();
  // Виртуальная иерархия узлов для анимации
  private static animationNodes: Map<string, THREE.Object3D> = new Map();
  // Маппинг UUID исходного объекта -> { mesh, groupIndex, originalPositions }
  private static uuidToGroupMap: Map<string, { mesh: THREE.Mesh; groupIndex: number; originalPositions?: Float32Array }> = new Map();

  public static processModelWithMerge(model: THREE.Object3D) {
    // Создаем виртуальную иерархию узлов для анимации ПЕРЕД мержем
    const animationRoot = this.createAnimationHierarchy(model);

    const { mergedMeshes, mergedLines } = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    const group = new THREE.Group();
    const groupMeshes = new THREE.Group();
    const groupLines = new THREE.Group();

    if (mergedMeshes.length > 0) groupMeshes.add(...mergedMeshes);
    if (mergedLines.length > 0) groupLines.add(...mergedLines);

    group.add(groupMeshes, groupLines);

    // Сохраняем ссылку на виртуальную иерархию в группе
    (group as any).userData.animationRoot = animationRoot;
    (group as any).userData.uuidToGroupMap = this.uuidToGroupMap;

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
        material.clippingPlanes = threeApp.clippingBvh.getClippingPlanes();

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
          mergedMesh: mergedMesh,
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

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, true);

      if (mergedGeometry && mergedGeometry.attributes.position && mergedGeometry.attributes.position.count > 0) {
        const lineMaterial = new THREE.LineBasicMaterial({
          vertexColors: true,
          color: (group.material as any).color || 0xffffff,
        });

        let mergedLine: THREE.Line | THREE.LineSegments;
        if (group.isLineSegments) {
          mergedLine = new THREE.LineSegments(mergedGeometry, lineMaterial);
        } else {
          mergedLine = new THREE.Line(mergedGeometry, lineMaterial);
        }

        mergedLines.push(mergedLine);
        // Для линий сохраняем userData без маппинга (можно расширить позже если нужно)
        mergedGeometry.userData = {
          groups: mergedGeometry.groups,
          uuids: group.originalUuids,
          parentUuids: group.originalParentUuids,
          objectCount: group.geometries.length,
        };

        group.geometries.forEach((geom) => geom.dispose());
      }
    });

    return mergedLines;
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

    if (clonedGeo.index) {
      clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  private static setGeomAttribute({ geometries, mergedGeometry, originalUuids = [], originalParentUuids = [], mergedMesh }: { geometries: THREE.BufferGeometry[]; mergedGeometry: THREE.BufferGeometry; originalUuids: string[]; originalParentUuids: string[]; mergedMesh?: THREE.Mesh }) {
    mergedGeometry.userData = {
      groups: mergedGeometry.groups,
      uuids: originalUuids,
      parentUuids: originalParentUuids,
      objectCount: geometries.length,
    };

    // Создаем маппинг UUID -> group index для применения анимаций
    if (mergedMesh && mergedGeometry.groups) {
      const positionAttr = mergedGeometry.attributes.position;
      if (positionAttr) {
        const allPositions = positionAttr.array as Float32Array;
        let vertexOffset = 0;

        geometries.forEach((geom, geomIndex) => {
          const uuid = originalUuids[geomIndex];
          if (uuid && geomIndex < mergedGeometry.groups.length) {
            const groupIndex = geomIndex;
            const group = mergedGeometry.groups[groupIndex];
            const start = group.start * 3;
            const count = group.count * 3;

            // Сохраняем исходные позиции вершин для этой группы
            const originalPositions = new Float32Array(count);
            for (let i = 0; i < count; i++) {
              originalPositions[i] = allPositions[start + i];
            }

            this.uuidToGroupMap.set(uuid, {
              mesh: mergedMesh,
              groupIndex: groupIndex,
              originalPositions: originalPositions,
            });
          }
          vertexOffset += geom.attributes.position?.count || 0;
        });
      }
    }
  }

  /**
   * Создает виртуальную иерархию узлов для анимации
   * Копирует структуру исходной модели с теми же UUID и именами
   */
  private static createAnimationHierarchy(model: THREE.Object3D): THREE.Object3D {
    const root = new THREE.Group();
    root.name = model.name || 'AnimationRoot';
    root.uuid = model.uuid;

    const nodeMap = new Map<string, THREE.Object3D>();
    nodeMap.set(model.uuid, root);

    // Рекурсивно создаем виртуальные узлы
    const createNode = (originalNode: THREE.Object3D, parent: THREE.Object3D) => {
      let virtualNode: THREE.Object3D;

      // Создаем виртуальный узел того же типа
      if (originalNode instanceof THREE.Mesh || originalNode instanceof THREE.Line || originalNode instanceof THREE.LineSegments) {
        // Для мешей и линий создаем пустую группу (геометрия будет в смерженной модели)
        virtualNode = new THREE.Group();
      } else if (originalNode instanceof THREE.Group) {
        virtualNode = new THREE.Group();
      } else {
        virtualNode = new THREE.Object3D();
      }

      // Копируем важные свойства для анимации
      virtualNode.name = originalNode.name;
      virtualNode.uuid = originalNode.uuid;
      virtualNode.position.copy(originalNode.position);
      virtualNode.rotation.copy(originalNode.rotation);
      virtualNode.scale.copy(originalNode.scale);
      virtualNode.matrix.copy(originalNode.matrix);
      virtualNode.matrixWorld.copy(originalNode.matrixWorld);
      // Сохраняем исходную мировую матрицу для вычисления относительных трансформаций
      virtualNode.userData = {
        ...originalNode.userData,
        isAnimationNode: true,
        originalMatrixWorld: originalNode.matrixWorld.clone(),
      };

      nodeMap.set(originalNode.uuid, virtualNode);
      parent.add(virtualNode);

      // Рекурсивно обрабатываем детей
      originalNode.children.forEach((child) => {
        createNode(child, virtualNode);
      });
    };

    // Создаем виртуальную иерархию
    model.children.forEach((child) => {
      createNode(child, root);
    });

    // Сохраняем все узлы в статической карте для быстрого доступа
    nodeMap.forEach((node, uuid) => {
      this.animationNodes.set(uuid, node);
    });

    return root;
  }

  /**
   * Получает виртуальный узел для анимации по UUID
   */
  public static getAnimationNode(uuid: string): THREE.Object3D | undefined {
    return this.animationNodes.get(uuid);
  }

  /**
   * Получает маппинг UUID -> группа для применения анимаций
   */
  public static getUuidToGroupMap(): Map<string, { mesh: THREE.Mesh; groupIndex: number }> {
    return this.uuidToGroupMap;
  }

  /**
   * Применяет трансформацию из анимации к соответствующей группе в смерженной геометрии
   * @param uuid - UUID исходного узла
   * @param relativeMatrix - относительная трансформация (новая мировая матрица * обратная исходная)
   */
  public static applyAnimationToGroup(uuid: string, relativeMatrix: THREE.Matrix4) {
    const mapping = this.uuidToGroupMap.get(uuid);
    if (!mapping) return;

    const { mesh, groupIndex, originalPositions } = mapping;
    const geometry = mesh.geometry;
    const groups = geometry.userData?.groups;

    if (!groups || groupIndex >= groups.length) return;

    const group = groups[groupIndex];
    const positionAttr = geometry.attributes.position;

    if (!positionAttr) return;

    const positions = positionAttr.array as Float32Array;
    const start = group.start * 3; // Каждая вершина = 3 компонента (x, y, z)
    const count = group.count * 3;

    if (originalPositions) {
      // Применяем относительную трансформацию к исходным позициям
      for (let i = 0; i < count; i += 3) {
        this.tempVector.set(originalPositions[i], originalPositions[i + 1], originalPositions[i + 2]);
        this.tempVector.applyMatrix4(relativeMatrix);
        positions[start + i] = this.tempVector.x;
        positions[start + i + 1] = this.tempVector.y;
        positions[start + i + 2] = this.tempVector.z;
      }
    } else {
      // Если нет исходных позиций, применяем к текущим (fallback)
      for (let i = start; i < start + count; i += 3) {
        this.tempVector.set(positions[i], positions[i + 1], positions[i + 2]);
        this.tempVector.applyMatrix4(relativeMatrix);
        positions[i] = this.tempVector.x;
        positions[i + 1] = this.tempVector.y;
        positions[i + 2] = this.tempVector.z;
      }
    }

    positionAttr.needsUpdate = true;
  }

  /**
   * Очищает данные анимации
   */
  public static clearAnimationData() {
    this.animationNodes.clear();
    this.uuidToGroupMap.clear();
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
