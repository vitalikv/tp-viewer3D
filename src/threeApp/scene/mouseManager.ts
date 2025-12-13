import * as THREE from 'three';

import { ContextSingleton } from '@/core/ContextSingleton';
import { SelectionMergedModel } from '@/threeApp/selection/selectionMergedModel';
import { SelectionHandler } from '@/threeApp/selection/selectionHandler';
import { InitModel } from '@/threeApp/model/initModel';
import { SceneManager } from '@/threeApp/scene/sceneManager';

export class MouseManager extends ContextSingleton<MouseManager> {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement | null = null;
  private camera: THREE.Camera | null = null;
  private isDown = false;
  private isMove = false;
  private isWorker = false;

  public init(camera: THREE.Camera, domElement: HTMLElement | null = null) {
    this.camera = camera;
    this.domElement = domElement;
    this.isWorker = this.domElement ? false : true;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.0;
    this.raycaster.params.Points.threshold = 0.0;
    this.raycaster.far = 1000;
    this.raycaster.firstHitOnly = true;

    this.mouse = new THREE.Vector2();

    this.updateCamera(camera);

    if (this.domElement) {
      this.initEvent();
    }
  }

  private initEvent() {
    this.domElement.addEventListener('pointerdown', this.pointerDown);
    this.domElement.addEventListener('pointermove', this.pointerMove);
    this.domElement.addEventListener('pointerup', this.pointerUp);

    window.addEventListener('keydown', this.keyDown);
  }

  public dispose() {
    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this.pointerDown);
      this.domElement.removeEventListener('pointermove', this.pointerMove);
      this.domElement.removeEventListener('pointerup', this.pointerUp);
    }

    window.removeEventListener('keydown', this.keyDown);

    this.domElement = null;
    this.camera = null;
  }

  private keyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
    }
    if (event.code === 'Delete') {
      event.preventDefault();
    }
  };

  public handlePointerEvent(type: string, eventData: { clientX: number; clientY: number; button?: number }): void {
    if (!this.isWorker) return;

    const syntheticEvent = {
      clientX: eventData.clientX,
      clientY: eventData.clientY,
      button: eventData.button ?? 0,
    } as PointerEvent;

    switch (type) {
      case 'pointerdown':
        this.pointerDown();
        break;
      case 'pointermove':
        this.pointerMove(syntheticEvent);
        break;
      case 'pointerup':
        this.pointerUp(syntheticEvent);
        break;
    }
  }

  private pointerDown = () => {
    this.isDown = true;
  };

  private pointerMove = (event: PointerEvent) => {
    if (!this.isDown) return;
    this.isMove = true;

    this.calculateMousePosition(event);
  };

  private pointerUp = (event: PointerEvent) => {
    if (!this.isMove) {
      SelectionMergedModel.clearSelection();
      SelectionHandler.inst().resetSelection();

      this.calculateMousePosition(event);

      const { obj, intersect } = this.intersectObj(event);
      const mode = InitModel.inst().getMerge() ? 'merge' : 'tflex';
      SelectionHandler.inst().handleSelection(obj, intersect, mode);
    }

    this.isDown = false;
    this.isMove = false;
  };

  private calculateMousePosition(event: PointerEvent) {
    const rect = SceneManager.inst().getClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private intersectObj(event: PointerEvent) {
    let obj: THREE.Object3D | null = null;
    let intersect: THREE.Intersection<THREE.Object3D> | null = null;

    if (event.button === 2) return { obj, intersect };

    this.calculateMousePosition(event);

    const model = InitModel.inst().getModel();
    if (!model) {
      return { obj, intersect };
    }

    const intersects = this.raycaster.intersectObjects([model], true);

    if (intersects.length > 0) {
      intersect = intersects[0];
      obj = intersect.object;
    }

    return { obj, intersect };
  }

  public updateCamera(camera: THREE.Camera) {
    this.camera = camera;
  }
}
