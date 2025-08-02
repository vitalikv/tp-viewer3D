import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three/examples/jsm/Addons.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { threeApp } from '../threeApp';

export class ModelLoader {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader;

  constructor() {
    this.loader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('three/examples/jsm/libs/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);
  }

  handleFileLoad = (e) => {
    const contents = e.target.result;

    this.loader.parse(
      contents,
      '',
      (gltf) => {
        //console.log(gltf);

        const model = gltf.scene;
        const merge = true;

        if (!merge) {
          threeApp.sceneManager.scene.add(model);
        } else {
          this.processModelWithMerge(model);
        }

        threeApp.sceneManager.renderer.render(threeApp.sceneManager.scene, threeApp.sceneManager.camera);
        console.log(threeApp.sceneManager.renderer.info.programs);
        console.log(threeApp.sceneManager.renderer.info.render);
        console.log(threeApp.sceneManager.renderer.info.memory);
      },
      (error) => {
        console.error('ошибка загрузки:', error);
      }
    );
  };

  processModelWithMerge(model) {
    this.centerModel(model);
    const mergedMeshes = this.mergeGeometriesWithMaterials(model);
    this.disposeHierarchy(model);

    const mergedGroup = new THREE.Group();
    mergedMeshes.forEach((mesh) => mergedGroup.add(mesh));
    threeApp.sceneManager.scene.add(mergedGroup);
  }

  centerModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    // Настраиваем камеру под размер модели
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    threeApp.sceneManager.camera.position.z = maxDim * 1.5;
    threeApp.sceneManager.controls.target.copy(center);
    threeApp.sceneManager.controls.update();
  }

  disposeHierarchy(node) {
    if (node.isMesh) {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach((m) => m.dispose());
        } else {
          node.material.dispose();
        }
      }
    }
    node.children.forEach((child) => this.disposeHierarchy(child));
  }

  mergeGeometriesWithMaterials(scene) {
    const meshEntries = [];

    // Собираем все меши с мировыми матрицами
    scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        if (!child.geometry.attributes.color) {
          // const colors = new Float32Array(child.geometry.attributes.position.count * 3).fill(1);
          // child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

          // Получаем цвет из материала
          const materialColor = child.material.color || new THREE.Color(0xffffff);

          // Создаём массив цветов с таким же количеством элементов, как и positions
          const count = child.geometry.attributes.position.count;
          const colors = new Float32Array(count * 3);

          // Заполняем массив цветов значением из материала
          for (let i = 0; i < count; i++) {
            colors[i * 3] = materialColor.r; // R
            colors[i * 3 + 1] = materialColor.g; // G
            colors[i * 3 + 2] = materialColor.b; // B
          }

          // Устанавливаем атрибут цвета
          child.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

          // Включаем использование атрибута цвета в материале
          child.material.vertexColors = true;
        }

        child.updateWorldMatrix(true, false);
        meshEntries.push({
          mesh: child,
          worldMatrix: child.matrixWorld.clone(),
        });
      }
    });

    // Группируем по материалам
    const materialGroups = new Map();

    meshEntries.forEach(({ mesh, worldMatrix }) => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material, idx) => {
        const key = material.uuid || `mat_${idx}`;

        if (!materialGroups.has(key)) {
          materialGroups.set(key, {
            material: material,
            geometries: [],
          });
        }

        const geometry = this.prepareGeometry(mesh.geometry, worldMatrix);
        materialGroups.get(key).geometries.push(geometry);
      });
    });

    // Объединяем геометрии
    const mergedMeshes = [];

    materialGroups.forEach((group) => {
      if (group.geometries.length === 0) return;

      const mergedGeometry = BufferGeometryUtils.mergeGeometries(group.geometries, false);

      if (mergedGeometry) {
        const mergedMeshe = new THREE.Mesh(mergedGeometry, new THREE.MeshStandardMaterial({ vertexColors: true, side: group.material.side }));
        //const mergedMeshe = new THREE.Mesh(mergedGeometry, group.material);
        mergedMeshes.push(mergedMeshe);

        this.testAdd({ geometries: group.geometries, mergeGeometries: mergedGeometry });
      }
    });

    return mergedMeshes;
  }

  prepareGeometry(geometry, matrix) {
    const clonedGeo = geometry.clone();
    clonedGeo.applyMatrix4(matrix);

    if (clonedGeo.index) {
      clonedGeo.toNonIndexed();
    }

    return clonedGeo;
  }

  private testAdd({ geometries, mergeGeometries }) {
    // geometries исходные геометрии
    //const objectIds = new Uint8Array(mergeGeometries.attributes.position.count); // массив ID объектов

    // Создаём массив objectId для каждой грани

    const faceCount = mergeGeometries.index ? mergeGeometries.index.count / 3 : mergeGeometries.attributes.position.count / 3;
    const faceObjectIds = new Uint8Array(faceCount);

    let faceOffset = 0;
    geometries.forEach((geom, objId) => {
      const geomFaceCount = geom.index ? geom.index.count / 3 : geom.attributes.position.count / 3;
      for (let i = 0; i < geomFaceCount; i++) {
        faceObjectIds[faceOffset + i] = objId;
      }
      faceOffset += geomFaceCount;
    });

    // Добавляем атрибут (используем `uv` или создаём новый)
    mergeGeometries.setAttribute('objectId', new THREE.BufferAttribute(faceObjectIds, 1));

    mergeGeometries.userData = { gs: geometries };
    // this.mergeGeometries.push(mergeGeometries);
    //this.geometryWallsMerge = geometryWallsMerge;
  }
}
