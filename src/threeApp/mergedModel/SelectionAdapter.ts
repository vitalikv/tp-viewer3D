import { InitModel } from '@/threeApp/model/InitModel';

export class SelectionAdapter {
  private static structureCache: any[] = [];
  private static uuidIndex: Map<string, any> = new Map();
  private static fragmentGuidIndex: Map<string, any[]> = new Map();

  public static initializeCache() {
    const structure = InitModel.inst().initData.getTree();
    this.structureCache = this.convertGroups(structure);
    this.buildIndexes(this.structureCache);
  }

  private static convertGroups(val: any[]) {
    let arr: any[] = [];
    const set = new Set<any>();

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
            objCopy.children = objCopy.children.concat(objCopy.childsGeom);
          }
        }
      }
    }

    return arr;
  }

  private static buildIndexes(nodes: any[]) {
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

  private static findRootNodeId(node: any) {
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

  private static selectedObj3dFromScene({ node }: { node: any }) {
    if (!node) return [];

    const { fragment_guid } = node;

    if (!fragment_guid) {
      return [node];
    }

    const jsonData = InitModel.inst().json2;

    const itemJson = this.findInJsonDataByFragmentGuid(fragment_guid.toLowerCase(), jsonData);

    let nodes: any[] = [];
    if (itemJson?.guid) {
      nodes = this.getUIIDbyACIGuidandFragmentGuid('3d', jsonData, itemJson.guid);
    } else {
      nodes = [node];
    }

    return nodes;
  }

  public static selectedObj3dByFragmentGuid({ fragment_guid }: { fragment_guid: string }) {
    const nodes = this.selectedObj3dFromScene({ node: { fragment_guid } });
    const groupNodes = this.cmd_api_selected3d(nodes);

    return groupNodes;
  }

  private static findInJsonDataByFragmentGuid(fragmentGuid: string, jsonData: any[]) {
    if (!Array.isArray(jsonData)) return null;

    for (const item of jsonData) {
      if (item.fragment_guid?.toLowerCase() === fragmentGuid) {
        return item;
      }
    }
    return null;
  }

  private static getUIIDbyACIGuidandFragmentGuid(type: string, jsonData: any[], aciguid: string) {
    if (type !== '3d') {
      return this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);
    }

    const objAss = this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);

    const result: any[] = [];
    for (const item of objAss) {
      if (item.fragment_guid) {
        const nodes = this.fragmentGuidIndex.get(item.fragment_guid.toUpperCase()) || [];
        result.push(...nodes);
      }
    }

    return result;
  }

  private static findsArrObjFromArrByProp(value: string, prop: string, arr: any[]) {
    if (!Array.isArray(arr)) return [];
    return arr.filter((item) => item[prop] === value);
  }

  private static cmd_api_selected3d(e: any): any[] {
    const clickNode = Array.isArray(e) ? e : [e];
    const groupNodes: any[] = [];

    const stack = [...clickNode];

    while (stack.length > 0) {
      const obj = stack.pop();
      if (!obj) continue;

      groupNodes.push(obj);

      if (obj.childsGeom && Array.isArray(obj.childsGeom)) {
        stack.push(...obj.childsGeom);
      }

      if (obj.children && Array.isArray(obj.children)) {
        stack.push(...obj.children);
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
