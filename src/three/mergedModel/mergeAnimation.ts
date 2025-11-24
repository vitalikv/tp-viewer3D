import * as THREE from 'three';

export class MergeAnimation {
  private static readonly tempVector = new THREE.Vector3();
  // Виртуальная иерархия узлов для анимации
  private static animationNodes: Map<string, THREE.Object3D> = new Map();
  // Маппинг UUID исходного объекта -> { mesh, groupIndex, originalPositions }
  private static uuidToGroupMap: Map<string, { mesh: THREE.Mesh; groupIndex: number; originalPositions?: Float32Array }> = new Map();

  /**
   * Создает виртуальную иерархию узлов для анимации
   * Копирует структуру исходной модели с теми же UUID и именами
   */
  public static createAnimationHierarchy(model: THREE.Object3D): THREE.Object3D {
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
   * Создает маппинг UUID -> group index для применения анимаций
   */
  public static createUuidToGroupMapping(geometries: THREE.BufferGeometry[], mergedGeometry: THREE.BufferGeometry, originalUuids: string[], mergedMesh: THREE.Mesh) {
    if (!mergedGeometry.groups) return;

    const positionAttr = mergedGeometry.attributes.position;
    if (!positionAttr) return;

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
}
