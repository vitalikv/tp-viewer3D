import * as THREE from 'three';
import { SelectedMergedByData } from '../loaders/data/selectedMergedByData';

export class SelectionManager {
  private selectedUuid: string | null = null;
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public handleObjectClick(intersect: THREE.Intersection<THREE.Object3D>) {
    if (!intersect || !intersect.object || !intersect.faceIndex) return;

    const mesh = intersect.object as THREE.Mesh;
    const geometry = mesh.geometry;

    if (!geometry.userData?.groups) return;

    const faceIndex = intersect.faceIndex;
    const groupIndex = this.findGroupByFaceIndex(geometry.groups, faceIndex);

    if (groupIndex === -1) return;

    const clickedUuid = geometry.userData.uuids[groupIndex];
    const clickedParentUuid = geometry.userData.parentUuids?.[groupIndex] || '';

    console.log('Clicked:', { clickedUuid, clickedParentUuid });

    const objs = SelectedMergedByData.getSelectedNode({
      uuid: clickedUuid,
      parentUuid: clickedParentUuid,
    });

    this.clearSelection();
    this.selectByUuid(clickedParentUuid);
    // Выделяем связанные объекты
    for (const element of objs) {
      if (!element.uuid) continue;
      //this.selectByUuid(element.uuid);
    }
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
    // Создаем материал выделения
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      emissive: 0x00ff00,
      emissiveIntensity: 0.2,
      opacity: 0.8,
    });

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry?.userData?.groups) {
        const mesh = object;
        const geometry = mesh.geometry;
        const { groups, uuids, parentUuids } = geometry.userData;

        // Находим индексы групп для выделения
        const highlightGroupIndices: number[] = [];
        parentUuids.forEach((uuid: string, index: number) => {
          if (uuid === targetUuid) {
            console.log(666, mesh);
            highlightGroupIndices.push(index);
          }
        });

        if (highlightGroupIndices.length === 0) return;

        // Сохраняем оригинальный материал если еще не сохранили
        if (!this.originalMaterials.has(mesh.uuid)) {
          this.originalMaterials.set(mesh.uuid, mesh.material);
        }

        // Создаем массив материалов для мульти-материала
        const materials: THREE.Material[] = [];
        const originalMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        // Для каждой группы выбираем материал
        for (let i = 0; i < groups.length; i++) {
          if (highlightGroupIndices.includes(i)) {
            // Выделенный материал для этой группы
            materials.push(highlightMaterial);
          } else {
            // Оригинальный материал для этой группы
            const materialIndex = Math.min(i, originalMaterials.length - 1);
            materials.push(originalMaterials[materialIndex]);
          }
        }

        // Применяем мульти-материал
        mesh.material = materials;
        console.log(9999);
      }
    });

    this.selectedUuid = targetUuid;
  }

  public clearSelection() {
    // Восстанавливаем оригинальные материалы
    this.originalMaterials.forEach((originalMaterial, meshUuid) => {
      const mesh = this.scene.getObjectByProperty('uuid', meshUuid) as THREE.Mesh;
      if (mesh) {
        mesh.material = originalMaterial;
      }
    });

    this.originalMaterials.clear();
    this.selectedUuid = null;
  }
}
