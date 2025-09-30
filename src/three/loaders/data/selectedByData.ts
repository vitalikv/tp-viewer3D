import { threeApp } from '../../threeApp';

export class SelectedByData {
  public static getSelectedNode({ obj }) {
    let selectID = NaN;

    const targetUUID = obj.uuid;
    const targetParentUUID = obj.parent.uuid;
    const structure = threeApp.modelLoader.initData.getStructure();

    console.log('uuid: ', targetUUID, 'parentUuid: ', targetParentUUID);

    const getChildren = (children, arr) => {
      for (const child of children) {
        arr.push(child);

        if (child.children?.length) {
          getChildren(child.children, arr);
        }
      }
      return arr;
    };

    for (let item of structure.value) {
      if (item.uuid === targetUUID) {
        selectID = item.id;
        break;
      } else {
        if (item.children && item.children !== null && item.children.length > 0) {
          const children = getChildren(item.children, []);

          for (let ch of children) {
            if (ch.uuid === targetUUID) {
              selectID = item.id;
              break;
            }
          }
        }

        if (obj.parent) {
          for (let item of structure.value) {
            if (item.uuid === targetParentUUID) {
              selectID = item.id;
              break;
            } else if (item.children && item.children !== null && item.children.length > 0) {
              const children = getChildren(item.children, []);

              for (let ch of children) {
                if (ch.uuid === targetParentUUID) {
                  selectID = item.id;
                  break;
                }
              }
            }
          }
        }
      }
    }

    console.log('structure', structure);
    console.log('selectID', selectID);
    let node = null;

    for (let i = 0; i < structure.value.length; i++) {
      const element = structure.value[i];
      if (element.id === selectID) {
        console.log('element', element);
        node = element;
        break;
      }
    }

    const nodes = [node]; // только выделенная группа
    //const nodes = this.selectedObj3dFromScene({ node }); // свзанные группы объектов
    console.log('nodes', nodes);

    const groupNodes = this.cmd_api_selected3d(nodes);
    console.log(9999, groupNodes);

    const objs = this.finds3dObjsInCurrScene(groupNodes);
    console.log(242, objs);

    return objs;
  }

  private static selectedObj3dFromScene({ node }) {
    if (!node) return;

    const { fragment_guid } = node;

    if (!fragment_guid) {
      throw new Error('Не передан fragment_guid для выбора');
    }

    const jsonData = threeApp.modelLoader.json2;

    const itemJson = this.findsArrObjFromArrByProp(fragment_guid.toLowerCase(), 'fragment_guid', jsonData)[0];

    console.log('jsonData', jsonData);
    console.log('itemJson', itemJson);

    let nodes = [];
    if (itemJson?.guid) {
      nodes = this.getUIIDbyACIGuidandFragmentGuid('3d', jsonData, itemJson.guid);
    }

    return nodes;
  }

  private static findsArrObjFromArrByProp(name: string, prop: string, arr: any[]) {
    return arr.filter((item) => item[prop] == name);
  }

  private static getUIIDbyACIGuidandFragmentGuid(type = '3d', jsonData, aciguid: string) {
    const structure = threeApp.modelLoader.initData.getStructure();

    if (type === '3d') {
      const objAss = this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);
      return objAss.map((item) => this.findsArrObjFromArrByProp(item.fragment_guid.toUpperCase(), 'fragment_guid', structure.value)[0]);
    } else {
      // Для 2D
      return this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);
    }
  }

  private static cmd_api_selected3d(e: any) {
    const clickNode = Array.isArray(e) ? e : [e];

    const getNodes = (clickNode: any[], arr: any[]) => {
      for (const obj of clickNode) {
        arr.push(obj);

        if (obj.childsGeom?.length) {
          arr.push(...obj.childsGeom);
        }

        if (obj.children?.length) {
          getNodes(obj.children, arr);
        }
      }

      return arr;
    };

    const groupNodes = getNodes(clickNode, []);

    return groupNodes;
  }

  private static finds3dObjsInCurrScene(selected: any[]) {
    if (selected.length === 0) return [];

    const scene = threeApp.sceneManager.scene;

    const selectedUuids = new Set(selected.map((obj) => obj.uuid));
    const refs3dObj: any[] = [];

    scene.traverse((node) => {
      if (selectedUuids.has(node.uuid)) {
        refs3dObj.push(node);
      }
    });

    return refs3dObj;
  }
}
