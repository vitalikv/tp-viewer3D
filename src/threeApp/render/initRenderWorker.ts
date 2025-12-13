import { ContextSingleton } from '@/core/ContextSingleton';

export class RenderWorker extends ContextSingleton<RenderWorker> {
  public worker: Worker;
  private container: HTMLCanvasElement;
  private resizeObserver?: ResizeObserver;
  private progressCallback?: (text: string | null) => void;
  private modelLoadedCallback?: (filename: string) => void;
  private modelErrorCallback?: (error: string) => void;

  public init({ canvas }: { canvas: HTMLCanvasElement }) {
    this.worker = new Worker(new URL('./renderWorker.ts', import.meta.url), { type: 'module' });

    this.container = canvas;

    const rect = this.getClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.initWorker({ canvas });
    this.setupEventListeners();
    this.setupWorkerMessageHandler();
  }

  private getClientRect() {
    return this.container.getBoundingClientRect();
  }

  private initWorker({ canvas }) {
    const offscreen = canvas.transferControlToOffscreen();
    console.log(888, offscreen, { dpr: window.devicePixelRatio });
    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        container: { width: canvas.width, height: canvas.height, dpr: window.devicePixelRatio },
      },
      [offscreen as Transferable]
    );
  }

  private setupEventListeners() {
    const pointerEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    pointerEvents.forEach((type) => {
      this.container.addEventListener(
        type,
        (e: PointerEvent) => {
          e.preventDefault();
          const rect = this.getClientRect();
          this.worker.postMessage({
            type: 'event',
            event: {
              kind: 'pointer',
              type,
              clientX: e.clientX - rect.left,
              clientY: e.clientY - rect.top,
              button: e.button,
              buttons: e.buttons,
              pointerId: e.pointerId,
              pointerType: e.pointerType,
            },
          });
        },
        { passive: false }
      );
    });

    this.container.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const rect = this.getClientRect();
        this.worker.postMessage({
          type: 'event',
          event: {
            kind: 'wheel',
            deltaY: e.deltaY,
            clientX: e.clientX - rect.left,
            clientY: e.clientY - rect.top,
          },
        });
      },
      { passive: false }
    );

    const resizeHandler = () => {
      const rect = this.getClientRect();
      this.worker.postMessage({
        type: 'resize',
        width: rect.width,
        height: rect.height,
        left: rect.left,
        top: rect.top,
      });
    };
    this.resizeObserver = new ResizeObserver(resizeHandler);
    this.resizeObserver.observe(this.container);
  }

  private setupWorkerMessageHandler() {
    this.worker.onmessage = (e) => {
      const { type, data, filename, error } = e.data;

      switch (type) {
        case 'progress':
          if (this.progressCallback) {
            this.progressCallback(data);
          }
          break;
        case 'modelLoaded':
          if (this.modelLoadedCallback) {
            this.modelLoadedCallback(filename);
          }
          break;
        case 'modelError':
          if (this.modelErrorCallback) {
            this.modelErrorCallback(error);
          }
          break;
      }
    };
  }

  public loadModel(file: File, callbacks?: { onProgress?: (text: string | null) => void; onLoaded?: (filename: string) => void; onError?: (error: string) => void }) {
    if (callbacks) {
      this.progressCallback = callbacks.onProgress;
      this.modelLoadedCallback = callbacks.onLoaded;
      this.modelErrorCallback = callbacks.onError;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      if (arrayBuffer) {
        this.worker.postMessage(
          {
            type: 'loadModel',
            arrayBuffer: arrayBuffer,
            filename: file.name,
          },
          [arrayBuffer]
        );
      }
    };
    reader.readAsArrayBuffer(file);
  }

  public dispose() {
    this.worker.terminate();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}
