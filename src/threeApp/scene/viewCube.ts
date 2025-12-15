import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls';

export class ViewCube {
  private controls: ArcballControls;
  private animate: () => void;
  private viewcube?: HTMLDivElement;
  private facesDiv?: NodeListOf<HTMLDivElement>;
  private verticesDiv?: NodeListOf<HTMLDivElement>;
  private edgesDiv?: NodeListOf<HTMLDivElement>;
  private onOrientationChange?: (data: { position: number[]; quaternion: number[]; up: number[] }) => void;

  constructor({ container, controls, animate, onOrientationChange }: { container: HTMLElement; controls: ArcballControls; animate: () => void; onOrientationChange?: (data: { position: number[]; quaternion: number[]; up: number[] }) => void }) {
    this.controls = controls;
    this.animate = animate;
    this.onOrientationChange = onOrientationChange;

    this.createHtmlCube(container);
    this.setupEventListeners();
    this.updateViewCube();
  }

  private createHtmlCube(container: HTMLElement) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const minDimension = Math.min(containerWidth, containerHeight);
    const baseSize = 120;
    let scaleFactor = (minDimension * 0.15) / baseSize;
    scaleFactor = Math.max(0.7, Math.min(scaleFactor, 1.0));

    const baseCubeSize = 100;
    const baseFontSize = 25;
    const baseTranslateZ = -300;
    const baseFaceTranslateZ = -50;
    const baseVertexSize = 15;
    const baseEdgeSize = 6;

    const scaledSize = baseSize * scaleFactor;
    const scaledCubeSize = baseCubeSize * scaleFactor;
    const scaledFontSize = baseFontSize * scaleFactor;
    const scaledTranslateZ = baseTranslateZ * scaleFactor;
    const scaledFaceTranslateZ = baseFaceTranslateZ * scaleFactor;
    const scaledVertexSize = baseVertexSize * scaleFactor;
    const scaledEdgeSize = baseEdgeSize * scaleFactor;

    const cssViewcube = `width: ${scaledSize}px;
      height: ${scaledSize}px;
      margin: ${10 * scaleFactor}px;
      perspective: ${600 * scaleFactor}px;
      position: absolute;
      left: ${40 * scaleFactor}px;  
      top: ${60 * scaleFactor}px;   
      z-index: 2;`;

    const cssCube = `width: ${scaledCubeSize}px;
      height: ${scaledCubeSize}px;
      position: relative;
      transform-style: preserve-3d;
      transform: translateZ(${scaledTranslateZ}px);
      text-transform: uppercase;`;

    const cssFace = `display: flex;
      justify-content: center;
      align-items: center;
      position: absolute;
      width: 100%;
      height: 100%;
      border: ${2 * scaleFactor}px solid #808080;
      line-height: ${scaledCubeSize}px;
      font-size: ${scaledFontSize}px;
      font-weight: bold;
      color: #7d7d7d;
      text-align: center;
      background: #fff;
      transition: all 0.1s;
      cursor: pointer;
      user-select: none;`;

    const cssVertex = `width: ${scaledVertexSize}px; height: ${scaledVertexSize}px; position: absolute; transform-style: preserve-3d;`;

    const cssEdge = `width: 100%; height: ${scaledEdgeSize}px; position: absolute; transform-style: preserve-3d;`;

    const cssItem = `position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      // font-size: 12px;
      // font-weight: bold;
      // color: #7d7d7d;      
      //border: 2px solid #808080;
      background: rgba(255, 0, 0, 0);
      cursor: pointer;
      user-select: none;`;

    const faces = [
      { id: 'face_top', name: 'Верх', style: cssFace + `transform: rotateY(0deg) rotateX(90deg) translateZ(${scaledFaceTranslateZ}px);` },
      { id: 'face_bottom', name: 'Низ', style: cssFace + `transform: rotateX(270deg) translateZ(${scaledFaceTranslateZ}px);` },
      { id: 'face_front', name: 'Перед', style: cssFace + `transform: rotateX(180deg) translateZ(${scaledFaceTranslateZ}px);` },
      { id: 'face_back', name: 'Зад', style: cssFace + `transform: rotateZ(180deg) translateZ(${scaledFaceTranslateZ}px);` },
      { id: 'face_left', name: 'Лево', style: cssFace + `transform: rotateY(-90deg) rotateX(180deg) rotateZ(0deg) translateZ(${scaledFaceTranslateZ}px);` },
      { id: 'face_right', name: 'Право', style: cssFace + `transform: rotateY(90deg) rotateX(180deg) rotateZ(0deg) translateZ(${scaledFaceTranslateZ}px);` },
    ];

    const vertices = [
      { id: 'vertex_front_left_bottom', style: cssVertex + `transform: translateX(${-scaledVertexSize / 2}px) translateY(${-scaledVertexSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
      { id: 'vertex_back_left_bottom', style: cssVertex + `transform: translateX(${-scaledVertexSize / 2}px) translateY(${-scaledVertexSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'vertex_back_right_bottom', style: cssVertex + `transform: translateX(${scaledCubeSize - scaledVertexSize / 2}px) translateY(${-scaledVertexSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'vertex_front_right_bottom', style: cssVertex + `transform: translateX(${scaledCubeSize - scaledVertexSize / 2}px) translateY(${-scaledVertexSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
      { id: 'vertex_front_left_top', style: cssVertex + `transform: translateX(${-scaledVertexSize / 2}px) translateY(${scaledCubeSize - scaledVertexSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
      { id: 'vertex_back_left_top', style: cssVertex + `transform: translateX(${-scaledVertexSize / 2}px) translateY(${scaledCubeSize - scaledVertexSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'vertex_back_right_top', style: cssVertex + `transform: translateX(${scaledCubeSize - scaledVertexSize / 2}px) translateY(${scaledCubeSize - scaledVertexSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'vertex_front_right_top', style: cssVertex + `transform: translateX(${scaledCubeSize - scaledVertexSize / 2}px) translateY(${scaledCubeSize - scaledVertexSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
    ];

    const edges = [
      { id: 'edge_front_right_vertical', style: cssEdge + `transform: rotateZ(90deg) translateX(${scaledCubeSize / 2 - scaledEdgeSize / 2}px) translateY(${-scaledCubeSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
      { id: 'edge_back_right_vertical', style: cssEdge + `transform: rotateZ(90deg) translateX(${scaledCubeSize / 2 - scaledEdgeSize / 2}px) translateY(${-scaledCubeSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'edge_front_left_vertical', style: cssEdge + `transform: rotateZ(90deg) translateX(${scaledCubeSize / 2 - scaledEdgeSize / 2}px) translateY(${scaledCubeSize / 2 - scaledEdgeSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
      { id: 'edge_back_left_vertical', style: cssEdge + `transform: rotateZ(90deg) translateX(${scaledCubeSize / 2 - scaledEdgeSize / 2}px) translateY(${scaledCubeSize / 2 - scaledEdgeSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },

      { id: 'edge_bottom_back_horizontal', style: cssEdge + `transform: rotateX(90deg) translateY(${-scaledCubeSize / 2}px) translateZ(0px);` },
      { id: 'edge_top_front_horizontal', style: cssEdge + `transform: rotateX(90deg) translateY(${scaledCubeSize / 2}px) translateZ(${-(scaledCubeSize - scaledEdgeSize / 2)}px);` },
      { id: 'edge_bottom_front_horizontal', style: cssEdge + `transform: rotateX(90deg) translateY(${scaledCubeSize / 2}px) translateZ(0px);` },
      { id: 'edge_top_back_horizontal', style: cssEdge + `transform: rotateX(90deg) translateY(${-scaledCubeSize / 2}px) translateZ(${-(scaledCubeSize - scaledEdgeSize / 2)}px);` },

      { id: 'edge_top_left_horizontal', style: cssEdge + `transform: rotateY(90deg) translateY(${scaledCubeSize - scaledEdgeSize / 2}px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'edge_bottom_left_horizontal', style: cssEdge + `transform: rotateY(90deg) translateY(0px) translateZ(${-scaledCubeSize / 2}px);` },
      { id: 'edge_top_right_horizontal', style: cssEdge + `transform: rotateY(90deg) translateY(${scaledCubeSize - scaledEdgeSize / 2}px) translateZ(${scaledCubeSize / 2}px);` },
      { id: 'edge_bottom_right_horizontal', style: cssEdge + `transform: rotateY(90deg) translateY(0px) translateZ(${scaledCubeSize / 2}px);` },
    ];

    const html = `<div id="viewcube-container" style="${cssViewcube}">
        <div style="${cssCube}" id="viewcube">
            ${faces.map((element) => `<div style="${element.style}" nameId="${element.id}"> ${element.name} </div>`).join('')} 

            ${vertices
              .map(
                (element) => `<div style="${element.style}" nameId="${element.id}">
                <div style="${cssItem} transform: rotateY(0deg) translateZ(${scaledVertexSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateY(180deg) translateZ(${scaledVertexSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateY(90deg) translateZ(${scaledVertexSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateY(-90deg) translateZ(${scaledVertexSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateX(90deg) translateZ(${scaledVertexSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateX(-90deg) translateZ(${scaledVertexSize / 2}px);"></div>
            </div>`
              )
              .join('')}
              
            ${edges
              .map(
                (element) => `<div style="${element.style}" nameId="${element.id}">
                <div style="${cssItem} transform: rotateY(0deg) translateZ(${scaledEdgeSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateY(180deg) translateZ(${scaledEdgeSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateX(90deg) translateZ(${scaledEdgeSize / 2}px);"></div>
                <div style="${cssItem} transform: rotateX(-90deg) translateZ(${scaledEdgeSize / 2}px);"></div>
            </div>`
              )
              .join('')}           
        </div>
    </div>`;

    const div = document.createElement('div');
    div.innerHTML = html;
    const divElement = div.children[0] as HTMLDivElement;
    container?.append(divElement);

    this.viewcube = divElement.querySelector('#viewcube');
    this.facesDiv = divElement.querySelectorAll('[nameId^="face_"]') as NodeListOf<HTMLDivElement>;
    this.verticesDiv = divElement.querySelectorAll('[nameId^="vertex_"]') as NodeListOf<HTMLDivElement>;
    this.edgesDiv = divElement.querySelectorAll('[nameId^="edge_"]') as NodeListOf<HTMLDivElement>;

    this.facesDiv.forEach((face) => {
      face.addEventListener('mouseenter', () => {
        face.style.background = '#adadad';
        face.style.color = '#fff';
      });

      face.addEventListener('mouseleave', () => {
        face.style.background = '#fff';
        face.style.color = '#7d7d7d';
      });
    });

    [...this.verticesDiv, ...this.edgesDiv].forEach((item) => {
      item.addEventListener('mouseenter', () => {
        for (const child of item.children) {
          (child as HTMLElement).style.background = 'rgba(173, 173, 173, 1)';
        }
      });

      item.addEventListener('mouseleave', () => {
        for (const child of item.children) {
          (child as HTMLElement).style.background = 'rgba(173, 173, 173, 0)';
        }
      });
    });
  }

  private setupEventListeners() {
    if (!this.viewcube) return;

    this.facesDiv?.forEach((item) => {
      item.addEventListener('click', () => this.handleFaceClick(item));
    });
    this.verticesDiv?.forEach((item) => {
      item.addEventListener('click', () => this.handleVertexClick(item));
    });
    this.edgesDiv?.forEach((item) => {
      item.addEventListener('click', () => this.handleEdgeClick(item));
    });

    this.controls.addEventListener('change', () => this.updateViewCube());
    this.controls.addEventListener('start', () => this.updateViewCube());
    this.controls.addEventListener('end', () => this.updateViewCube());
  }

  private handleFaceClick(face: HTMLElement) {
    const direction = new THREE.Vector3();
    const targetQuaternion = new THREE.Quaternion();

    const nameId = face.getAttribute('nameId');

    switch (nameId) {
      case 'face_front':
        direction.set(0, 0, 1);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
        break;
      case 'face_back':
        direction.set(0, 0, -1);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
        break;
      case 'face_right':
        direction.set(1, 0, 0);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        break;
      case 'face_left':
        direction.set(-1, 0, 0);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
        break;
      case 'face_top':
        direction.set(0, 1, 0);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        break;
      case 'face_bottom':
        direction.set(0, -1, 0);
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        break;
    }

    const camera = this.getActiveCamera();
    const distance = camera.position.distanceTo(this.controls['_gizmos'].position);
    const targetPosition = direction.multiplyScalar(distance).add(this.controls['_gizmos'].position);

    this.animateCameraToPosition(targetPosition, targetQuaternion);
  }

  private handleVertexClick(vertex: HTMLElement) {
    const direction = new THREE.Vector3();
    const targetUp = new THREE.Vector3(0, 1, 0);

    const nameId = vertex.getAttribute('nameId');

    switch (nameId) {
      case 'vertex_front_right_top':
        direction.set(1, 1, 1).normalize();
        break;
      case 'vertex_front_right_bottom':
        direction.set(1, -1, 1).normalize();
        targetUp.set(0, -1, 0);
        break;
      case 'vertex_front_left_top':
        direction.set(-1, 1, 1).normalize();
        break;
      case 'vertex_front_left_bottom':
        direction.set(-1, -1, 1).normalize();
        targetUp.set(0, -1, 0);
        break;
      case 'vertex_back_right_top':
        direction.set(1, 1, -1).normalize();
        break;
      case 'vertex_back_right_bottom':
        direction.set(1, -1, -1).normalize();
        targetUp.set(0, -1, 0);
        break;
      case 'vertex_back_left_top':
        direction.set(-1, 1, -1).normalize();
        break;
      case 'vertex_back_left_bottom':
        direction.set(-1, -1, -1).normalize();
        targetUp.set(0, -1, 0);
        break;
    }

    const { targetPosition, targetQuaternion } = this.calculateCameraTarget(direction, targetUp);

    this.animateCameraToPosition(targetPosition, targetQuaternion);
  }

  private handleEdgeClick(edge: HTMLElement) {
    const direction = new THREE.Vector3();
    const targetUp = new THREE.Vector3(0, 1, 0);

    const nameId = edge.getAttribute('nameId');

    switch (nameId) {
      case 'edge_front_right_vertical':
        direction.set(1, 0, 1).normalize();
        break;
      case 'edge_front_left_vertical':
        direction.set(-1, 0, 1).normalize();
        break;
      case 'edge_back_right_vertical':
        direction.set(1, 0, -1).normalize();
        break;
      case 'edge_back_left_vertical':
        direction.set(-1, 0, -1).normalize();
        break;

      case 'edge_top_front_horizontal':
        direction.set(0, 1, 1).normalize();
        break;
      case 'edge_top_back_horizontal':
        direction.set(0, 1, -1).normalize();
        break;
      case 'edge_top_right_horizontal':
        direction.set(1, 1, 0).normalize();
        break;
      case 'edge_top_left_horizontal':
        direction.set(-1, 1, 0).normalize();
        break;

      case 'edge_bottom_front_horizontal':
        direction.set(0, -1, 1).normalize();
        targetUp.set(0, -1, 0);
        break;
      case 'edge_bottom_back_horizontal':
        direction.set(0, -1, -1).normalize();
        targetUp.set(0, -1, 0);
        break;
      case 'edge_bottom_right_horizontal':
        direction.set(1, -1, 0).normalize();
        targetUp.set(0, -1, 0);
        break;
      case 'edge_bottom_left_horizontal':
        direction.set(-1, -1, 0).normalize();
        targetUp.set(0, -1, 0);
        break;
    }

    const { targetPosition, targetQuaternion } = this.calculateCameraTarget(direction, targetUp);

    this.animateCameraToPosition(targetPosition, targetQuaternion);
  }

  private getActiveCamera() {
    return this.controls.object as THREE.PerspectiveCamera | THREE.OrthographicCamera;
  }

  private calculateCameraTarget(direction: THREE.Vector3, targetUp: THREE.Vector3) {
    const camera = this.getActiveCamera();

    const distance = camera.position.distanceTo(this.controls['_gizmos'].position);
    const targetPosition = direction.multiplyScalar(distance).add(this.controls['_gizmos'].position);

    const targetQuaternion = new THREE.Quaternion();
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.lookAt(targetPosition, this.controls['_gizmos'].position, targetUp);
    targetQuaternion.setFromRotationMatrix(tempMatrix);

    return { targetPosition, targetQuaternion };
  }

  private animateCameraToPosition(targetPosition: THREE.Vector3, targetQuaternion: THREE.Quaternion) {
    const camera = this.getActiveCamera();
    const duration = 500;
    const startPosition = camera.position.clone();
    const startUp = camera.up.clone();
    const targetUp = new THREE.Vector3(0, 1, 0);
    const startTime = Date.now();

    if (targetQuaternion.equals(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2))) {
      targetUp.set(0, 0, -1);
    } else if (targetQuaternion.equals(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2))) {
      targetUp.set(0, 0, 1);
    }

    if (this.onOrientationChange) {
      this.onOrientationChange({
        position: targetPosition.toArray(),
        quaternion: targetQuaternion.toArray(),
        up: targetUp.toArray(),
      });
      return;
    }

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);

      camera.position.lerpVectors(startPosition, targetPosition, t);
      camera.up.lerpVectors(startUp, targetUp, t);

      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      this.controls.update();
      this.updateViewCube();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        camera.up.copy(targetUp);
        this.updateViewCube();
      }
    };

    animate();
  }

  public updateViewCube() {
    if (!this.viewcube) return;
    const camera = this.getActiveCamera();

    const mat = new THREE.Matrix4();
    mat.extractRotation(camera.matrixWorldInverse);
    this.viewcube.style.transform = `translateZ(-300px) ${this.getCameraCSSMatrix(mat)}`;

    this.animate();
  }

  private epsilon(value: number) {
    return Math.abs(value) < 1e-10 ? 0 : value;
  }

  private getCameraCSSMatrix(matrix: THREE.Matrix4) {
    const { elements } = matrix;

    return `matrix3d(
                    ${this.epsilon(elements[0])},
                    ${this.epsilon(-elements[1])},
                    ${this.epsilon(elements[2])},
                    ${this.epsilon(elements[3])},
                    ${this.epsilon(elements[4])},
                    ${this.epsilon(-elements[5])},
                    ${this.epsilon(elements[6])},
                    ${this.epsilon(elements[7])},
                    ${this.epsilon(elements[8])},
                    ${this.epsilon(-elements[9])},
                    ${this.epsilon(elements[10])},
                    ${this.epsilon(elements[11])},
                    ${this.epsilon(elements[12])},
                    ${this.epsilon(-elements[13])},
                    ${this.epsilon(elements[14])},
                    ${this.epsilon(elements[15])})`;
  }
}
