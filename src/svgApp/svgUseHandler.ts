import { SelectedByData } from '@/threeApp/model/structure/selectedByData';
import { SvgGroupAssembler } from './svgGroupAssembler';
import { WatermarkSvg } from '@/watermark/watermarkSvg';

export class SvgUseHandler {
  private enabled = false;
  private svg: SVGElement;
  private drawingGroup: SVGGElement;
  private actElems: SVGElement[] = [];
  private highlightElems: SVGElement[] = [];
  private groupMatcher: SvgGroupAssembler;
  private isDown = false;
  private isMove = false;

  constructor(svgElement: SVGElement) {
    this.svg = svgElement;
    const drawingGroup = this.svg.querySelector<SVGGElement>('g#Drawing');

    if (!drawingGroup) {
      throw new Error('нету g#Drawing');
    }

    this.drawingGroup = drawingGroup;
    this.groupMatcher = new SvgGroupAssembler(this.svg);
    this.removeEvents();
    this.initEvent();
    this.enabled = true;
  }

  public isEnabled() {
    return this.enabled;
  }

  private initEvent() {
    this.svg.parentElement.addEventListener('mousedown', this.mouseDown);
    this.svg.parentElement.addEventListener('mousemove', this.mouseMove);
    this.svg.parentElement.addEventListener('mouseup', this.mouseUp);
  }

  public cmd_select_intlinks(linkIds: Array<string>) {
    this.resetActElems();
    for (const linkId of linkIds) {
      this.selectedIntLinkGroupById(linkId);
    }
  }

  private mouseDown = (e: MouseEvent) => {
    this.isDown = true;
    this.isMove = false;
    const target = e.target as SVGElement;
  };

  private mouseMove = (event: MouseEvent) => {
    if (this.isDown) this.isMove = true;

    this.resetHighlight();

    const selectedElem = this.findSelectedElem(event);
    this.selectedGroupByElemId(selectedElem, 'highlighted');
  };

  private mouseUp = (event: MouseEvent) => {
    if (this.isMove) return;

    this.resetActElems();

    const selectedElem = this.findSelectedElem(event);
    this.selectedGroupByElemId(selectedElem, 'selected');

    this.isDown = false;
    this.isMove = false;
  };

  private findSelectedElem(event: MouseEvent) {
    let selectedElem: SVGElement | null = null;
    const target = event.target;

    if (target instanceof SVGElement && this.drawingGroup.contains(target)) {
      selectedElem = target;
    }

    if (!selectedElem) {
      const svgPoint = this.getSVGPoint(event);
      const nearestElement = this.findNearestElem(svgPoint, 10);

      if (nearestElement) selectedElem = nearestElement;
    }

    return selectedElem;
  }

  private getSVGPoint(event: MouseEvent) {
    const svgElement = this.svg as SVGSVGElement;

    const point = svgElement.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const groupCTM = this.drawingGroup.getScreenCTM();
    if (!groupCTM) {
      return point;
    }

    return point.matrixTransform(groupCTM.inverse());
  }

  private findNearestElem(point: DOMPoint, maxDistance: number) {
    let nearestElement: SVGElement | null = null;
    let minDistance = Infinity;

    const children = Array.from(this.drawingGroup.children) as SVGElement[];

    for (const element of children) {
      if (this.isElementActive(element)) {
        continue;
      }

      const distance = this.calcDistanceToElem(element, point);

      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance;
        nearestElement = element;
      }
    }

    return nearestElement;
  }

  private calcDistanceToElem(element: SVGElement, point: DOMPoint) {
    //@ts-ignore
    const bbox = element.getBBox();
    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    return Math.sqrt(Math.pow(point.x - centerX, 2) + Math.pow(point.y - centerY, 2));
  }

  private selectedGroupByElemId(selectedElem: SVGElement | null, type: 'selected' | 'highlighted') {
    const elementId = selectedElem?.getAttribute('id');

    if (!elementId) return;

    const dataGroup = this.groupMatcher.findGroupByElementId(elementId);
    const fragment_guid = dataGroup?.element.getAttribute('id');
    const arrDataGroup = [];

    if (fragment_guid) {
      const nodes = [];

      for (const node of nodes) {
        const groupId = node.fragment_guid.toLowerCase();
        const dataGroup = this.groupMatcher.findGroupById(groupId);
        arrDataGroup.push(dataGroup);
      }
    }

    if (arrDataGroup.length === 0 && dataGroup) arrDataGroup.push(dataGroup);

    for (const group of arrDataGroup) {
      if (group && group.children) {
        group.children.forEach((item) => {
          if (type === 'selected') {
            this.setActElems(item.element);
          }
          if (type === 'highlighted' && !this.isElementActive(item.element)) {
            this.setHighlight(item.element);
          }
        });
      }
    }
  }

  private selectedIntLinkGroupById(groupId: string) {
    const arrDataGroup = [];

    const dataGroup = this.groupMatcher.findGroupById(groupId);
    arrDataGroup.push(dataGroup);
    for (const group of arrDataGroup) {
      if (group && group.children) {
        group.children.forEach((item) => {
          this.setActElems(item.element);
        });
      }
    }
  }

  public selectedGroupById(groupId: string) {
    this.resetActElems();

    const arrDataGroup = [];

    const nodes = [];

    for (const node of nodes) {
      const groupId = node.fragment_guid.toLowerCase();
      const dataGroup = this.groupMatcher.findGroupById(groupId);
      arrDataGroup.push(dataGroup);
    }

    for (const group of arrDataGroup) {
      if (group && group.children) {
        group.children.forEach((item) => {
          this.setActElems(item.element);
        });
      }
    }
  }

  private setActElems(element: SVGElement) {
    const originalStroke = element.dataset.originalStroke;
    const originalStrokeWidth = element.dataset.originalStrokeWidth;
    const originalFill = element.dataset.originalFill;
    const originalFillBg = element.dataset.originalFillBg;
    const color = '#ff0000';
    if (originalStroke) element.setAttribute('stroke', color);
    if (originalStrokeWidth) {
      const width = parseFloat(originalStrokeWidth) * 1.5;
      element.setAttribute('stroke-width', width.toString());
    }
    if (originalFill) {
      element.setAttribute('fill', 'rgba(255,0,0,0.3)');
      if (originalStroke) element.setAttribute('stroke', originalStroke);
    }
    if (originalFillBg) {
      element.setAttribute('fill', color);
    }
    this.actElems.push(element);
  }

  private resetActElems() {
    this.actElems.forEach((element) => {
      this.setDefDataset(element);
    });
    this.actElems.length = 0;
  }

  private setHighlight(element: SVGElement) {
    if (!this.isElementActive(element)) {
      const originalStroke = element.dataset.originalStroke;
      const originalStrokeWidth = element.dataset.originalStrokeWidth;
      const originalFillBg = element.dataset.originalFillBg;
      const color = '#ff0000';
      if (originalStroke) element.setAttribute('stroke', color);
      if (originalStrokeWidth) {
        const width = parseFloat(originalStrokeWidth) * 1.5;
        element.setAttribute('stroke-width', width.toString());
      }
      if (originalFillBg) {
        element.setAttribute('fill', color);
      }
      this.highlightElems.push(element);
    }
  }

  private resetHighlight() {
    this.highlightElems.forEach((element) => {
      if (!this.isElementActive(element)) {
        this.setDefDataset(element);
      }
    });
    this.highlightElems.length = 0;
  }

  private setDefDataset(element: SVGElement) {
    const originalStroke = element.dataset.originalStroke;
    const originalStrokeWidth = element.dataset.originalStrokeWidth;
    const originalFill = element.dataset.originalFill;
    const originalFillBg = element.dataset.originalFillBg;
    if (originalStroke) element.setAttribute('stroke', originalStroke);
    if (originalStrokeWidth) element.setAttribute('stroke-width', originalStrokeWidth);
    if (originalFill) element.setAttribute('fill', originalFill);
    if (originalFillBg) element.setAttribute('fill', originalFillBg);
  }

  private isElementActive(element: SVGElement): boolean {
    return this.actElems.includes(element);
  }

  public removeEvents() {
    this.svg.removeEventListener('mousedown', this.mouseDown);
    this.svg.removeEventListener('mousemove', this.mouseMove);
    this.svg.removeEventListener('mouseup', this.mouseUp);
  }

  private isBackgroundClick(target: SVGElement, event: MouseEvent): boolean {
    if (target === this.svg) {
      return true;
    }

    if (target.id === 'Drawing' || (target.parentElement && target.parentElement.id === 'Drawing')) {
      return true;
    }

    if (target.classList.contains('clickable-overlay')) {
      const parentGroup = target.parentElement;
      if (!parentGroup || !parentGroup.id || parentGroup.id === 'Drawing') {
        return true;
      }
    }

    const elements = document.elementsFromPoint(event.clientX, event.clientY);
    const svgElements = elements.filter((el) => el instanceof SVGElement && this.svg.contains(el));

    return svgElements.length === 0 || svgElements.every((el) => el.id === 'Drawing' || (el.parentElement && el.parentElement.id === 'Drawing'));
  }
}
