import * as THREE from 'three';
import { SelectedMergedByData } from '../loaders/data/selectedMergedByData';

export class SelectionManager {
  private selectedUuid: string | null = null;
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private scene: THREE.Scene;

  public mergedMeshes: Map<string, THREE.Mesh[]> = new Map();
  public mergedLines: Map<string, (THREE.Line | THREE.LineSegments)[]> = new Map();

  // ИЗМЕНЕНО: Сохраняем все объекты (меши и линии)
  private objectByUuid: Map<string, THREE.Object3D> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setMergedObjects(meshes: THREE.Mesh[], lines: (THREE.Line | THREE.LineSegments)[]) {
    this.mergedMeshes.clear();
    this.mergedLines.clear();
    this.objectByUuid.clear(); // Очищаем кэш

    // Сохраняем меши в кэш
    meshes.forEach((mesh) => {
      this.objectByUuid.set(mesh.uuid, mesh);

      const geometry = mesh.geometry;
      if (geometry?.userData?.parentUuids) {
        const parentUuids = geometry.userData.parentUuids;

        parentUuids.forEach((parentUuid: string) => {
          if (!this.mergedMeshes.has(parentUuid)) {
            this.mergedMeshes.set(parentUuid, []);
          }
          this.mergedMeshes.get(parentUuid)!.push(mesh);
        });
      }
    });

    // Сохраняем линии в кэш
    lines.forEach((line) => {
      this.objectByUuid.set(line.uuid, line);

      const geometry = line.geometry;
      if (geometry?.userData?.parentUuids) {
        const parentUuids = geometry.userData.parentUuids;

        parentUuids.forEach((parentUuid: string) => {
          if (!this.mergedLines.has(parentUuid)) {
            this.mergedLines.set(parentUuid, []);
          }
          this.mergedLines.get(parentUuid)!.push(line);
        });
      }
    });

    console.log('Merged meshes:', this.mergedMeshes);
    console.log('Merged lines:', this.mergedLines);
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

    console.time('getSelectedNode');
    const objs = SelectedMergedByData.getSelectedNode({ uuid: clickedUuid, parentUuid: clickedParentUuid });
    console.timeEnd('getSelectedNode');

    console.time('setMergedObjects');
    this.clearSelection();
    this.selectByUuid(clickedParentUuid);
    // Выделяем связанные объекты
    for (const element of objs) {
      if (!element.uuid) continue;
      this.selectByUuid(element.uuid);
    }
    console.timeEnd('setMergedObjects');
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
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      transparent: true,
      emissive: 0x00ff00,
      emissiveIntensity: 0.2,
      opacity: 0.8,
    });

    const baseMat2 = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, depthTest: false, opacity: 0.1 });

    // Получаем меши для targetUuid напрямую из Map
    const targetMeshes = this.mergedMeshes.get(targetUuid) || [];
    const targetLines = this.mergedLines.get(targetUuid) || [];

    [...targetMeshes, ...targetLines].forEach((mesh) => {
      const geometry = mesh.geometry;

      if (!geometry.userData?.groups) return;

      const { groups, parentUuids } = geometry.userData;

      // Находим индексы групп для выделения
      const highlightGroupIndices: number[] = [];
      parentUuids.forEach((uuid: string, index: number) => {
        if (uuid === targetUuid) {
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
          const material = mesh.isLine ? baseMat2 : highlightMaterial;
          materials.push(material);
        } else {
          const materialIndex = Math.min(i, originalMaterials.length - 1);
          materials.push(originalMaterials[materialIndex]);
        }
      }

      // Применяем мульти-материал
      mesh.material = materials;
    });

    this.selectedUuid = targetUuid;
  }

  public clearSelection() {
    // Восстанавливаем оригинальные материалы используя кэш
    this.originalMaterials.forEach((originalMaterial, objectUuid) => {
      const object = this.objectByUuid.get(objectUuid);

      if (object) {
        object.material = originalMaterial;
      }
    });

    this.originalMaterials.clear();
    this.selectedUuid = null;
  }
}
