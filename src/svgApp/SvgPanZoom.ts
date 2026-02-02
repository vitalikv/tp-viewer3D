export class SvgPanZoom {
  private svgElement: SVGElement;
  private container: HTMLElement;
  private zoomScaleSensitivity: number = 0.4;
  private minZoom: number = 0.1;
  private maxZoom: number = 30;

  private translateX: number = 0;
  private translateY: number = 0;
  private scale: number = 1;

  private isPanning: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private startTranslateX: number = 0;
  private startTranslateY: number = 0;

  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private wheelHandler: (e: WheelEvent) => void;
  private dblClickHandler: (e: MouseEvent) => void;
  private transformGroup: SVGGElement | null = null;

  constructor(svgElement: SVGElement, container: HTMLElement) {
    this.svgElement = svgElement;
    this.container = container;

    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.wheelHandler = this.handleWheel.bind(this);
    this.dblClickHandler = this.handleDblClick.bind(this);

    this.init();
  }

  private init() {
    this.container.style.userSelect = 'none';
    this.container.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    this.container.addEventListener('wheel', this.wheelHandler, { passive: false });
    this.container.addEventListener('dblclick', this.dblClickHandler);

    this.createTransformGroup();

    this.fit();
    this.center();
    this.applyTransform();
  }

  private createTransformGroup() {
    if (this.transformGroup) return;

    this.transformGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.transformGroup.setAttribute('data-pan-zoom-group', 'true');

    const children: Node[] = [];
    while (this.svgElement.firstChild) {
      children.push(this.svgElement.firstChild);
      this.svgElement.removeChild(this.svgElement.firstChild);
    }

    children.forEach((child) => {
      this.transformGroup!.appendChild(child);
    });

    this.svgElement.appendChild(this.transformGroup);
  }

  private getInitialBBox() {
    if (!this.transformGroup) return null;

    const currentTransform = this.transformGroup.getAttribute('transform');
    this.transformGroup.removeAttribute('transform');

    let bbox = null;
    try {
      bbox = this.transformGroup.getBBox();
    } catch (_e) {
      bbox = null;
    }

    if (currentTransform) {
      this.transformGroup.setAttribute('transform', currentTransform);
    }

    return bbox;
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.isPanning = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTranslateX = this.translateX;
    this.startTranslateY = this.translateY;
    this.container.style.cursor = 'grabbing';
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.isPanning) return;
    e.preventDefault();

    const svgRect = this.svgElement.getBoundingClientRect();
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;

    const svg = this.svgElement as SVGSVGElement;
    let svgViewBoxWidth = svgRect.width;
    let svgViewBoxHeight = svgRect.height;

    if (svg.viewBox && svg.viewBox.baseVal) {
      svgViewBoxWidth = svg.viewBox.baseVal.width;
      svgViewBoxHeight = svg.viewBox.baseVal.height;
    }

    const svgDisplayWidth = svgRect.width;
    const svgDisplayHeight = svgRect.height;

    if (svgDisplayWidth === 0 || svgDisplayHeight === 0) {
      return;
    }

    const scaleX = svgViewBoxWidth / svgDisplayWidth;
    const scaleY = svgViewBoxHeight / svgDisplayHeight;

    this.translateX = this.startTranslateX + deltaX * scaleX;
    this.translateY = this.startTranslateY + deltaY * scaleY;

    this.applyTransform();
  }

  private handleMouseUp(e: MouseEvent) {
    if (e.button !== 0) return;
    this.isPanning = false;
    this.container.style.cursor = '';
  }

  private handleWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!this.transformGroup) return;

    const delta = e.deltaY > 0 ? -1 : 1;
    const zoomFactor = 1 + delta * this.zoomScaleSensitivity * 0.1;
    const newScale = this.scale * zoomFactor;

    if (newScale < this.minZoom || newScale > this.maxZoom) {
      return;
    }

    const bbox = this.getInitialBBox();
    if (!bbox) return;

    const groupCenterInGroupX = bbox.x + bbox.width / 2;
    const groupCenterInGroupY = bbox.y + bbox.height / 2;

    const oldScale = this.scale;

    const groupCenterInSvgX = groupCenterInGroupX * oldScale + this.translateX;
    const groupCenterInSvgY = groupCenterInGroupY * oldScale + this.translateY;

    this.scale = newScale;

    this.translateX = groupCenterInSvgX - groupCenterInGroupX * this.scale;
    this.translateY = groupCenterInSvgY - groupCenterInGroupY * this.scale;

    this.applyTransform();
  }

  private handleDblClick(_e: MouseEvent) {
    this.fit();
    this.center();
    this.applyTransform();
  }

  private applyTransform() {
    if (!this.transformGroup) return;

    const transform = `translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`;
    this.transformGroup.setAttribute('transform', transform);
  }

  private getSvgDimensions() {
    let svgWidth = 0;
    let svgHeight = 0;
    let svgX = 0;
    let svgY = 0;

    const svg = this.svgElement as SVGSVGElement;

    if (this.transformGroup) {
      try {
        const bbox = this.transformGroup.getBBox();
        svgWidth = bbox.width;
        svgHeight = bbox.height;
        svgX = bbox.x;
        svgY = bbox.y;
      } catch (_e) {
        if (svg.viewBox && svg.viewBox.baseVal) {
          svgWidth = svg.viewBox.baseVal.width;
          svgHeight = svg.viewBox.baseVal.height;
          svgX = svg.viewBox.baseVal.x;
          svgY = svg.viewBox.baseVal.y;
        } else {
          const widthAttr = this.svgElement.getAttribute('width');
          const heightAttr = this.svgElement.getAttribute('height');
          svgWidth = widthAttr ? parseFloat(widthAttr) : 100;
          svgHeight = heightAttr ? parseFloat(heightAttr) : 100;
        }
      }
    } else {
      if (svg.viewBox && svg.viewBox.baseVal) {
        svgWidth = svg.viewBox.baseVal.width;
        svgHeight = svg.viewBox.baseVal.height;
        svgX = svg.viewBox.baseVal.x;
        svgY = svg.viewBox.baseVal.y;
      } else {
        try {
          const bbox = svg.getBBox();
          svgWidth = bbox.width;
          svgHeight = bbox.height;
          svgX = bbox.x;
          svgY = bbox.y;
        } catch (_e) {
          const widthAttr = this.svgElement.getAttribute('width');
          const heightAttr = this.svgElement.getAttribute('height');
          svgWidth = widthAttr ? parseFloat(widthAttr) : 100;
          svgHeight = heightAttr ? parseFloat(heightAttr) : 100;
        }
      }
    }

    if (svgWidth === 0 || svgHeight === 0) {
      svgWidth = svgWidth || 100;
      svgHeight = svgHeight || 100;
    }

    return { svgWidth, svgHeight, svgX, svgY };
  }

  public fit() {
    const containerRect = this.container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }

    if (!this.transformGroup) {
      return;
    }

    const svgRect = this.svgElement.getBoundingClientRect();
    const svgDisplayWidth = svgRect.width;
    const svgDisplayHeight = svgRect.height;

    if (svgDisplayWidth === 0 || svgDisplayHeight === 0) {
      return;
    }

    const bbox = this.getInitialBBox();
    if (!bbox) {
      return;
    }

    const svgContentWidth = bbox.width;
    const svgContentHeight = bbox.height;

    if (svgContentWidth === 0 || svgContentHeight === 0) {
      return;
    }

    const svg = this.svgElement as SVGSVGElement;
    let svgViewBoxWidth = svgContentWidth;
    let svgViewBoxHeight = svgContentHeight;

    if (svg.viewBox && svg.viewBox.baseVal) {
      svgViewBoxWidth = svg.viewBox.baseVal.width;
      svgViewBoxHeight = svg.viewBox.baseVal.height;
    }

    const svgBaseScaleX = svgDisplayWidth / svgViewBoxWidth;
    const svgBaseScaleY = svgDisplayHeight / svgViewBoxHeight;
    const svgBaseScale = Math.min(svgBaseScaleX, svgBaseScaleY);

    const scaleX = containerWidth / svgContentWidth;
    const scaleY = containerHeight / svgContentHeight;
    const targetScale = Math.min(scaleX, scaleY) * 0.9;

    const newScale = targetScale / svgBaseScale;

    if (newScale > 0) {
      this.scale = Math.max(this.minZoom, Math.min(this.maxZoom, newScale));
    }
  }

  public center() {
    const containerRect = this.container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }

    if (!this.transformGroup) {
      return;
    }

    const svgRect = this.svgElement.getBoundingClientRect();
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;

    if (svgWidth === 0 || svgHeight === 0) {
      return;
    }

    const bbox = this.getInitialBBox();
    if (!bbox) {
      return;
    }

    const svgContentWidth = bbox.width;
    const svgContentHeight = bbox.height;
    const svgX = bbox.x;
    const svgY = bbox.y;

    if (svgContentWidth === 0 || svgContentHeight === 0) {
      return;
    }

    const svg = this.svgElement as SVGSVGElement;
    let svgViewBoxWidth = svgWidth;
    let svgViewBoxHeight = svgHeight;

    if (svg.viewBox && svg.viewBox.baseVal) {
      svgViewBoxWidth = svg.viewBox.baseVal.width;
      svgViewBoxHeight = svg.viewBox.baseVal.height;
    }

    const centerXInViewBox = svgViewBoxWidth / 2;
    const centerYInViewBox = svgViewBoxHeight / 2;

    const scaledContentWidth = svgContentWidth * this.scale;
    const scaledContentHeight = svgContentHeight * this.scale;

    this.translateX = centerXInViewBox - scaledContentWidth / 2 - svgX * this.scale;
    this.translateY = centerYInViewBox - scaledContentHeight / 2 - svgY * this.scale;
  }

  public resize() {
    const containerRect = this.container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    if (containerWidth === 0 || containerHeight === 0) {
      return;
    }
  }

  public getZoom() {
    return this.scale;
  }

  public getSizes() {
    const containerRect = this.container.getBoundingClientRect();

    let svgWidth = 0;
    let svgHeight = 0;

    try {
      const bbox = (this.svgElement as SVGSVGElement).getBBox();
      svgWidth = bbox.width;
      svgHeight = bbox.height;
    } catch (_e) {
      const widthAttr = this.svgElement.getAttribute('width');
      const heightAttr = this.svgElement.getAttribute('height');
      svgWidth = this.svgElement.clientWidth || (widthAttr ? parseFloat(widthAttr) : 0);
      svgHeight = this.svgElement.clientHeight || (heightAttr ? parseFloat(heightAttr) : 0);
    }

    return {
      width: svgWidth,
      height: svgHeight,
      realWidth: containerRect.width,
      realHeight: containerRect.height,
    };
  }

  public destroy() {
    this.container.removeEventListener('mousedown', this.mouseDownHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
    this.container.removeEventListener('wheel', this.wheelHandler);
    this.container.removeEventListener('dblclick', this.dblClickHandler);
    this.container.style.cursor = '';
    this.container.style.userSelect = '';
  }
}
