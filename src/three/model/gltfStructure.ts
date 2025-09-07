import * as THREE from 'three';

export class GltfStructure {
  public initStructure({ gltf }) {
    if (!gltf.parser.json.extras || !gltf.parser.json.extras.tflex) return;

    const structure = gltf.parser.json.extras.tflex.structure;
    // Строим карты
    const nodesMap = new Map();
    const childrenMap = new Map(); // nodeId => массив structure элементов, которые считают этот nodeId своим child

    structure.forEach((item, structureIndex) => {
      if (item.nodes) {
        item.nodes.forEach((nodeId) => {
          nodesMap.set(nodeId, {
            structureData: item,
            structureIndex: structureIndex,
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

    console.log(333, childrenMap);

    gltf.parser.json.nodes.forEach(async (node, index) => {
      if (nodesMap.has(index)) {
        const threeObj = await gltf.parser.getDependency('node', index);
        if (threeObj) {
          const { structureData, structureIndex } = nodesMap.get(index);

          threeObj.userData.nodeId = index;
          threeObj.userData.structureData = structureData;
          threeObj.userData.structureId = structureIndex; // Записываем индекс из structure

          if (childrenMap.has(structureIndex)) {
            const children = childrenMap.get(structureIndex);
            threeObj.userData.children = children;

            // Получаем childrenNodeIds (список ID nodes, а не объектов)
            const childrenNodeIds = [];

            // Для каждого дочернего structureId находим его nodeIds
            for (const childStructureId of children) {
              // Находим structure элемент по индексу
              const childStructure = structure[childStructureId];
              if (childStructure && childStructure.nodes) {
                // Добавляем все nodeIds из дочернего элемента
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
