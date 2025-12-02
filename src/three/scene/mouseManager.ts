import * as THREE from 'three';

import { threeApp } from '../threeApp';
import { SelectionManager } from '../mergedModel/selectionManager';
import { SelectionHandler } from '../selection/selectionHandler';

type SelectionMode = 'merge' | 'tflex';

const RAYCASTER_FAR = 1000;

/**
 * Класс для обработки событий мыши и raycasting
 * Отвечает только за отслеживание позиции мыши и определение пересечений с объектами
 */
export class MouseManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private domElement: HTMLElement | null = null;
  private camera: THREE.Camera | null = null;
  private isDown = false;
  private isMove = false;
  private selectionHandler: SelectionHandler;

  constructor(selectionHandler: SelectionHandler) {
    this.selectionHandler = selectionHandler;
  }

  public init(camera: THREE.Camera, domElement: HTMLElement): void {
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.0;
    this.raycaster.params.Points.threshold = 0.0;
    this.raycaster.far = RAYCASTER_FAR;
    this.raycaster.firstHitOnly = true;

    this.mouse = new THREE.Vector2();

    this.domElement.addEventListener('pointerdown', this.pointerDown);
    this.domElement.addEventListener('pointermove', this.pointerMove);
    this.domElement.addEventListener('pointerup', this.pointerUp);

    window.addEventListener('keydown', this.keyDown);
  }

  public dispose(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this.pointerDown);
      this.domElement.removeEventListener('pointermove', this.pointerMove);
      this.domElement.removeEventListener('pointerup', this.pointerUp);
    }

    window.removeEventListener('keydown', this.keyDown);

    this.domElement = null;
    this.camera = null;
  }

  private keyDown = (event: KeyboardEvent): void => {
    if (event.code === 'Space') {
      event.preventDefault();
    }
    if (event.code === 'Delete') {
      event.preventDefault();
    }
  };

  private pointerDown = (_event: PointerEvent): void => {
    this.isDown = true;
  };

  private pointerMove = (event: PointerEvent): void => {
    if (!this.isDown) return;
    this.isMove = true;

    this.calculateMousePosition(event);
    this.updateRaycaster();
  };

  private pointerUp = async (event: PointerEvent): Promise<void> => {
    try {
      if (!this.isMove) {
        SelectionManager.clearSelection();
        this.selectionHandler.resetSelection();

        this.calculateMousePosition(event);
        this.updateRaycaster();

        const { obj, intersect } = await this.intersectObj(event);

        const mode: SelectionMode = threeApp.modelLoader.getMerge() ? 'merge' : 'tflex';

        this.selectionHandler.handleSelection(obj, intersect, mode);
      }
    } catch (error) {
      console.error('Error in pointerUp:', error);
    } finally {
      this.isDown = false;
      this.isMove = false;
    }
  };

  private calculateMousePosition(event: PointerEvent): void {
    if (!this.domElement) return;

    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateRaycaster(): void {
    if (!this.camera) return;
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }

  private async intersectObj(event: PointerEvent): Promise<{
    obj: THREE.Object3D | null;
    intersect: THREE.Intersection<THREE.Object3D> | null;
  }> {
    let obj: THREE.Object3D | null = null;
    let intersect: THREE.Intersection<THREE.Object3D> | null = null;

    // Пропускаем правую кнопку мыши
    if (event.button === 2) {
      return { obj, intersect };
    }

    this.calculateMousePosition(event);
    this.updateRaycaster();

    const model = threeApp.modelLoader.getModel();
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
}
