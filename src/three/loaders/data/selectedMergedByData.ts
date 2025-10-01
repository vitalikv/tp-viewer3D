import { threeApp } from '../../threeApp';

export class SelectedMergedByData {
  private static structureCache: any[] = [];
  private static uuidIndex: Map<string, any> = new Map();
  private static fragmentGuidIndex: Map<string, any[]> = new Map();

  public static initializeCache() {
    const structure = threeApp.modelLoader.initData.getStructure();
    this.structureCache = structure.value;
    this.buildIndexes(this.structureCache);
  }

  private static buildIndexes(nodes: any[]) {
    if (!nodes || !Array.isArray(nodes)) return;

    for (const node of nodes) {
      // Индексируем по UUID
      if (node.uuid) {
        this.uuidIndex.set(node.uuid, node);
      }

      // Индексируем по fragment_guid (может быть несколько узлов с одинаковым fragment_guid)
      if (node.fragment_guid) {
        const guid = node.fragment_guid.toUpperCase();
        if (!this.fragmentGuidIndex.has(guid)) {
          this.fragmentGuidIndex.set(guid, []);
        }
        this.fragmentGuidIndex.get(guid)!.push(node);
      }

      // Рекурсивно индексируем детей
      if (node.children && Array.isArray(node.children)) {
        this.buildIndexes(node.children);
      }
    }
  }

  public static getSelectedNode({ uuid, parentUuid }: { uuid: string; parentUuid?: string }) {
    console.log('uuid: ', uuid, 'parentUuid: ', parentUuid);

    // Инициализируем кэш при первом вызове
    if (this.uuidIndex.size === 0) {
      this.initializeCache();
    }

    let selectID = NaN;

    // Ищем узел по UUID (быстрая версия оригинального алгоритма)
    const targetNode = this.findNodeByUuidWithParent(uuid);

    if (targetNode) {
      // Находим корневой узел (родитель с idxtfxparent = null)
      selectID = this.findRootNodeId(targetNode);
    }

    // Если не нашли и есть parentUuid, ищем по parentUuid
    if (isNaN(selectID) && parentUuid) {
      const parentNode = this.findNodeByUuidWithParent(parentUuid);
      if (parentNode) {
        selectID = this.findRootNodeId(parentNode);
      }
    }

    console.log('selectID', selectID);

    let node = null;
    if (!isNaN(selectID)) {
      // Ищем корневой узел по ID (быстрая версия)
      node = this.structureCache.find((item) => item.id === selectID);
    }

    console.log('node', node);

    const nodes = this.selectedObj3dFromScene({ node });
    console.log('nodes', nodes);

    const groupNodes = this.cmd_api_selected3d(nodes);
    console.log(9999, groupNodes);

    return groupNodes;
  }

  private static findNodeByUuidWithParent(uuid: string): any {
    // Быстрый поиск через индекс
    return this.uuidIndex.get(uuid) || null;
  }

  private static findRootNodeId(node: any): number {
    // Поднимаемся вверх по иерархии до корневого узла
    let current = node;
    while (current && current.idxtfxparent !== null && current.idxtfxparent !== undefined) {
      const parent = this.findNodeByIdx(current.idxtfxparent);
      if (!parent) break;
      current = parent;
    }
    return current?.id || NaN;
  }

  private static findNodeByIdx(idx: number): any {
    // Ищем узел по idx во всей структуре
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
      console.warn('Не передан fragment_guid для выбора');
      return [node]; // Возвращаем оригинальный узел, как в старом коде
    }

    const jsonData = threeApp.modelLoader.json2;

    // Быстрый поиск в jsonData по fragment_guid
    const itemJson = this.findInJsonDataByFragmentGuid(fragment_guid.toLowerCase(), jsonData);

    console.log('jsonData', jsonData);
    console.log('itemJson', itemJson);

    let nodes = [];
    if (itemJson?.guid) {
      // Используем оригинальную логику поиска связанных узлов
      nodes = this.getUIIDbyACIGuidandFragmentGuid('3d', jsonData, itemJson.guid);
    } else {
      // Если не нашли в jsonData, возвращаем оригинальный узел
      nodes = [node];
    }

    return nodes;
  }

  private static findInJsonDataByFragmentGuid(fragmentGuid: string, jsonData: any[]) {
    if (!Array.isArray(jsonData)) return null;

    // Используем быстрое линейное сканирование, но только по jsonData
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

    // Для 3D: находим все объекты в jsonData с этим guid
    const objAss = this.findsArrObjFromArrByProp(aciguid, 'guid', jsonData);

    // Находим соответствующие узлы в структуре по fragment_guid
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

  private static cmd_api_selected3d(e: any) {
    const clickNode = Array.isArray(e) ? e : [e];
    const groupNodes: any[] = [];

    // Используем стек вместо рекурсии
    const stack = [...clickNode];

    while (stack.length > 0) {
      const obj = stack.pop();
      if (!obj) continue;

      groupNodes.push(obj);

      // Добавляем дочерние элементы в стек (оригинальная логика)
      if (obj.childsGeom && Array.isArray(obj.childsGeom)) {
        stack.push(...obj.childsGeom);
      }

      if (obj.children && Array.isArray(obj.children)) {
        stack.push(...obj.children);
      }
    }

    return groupNodes;
  }

  // Метод для очистки кэша
  public static clearCache() {
    this.structureCache = [];
    this.uuidIndex.clear();
    this.fragmentGuidIndex.clear();
  }
}
