import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';

// В начале воркера
if (typeof window === 'undefined') {
  const eventListeners: Record<string, Array<(e: any) => void>> = {};

  (globalThis as any).window = globalThis;
  (globalThis as any).document = {
    addEventListener: (type: string, listener: (e: any) => void) => {
      if (!eventListeners[type]) eventListeners[type] = [];
      eventListeners[type].push(listener);
    },
    removeEventListener: (type: string, listener: (e: any) => void) => {
      if (eventListeners[type]) {
        eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
      }
    },
    createElement: () => ({
      addEventListener: () => {},
      removeEventListener: () => {},
      style: {},
    }),
    documentElement: { style: {} },
    isWorker: true,
  };

  // Эмулируем add/removeEventListener на window
  globalThis.addEventListener = (type: string, listener: (e: any) => void) => {
    if (!eventListeners[type]) eventListeners[type] = [];
    eventListeners[type].push(listener);
  };

  globalThis.removeEventListener = (type: string, listener: (e: any) => void) => {
    if (eventListeners[type]) {
      eventListeners[type] = eventListeners[type].filter((l) => l !== listener);
    }
  };
}

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

export class ControlsManager extends ArcballControls {
  private virtualElement: VirtualDOMElement;

  constructor(camera: THREE.Camera, size: { width: number; height: number }, scene: THREE.Scene) {
    const virtualElement = new VirtualDOMElement(size);
    super(camera, virtualElement as unknown as HTMLElement, scene);
    this.virtualElement = virtualElement;

    // Переопределяем метод calculatePointersDistance для защиты от ошибок
    this.overrideCalculatePointersDistance();

    this.virtualConnect();
  }

  private overrideCalculatePointersDistance() {
    // Сохраняем оригинальный метод
    const originalMethod = (this as any).calculatePointersDistance;

    // Переопределяем метод с проверкой на undefined
    (this as any).calculatePointersDistance = function (pointers: any[]) {
      // Проверяем, что все указатели существуют и имеют clientX
      if (!pointers || pointers.length === 0) {
        return 0;
      }

      // Фильтруем undefined указатели
      const validPointers = pointers.filter((p: any) => p && typeof p.clientX === 'number');

      if (validPointers.length < 2) {
        return 0;
      }

      // Вызываем оригинальный метод с валидными указателями
      return originalMethod.call(this, validPointers);
    };
  }

  private virtualConnect() {
    const domElement = this.virtualElement;

    domElement.addEventListener('contextmenu', (event) => {
      event.preventDefault(); // Предотвращаем контекстное меню
      event.stopPropagation(); // Останавливаем всплытие
    });
    domElement.addEventListener('pointerdown', (event) => (this as any)._onPointerDown(event));
    domElement.addEventListener('pointermove', (event) => (this as any)._onPointerMove(event));
    domElement.addEventListener('pointerup', (event) => (this as any)._onPointerUp(event));
    domElement.addEventListener('pointercancel', (event) => (this as any)._onPointerCancel(event));
    domElement.addEventListener('wheel', (event) => (this as any)._onWheel(event));
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
        console.log('wheel', event);
        return {
          ...baseEvent,
          type: 'wheel',
          deltaY: event.deltaY,
        };

      default:
        return null;
    }
  }

  public update() {
    super.update();
  }
}
