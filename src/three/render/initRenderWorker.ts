export class RenderWorker {
  private worker: Worker;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.worker = new Worker(new URL('./workers/renderWorker.ts', import.meta.url), { type: 'module' });

    this.initWorker();
    this.setupEventListeners();
  }

  private initWorker() {
    const rect = this.canvas.getBoundingClientRect();
    const offscreen = this.canvas.transferControlToOffscreen();

    this.worker.postMessage(
      {
        type: 'init',
        canvas: offscreen,
        width: rect.width,
        height: rect.height,
        dpr: window.devicePixelRatio,
      },
      [offscreen as Transferable]
    );
  }

  private setupEventListeners() {
    // Pointer events
    const pointerEvents = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
    pointerEvents.forEach((type) => {
      this.canvas.addEventListener(
        type,
        (e: PointerEvent) => {
          e.preventDefault();
          const rect = this.canvas.getBoundingClientRect();
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

    // Wheel event
    this.canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
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

    // Resize
    window.addEventListener('resize', () => {
      const rect = this.canvas.getBoundingClientRect();
      this.worker.postMessage({
        type: 'resize',
        width: rect.width,
        height: rect.height,
        dpr: window.devicePixelRatio,
      });
    });
  }

  public dispose() {
    this.worker.terminate();
    window.removeEventListener('resize', () => {});
  }
}
