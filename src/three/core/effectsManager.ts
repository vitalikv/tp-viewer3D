import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export class EffectsManager {
  public composer: EffectComposer;
  public outlinePass: OutlinePass;
  public renderPass: RenderPass;
  public outputPass: OutputPass;
  public smaaPass: SMAAPass;
  public enabled = false;

  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  public init({ scene, camera, renderer, container }) {
    if (this.enabled) return;
    this.enabled = true;

    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this.initComposer();
    this.initOutlineEffect();
    this.initSMAA();

    this.setSize();
  }

  private initComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.outputPass.renderToScreen = true;
  }

  private initOutlineEffect() {
    const resolution = new THREE.Vector2(this.width, this.height);

    this.outlinePass = new OutlinePass(resolution, this.scene, this.camera);

    // Настройки по умолчанию или из конфига
    this.outlinePass.edgeStrength = 2;
    this.outlinePass.edgeGlow = 0;
    this.outlinePass.edgeThickness = 0.1;
    this.outlinePass.pulsePeriod = 0;

    this.outlinePass.visibleEdgeColor.setHex(0x00ff00);
    this.outlinePass.hiddenEdgeColor.setHex(0x00ff00);

    this.outlinePass.overlayMaterial.blending = THREE.CustomBlending;

    this.composer.addPass(this.outlinePass);
  }

  private initSMAA() {
    this.smaaPass = new SMAAPass();
    this.smaaPass.setSize(this.width, this.height);
    this.composer.addPass(this.smaaPass);
  }

  public setSize() {
    const rect = this.container.getBoundingClientRect();

    this.composer.setSize(rect.width, rect.height);

    if (this.smaaPass) {
      this.smaaPass.setSize(rect.width, rect.height);
    }
  }

  public render() {
    this.composer.render();
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
