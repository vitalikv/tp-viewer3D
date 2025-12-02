import { threeApp } from '../three/threeApp';
import { ApiUiToThree } from '../api/apiLocal/apiUiToThree';

export class UiClippingSlider {
  private act = false;
  private container: HTMLElement;
  private useBVH: HTMLDivElement;
  private helperBVH: HTMLDivElement;
  private model: HTMLDivElement;
  private wireframe: HTMLDivElement;
  private invert: HTMLDivElement;
  private showPlane: HTMLDivElement;

  private actBtnColor = '#4361ee';
  private deActBtnColor = 'rgba(94, 98, 118, 1)';

  public init(wrapContainer) {
    if (this.act) return;
    this.act = true;

    this.container = this.crDivSlider();
    wrapContainer.append(this.container);

    this.eventStop({ div: this.container });
    this.eventSlider();
    this.eventBtn();
    this.setStartColorBtns();
  }

  private crDivSlider() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const controlsStyle = `position: absolute; right: 20px; bottom: 120px; width: 200px; background: rgba(0, 0, 0, 0.3); padding: 15px;`;
    const controlGroupStyle = `margin-bottom: 15px;`;
    const controlTitleStyle = `font-size: 1.1rem; margin-bottom: 10px; color: #fff;`;
    const sliderContainerStyle = `margin-bottom: 10px;`;
    const sliderLabelStyle = `display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem; color: #fff;`;
    const sliderValueStyle = `font-weight: bold; background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 3px; font-size: 0.8rem; color: #fff;`;
    const sliderStyle = `-webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.2); outline: none;`;
    const buttonsStyle = `display: flex; gap: 8px; margin-top: 15px;`;
    const buttonStyle = `flex: 1; padding: 8px; border: none; border-radius: 4px; background: ${this.actBtnColor}; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1); font-size: 0.9rem;`;

    const html = `<div style="${controlsStyle}">
        <div style="${controlGroupStyle}">
            <h3 style="${controlTitleStyle}">Позиция</h3>
            
            <div style="${sliderContainerStyle}">
                <div style="${sliderLabelStyle}">
                    <span>Ось X:</span>
                    <span style="${sliderValueStyle}" id="x-position-value">50</span>
                </div>
                <input type="range" min="0" max="100" value="50" style="${sliderStyle}" id="x-position">
            </div>
            
            <div style="${sliderContainerStyle}">
                <div style="${sliderLabelStyle}">
                    <span>Ось Y:</span>
                    <span style="${sliderValueStyle}" id="y-position-value">50</span>
                </div>
                <input type="range" min="0" max="100" value="50" style="${sliderStyle}" id="y-position">
            </div>
            
            <div style="${sliderContainerStyle}">
                <div style="${sliderLabelStyle}">
                    <span>Ось Z:</span>
                    <span style="${sliderValueStyle}" id="z-position-value">50</span>
                </div>
                <input type="range" min="0" max="100" value="50" style="${sliderStyle}" id="z-position">
            </div>
        </div>
        
        <div style="${controlGroupStyle}">
            <h3 style="${controlTitleStyle}">Вращение</h3>
            
            <div style="${sliderContainerStyle}">
                <div style="${sliderLabelStyle}">
                    <span>Вращение X:</span>
                    <span style="${sliderValueStyle}" id="x-rotation-value">0°</span>
                </div>
                <input type="range" min="0" max="360" value="0" style="${sliderStyle}" id="x-rotation">
            </div>
            
            <div style="${sliderContainerStyle}">
                <div style="${sliderLabelStyle}">
                    <span>Вращение Y:</span>
                    <span style="${sliderValueStyle}" id="y-rotation-value">0°</span>
                </div>
                <input type="range" min="0" max="360" value="0" style="${sliderStyle}" id="y-rotation">
            </div>
            
            <div style="${sliderContainerStyle}">
                <div style="${sliderLabelStyle}">
                    <span>Вращение Z:</span>
                    <span style="${sliderValueStyle}" id="z-rotation-value">0°</span>
                </div>
                <input type="range" min="0" max="360" value="0" style="${sliderStyle}" id="z-rotation">
            </div>
        </div>
        
        <div style="${buttonsStyle}">
            <button id="useBVH" style="${buttonStyle}">useBVH</button>
            <button id="helperBVH" style="${buttonStyle}">helperBVH</button>
        </div>

        <div style="${buttonsStyle}">
            <button id="model" style="${buttonStyle}">model</button>
            <button id="wireframe" style="${buttonStyle}">wireframe</button>
        </div>

        <div style="${buttonsStyle}">
            <button id="invert" style="${buttonStyle}">invert</button>
            <button id="showPlane" style="${buttonStyle}">showPlane</button>
        </div>

        <div style="${buttonsStyle}">
            <button id="reset-btn" style="${buttonStyle}">Сбросить</button>
        </div>
    </div>`;

    return html;
  }

  // блокируем действия на 3д сцене, когда курсор находится на div
  private eventStop({ div }) {
    const arrEvent = ['onmousedown', 'onwheel', 'onmousewheel', 'onmousemove', 'ontouchstart', 'ontouchend', 'ontouchmove'];

    arrEvent.forEach((events) => {
      div[events] = (e) => {
        e.stopPropagation();
      };
    });
  }

  private eventSlider() {
    const xPositionSlider = this.container.querySelector('#x-position') as HTMLInputElement;
    const yPositionSlider = this.container.querySelector('#y-position') as HTMLInputElement;
    const zPositionSlider = this.container.querySelector('#z-position') as HTMLInputElement;
    const xRotationSlider = this.container.querySelector('#x-rotation') as HTMLInputElement;
    const yRotationSlider = this.container.querySelector('#y-rotation') as HTMLInputElement;
    const zRotationSlider = this.container.querySelector('#z-rotation') as HTMLInputElement;

    const xPositionValue = this.container.querySelector('#x-position-value');
    const yPositionValue = this.container.querySelector('#y-position-value');
    const zPositionValue = this.container.querySelector('#z-position-value');
    const xRotationValue = this.container.querySelector('#x-rotation-value');
    const yRotationValue = this.container.querySelector('#y-rotation-value');
    const zRotationValue = this.container.querySelector('#z-rotation-value');

    const resetBtn = this.container.querySelector('#reset-btn');

    const updatePlanePosition = () => {
      if (!threeApp.clippingBvh) return;

      const x = parseInt(xPositionSlider.value);
      const y = parseInt(yPositionSlider.value);
      const z = parseInt(zPositionSlider.value);

      // threeApp.clippingBvh.setPlanePosition(x, y, z);
      // threeApp.sceneManager.render();
      ApiUiToThree.setPlanePosition(x, y, z);
    };

    const updatePlaneRotation = () => {
      if (!threeApp.clippingBvh) return;

      const x = parseInt(xRotationSlider.value);
      const y = parseInt(yRotationSlider.value);
      const z = parseInt(zRotationSlider.value);

      // threeApp.clippingBvh.setPlaneRotation(x, y, z);
      // threeApp.sceneManager.render();
      ApiUiToThree.setPlaneRotation(x, y, z);
    };

    xPositionSlider.addEventListener('input', function () {
      xPositionValue.textContent = this.value;
      updatePlanePosition();
    });

    yPositionSlider.addEventListener('input', function () {
      yPositionValue.textContent = this.value;
      updatePlanePosition();
    });

    zPositionSlider.addEventListener('input', function () {
      zPositionValue.textContent = this.value;
      updatePlanePosition();
    });

    xRotationSlider.addEventListener('input', function () {
      xRotationValue.textContent = this.value + '°';
      updatePlaneRotation();
    });

    yRotationSlider.addEventListener('input', function () {
      yRotationValue.textContent = this.value + '°';
      updatePlaneRotation();
    });

    zRotationSlider.addEventListener('input', function () {
      zRotationValue.textContent = this.value + '°';
      updatePlaneRotation();
    });

    resetBtn.addEventListener('click', () => {
      xPositionSlider.value = '50';
      yPositionSlider.value = '50';
      zPositionSlider.value = '50';
      xRotationSlider.value = '0';
      yRotationSlider.value = '0';
      zRotationSlider.value = '0';

      xPositionValue.textContent = '50';
      yPositionValue.textContent = '50';
      zPositionValue.textContent = '50';
      xRotationValue.textContent = '0°';
      yRotationValue.textContent = '0°';
      zRotationValue.textContent = '0°';

      if (threeApp.clippingBvh) {
        // threeApp.clippingBvh.resetPlane();
        // threeApp.sceneManager.render();
        ApiUiToThree.resetPlane();
      }
    });
  }

  private eventBtn() {
    this.useBVH = this.container.querySelector('#useBVH') as HTMLDivElement;
    this.helperBVH = this.container.querySelector('#helperBVH') as HTMLDivElement;
    this.model = this.container.querySelector('#model') as HTMLDivElement;
    this.wireframe = this.container.querySelector('#wireframe') as HTMLDivElement;
    this.invert = this.container.querySelector('#invert') as HTMLDivElement;
    this.showPlane = this.container.querySelector('#showPlane') as HTMLDivElement;

    this.useBVH.onmousedown = () => {
      const act = !threeApp.clippingBvh.getUseBVH();
      threeApp.clippingBvh.setUseBVH(act);

      this.useBVH.style.background = act ? this.actBtnColor : this.deActBtnColor;
    };

    this.helperBVH.onmousedown = () => {
      const act = !threeApp.clippingBvh.getHelperBVH();
      threeApp.clippingBvh.setHelperBVH(act);

      this.helperBVH.style.background = act ? this.actBtnColor : this.deActBtnColor;
    };

    this.model.onmousedown = () => {
      const act = !threeApp.clippingBvh.getModel();
      threeApp.clippingBvh.setModel(act);

      this.model.style.background = act ? this.actBtnColor : this.deActBtnColor;
    };

    this.wireframe.onmousedown = () => {
      const act = !threeApp.clippingBvh.getWireframe();
      threeApp.clippingBvh.setWireframe(act);

      this.wireframe.style.background = act ? this.actBtnColor : this.deActBtnColor;
    };

    this.invert.onmousedown = () => {
      const act = !threeApp.clippingBvh.getInvertPlane();
      threeApp.clippingBvh.setInvertPlane(act);

      this.invert.style.background = act ? this.actBtnColor : this.deActBtnColor;
    };

    this.showPlane.onmousedown = () => {
      const act = !threeApp.clippingBvh.getShowPlane();
      threeApp.clippingBvh.setShowPlane(act);

      this.showPlane.style.background = act ? this.actBtnColor : this.deActBtnColor;
    };
  }

  private setStartColorBtns() {
    const state = ApiUiToThree.getStateClippingBvh();

    if (state) {
      this.useBVH.style.background = state.useBVH ? this.actBtnColor : this.deActBtnColor;
      this.helperBVH.style.background = state.helperBVH ? this.actBtnColor : this.deActBtnColor;
      this.model.style.background = state.model ? this.actBtnColor : this.deActBtnColor;
      this.wireframe.style.background = state.wireframe ? this.actBtnColor : this.deActBtnColor;
      this.showPlane.style.background = state.showPlane ? this.actBtnColor : this.deActBtnColor;
    }
  }

  public showSlider() {
    this.container.style.display = '';
  }

  public hideSlider() {
    this.container.style.display = 'none';
  }
}
