import * as THREE from 'three';

export class GltfStructure {
  public async initStructure({ gltf }) {
    if (!gltf.parser.json.extras || !gltf.parser.json.extras.tflex) return;

    const structure = gltf.parser.json.extras.tflex.structure;
    // Строим карты
    const nodesMap = new Map();
    const childrenMap = new Map(); // nodeId => массив structure элементов, которые считают этот nodeId своим child

    structure.forEach((item, structureIndex) => {
      if (item.nodes) {
        item.nodes.forEach((nodeId) => {
          const childrenNodes = childrenMap.has(structureIndex) ? childrenMap.get(structureIndex) : [];

          nodesMap.set(nodeId, {
            structureData: item,
            structureIndex,
            childrenNodes,
          });
        });
      }

      // Заполняем карту childrenMap: для каждого childId храним родительские элементы
      if (item.children) {
        item.children.forEach((childId) => {
          if (!childrenMap.has(childId)) {
            childrenMap.set(childId, item.children);
          }
        });
      }
    });

    console.log(333, nodesMap, childrenMap);

    // 2. ОБЪЕДИНЯЕМ В ГРУППЫ
    const groupedChildrenMap = this.groupChildrenMapByValue(childrenMap);
    console.log('Grouped childrenMap:', groupedChildrenMap);

    const allNodeIdsToProcess = new Set();

    for (const groupKeys of groupedChildrenMap.values()) {
      for (const structureIndex of groupKeys) {
        // Находим все nodeId для этого structureIndex
        for (const [nodeId, nodeData] of nodesMap.entries()) {
          if (nodeData.structureIndex === structureIndex) {
            allNodeIdsToProcess.add(nodeId);
          }
        }
      }
    }

    // Параллельно обрабатываем все nodeId
    const processingPromises = Array.from(allNodeIdsToProcess).map(async (nodeId) => {
      try {
        const threeObj = await gltf.parser.getDependency('node', nodeId);

        if (threeObj) {
          const nodeData = nodesMap.get(nodeId);

          // Находим к какой группе принадлежит этот structureIndex
          let groupInfo = null;
          for (const [repKey, groupKeys] of groupedChildrenMap.entries()) {
            if (groupKeys.includes(nodeData.structureIndex)) {
              groupInfo = { representative: repKey, members: groupKeys };
              break;
            }
          }

          return threeObj;
        }
      } catch (error) {
        console.warn(`Ошибка загрузки node ${nodeId}:`, error);
      }
    });

    const processedObjects = await Promise.all(processingPromises);
    console.log(44444, `processedObjects:`, processedObjects);

    gltf.parser.json.nodes.forEach(async (node, index) => {
      if (nodesMap.has(index)) {
        const threeObj = await gltf.parser.getDependency('node', index);
        if (threeObj) {
          const nodeData = nodesMap.get(index);

          //nodesMap.set(index, { ...nodeData, threeObj });

          const { structureData, structureIndex, childrenNodes } = nodeData;

          threeObj.userData.nodeId = index;
          threeObj.userData.structureData = structureData;
          threeObj.userData.structureId = structureIndex; // Записываем индекс из structure

          if (childrenNodes && childrenNodes.length > 0) {
            threeObj.userData.children = childrenNodes;

            const childrenNodeIds = [];

            for (const childStructureId of childrenNodes) {
              const childStructure = structure[childStructureId];
              if (childStructure && childStructure.nodes) {
                childrenNodeIds.push(...childStructure.nodes);
              }
            }

            threeObj.userData.childrenNodeIds = childrenNodeIds;
          }

          threeObj.traverse((node) => {
            if (threeObj !== node) node.userData.parentNodeId = index;
          });
        }
      }
    });
  }

  private groupChildrenMapByValue(childrenMap) {
    const uniqueGroupsMap = new Map();
    const processedValues = new Set();

    // Проходим по всем элементам childrenMap
    for (const [key, value] of childrenMap.entries()) {
      // Создаем уникальный ключ для значения (отсортированный)
      const valueKey = JSON.stringify([...value].sort((a, b) => a - b));

      // Если такое значение еще не обрабатывали
      if (!processedValues.has(valueKey)) {
        processedValues.add(valueKey);

        // Находим все ключи с таким же значением
        const groupKeys = [key];
        for (const [otherKey, otherValue] of childrenMap.entries()) {
          if (key !== otherKey) {
            const otherValueKey = JSON.stringify([...otherValue].sort((a, b) => a - b));
            if (valueKey === otherValueKey) {
              groupKeys.push(otherKey);
            }
          }
        }

        // Сохраняем группу (берем минимальный ключ как представитель группы)
        const representativeKey = Math.min(...groupKeys);
        uniqueGroupsMap.set(
          representativeKey,
          groupKeys.sort((a, b) => a - b)
        );
      }
    }

    return uniqueGroupsMap;
  }

  //------
  public async selectedNode({ gltf, model, nodeId }) {
    const targetNode = gltf.parser.json.nodes[nodeId];
    const threeNode = await gltf.parser.getDependency('node', nodeId);
    const nodeInScene = gltf.scene.getObjectByProperty('uuid', threeNode.uuid);

    console.log(targetNode, threeNode, nodeInScene);

    if (nodeInScene) {
      model.traverse((obj) => {
        if (obj === threeNode) {
          console.log('Найден при обходе сцены!', obj);
          //nodeInScene.removeFromParent();

          obj.children.forEach(async (node) => {
            node.material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            //node.material.color = new THREE.Color(0xff0000);
          });
        }
      });
    }
  }
}
