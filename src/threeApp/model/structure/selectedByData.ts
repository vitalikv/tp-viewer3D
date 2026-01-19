import * as THREE from 'three';
import { SceneManager } from '@/threeApp/scene/SceneManager';
import { InitModel } from '@/threeApp/model/InitModel';

export class SelectedByData {
  public static getSelectedNode({ obj }: { obj: THREE.Object3D }) {
    let selectID = NaN;

    const targetUUID = obj.uuid;
    const targetParentUUID = obj.parent.uuid;
    const structure = InitModel.inst().initData.getStructure();

    const getChildren = (children: unknown[], arr: unknown[]) => {
      for (const child of children) {
        arr.push(child);

        if (
          child &&
          typeof child === 'object' &&
          'children' in child &&
          Array.isArray((child as { children?: unknown[] }).children)
        ) {
          const childChildren = (child as { children: unknown[] }).children;
          if (childChildren.length > 0) {
            getChildren(childChildren, arr);
          }
        }
      }
      return arr;
    };

    for (const item of structure.value) {
      if (item.uuid === targetUUID) {
        selectID = item.id;
        break;
      } else {
        if (item.children && item.children !== null && item.children.length > 0) {
          const children = getChildren(item.children, []);

          for (const ch of children) {
            if (ch.uuid === targetUUID) {
              selectID = item.id;
              break;
            }
          }
        }

        if (obj.parent) {
          for (const item of structure.value) {
            if (item.uuid === targetParentUUID) {
              selectID = item.id;
              break;
            } else if (item.children && item.children !== null && item.children.length > 0) {
              const children = getChildren(item.children, []);

              for (const ch of children) {
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

    let node = null;

    for (let i = 0; i < structure.value.length; i++) {
      const element = structure.value[i];
      if (element.id === selectID) {
        node = element;
        break;
      }
    }

    //const nodes = [node]; // только выделенная группа
    const nodes = this.selectedObj3dFromScene({ node }); // свзанные группы объектов

    const groupNodes = this.cmd_api_selected3d(nodes);

    const objs = this.finds3dObjsInCurrScene(groupNodes);

    return objs;
  }

  private static selectedObj3dFromScene({ node }: { node: unknown }) {
    if (!node) return;

    const { fragment_guid } = node;

    if (!fragment_guid) {
      throw new Error('Не передан fragment_guid для выбора');
    }

    const jsonData = InitModel.inst().json2;

    const itemJson = this.findsArrObjFromArrByProp(fragment_guid.toLowerCase(), 'fragment_guid', jsonData)[0];

    let nodes: unknown[] = [];
    if (itemJson?.guid) {
      nodes = this.getUIIDbyACIGuidandFragmentGuid('3d', jsonData, itemJson.guid);
    } else {
      nodes = [node];
    }

    return nodes;
  }

  private static findsArrObjFromArrByProp(name: string, prop: string, arr: unknown[]) {
    return arr.filter((item) => item[prop] == name);
  }

  private static getUIIDbyACIGuidandFragmentGuid(type = '3d', jsonData: unknown[], aciguid: string) {
    const structure = InitModel.inst().initData.getStructure();

    if (type === '3d') {
      const objAss = this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);
      return objAss.map(
        (item) => this.findsArrObjFromArrByProp(item.fragment_guid.toUpperCase(), 'fragment_guid', structure.value)[0]
      );
    } else {
      // Для 2D
      return this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);
    }
  }

  private static cmd_api_selected3d(e: unknown) {
    const clickNode = Array.isArray(e) ? e : [e];

    const getNodes = (clickNode: unknown[], arr: unknown[]) => {
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

  private static finds3dObjsInCurrScene(selected: Array<{ uuid: string }>) {
    if (selected.length === 0) return [];

    const scene = SceneManager.inst().scene;

    const selectedUuids = new Set(selected.map((obj) => obj.uuid));
    const refs3dObj: THREE.Object3D[] = [];

    scene.traverse((node) => {
      if (selectedUuids.has(node.uuid)) {
        refs3dObj.push(node);
      }
    });

    return refs3dObj;
  }
}
