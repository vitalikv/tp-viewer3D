import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { ContextSingleton } from '@/core/ContextSingleton';

export class EffectsManager extends ContextSingleton<EffectsManager> {
  public composer!: EffectComposer;
  public outlinePass!: OutlinePass;
  private renderPass!: RenderPass;
  private outputPass!: OutputPass;
  private smaaPass: SMAAPass;
  public enabled = false;

  private container!: HTMLElement | { width: number; height: number; dpr: number; virtDom: boolean };
  private scene!: THREE.Scene;
  private camera!: THREE.Camera;
  private renderer!: THREE.WebGLRenderer;

  public init({ scene, camera, renderer, container }: { scene: THREE.Scene; camera: THREE.Camera; renderer: THREE.WebGLRenderer; container: HTMLElement | { width: number; height: number; dpr: number; virtDom: boolean } }) {
    if (this.enabled) return;
    this.enabled = true;

    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    const rect = this.getClientRect();

    this.initComposer(rect);
    this.initOutlineEffect(rect);
    this.initLineEffect(rect);
    //this.initSMAA();

    this.setSize();
  }

  private getClientRect(): { width: number; height: number } {
    if (this.container && typeof this.container === 'object' && 'virtDom' in this.container && this.container.virtDom) {
      return {
        width: this.container.width,
        height: this.container.height,
      };
    }
    return (this.container as HTMLElement).getBoundingClientRect();
  }

  private initComposer(rect: { width: number; height: number }) {
    const renderTarget = new THREE.WebGLRenderTarget(rect.width, rect.height, { samples: 4 });

    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.outputPass.renderToScreen = true;
  }

  private initOutlineEffect(rect: { width: number; height: number }) {
    const resolution = new THREE.Vector2(rect.width, rect.height);

    this.outlinePass = new OutlinePass(resolution, this.scene, this.camera);

    this.outlinePass.edgeStrength = 1.0;
    this.outlinePass.edgeGlow = 0;
    this.outlinePass.edgeThickness = 0.0;
    this.outlinePass.pulsePeriod = 0;

    this.outlinePass.visibleEdgeColor.setHex(0x00ff00);
    this.outlinePass.hiddenEdgeColor.setHex(0x00ff00);

    this.outlinePass.overlayMaterial.blending = THREE.CustomBlending;

    this.composer.addPass(this.outlinePass);
  }

  private initLineEffect(rect: { width: number; height: number }) {
    const lineShader = {
      uniforms: {
        tDiffuse: { value: null },
        maskTexture: { value: null },
        lineColor: { value: new THREE.Color(0x00ff00) },
        lineThickness: { value: 1 },
        resolution: { value: new THREE.Vector2(rect.width, rect.height) },
      },
      vertexShader: `
          varying vec2 vUv;
          void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
      `,
      fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D maskTexture;
      uniform vec3 lineColor;
      uniform float lineThickness;
      uniform vec2 resolution;
      varying vec2 vUv;
      
      void main() {
        vec4 sceneColor = texture2D(tDiffuse, vUv);
        float centerMask = texture2D(maskTexture, vUv).r;
        
        vec2 gradient = vec2(
          texture2D(maskTexture, vUv + vec2(1.0/resolution.x, 0.0)).r - 
          texture2D(maskTexture, vUv - vec2(1.0/resolution.x, 0.0)).r,
          texture2D(maskTexture, vUv + vec2(0.0, 1.0/resolution.y)).r - 
          texture2D(maskTexture, vUv - vec2(0.0, 1.0/resolution.y)).r
        );
        
        float edgeStrength = length(gradient);
        
        float line = smoothstep(0.5 - lineThickness * 0.01, 0.5 + lineThickness * 0.01, edgeStrength);
        line *= centerMask;
        
        gl_FragColor = mix(sceneColor, vec4(lineColor, 1.0), line);
      }
    `,
    };

    const linePass = new ShaderPass(lineShader);
    linePass.renderToScreen = true;
    linePass.material.depthTest = false;
    linePass.material.depthWrite = false;
    linePass.material.transparent = true;
    linePass.uniforms.maskTexture.value = this.outlinePass.renderTargetMaskBuffer.texture;
    this.composer.addPass(linePass);
  }

  // сглаживание, но не использую потому что есть const renderTarget = new THREE.WebGLRenderTarget(rect.width, rect.height, { samples: 4 });
  private initSMAA() {
    const rect = this.getClientRect();

    this.smaaPass = new SMAAPass();
    this.smaaPass.setSize(rect.width, rect.height);
    this.composer.addPass(this.smaaPass);
  }

  public setSize() {
    const rect = this.getClientRect();

    this.composer.setSize(rect.width, rect.height);

    if (this.smaaPass) {
      this.smaaPass.setSize(rect.width, rect.height);
    }
  }

  public render(): number {
    let totalCalls = 0;

    const originalRender = this.renderer.render;
    this.renderer.render = (scene: THREE.Scene, camera: THREE.Camera, ...args: any[]) => {
      originalRender.call(this.renderer, scene, camera, ...args);
      totalCalls += this.renderer.info.render.calls;
      this.renderer.info.reset();
    };
    this.composer.render();
    this.renderer.render = originalRender;

    return totalCalls;
  }

  public dispose() {
    this.composer.dispose();
    this.renderPass.dispose();
    this.outlinePass.dispose();
    if (this.smaaPass) {
      this.smaaPass.dispose();
    }
  }
}
