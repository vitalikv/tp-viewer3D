import * as THREE from 'three';
import { WatermarkCanvas } from './watermarkCanvas';

export class Watermark3d {
  private static watermarkMesh: THREE.Mesh;

  public static async init(scene: THREE.Scene) {
    const canvas = WatermarkCanvas.getWatermarkCanvas();
    if (!canvas) return;

    this.createFullscreenWatermark(scene);
    this.renderWatermark();
  }

  private static createFullscreenWatermark(scene: THREE.Scene) {
    this.watermarkMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial());
    scene.add(this.watermarkMesh);
  }

  private static getShader(canvas: HTMLCanvasElement) {
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

    const texture = new THREE.CanvasTexture(canvas);
    this.updateMaterial(texture);
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
