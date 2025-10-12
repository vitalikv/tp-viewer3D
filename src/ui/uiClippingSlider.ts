import { threeApp } from '../three/threeApp';

export class UiClippingSlider {
  private container: HTMLElement;

  public init(wrapContainer) {
    this.container = this.crDivSlider();
    wrapContainer.append(this.container);

    this.eventStop({ div: this.container });
    this.event();
  }

  private crDivSlider() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLElement;

    return div;
  }

  private html() {
    const controlsStyle = `position: absolute; right: 20px; bottom: 90px; width: 200px; background: rgba(0, 0, 0, 0.3); padding: 15px;`;
    const controlGroupStyle = `margin-bottom: 15px;`;
    const controlTitleStyle = `font-size: 1.1rem; margin-bottom: 10px; color: #fff;`;
    const sliderContainerStyle = `margin-bottom: 10px;`;
    const sliderLabelStyle = `display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 0.9rem; color: #fff;`;
    const sliderValueStyle = `font-weight: bold; background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 3px; font-size: 0.8rem; color: #fff;`;
    const sliderStyle = `-webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px; background: rgba(255, 255, 255, 0.2); outline: none;`;
    const buttonsStyle = `display: flex; gap: 8px; margin-top: 15px;`;
    const buttonStyle = `flex: 1; padding: 8px; border: none; border-radius: 4px; background: #4361ee; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 3px 5px rgba(0, 0, 0, 0.1); font-size: 0.9rem;`;

    const html = `<div class="controls" style="${controlsStyle}">
        <div class="control-group" style="${controlGroupStyle}">
            <h3 class="control-title" style="${controlTitleStyle}">Позиция плоскостей сечения</h3>
            
            <div class="slider-container" style="${sliderContainerStyle}">
                <div class="slider-label" style="${sliderLabelStyle}">
                    <span>Ось X:</span>
                    <span class="slider-value" style="${sliderValueStyle}" id="x-position-value">50</span>
                </div>
                <input type="range" min="0" max="100" value="50" class="slider" style="${sliderStyle}" id="x-position">
            </div>
            
            <div class="slider-container" style="${sliderContainerStyle}">
                <div class="slider-label" style="${sliderLabelStyle}">
                    <span>Ось Y:</span>
                    <span class="slider-value" style="${sliderValueStyle}" id="y-position-value">50</span>
                </div>
                <input type="range" min="0" max="100" value="50" class="slider" style="${sliderStyle}" id="y-position">
            </div>
            
            <div class="slider-container" style="${sliderContainerStyle}">
                <div class="slider-label" style="${sliderLabelStyle}">
                    <span>Ось Z:</span>
                    <span class="slider-value" style="${sliderValueStyle}" id="z-position-value">50</span>
                </div>
                <input type="range" min="0" max="100" value="50" class="slider" style="${sliderStyle}" id="z-position">
            </div>
        </div>
        
        <div class="control-group" style="${controlGroupStyle}">
            <h3 class="control-title" style="${controlTitleStyle}">Вращение плоскостей сечения</h3>
            
            <div class="slider-container" style="${sliderContainerStyle}">
                <div class="slider-label" style="${sliderLabelStyle}">
                    <span>Вращение X:</span>
                    <span class="slider-value" style="${sliderValueStyle}" id="x-rotation-value">0°</span>
                </div>
                <input type="range" min="0" max="360" value="0" class="slider" style="${sliderStyle}" id="x-rotation">
            </div>
            
            <div class="slider-container" style="${sliderContainerStyle}">
                <div class="slider-label" style="${sliderLabelStyle}">
                    <span>Вращение Y:</span>
                    <span class="slider-value" style="${sliderValueStyle}" id="y-rotation-value">0°</span>
                </div>
                <input type="range" min="0" max="360" value="0" class="slider" style="${sliderStyle}" id="y-rotation">
            </div>
            
            <div class="slider-container" style="${sliderContainerStyle}">
                <div class="slider-label" style="${sliderLabelStyle}">
                    <span>Вращение Z:</span>
                    <span class="slider-value" style="${sliderValueStyle}" id="z-rotation-value">0°</span>
                </div>
                <input type="range" min="0" max="360" value="0" class="slider" style="${sliderStyle}" id="z-rotation">
            </div>
        </div>
        
        <div class="buttons" style="${buttonsStyle}">
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

  private event() {
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

      threeApp.clippingBvh.setPlanePosition(x, y, z);
      threeApp.clippingBvh.setAnimationEnabled(false); // Отключаем анимацию при ручном управлении
    };

    const updatePlaneRotation = () => {
      if (!threeApp.clippingBvh) return;

      const x = parseInt(xRotationSlider.value);
      const y = parseInt(yRotationSlider.value);
      const z = parseInt(zRotationSlider.value);

      threeApp.clippingBvh.setPlaneRotation(x, y, z);
      threeApp.clippingBvh.setAnimationEnabled(false); // Отключаем анимацию при ручном управлении
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
        threeApp.clippingBvh.resetPlane();
      }
    });
  }
}
