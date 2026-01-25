interface ImportMeta {
  url: string;
  env: {
    DEV: boolean;
    PROD: boolean;
    MODE: string;
    [key: string]: any;
  };
}
interface HTMLCanvasElement {
  transferControlToOffscreen(): OffscreenCanvas;
}
