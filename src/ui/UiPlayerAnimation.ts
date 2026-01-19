import * as THREE from 'three';
import { ApiUiToThree } from '@/api/apiLocal/ApiUiToThree';
import { ContextSingleton } from '@/core/ContextSingleton';

export class UiPlayerAnimation extends ContextSingleton<UiPlayerAnimation> {
  private divWrap: HTMLDivElement;
  private btnPlay: HTMLDivElement;
  private btnPause: HTMLDivElement;
  private playerTime: HTMLDivElement;
  private playerCaret: HTMLDivElement;
  private playerTimeLine: HTMLDivElement;
  private playerMenu: HTMLDivElement;
  private playerStep: HTMLDivElement;
  private isDragging: boolean = false;

  public init(container: HTMLDivElement) {
    this.divWrap = this.crDiv();
    container.append(this.divWrap);

    //this.eventStop({ div: this.divWrap });
    this.eventPlayer();
  }

  private crDiv() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const css1 = `position: absolute;
    bottom: 0px;
    right: 0;
    left: 0;
    background: #fff;
    border: 1px solid #222222;`;

    const css2 = `padding: 15px; box-sizing: border-box;`;
    const cssPlayer = `position: relative;
    display: grid;
    grid-template-columns: 20px minmax(83px,min-content) 1fr auto;
    gap: 15px;
    align-items: center;`;
    const cssPlayerButton = `cursor: pointer;
    height: 20px;
    display: flex;
    align-items: center;
    border-radius: 5px;`;
    const cssPlayerTime = `color: #484848;
    font-family: sans-serif;
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    line-height: 15px;`;
    const cssPlayerTimeLine = `position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    gap: 10px;`;
    const cssPlayerStep = `width: 100%;
    height: 2px;
    border-radius: 10px;
    background-color: #d8d8d8;
    cursor: pointer;`;
    const cssPlayerCaret = `position: absolute;
    top: -6px;
    left: -7px;
    width: 14px;
    height: 14px;
    background-color: #9fc8ff;
    cursor: pointer;
    border-radius: 50%;`;
    const cssPlayerNavigations = `display: flex; gap: 20px;`;
    const cssPlayerWrapMenuBtn = `max-width: 40px; position: relative; display: inline-block;`;
    const cssPlayerMenuBtn = `background: none;
    border: none;
    cursor: pointer;
    display: flex;
    gap: 10px;
    justify-content: start;
    align-items: center;
    width: max-content;`;
    const cssSwitchingView = `position: absolute;
    top: -15px;
    left: 15px;
    transform: translateY(-100%);
    display: flex;
    border-radius: 10px;
    background: #fff;`;
    const cssSwitchingViewButton = `background: #f0f0f0;
    width: 50%;
    padding: 9px 14px;
    cursor: pointer;`;
    const cssPlayerMenu = `position: absolute;
    top: -15px;
    right: 15px;
    transform: translateY(-100%);
    display: none;
    min-width: 200px;
    min-height: 100px;
    background: #fff;
    border: 1px solid #222222;
    z-index: 1;`;

    const html = `
    <div style="${css1}">
      <div id="wrap-player" style="${css2}">
        <div style="${cssPlayer}">
          <div style="${cssPlayerButton}">
            <div nameId="playerButton" style="display: block;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 3.72316C4 2.95533 4.82948 2.47397 5.49614 2.85491L16.4806 9.13173C17.1524 9.51563 17.1524 10.4843 16.4806 10.8682L5.49614 17.145C4.82948 17.526 4 17.0446 4 16.2768V3.72316Z" fill="#797979"></path>
              </svg>
            </div>
            <div nameId="playerPause" style="display: none;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 5C4 4.44772 4.44772 4 5 4H8C8.55228 4 9 4.44772 9 5V15C9 15.5523 8.55228 16 8 16H5C4.44772 16 4 15.5523 4 15V5Z" fill="#797979"></path>
                <path d="M11 5C11 4.44772 11.4477 4 12 4H15C15.5523 4 16 4.44772 16 5V15C16 15.5523 15.5523 16 15 16H12C11.4477 16 11 15.5523 11 15V5Z" fill="#797979"></path>
              </svg>
            </div>
          </div>
          <div nameId="playerTime" style="${cssPlayerTime}">0.00 / 0.00</div>
          <div id="player-time-line" style="${cssPlayerTimeLine}">
            <div style="${cssPlayerStep}"></div>
            <div nameId="playerCaret" style="transform: translateX(0px); ${cssPlayerCaret}"></div>
          </div>
          <div id="player-navigations" style="${cssPlayerNavigations}">
            <div style="${cssPlayerWrapMenuBtn}">
              <div nameId="btnPlayerMenu" style="${cssPlayerMenuBtn}">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect width="20" height="20" fill="white"></rect>
                    <path d="M2 5H18" stroke="#797979" stroke-width="2" stroke-linejoin="bevel"></path>
                    <path d="M2 10H18" stroke="#797979" stroke-width="2" stroke-linejoin="bevel"></path>
                    <path d="M2 15H18" stroke="#797979" stroke-width="2" stroke-linejoin="bevel"></path>
                  </svg>
                </div>
                <div class="arrow-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M4.24744 7.6585L0.747437 3.6585L2.25259 2.34149L5.00001 5.4814L7.74744 2.34149L9.25259 3.6585L5.75259 7.6585H4.24744Z" fill="#A1A1A1"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style="${cssSwitchingView}">
          <div nameId="animationPosStart" style="${cssSwitchingViewButton}">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M2 6V17L11 22L20 17V6L11 1L2 6ZM3.6 7.80406V16.0586L10.2 19.7252V11.4707L3.6 7.80406ZM11.8 11.4707V19.7252L18.4 16.0586V7.80406L11.8 11.4707ZM17.529 6.45758L11 2.83033L4.47095 6.45758L11 10.0848L17.529 6.45758Z" fill="#9B9B9B"></path>
            </svg>
          </div>
          <div nameId="animationPosEnd" style="${cssSwitchingViewButton}">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M1.8 16.5293V8.35961L9.2 12.4707V20.6404L1.8 16.5293ZM12.8 20.6404V12.4707L20.2 8.35961V16.5293L12.8 20.6404ZM18.3527 5L11 9.08483L3.6473 5L11 0.915167L18.3527 5Z" stroke="#9B9B9B" stroke-width="1.6"></path>
            </svg>
          </div>          
        </div>
        <div nameId="playerMenu" style="${cssPlayerMenu}">
        </div>
      </div>
    </div>`;

    return html;
  }

  private eventStop({ div }) {
    const arrEvent = [
      'onmousedown',
      'onwheel',
      'onmousewheel',
      'onmousemove',
      'ontouchstart',
      'ontouchend',
      'ontouchmove',
    ];

    arrEvent.forEach((events) => {
      div[events] = (e) => {
        e.stopPropagation();
      };
    });
  }

  private eventPlayer() {
    this.playerTime = this.divWrap.querySelector('[nameId="playerTime"]') as HTMLDivElement;
    this.btnPlay = this.divWrap.querySelector('[nameId="playerButton"]') as HTMLDivElement;
    this.btnPause = this.divWrap.querySelector('[nameId="playerPause"]') as HTMLDivElement;
    this.playerCaret = this.divWrap.querySelector('[nameId="playerCaret"]') as HTMLDivElement;
    this.playerTimeLine = this.divWrap.querySelector('#player-time-line') as HTMLDivElement;
    this.playerMenu = this.divWrap.querySelector('[nameId="playerMenu"]') as HTMLDivElement;
    this.playerStep = this.playerTimeLine.querySelector('div') as HTMLDivElement;
    const btnPlayerMenu = this.divWrap.querySelector('[nameId="btnPlayerMenu"]') as HTMLDivElement;
    const animationPosStart = this.divWrap.querySelector('[nameId="animationPosStart"]') as HTMLDivElement;
    const animationPosEnd = this.divWrap.querySelector('[nameId="animationPosEnd"]') as HTMLDivElement;

    this.btnPlay.onmousedown = () => {
      if (!ApiUiToThree.inst().hasAnimations()) {
        return;
      }
      this.updateBtnPlay(true);
      ApiUiToThree.inst().playAnimation();
    };

    this.btnPause.onmousedown = () => {
      this.updateBtnPlay(false);
      ApiUiToThree.inst().pauseAnimation();
    };

    btnPlayerMenu.onmousedown = () => {
      this.playerMenu.style.display = this.playerMenu.style.display === 'none' ? 'flex' : 'none';
    };

    animationPosStart.onmousedown = () => {
      ApiUiToThree.inst().setAnimationPosStart();
    };

    animationPosEnd.onmousedown = () => {
      ApiUiToThree.inst().setAnimationPosEnd();
    };

    this.setupCaretDrag();
    this.setupTimelineClick();
  }

  private setupCaretDrag() {
    if (!this.playerCaret || !this.playerTimeLine) {
      return;
    }

    let dragOffset = 0;

    const updateCaretPosition = (clientX: number, useOffset: boolean = false) => {
      if (!ApiUiToThree.inst().hasAnimations()) {
        return;
      }

      const rect = this.playerTimeLine.getBoundingClientRect();
      const x = clientX - rect.left;
      const lineWidth = this.playerTimeLine.clientWidth;
      const caretWidth = this.playerCaret.offsetWidth;
      const maxTranslate = Math.max(0, lineWidth - caretWidth);

      let targetX = x;
      if (useOffset) {
        targetX = x - dragOffset;
      } else {
        targetX = x - caretWidth / 2;
      }

      const clampedX = Math.max(0, Math.min(targetX, lineWidth));
      const translateX = Math.max(0, Math.min(clampedX, maxTranslate));
      const percent = maxTranslate > 0 ? (translateX / maxTranslate) * 100 : 0;

      this.playerCaret.style.transform = `translateX(${translateX}px)`;

      const maxDuration = ApiUiToThree.inst().getAnimationMaxDuration();
      if (maxDuration > 0) {
        const time = (percent / 100) * maxDuration;
        ApiUiToThree.inst().setAnimationTime(time);
        this.updateBtnPlay(false);
      }
    };

    let onMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    let onMouseUpHandler: (() => void) | null = null;

    onMouseMoveHandler = (e: MouseEvent) => {
      if (!this.isDragging) {
        return;
      }
      updateCaretPosition(e.clientX, true);
    };

    onMouseUpHandler = () => {
      this.isDragging = false;
      dragOffset = 0;

      // Пересчитываем BVH после окончания перетаскивания
      if (ApiUiToThree.inst().hasAnimations()) {
        ApiUiToThree.inst().rebuildAnimationBVH();
      }

      if (onMouseMoveHandler) {
        window.removeEventListener('mousemove', onMouseMoveHandler);
      }
      if (onMouseUpHandler) {
        window.removeEventListener('mouseup', onMouseUpHandler);
      }
    };

    const startDrag = (e: MouseEvent) => {
      if (!ApiUiToThree.inst().hasAnimations()) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const caretRect = this.playerCaret.getBoundingClientRect();
      const caretCenterX = caretRect.left + caretRect.width / 2;
      dragOffset = e.clientX - caretCenterX;

      this.isDragging = true;
      updateCaretPosition(e.clientX, true);
      if (onMouseMoveHandler) {
        window.addEventListener('mousemove', onMouseMoveHandler);
      }
      if (onMouseUpHandler) {
        window.addEventListener('mouseup', onMouseUpHandler);
      }
    };

    this.playerCaret.addEventListener('mousedown', startDrag);
    this.playerCaret.style.userSelect = 'none';
    this.playerCaret.style.pointerEvents = 'auto';
  }

  private setupTimelineClick() {
    this.playerStep.onmousedown = (e) => {
      if (!ApiUiToThree.inst().hasAnimations()) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const rect = this.playerTimeLine.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const lineWidth = this.playerTimeLine.clientWidth;
      const caretWidth = this.playerCaret.offsetWidth;
      const maxTranslate = Math.max(0, lineWidth - caretWidth);
      const clampedX = Math.max(0, Math.min(x, lineWidth));
      const translateX = Math.max(0, Math.min(clampedX - caretWidth / 2, maxTranslate));
      const percent = maxTranslate > 0 ? (translateX / maxTranslate) * 100 : 0;

      this.playerCaret.style.transform = `translateX(${translateX}px)`;

      const maxDuration = ApiUiToThree.inst().getAnimationMaxDuration();
      if (maxDuration > 0) {
        const time = (percent / 100) * maxDuration;
        ApiUiToThree.inst().setAnimationTime(time);
        this.updateBtnPlay(false);
      }
    };
  }

  public updateBtnPlay(isPlaying: boolean) {
    if (isPlaying) {
      this.btnPlay.style.display = 'none';
      this.btnPause.style.display = 'block';
    } else {
      this.btnPlay.style.display = 'block';
      this.btnPause.style.display = 'none';
    }
  }

  public updatePlayerTime(time: number, maxTime: number) {
    this.playerTime.innerHTML = `${time.toFixed(2)} / ${maxTime.toFixed(2)}`;
  }

  public updatePlayerCaret(percent: number, isPlaying: boolean) {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    const lineWidth = this.playerTimeLine?.clientWidth ?? 0;
    const caretWidth = this.playerCaret?.offsetWidth ?? 0;
    const maxTranslate = Math.max(0, lineWidth - caretWidth);
    const translateX = (clampedPercent / 100) * maxTranslate;
    this.playerCaret.style.transform = `translateX(${translateX}px)`;
    if (isPlaying) {
      this.playerCaret.style.backgroundColor = '#ff0000';
    } else {
      this.playerCaret.style.backgroundColor = '#9fc8ff';
    }
  }

  public updatePlayerMenu(animations: THREE.AnimationClip[]) {
    let html =
      '<div style="display: flex; flex-direction: column; gap: 10px; margin: auto; padding: 20px; font-size: 12px;">';
    const cssCheckbox = `width: 16px; height: 16px; border: 1px solid #666; display: flex; align-items: center; justify-content: center;`;
    const cssAnimationItem = `display: flex; align-items: center; gap: 10px; padding: 3px 0px; cursor: pointer; transition: all 0.2s;`;
    const divCheckBoxSelected = '<div style="width: 8px; height: 8px; background: #666;"></div>';

    for (let i = 0; i < animations.length; i++) {
      const selected = i === 0 ? 'selected' : '';
      const animationName = animations[i].name;

      html += `
      <div nameId="animationItem" animationName="${animationName}" animationIndex="${i}" style="${cssAnimationItem}">
        <div nameId="checkbox" style="${cssCheckbox}">
          ${selected ? divCheckBoxSelected : ''}
        </div>
        <label style="cursor: pointer; user-select: none;">${animationName}</label>
      </div>
      `;
    }

    html += '</div>';
    this.playerMenu.innerHTML = html;
    this.eventPlayerMenu(divCheckBoxSelected);
  }

  private eventPlayerMenu(divCheckBoxSelected: string) {
    const items = Array.from(this.playerMenu.querySelectorAll<HTMLDivElement>('[nameId="animationItem"]'));

    const clearSelection = () => {
      items.forEach((item) => {
        item.setAttribute('nameId', 'animationItem');
        const checkbox = item.querySelector('[nameId="checkbox"]') as HTMLDivElement;
        checkbox.innerHTML = '';
      });
    };

    items.forEach((item) => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (item.getAttribute('nameId') === 'animationItem: selected') {
          return;
        }

        clearSelection();

        item.setAttribute('nameId', 'animationItem: selected');
        const checkbox = item.querySelector('[nameId="checkbox"]') as HTMLDivElement;
        checkbox.innerHTML = divCheckBoxSelected;

        const animationIndex = item.getAttribute('animationIndex');
        ApiUiToThree.inst().setAnimationIndex(Number(animationIndex));
      };
    });
  }
}
