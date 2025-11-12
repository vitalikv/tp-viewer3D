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

  private static params = {
    contentType: 'datetime',
    text: 'T-Flex',
    textColor: '#000000',
    opacityText: 0.8,
    opacityLogo: 0.2,
    fontSize: 20,
    width: 150,
    height: 100,
    urlLogo: './watermark/nopic_logo_bluebg.png',
    scaleLogo: 1,
    // Новые параметры для отступов
    paddingTop: 100,
    paddingBottom: 100,
    paddingLeft: 100,
    paddingRight: 100,
    spacingX: 55, // расстояние между водяными знаками по X
    spacingY: 55, // расстояние между водяными знаками по Y
  };

  public static async init(scene, container) {
    this.container = container;

    this.createCanvas();
    this.createFullscreenWatermark(scene);

    this.loadBackgroundImage()
      .then(() => {
        this.renderWatermark();
        threeApp.sceneManager.render();
      })
      .catch((error) => {
        console.log('Failed to load background image:', error);
        this.renderWatermark();
        threeApp.sceneManager.render();
      });
  }

  private static loadBackgroundImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.params.urlLogo) {
        resolve();
        return;
      }

      this.imgLogo = new Image();
      this.imgLogo.crossOrigin = 'anonymous';
      this.imgLogo.onload = () => {
        this.params.width = this.imgLogo!.width * this.params.scaleLogo;
        this.params.height = this.imgLogo!.height * this.params.scaleLogo;
        console.log('Image loaded, updated params:', this.params.width, this.params.height);
        resolve();
      };
      this.imgLogo.onerror = () => {
        this.imgLogo = null;
        console.log('Не удалось загрузить img:', this.params.urlLogo);
        reject();
      };
      this.imgLogo.src = this.params.urlLogo;
    });
  }

  private static createCanvas() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    const rect = this.getClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  private static createFullscreenWatermark(scene) {
    this.watermarkMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    scene.add(this.watermarkMesh);
  }

  private static updateTexture() {
    // Очищаем canvas (это создает прозрачный фон)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Рассчитываем рабочую область с учетом отступов
    const workAreaWidth = this.canvas.width - this.params.paddingLeft - this.params.paddingRight;
    const workAreaHeight = this.canvas.height - this.params.paddingTop - this.params.paddingBottom;

    // Рассчитываем количество повторений с учетом отступов между водяными знаками
    const effectiveWidth = this.params.width + this.params.spacingX;
    const effectiveHeight = this.params.height + this.params.spacingY;

    // Рассчитываем количество водяных знаков, которые полностью помещаются в рабочей области
    const repeatX = Math.floor(workAreaWidth / effectiveWidth);
    const repeatY = Math.floor(workAreaHeight / effectiveHeight);

    // Если нет места для водяных знаков, выходим
    if (repeatX <= 0 || repeatY <= 0) return;

    // Рассчитываем общую ширину и высоту сетки водяных знаков
    const totalGridWidth = repeatX * this.params.width + (repeatX - 1) * this.params.spacingX;
    const totalGridHeight = repeatY * this.params.height + (repeatY - 1) * this.params.spacingY;

    // Рассчитываем начальное смещение для центрирования сетки
    const startX = this.params.paddingLeft + (workAreaWidth - totalGridWidth) / 2;
    const startY = this.params.paddingTop + (workAreaHeight - totalGridHeight) / 2;

    // Создаем водяные знаки по всей площади с центрированием
    for (let x = 0; x < repeatX; x++) {
      for (let y = 0; y < repeatY; y++) {
        const posX = startX + x * effectiveWidth;
        const posY = startY + y * effectiveHeight;

        // Проверяем, чтобы водяной знак не выходил за пределы рабочей области
        if (posX + this.params.width <= this.canvas.width - this.params.paddingRight && posY + this.params.height <= this.canvas.height - this.params.paddingBottom) {
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
            
            // Пропускаем полностью прозрачные пиксели
            if (watermarkColor.a < 0.1) {
                discard;
            }
            
            gl_FragColor = watermarkColor;
        }
    `;

    return { vertexShader, fragmentShader };
  }

  private static drawSingleWatermark(x, y) {
    this.ctx.save();

    // УБИРАЕМ фон - теперь canvas изначально прозрачный
    // this.ctx.fillStyle = `rgba(255, 255, 255, 0)`;
    // this.ctx.fillRect(x, y, this.params.width, this.params.height);

    // Рисуем фоновое изображение если оно загружено
    if (this.imgLogo) {
      this.drawLogo(x, y);
    }

    // Текст
    let displayText;
    if (this.params.contentType === 'datetime') {
      displayText = this.getCurrentDateTime();
    } else {
      displayText = this.params.text;
    }

    // Текст с прозрачностью
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
      // Обычный текст (одна строка)
      this.ctx.fillText(displayText, x + this.params.width / 2, y + this.params.height / 2);
    }

    this.ctx.restore();
  }

  private static drawLogo(x: number, y: number) {
    if (!this.imgLogo) return;

    // Рисуем изображение с прозрачностью
    this.ctx.globalAlpha = this.params.opacityLogo;
    this.ctx.drawImage(this.imgLogo, x, y, this.params.width, this.params.height);
    this.ctx.globalAlpha = 1.0; // Сбрасываем прозрачность
  }

  private static hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private static getCurrentDateTime(): string[] {
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

    console.log('Canvas size:', rect.width, rect.height);
    console.log('Watermark size:', this.params.width, this.params.height);
    console.log('Padding:', this.params.paddingTop, this.params.paddingBottom, this.params.paddingLeft, this.params.paddingRight);
    console.log('Spacing:', this.params.spacingX, this.params.spacingY);

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
