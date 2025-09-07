export class RenderWorker {
  public worker: Worker;
  private container: HTMLElement;
  //private canvas: HTMLCanvasElement;

  constructor({ container }: { container: HTMLElement }) {
    this.worker = new Worker(new URL('./workers/renderWorker.ts', import.meta.url), { type: 'module' });

    this.container = container;

    const rect = this.getClientRect();
    const canvas = document.createElement('canvas');
    canvas.width = rect.width;
    canvas.height = rect.height;
    container?.appendChild(canvas);

    this.initWorker({ canvas });
    this.setupEventListeners();
  }

  private getClientRect() {
    return this.container.getBoundingClientRect();
  }

  private initWorker({ canvas }) {
    const offscreen = canvas.transferControlToOffscreen();
    //console.log(888, offscreen, { width: this.canvas.width, height: this.canvas.height, dpr: window.devicePixelRatio });
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

    window.addEventListener('resize', () => {
      const rect = this.getClientRect();
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
