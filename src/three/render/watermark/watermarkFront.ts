import * as THREE from 'three';
import { threeApp } from '../../threeApp';

export class WatermarkFront {
  private static container: HTMLElement;
  private static canvas: HTMLCanvasElement;
  private static ctx: CanvasRenderingContext2D;
  private static texture = new THREE.CanvasTexture();
  private static material = new THREE.ShaderMaterial();
  private static watermarkMesh: THREE.Mesh;
  private static imgLogo: HTMLImageElement | null = null;

  private static params: {
    contentType: 'datetime' | 'text';
    text: string;
    textColor: string;
    opacityText: number;
    opacityLogo: number;
    fontSize: number;
    width: number;
    height: number;
    urlLogo: string | undefined;
    scaleLogo: number;
    padding: number;
    spacing: number;
  } = {
    contentType: 'datetime',
    text: '',
    textColor: '#000000',
    opacityText: 1,
    opacityLogo: 0.3,
    fontSize: 16,
    width: 150,
    height: 100,
    urlLogo: 'https://static.tildacdn.com/tild6339-3233-4234-a137-643165663664/logo_rosatom.png',
    scaleLogo: 1,
    padding: 0,
    spacing: 100,
  };

  public static async init(scene: THREE.Scene, container: HTMLElement) {
    this.container = container;

    this.createCanvas();
    this.createFullscreenWatermark(scene);

    this.loadBackgroundImage()
      .then(() => {
        this.renderWatermark();
        threeApp.sceneManager.render();
      })
      .catch(() => {
        console.log('Не удалось загрузить img:', this.params.urlLogo);
        this.renderWatermark();
        threeApp.sceneManager.render();
      });
  }

  private static loadBackgroundImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.params.urlLogo) {
        reject();
      }

      if (this.params.urlLogo) {
        this.imgLogo = new Image();
        this.imgLogo.crossOrigin = 'anonymous';
        this.imgLogo.onload = () => {
          this.params.width = this.imgLogo!.width * this.params.scaleLogo;
          this.params.height = this.imgLogo!.height * this.params.scaleLogo;
          resolve();
        };
        this.imgLogo.onerror = () => {
          this.imgLogo = null;
          reject();
        };
        this.imgLogo.src = this.params.urlLogo;
      } else {
        reject();
      }
    });
  }

  private static createCanvas() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;

    const rect = this.getClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  private static createFullscreenWatermark(scene: THREE.Scene) {
    this.watermarkMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    scene.add(this.watermarkMesh);
  }

  private static updateTexture() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const workAreaWidth = this.canvas.width - this.params.padding * 2;
    const workAreaHeight = this.canvas.height - this.params.padding * 2;

    const effectiveWidth = this.params.width + this.params.spacing;
    const effectiveHeight = this.params.height + this.params.spacing;

    const repeatX = Math.floor(workAreaWidth / effectiveWidth);
    const repeatY = Math.floor(workAreaHeight / effectiveHeight);

    if (repeatX <= 0 || repeatY <= 0) return;

    const totalGridWidth = repeatX * this.params.width + (repeatX - 1) * this.params.spacing;
    const totalGridHeight = repeatY * this.params.height + (repeatY - 1) * this.params.spacing;

    const startX = this.params.padding + (workAreaWidth - totalGridWidth) / 2;
    const startY = this.params.padding + (workAreaHeight - totalGridHeight) / 2;

    for (let x = 0; x < repeatX; x++) {
      for (let y = 0; y < repeatY; y++) {
        const posX = startX + x * effectiveWidth;
        const posY = startY + y * effectiveHeight;

        if (posX + this.params.width <= this.canvas.width - this.params.padding && posY + this.params.height <= this.canvas.height - this.params.padding) {
          this.drawSingleWatermark(posX, posY);
        }
      }
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
  }

  private static updateMaterial() {
    this.disposeMaterial(this.material);

    const { vertexShader, fragmentShader } = this.getShader();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        watermarkTexture: { value: this.texture },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  private static getShader() {
    const vertexShader = `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform sampler2D watermarkTexture;
        
        void main() {
            vec2 uv = gl_FragCoord.xy / vec2(${this.canvas.width}.0, ${this.canvas.height}.0);
            vec4 watermarkColor = texture2D(watermarkTexture, uv);
            
            if (watermarkColor.a < 0.1) {
                discard;
            }
            
            gl_FragColor = watermarkColor;
        }
    `;

    return { vertexShader, fragmentShader };
  }

  private static drawSingleWatermark(x: number, y: number) {
    this.ctx.save();

    if (this.imgLogo) {
      this.drawLogo(x, y);
    }

    let displayText: string | string[];
    if (this.params.contentType === 'datetime') {
      displayText = this.getCurrentDateTime();
    } else {
      displayText = this.params.text;
    }

    this.ctx.fillStyle = this.hexToRgba(this.params.textColor, this.params.opacityText);
    this.ctx.font = `bold ${this.params.fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    if (this.params.contentType === 'datetime') {
      const [time, date] = this.getCurrentDateTime();

      const centerX = x + this.params.width / 2;
      const centerY = y + this.params.height / 2;
      const lineHeight = this.params.fontSize * 1.2;

      this.ctx.fillText(time, centerX, centerY - lineHeight / 2);
      this.ctx.fillText(date, centerX, centerY + lineHeight / 2);
    } else {
      this.ctx.fillText(displayText as string, x + this.params.width / 2, y + this.params.height / 2);
    }

    this.ctx.restore();
  }

  private static drawLogo(x: number, y: number) {
    if (!this.imgLogo) return;

    this.ctx.globalAlpha = this.params.opacityLogo;
    this.ctx.drawImage(this.imgLogo, x, y, this.params.width, this.params.height);
    this.ctx.globalAlpha = 1.0;
  }

  private static hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private static getCurrentDateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    return [`${hours}:${minutes}:${seconds}`, `${day}.${month}.${year}`];
  }

  private static getClientRect() {
    return this.container.getBoundingClientRect();
  }

  public static renderWatermark() {
    if (!this.canvas) return;

    const rect = this.getClientRect();

    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    this.updateTexture();
    this.updateMaterial();
    this.watermarkMesh.material = this.material;
  }

  private static disposeMaterial(material: THREE.Material) {
    material.dispose();

    Object.keys(material).forEach((key: string) => {
      const value = (material as any)[key];
      if (value?.isTexture) {
        value.dispose();
      }
    });
  }
}
