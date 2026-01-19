import * as THREE from 'three';

import { ContextSingleton } from '@/core/ContextSingleton';
import { ClippingBvh } from '@/threeApp/clipping/ClippingBvh';
import { EffectsManager } from '@/threeApp/scene/EffectsManager';
import { OutlineSelection } from '@/threeApp/selection/OutlineSelection';
import { SelectedByData } from '@/threeApp/model/structure/selectedByData';
import { SelectionMergedModel } from '@/threeApp/selection/SelectionMergedModel';

interface ActiveObjectItem {
  obj: THREE.Mesh | THREE.Line | THREE.LineSegments;
  mat: THREE.Material | THREE.Material[];
}

interface ActiveObjects {
  items: ActiveObjectItem[];
}

type SelectionMode = 'merge' | 'tflex';

const SELECTION_COLOR = 0x00ff00;
const SELECTION_EMISSIVE_INTENSITY = 0.2;
const SELECTION_OPACITY = 0.8;
const LINE_OPACITY = 0.1;

export class SelectionHandler extends ContextSingleton<SelectionHandler> {
  private activeObj: ActiveObjects = { items: [] };
  private selectionMaterial: THREE.MeshStandardMaterial;
  private lineMaterial: THREE.LineBasicMaterial;

  constructor() {
    super();

    this.selectionMaterial = new THREE.MeshStandardMaterial({
      color: SELECTION_COLOR,
      transparent: true,
      emissive: SELECTION_COLOR,
      emissiveIntensity: SELECTION_EMISSIVE_INTENSITY,
      opacity: SELECTION_OPACITY,
    });

    this.lineMaterial = new THREE.LineBasicMaterial({
      color: SELECTION_COLOR,
      transparent: true,
      depthTest: false,
      opacity: LINE_OPACITY,
    });
  }

  public handleSelection(
    obj: THREE.Object3D | null,
    intersect: THREE.Intersection<THREE.Object3D> | null,
    mode: SelectionMode
  ): void {
    if (obj && mode === 'tflex') {
      this.selectTflex(obj);
    } else if (intersect && mode === 'merge') {
      this.selectMerged(intersect);
    }
  }

  private selectTflex(obj: THREE.Object3D): void {
    let objs = SelectedByData.getSelectedNode({ obj });

    this.selectionMaterial.clippingPlanes = ClippingBvh.inst().getClippingPlanes();
    this.selectionMaterial.needsUpdate = true;

    if (objs.length === 0) {
      objs = [obj];
    }

    objs.forEach((object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          this.setActiveObj(child as THREE.Mesh);
          child.material = this.selectionMaterial;
        }
        if (child.isLine || child.isLineSegments) {
          this.setActiveObj(child as THREE.Line | THREE.LineSegments);
          child.material = this.lineMaterial;
        }
      });
    });
  }

  private setActiveObj(obj: THREE.Mesh | THREE.Line | THREE.LineSegments): void {
    if (!obj) return;

    const exists = this.activeObj.items.some((item) => item.obj === obj);
    if (exists) return;

    this.activeObj.items.push({
      obj,
      mat: obj.material,
    });

    if (obj instanceof THREE.Mesh && EffectsManager.inst()?.enabled) {
      OutlineSelection.inst().addOutlineObject(obj);
    }
  }

  private selectMerged(intersect: THREE.Intersection<THREE.Object3D>): void {
    if (!intersect?.object) return;

    const isMesh = intersect.object instanceof THREE.Mesh;
    const isLine = intersect.object instanceof THREE.Line || intersect.object instanceof THREE.LineSegments;

    if (!isMesh && !isLine) return;

    SelectionMergedModel.handleObjectClick(intersect);
  }

  public resetSelection(): void {
    const activeObj = this.getActiveObj();
    activeObj.items.forEach((item) => {
      if (item.obj && item.mat) {
        item.obj.material = item.mat;
      }
    });

    if (EffectsManager.inst()?.enabled) {
      OutlineSelection.inst().clearOutlineObjects();
    }

    this.clearActiveObj();
  }

  public clearSelection(): void {
    this.resetSelection();
  }

  private getActiveObj(): ActiveObjects {
    return this.activeObj;
  }

  private clearActiveObj(): void {
    this.activeObj.items.length = 0;
  }

  public dispose(): void {
    this.resetSelection();
    this.selectionMaterial.dispose();
    this.lineMaterial.dispose();
  }
}
