import * as THREE from 'three';
import { ArcballControls } from '@/threeApp/worker/ArcballControls';

import { ThreeApp } from '@/threeApp/ThreeApp';
import { SceneManager } from '@/threeApp/scene/SceneManager';

export class ControlsManager {
  private controls: ArcballControls;
  private camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private isWorker: boolean;
  private renderScheduled = false;

  public init({ canvas }: { canvas: HTMLCanvasElement | OffscreenCanvas }) {
    this.camera = SceneManager.inst().camera;
    this.canvas = canvas;
    this.isWorker = ThreeApp.inst().isWorker;

    this.controls = new ArcballControls(this.camera, canvas, SceneManager.inst().scene);
    this.controls.enableAnimations = false;

    if (this.isWorker) {
      const raf =
        typeof window !== 'undefined'
          ? window.requestAnimationFrame
          : typeof self !== 'undefined'
            ? self.requestAnimationFrame
            : null;
      if (raf) {
        this.controls.addEventListener('change', () => {
          if (!this.renderScheduled) {
            this.renderScheduled = true;
            raf(() => {
              SceneManager.inst().render();
              this.renderScheduled = false;
            });
          }
        });
      } else {
        this.controls.addEventListener('change', () => SceneManager.inst().render());
      }
    } else {
      this.controls.addEventListener('change', () => SceneManager.inst().render());
    }

    this.controls.addEventListener('start', () => SceneManager.inst().render());
    this.controls.addEventListener('end', () => SceneManager.inst().render());

    if (!this.isWorker && this.canvas instanceof HTMLCanvasElement) {
      this.canvas.addEventListener('pointerdown', this.handlePointerDownForRotation, { capture: true });
    }

    return this.controls;
  }

  public setRotationCenterFromPoint(clientX: number, clientY: number) {
    if (!this.controls || !this.camera) return;

    const rect = SceneManager.inst().getClientRect();

    const mouse = new THREE.Vector2();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const hitPoint = this.controls['unprojectOnObj'](mouse, this.camera);

    if (hitPoint !== null) {
      this.controls.enabled = false;

      this.controls.target.copy(hitPoint);
      this.controls['_gizmos'].position.copy(hitPoint);

      const tbRadius = this.controls['calculateTbRadius'](this.camera);
      this.controls['makeGizmos'](hitPoint, tbRadius);
      this.controls['_currentTarget'].copy(hitPoint);

      this.controls['updateMatrixState']();

      this.controls.enabled = true;
    }
  }

  private handlePointerDownForRotation = (event: PointerEvent) => {
    if (event.button !== 0) return;

    if (!(this.canvas instanceof HTMLCanvasElement)) return;

    this.setRotationCenterFromPoint(event.clientX, event.clientY);
  };

  public getControls() {
    return this.controls;
  }
}
