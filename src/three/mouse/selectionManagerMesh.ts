import * as THREE from 'three';
import { SelectedMergedByData } from '../loaders/data/selectedMergedByData';

export class SelectionManager {
  private selectedUuid: string | null = null;
  private highlightMeshes: THREE.Mesh[] = [];
  scene;
  constructor(scene) {
    this.scene = scene;
  }

  public handleObjectClick(intersect: THREE.Intersection<THREE.Object3D>) {
    if (!intersect || !intersect.object || !intersect.faceIndex) return;
    this.clearSelection();
    const mesh = intersect.object as THREE.Mesh;
    const geometry = mesh.geometry;

    if (!geometry.userData?.groups) return;

    const faceIndex = intersect.faceIndex;
    const groupIndex = this.findGroupByFaceIndex(geometry.groups, faceIndex);

    if (groupIndex === -1) return;

    const clickedUuid = geometry.userData.uuids[groupIndex];
    const clickedParentUuid = geometry.userData.parentUuids?.[groupIndex] || '';

    console.log(geometry.userData);

    const objs = SelectedMergedByData.getSelectedNode({ uuid: clickedUuid, parentUuid: clickedParentUuid });

    // Выделяем связанные объекты
    for (let i = 0; i < objs.length; i++) {
      const element = objs[i];
      if (!element.uuid) continue;
      console.log(element.uuid);
      this.selectByUuid(element.uuid);
    }

    //this.selectByUuid(clickedUuid);
  }

  private findGroupByFaceIndex(groups: THREE.Group[], faceIndex: number): number {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const startFace = group.start / 3;
      const endFace = startFace + group.count / 3;

      if (faceIndex >= startFace && faceIndex < endFace) {
        return i;
      }
    }
    return -1;
  }

  public selectByUuid(targetUuid: string) {
    //this.clearSelection();

    // Создаем материал выделения
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      emissive: 0x00ff00,
      emissiveIntensity: 0.2,
      opacity: 0.8,
    });

    // Находим и выделяем все объекты с targetUuid
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry?.userData?.groups) {
        const geometry = object.geometry;
        const { groups, uuids, parentUuids } = geometry.userData;

        const targetGroupIndices = parentUuids.map((uuid: string, index: number) => (uuid === targetUuid ? index : -1)).filter((index) => index !== -1);

        if (targetGroupIndices.length > 0) {
          // Создаем геометрию для выделенных групп
          const highlightGeometry = this.extractGroupsGeometry(geometry, groups, targetGroupIndices);

          if (highlightGeometry) {
            const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);

            // Копируем трансформацию
            highlightMesh.position.copy(object.position);
            highlightMesh.rotation.copy(object.rotation);
            highlightMesh.scale.copy(object.scale);

            highlightMesh.userData = { isHighlight: true, targetUuid };

            this.scene.add(highlightMesh);
            this.highlightMeshes.push(highlightMesh);
          }
        }
      }
    });

    this.selectedUuid = targetUuid;
  }

  private extractGroupsGeometry(originalGeometry: THREE.BufferGeometry, groups: THREE.Group[], groupIndices: number[]): THREE.BufferGeometry | null {
    const newGeometry = new THREE.BufferGeometry();

    // Копируем атрибуты
    newGeometry.setAttribute('position', originalGeometry.attributes.position.clone());
    if (originalGeometry.attributes.normal) {
      newGeometry.setAttribute('normal', originalGeometry.attributes.normal.clone());
    }

    // Собираем индексы для выделенных групп
    const indices: number[] = [];
    groupIndices.forEach((groupIndex) => {
      const group = groups[groupIndex];
      if (originalGeometry.index) {
        for (let i = group.start; i < group.start + group.count; i++) {
          indices.push(originalGeometry.index.getX(i));
        }
      } else {
        for (let i = group.start; i < group.start + group.count; i++) {
          indices.push(i);
        }
      }
    });

    if (indices.length > 0) {
      newGeometry.setIndex(indices);
      return newGeometry;
    }

    return null;
  }

  public clearSelection() {
    // Удаляем все меши выделения
    this.highlightMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
    });
    this.highlightMeshes = [];
    this.selectedUuid = null;
  }
}
