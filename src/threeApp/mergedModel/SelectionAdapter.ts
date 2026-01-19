import { InitModel } from '@/threeApp/model/InitModel';
import { IDataLabel } from '@/threeApp/model/structure/IData';

// Расширенный интерфейс для узлов в SelectionAdapter
export interface SelectionNode extends IDataLabel {
  uuid?: string;
  ref3dId?: string;
  childsGeom?: SelectionNode[];
}

// Интерфейс для элементов JSON данных
interface JsonDataItem {
  fragment_guid?: string;
  guid?: string;
  [key: string]: unknown;
}

export class SelectionAdapter {
  private static structureCache: SelectionNode[] = [];
  private static uuidIndex: Map<string, SelectionNode> = new Map();
  private static fragmentGuidIndex: Map<string, SelectionNode[]> = new Map();

  public static initializeCache() {
    const structure = InitModel.inst().initData.getTree();
    this.structureCache = this.convertGroups(structure);
    this.buildIndexes(this.structureCache);
  }

  private static convertGroups(val: IDataLabel[]): SelectionNode[] {
    let arr: SelectionNode[] = [];
    const set = new Set<SelectionNode>();

    for (const item of val) {
      if ('children' in item && item.children !== null && item.children.length > 0) {
        const obj = {
          ...item,
        };
        obj.children = [...item.children];
      }

      if (Number.isNaN(item.idxtfxparent)) {
        set.add({ ...item });
      }
    }

    arr = Array.from(set);

    if (arr.length > 0) {
      for (const objCopy of arr) {
        if (objCopy.childsGeom) {
          if (objCopy.children == null) {
            objCopy.children = [...objCopy.childsGeom];
          } else {
            objCopy.children = (objCopy.children as SelectionNode[]).concat(objCopy.childsGeom);
          }
        }
      }
    }

    return arr;
  }

  private static buildIndexes(nodes: SelectionNode[]) {
    if (!nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      if (node.uuid) {
        this.uuidIndex.set(node.uuid, node);
      }

      if (node.fragment_guid) {
        const guid = node.fragment_guid.toUpperCase();
        if (!this.fragmentGuidIndex.has(guid)) {
          this.fragmentGuidIndex.set(guid, []);
        }
        this.fragmentGuidIndex.get(guid)!.push(node);
      }

      if (node.children && Array.isArray(node.children)) {
        this.buildIndexes(node.children);
      }
    }
  }

  public static getSelectedNode({ uuid, parentUuid }: { uuid: string; parentUuid?: string }) {
    if (this.uuidIndex.size === 0) {
      this.initializeCache();
    }

    let selectID = NaN;
    const targetNode = this.findNodeByUuidWithParent(uuid);

    if (targetNode) {
      selectID = this.findRootNodeId(targetNode);
    }

    if (isNaN(selectID) && parentUuid) {
      const parentNode = this.findNodeByUuidWithParent(parentUuid);
      if (parentNode) {
        selectID = this.findRootNodeId(parentNode);
      }
    }

    let node = null;
    if (!isNaN(selectID)) {
      node = this.structureCache.find((item) => item.id === selectID);
    }

    const nodes = this.selectedObj3dFromScene({ node });
    const groupNodes = this.cmd_api_selected3d(nodes);

    return groupNodes;
  }

  private static findNodeByUuidWithParent(uuid: string) {
    return this.uuidIndex.get(uuid) || null;
  }

  private static findRootNodeId(node: SelectionNode) {
    let current = node;
    while (current && current.idxtfxparent !== null && current.idxtfxparent !== undefined) {
      const parent = this.findNodeByIdx(current.idxtfxparent);
      if (!parent) break;
      current = parent;
    }
    return current?.id || NaN;
  }

  private static findNodeByIdx(idx: number) {
    const stack = [...this.structureCache];
    while (stack.length > 0) {
      const node = stack.pop();
      if (node?.idx === idx) return node;

      if (node?.children && Array.isArray(node.children)) {
        stack.push(...node.children);
      }
    }
    return null;
  }

  private static selectedObj3dFromScene({ node }: { node: SelectionNode | null }) {
    if (!node) return [];

    const { fragment_guid } = node;

    if (!fragment_guid) {
      return [node];
    }

    const jsonData = InitModel.inst().json2 as JsonDataItem[] | undefined;

    const itemJson = this.findInJsonDataByFragmentGuid(fragment_guid.toLowerCase(), jsonData);

    let nodes: SelectionNode[] = [];
    if (itemJson?.guid) {
      nodes = this.getUIIDbyACIGuidandFragmentGuid('3d', jsonData, itemJson.guid);
    } else {
      nodes = [node];
    }

    return nodes;
  }

  public static selectedObj3dByFragmentGuid({ fragment_guid }: { fragment_guid: string }) {
    const node: SelectionNode = {
      id: 0,
      idx: 0,
      idxtfxparent: NaN,
      label: '',
      description: '',
      number: '',
      children: null,
      nodes: null,
      id_node_tf: '',
      fragment_guid,
    };
    const nodes = this.selectedObj3dFromScene({ node });
    const groupNodes = this.cmd_api_selected3d(nodes);

    return groupNodes;
  }

  private static findInJsonDataByFragmentGuid(
    fragmentGuid: string,
    jsonData: JsonDataItem[] | undefined
  ): JsonDataItem | null {
    if (!Array.isArray(jsonData)) return null;

    for (const item of jsonData) {
      if (item.fragment_guid?.toLowerCase() === fragmentGuid) {
        return item;
      }
    }
    return null;
  }

  private static getUIIDbyACIGuidandFragmentGuid(
    type: string,
    jsonData: JsonDataItem[] | undefined,
    aciguid: string
  ): SelectionNode[] {
    if (!jsonData) return [];

    if (type !== '3d') {
      return this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData) as unknown as SelectionNode[];
    }

    const objAss = this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);

    const result: SelectionNode[] = [];
    for (const item of objAss) {
      if (item.fragment_guid) {
        const nodes = this.fragmentGuidIndex.get(item.fragment_guid.toUpperCase()) || [];
        result.push(...nodes);
      }
    }

    return result;
  }

  private static findsArrObjFromArrByProp(value: string, prop: string, arr: JsonDataItem[]): JsonDataItem[] {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item) => item[prop] === value);
  }

  private static cmd_api_selected3d(e: SelectionNode | SelectionNode[]): SelectionNode[] {
    const clickNode = Array.isArray(e) ? e : [e];
    const groupNodes: SelectionNode[] = [];

    const stack = [...clickNode];

    while (stack.length > 0) {
      const obj = stack.pop();
      if (!obj) continue;

      groupNodes.push(obj);

      if (obj.childsGeom && Array.isArray(obj.childsGeom)) {
        stack.push(...obj.childsGeom);
      }

      if (obj.children && Array.isArray(obj.children)) {
        stack.push(...(obj.children as SelectionNode[]));
      }
    }

    return groupNodes;
  }

  public static clearCache() {
    this.structureCache = [];
    this.uuidIndex.clear();
    this.fragmentGuidIndex.clear();
  }
}
