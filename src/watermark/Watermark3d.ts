import * as THREE from 'three';
import { WatermarkCanvas } from '@/watermark/WatermarkCanvas';

export class Watermark3d {
  private static renderer: THREE.WebGLRenderer;
  private static watermarkMesh: THREE.Mesh;
  private static watermarkScene: THREE.Scene | null = null;
  private static watermarkCamera: THREE.OrthographicCamera | null = null;

  public static async init(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const canvas = WatermarkCanvas.getWatermarkCanvas();
    if (!canvas) return;
    console.log('Watermark3dFront');

    this.createOverlay();
    this.renderWatermark();
  }

  private static createOverlay() {
    if (this.watermarkScene && this.watermarkCamera) return;

    this.watermarkScene = new THREE.Scene();
    this.watermarkCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.watermarkCamera.position.set(0, 0, 1);
    this.watermarkCamera.lookAt(0, 0, 0);
    this.watermarkCamera.updateProjectionMatrix();

    this.watermarkMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.MeshBasicMaterial({ transparent: true })
    );
    this.watermarkMesh.frustumCulled = false;
    this.watermarkMesh.renderOrder = Infinity;
    this.watermarkScene.add(this.watermarkMesh);
  }

  private static getShader(canvas: HTMLCanvasElement | OffscreenCanvas) {
    const vertexShader = `
        void main() {
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform sampler2D watermarkTexture;
        
        void main() {
            vec2 uv = gl_FragCoord.xy / vec2(${canvas.width}.0, ${canvas.height}.0);
            vec4 watermarkColor = texture2D(watermarkTexture, uv);
            
            if (watermarkColor.a < 0.1) {
                discard;
            }
            
            gl_FragColor = watermarkColor;
        }
    `;

    return { vertexShader, fragmentShader };
  }

  public static renderWatermark() {
    const canvas = WatermarkCanvas.getWatermarkCanvas();
    if (!canvas) return;

    if (!this.watermarkScene) {
      this.createOverlay();
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.updateMaterial(texture);
  }

  public static renderOverlay() {
    if (!this.watermarkScene || !this.watermarkCamera) return;

    const previousAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.watermarkScene, this.watermarkCamera);
    this.renderer.autoClear = previousAutoClear;
  }

  private static updateMaterial(texture: THREE.CanvasTexture) {
    const canvas = WatermarkCanvas.getWatermarkCanvas();
    if (!canvas) return;

    this.disposeMaterial();

    const { vertexShader, fragmentShader } = this.getShader(canvas);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        watermarkTexture: { value: texture },
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    if (this.watermarkMesh) this.watermarkMesh.material = material;
  }

  private static disposeMaterial() {
    if (!this.watermarkMesh) return;
    const material = this.watermarkMesh.material as THREE.ShaderMaterial;
    material.dispose();

    Object.keys(material).forEach((key: string) => {
      const value = (material as any)[key];
      if (value?.isTexture) {
        value.dispose();
      }
    });
  }
}
