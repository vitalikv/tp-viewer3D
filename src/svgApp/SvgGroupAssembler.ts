export interface GroupChild {
  id: string;
  element: SVGElement;
  bounds: DOMRect;
  uniqueId: string;
}

export interface GroupData {
  element: SVGGElement;
  bounds: DOMRect;
  childIds: string[];
  children?: GroupChild[];
}

export interface ElementMatch {
  element: SVGElement;
  elementId: string;
  group: GroupData | undefined;
}

interface ChildItem {
  id: string;
  element: any;
  bounds: any;
  uniqueId: string;
}

export class SvgGroupAssembler {
  private svg: SVGElement;
  private groupMap: Map<string, GroupData> = new Map();
  private elementToGroupMap: Map<string, string> = new Map();

  constructor(svgElement: SVGElement) {
    this.svg = svgElement;
    this.init();
  }

  private init() {
    this.buildGroupMap();
    this.buildReverseIndex();
    this.setDefParams();
    this.disableLinkBehavior();
  }

  private buildGroupMap() {
    const drawingGroup = this.svg.querySelector<SVGGElement>('g#Drawing');
    const groups = this.svg.querySelectorAll<SVGGElement>('g[id]:not(g#Drawing)');

    groups.forEach((group: SVGGElement) => {
      const groupId = group.getAttribute('id');
      if (!groupId) return;

      const childIds = this.getChildIds(group);
      const matchingChildren = this.findMatchingChildren(drawingGroup, childIds);

      this.groupMap.set(groupId, {
        element: group,
        bounds: group.getBBox(),
        childIds: childIds,
        children: matchingChildren,
      });
    });
  }

  private findMatchingChildren(drawingGroup: SVGGElement | null, childIds: string[]) {
    if (!drawingGroup || childIds.length === 0) return [];

    const matches: GroupChild[] = [];
    const childIdSet = new Set(childIds);

    const walkElems = (element: Element) => {
      if (element instanceof SVGElement) {
        const elementId = element.getAttribute('id');
        if (elementId && childIdSet.has(elementId)) {
          matches.push({
            id: elementId,
            element: element,
            bounds: element.getBBox(),
            uniqueId: `${elementId}_${matches.length}`,
          });
        }
      }

      Array.from(element.children).forEach(walkElems);
    };

    walkElems(drawingGroup);

    return matches;
  }

  private getChildIds(groupElement: SVGGElement) {
    return Array.from(groupElement.querySelectorAll<SVGElement>('*[id]'))
      .map((el) => el.getAttribute('id'))
      .filter((id): id is string => id !== null && id.trim() !== '');
  }

  private buildReverseIndex() {
    for (const [groupId, groupData] of this.groupMap.entries()) {
      groupData.childIds.forEach((childId) => {
        this.elementToGroupMap.set(childId, groupId);
      });
    }
  }

  private setDefParams() {
    const firstKey = this.groupMap.keys().next().value;
    if (firstKey) {
      this.groupMap.delete(firstKey);
    }

    this.groupMap.forEach((item) => {
      if (item.children) {
        const { unique, duplicates } = this.separateChildrenById(item.children);

        unique.forEach((item) => {
          const elem = item.element;
          elem.dataset.originalStroke = elem.getAttribute('stroke') || undefined;
          elem.dataset.originalStrokeWidth = elem.getAttribute('stroke-width') || undefined;
        });

        duplicates.forEach((item, ind, array) => {
          const elem = item.element;
          if (!(0 === ind && array[array.length - 1].element.tagName === 'polygon')) {
            elem.dataset.originalStroke = elem.getAttribute('stroke') || undefined;
            elem.dataset.originalStrokeWidth = elem.getAttribute('stroke-width') || undefined;
          }

          if (array.length - 1 === ind && elem.tagName === 'polygon') {
            elem.dataset.originalFill = elem.getAttribute('fill') || undefined;
          }
        });
      }
    });
  }

  private separateChildrenById(children: ChildItem[]) {
    const idCountMap = new Map<string, number>();

    children.forEach((item) => {
      idCountMap.set(item.id, (idCountMap.get(item.id) || 0) + 1);
    });

    const unique: ChildItem[] = [];
    const duplicates: ChildItem[] = [];

    children.forEach((item) => {
      if ((idCountMap.get(item.id) || 0) === 1) {
        unique.push(item);
      } else {
        duplicates.push(item);
      }
    });

    return { unique, duplicates };
  }

  private disableLinkBehavior() {
    const links = this.svg.querySelectorAll('a');

    links.forEach((link) => {
      link.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        },
        true
      );
    });
  }

  public findGroupByElementId(elementId: string) {
    const groupId = this.elementToGroupMap.get(elementId);
    return groupId ? this.groupMap.get(groupId) : undefined;
  }

  public findGroupById(groupId: string) {
    return this.groupMap.get(groupId);
  }
}
