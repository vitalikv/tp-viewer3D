import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class VirtualDOMElement {
  private listeners: Record<string, ((event: any) => void)[]> = {};
  public clientWidth: number;
  public clientHeight: number;
  public style: Record<string, string> = { touchAction: '' };
  public ownerDocument = this;
  public documentElement = this;

  constructor(size: { width: number; height: number }) {
    this.clientWidth = size.width;
    this.clientHeight = size.height;
  }

  // Основные методы DOM
  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  dispatchEvent(event: any) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach((listener) => {
        try {
          listener(event);
        } catch (e) {
          console.error('Error in event listener:', e);
        }
      });
    }
    return true;
  }

  // Методы, необходимые для OrbitControls
  getRootNode() {
    return this;
  }

  getBoundingClientRect() {
    return {
      width: this.clientWidth,
      height: this.clientHeight,
      top: 0,
      left: 0,
      right: this.clientWidth,
      bottom: this.clientHeight,
      x: 0,
      y: 0,
    };
  }

  contains(element: any) {
    return element === this;
  }

  hasPointerCapture(pointerId: number) {
    return false;
  }

  setPointerCapture(pointerId: number) {}
  releasePointerCapture(pointerId: number) {}

  focus() {}
}

export class VirtualOrbitControls extends OrbitControls {
  private virtualElement: VirtualDOMElement;

  constructor(camera: THREE.Camera, size: { width: number; height: number }) {
    const virtualElement = new VirtualDOMElement(size);
    super(camera, virtualElement as unknown as HTMLElement);
    this.virtualElement = virtualElement;

    // Переопределяем connect/disconnect чтобы избежать ошибок
    (this as any).connect = () => {};
    (this as any).disconnect = () => {};
  }

  public setSize(width: number, height: number) {
    this.virtualElement.clientWidth = width;
    this.virtualElement.clientHeight = height;
  }

  public dispatchEvent(event: any) {
    const domEvent = this.createDOMEvent(event);
    if (domEvent) {
      this.virtualElement.dispatchEvent(domEvent);
    }
  }

  private createDOMEvent(event: any): any {
    const baseEvent = {
      clientX: event.clientX,
      clientY: event.clientY,
      preventDefault: () => {},
      stopPropagation: () => {},
    };

    switch (event.kind) {
      case 'pointer':
        return {
          ...baseEvent,
          type: event.type,
          button: event.button,
          buttons: event.buttons,
          pointerId: event.pointerId,
          pointerType: event.pointerType || 'mouse',
        };

      case 'wheel':
        return {
          ...baseEvent,
          type: 'wheel',
          deltaY: event.deltaY,
        };

      default:
        return null;
    }
  }

  public update(): boolean {
    return super.update();
  }
}
