import * as THREE from 'three';

type MergedObject = THREE.Mesh | THREE.Line | THREE.LineSegments;

interface UuidGroupMapping {
  mesh: MergedObject;
  groupIndex: number;
  originalPositions?: Float32Array;
  vertexIndices?: number[];
  vertexIndexMap?: Map<number, number>;
  startVertex?: number;
}

export class MergeAnimation {
  private static readonly tempVector = new THREE.Vector3();

  private static animationNodes: Map<string, THREE.Object3D> = new Map();

  private static uuidToGroupMap: Map<string, UuidGroupMapping> = new Map();

  public static createAnimationHierarchy(model: THREE.Object3D): THREE.Object3D {
    model.updateMatrixWorld(true);

    const root = new THREE.Group();
    root.name = model.name || 'AnimationRoot';
    root.uuid = model.uuid;

    root.position.copy(model.position);
    root.rotation.copy(model.rotation);
    root.scale.copy(model.scale);
    root.matrix.copy(model.matrix);
    root.matrixWorld.copy(model.matrixWorld);
    root.matrixAutoUpdate = model.matrixAutoUpdate;

    const nodeMap = new Map<string, THREE.Object3D>();
    nodeMap.set(model.uuid, root);

    const createNode = (originalNode: THREE.Object3D, parent: THREE.Object3D) => {
      let virtualNode: THREE.Object3D;
      const wasMesh =
        originalNode instanceof THREE.Mesh ||
        originalNode instanceof THREE.Line ||
        originalNode instanceof THREE.LineSegments;

      if (wasMesh) {
        virtualNode = new THREE.Group();
      } else if (originalNode instanceof THREE.Group) {
        virtualNode = new THREE.Group();
      } else {
        virtualNode = new THREE.Object3D();
      }

      virtualNode.name = originalNode.name;
      virtualNode.uuid = originalNode.uuid;
      virtualNode.position.copy(originalNode.position);
      virtualNode.rotation.copy(originalNode.rotation);
      virtualNode.scale.copy(originalNode.scale);
      virtualNode.matrix.copy(originalNode.matrix);
      virtualNode.matrixWorld.copy(originalNode.matrixWorld);

      const userData: any = {
        ...originalNode.userData,
        isAnimationNode: true,
        originalMatrixWorld: originalNode.matrixWorld.clone(),
      };

      virtualNode.userData = userData;

      nodeMap.set(originalNode.uuid, virtualNode);
      parent.add(virtualNode);

      originalNode.children.forEach((child) => {
        createNode(child, virtualNode);
      });
    };

    model.children.forEach((child) => {
      createNode(child, root);
    });

    root.updateMatrixWorld(true);

    nodeMap.forEach((node, uuid) => {
      this.animationNodes.set(uuid, node);
    });

    return root;
  }

  public static getAnimationNode(uuid: string): THREE.Object3D | undefined {
    return this.animationNodes.get(uuid);
  }

  public static getUuidToGroupMap(): Map<string, UuidGroupMapping> {
    return this.uuidToGroupMap;
  }

  public static createUuidToGroupMapping(
    geometries: THREE.BufferGeometry[],
    mergedGeometry: THREE.BufferGeometry,
    originalUuids: string[],
    mergedObject: MergedObject
  ) {
    if (!mergedGeometry.groups) {
      return;
    }

    const positionAttr = mergedGeometry.attributes.position;
    if (!positionAttr) {
      console.warn(' Нет атрибута позиций в смерженной геометрии для создания маппинга');
      return;
    }

    if (geometries.length !== originalUuids.length) {
      console.warn(` Несоответствие количества геометрий (${geometries.length}) и UUID (${originalUuids.length})`);
    }

    if (geometries.length !== mergedGeometry.groups.length) {
      console.warn(
        ` Несоответствие количества геометрий (${geometries.length}) и групп (${mergedGeometry.groups.length})`
      );
    }

    const allPositions = positionAttr.array as Float32Array;
    const duplicateUuids = new Map<string, number>();

    geometries.forEach((_geom, geomIndex) => {
      const uuid = originalUuids[geomIndex];

      if (!uuid) {
        console.warn(` Нет UUID для геометрии с индексом ${geomIndex}`);
        return;
      }

      if (geomIndex >= mergedGeometry.groups.length) {
        console.warn(` Индекс геометрии ${geomIndex} превышает количество групп ${mergedGeometry.groups.length}`);
        return;
      }

      if (this.uuidToGroupMap.has(uuid)) {
        const count = duplicateUuids.get(uuid) || 0;
        duplicateUuids.set(uuid, count + 1);
        console.warn(
          ` Дубликат UUID ${uuid} - несколько мешей используют одну геометрию (встречается ${count + 2} раз)`
        );
      }

      const groupIndex = geomIndex;
      const group = mergedGeometry.groups[groupIndex];

      const indexAttr = mergedGeometry.index;
      const vertexCount = positionAttr.count;

      if (indexAttr) {
        const uniqueVertexIndices = new Set<number>();

        for (let i = group.start; i < group.start + group.count; i++) {
          const vertexIndex = indexAttr.getX(i);
          if (vertexIndex >= 0 && vertexIndex < vertexCount) {
            uniqueVertexIndices.add(vertexIndex);
          }
        }

        const uniqueVertices = Array.from(uniqueVertexIndices).sort((a, b) => a - b);
        const originalPositions = new Float32Array(uniqueVertices.length * 3);

        for (let i = 0; i < uniqueVertices.length; i++) {
          const vertexIndex = uniqueVertices[i];
          const posIndex = vertexIndex * 3;
          originalPositions[i * 3] = allPositions[posIndex];
          originalPositions[i * 3 + 1] = allPositions[posIndex + 1];
          originalPositions[i * 3 + 2] = allPositions[posIndex + 2];
        }

        const vertexIndexMap = new Map<number, number>();
        uniqueVertices.forEach((vertexIndex, mapIndex) => {
          vertexIndexMap.set(vertexIndex, mapIndex);
        });

        this.uuidToGroupMap.set(uuid, {
          mesh: mergedObject,
          groupIndex: groupIndex,
          originalPositions: originalPositions,
          vertexIndices: uniqueVertices,
          vertexIndexMap: vertexIndexMap,
        });
      } else {
        const startVertex = group.start * 3;
        const countVertices = group.count * 3;

        if (startVertex + countVertices > allPositions.length) {
          console.warn(
            ` Некорректные индексы для группы ${groupIndex}: start=${startVertex}, count=${countVertices}, positions.length=${allPositions.length}, group.start=${group.start}, group.count=${group.count}`
          );
          return;
        }

        const originalPositions = new Float32Array(countVertices);
        for (let i = 0; i < countVertices; i++) {
          originalPositions[i] = allPositions[startVertex + i];
        }

        this.uuidToGroupMap.set(uuid, {
          mesh: mergedObject,
          groupIndex: groupIndex,
          originalPositions: originalPositions,
          startVertex: startVertex,
        });
      }
    });

    if (duplicateUuids.size > 0) {
      console.warn(
        ` Найдено ${duplicateUuids.size} дубликатов UUID - это может вызвать проблемы с анимацией для повторяющихся геометрий`
      );
    }
  }

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
    const indexAttr = geometry.index;

    if (originalPositions) {
      if (indexAttr && mapping.vertexIndices) {
        const vertexIndices = mapping.vertexIndices;
        for (let i = 0; i < vertexIndices.length; i++) {
          const vertexIndex = vertexIndices[i];
          const posIndex = vertexIndex * 3;
          const origIndex = i * 3;

          this.tempVector.set(
            originalPositions[origIndex],
            originalPositions[origIndex + 1],
            originalPositions[origIndex + 2]
          );
          this.tempVector.applyMatrix4(relativeMatrix);

          positions[posIndex] = this.tempVector.x;
          positions[posIndex + 1] = this.tempVector.y;
          positions[posIndex + 2] = this.tempVector.z;
        }
      } else {
        const startVertex = mapping.startVertex ?? group.start * 3;
        const count = originalPositions.length;

        for (let i = 0; i < count; i += 3) {
          this.tempVector.set(originalPositions[i], originalPositions[i + 1], originalPositions[i + 2]);
          this.tempVector.applyMatrix4(relativeMatrix);
          positions[startVertex + i] = this.tempVector.x;
          positions[startVertex + i + 1] = this.tempVector.y;
          positions[startVertex + i + 2] = this.tempVector.z;
        }
      }
    } else {
      const start = group.start * 3;
      const count = group.count * 3;

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

  public static linkAnimationHierarchyToMergedModel(
    animationRoot: THREE.Object3D,
    mergedMeshes: THREE.Mesh[],
    mergedLines: (THREE.Line | THREE.LineSegments)[]
  ): void {
    const allOriginalUuids = new Set<string>();

    mergedMeshes.forEach((mesh) => {
      const geometry = mesh.geometry;
      const uuids = geometry.userData?.uuids as string[] | undefined;
      if (uuids) {
        uuids.forEach((uuid) => allOriginalUuids.add(uuid));
      }
    });

    mergedLines.forEach((line) => {
      const geometry = line.geometry;
      const uuids = geometry.userData?.uuids as string[] | undefined;
      if (uuids) {
        uuids.forEach((uuid) => allOriginalUuids.add(uuid));
      }
    });

    const missingMappings: string[] = [];
    const totalMeshNodes = new Set<string>();

    animationRoot.traverse((node) => {
      const uuid = node.uuid;

      if (allOriginalUuids.has(uuid)) {
        totalMeshNodes.add(uuid);

        if (!this.uuidToGroupMap.has(uuid)) {
          missingMappings.push(uuid);
        }
      }
    });

    if (missingMappings.length > 0) {
      console.warn(
        ` Найдены узлы виртуальной иерархии без маппинга: ${missingMappings.length} из ${totalMeshNodes.size} мешей/линий`
      );
      if (missingMappings.length <= 10) {
        console.warn('UUID без маппинга:', missingMappings);
      }
    }

    const missingNodes: string[] = [];
    this.uuidToGroupMap.forEach((_mapping, uuid) => {
      if (!this.animationNodes.has(uuid)) {
        missingNodes.push(uuid);
      }
    });

    if (missingNodes.length > 0) {
      console.warn(` Найдены UUID в маппинге без узлов в виртуальной иерархии: ${missingNodes.length}`);
      if (missingNodes.length <= 10) {
        console.warn('UUID без узлов:', missingNodes);
      }
    }

    console.log(
      `Связь виртуальной иерархии со смерженной моделью: ${this.uuidToGroupMap.size} маппингов, ${totalMeshNodes.size} мешей/линий в иерархии, ${this.animationNodes.size} всего узлов`
    );
  }

  public static clearAnimationData() {
    this.animationNodes.clear();
    this.uuidToGroupMap.clear();
  }
}
