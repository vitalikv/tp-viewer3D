export class UiPlayerAnimation {
  constructor(container: HTMLDivElement) {
    const div = this.crDiv();
    container.append(div);
    this.eventStop({ div });
  }

  private crDiv() {
    let div = document.createElement('div');
    div.innerHTML = this.html();
    div = div.children[0] as HTMLDivElement;

    return div;
  }

  private html() {
    const css1 = `position: absolute;
    bottom: 90px;
    right: 0;
    left: 0;
    background: #fff;
    border: 1px solid #222222;
    z-index: 99;`;

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
    border-radius: 50%;
    transition: transform .2s,background-color .2s;
    will-change: transform;`;
    const cssPlayerNavigations = `display: flex; gap: 20px;`;
    const cssPlayerMenu = `max-width: 40px; position: relative; display: inline-block;`;
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

    const html = `
    <div style="${css1}">
      <div id="wrap-player" style="${css2}">
        <div style="${cssPlayer}">
          <div style="${cssPlayerButton}">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 3.72316C4 2.95533 4.82948 2.47397 5.49614 2.85491L16.4806 9.13173C17.1524 9.51563 17.1524 10.4843 16.4806 10.8682L5.49614 17.145C4.82948 17.526 4 17.0446 4 16.2768V3.72316Z" fill="#797979"></path>
            </svg>
          </div>
          <div style="${cssPlayerTime}">00:00 / 00:20</div>
          <div id="player-time-line" style="${cssPlayerTimeLine}">
            <div style="${cssPlayerStep}"></div>
            <div style="transform: translateX(0px); ${cssPlayerCaret}"></div>
          </div>
          <div id="player-navigations" style="${cssPlayerNavigations}">
            <div style="${cssPlayerMenu}">
              <div style="${cssPlayerMenuBtn}">
                <div class="menu-icon">
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
          <div class="open" style="${cssSwitchingViewButton}">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M1.8 16.5293V8.35961L9.2 12.4707V20.6404L1.8 16.5293ZM12.8 20.6404V12.4707L20.2 8.35961V16.5293L12.8 20.6404ZM18.3527 5L11 9.08483L3.6473 5L11 0.915167L18.3527 5Z" stroke="#9B9B9B" stroke-width="1.6"></path>
            </svg>
          </div>
          <div class="close active" style="${cssSwitchingViewButton}">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M2 6V17L11 22L20 17V6L11 1L2 6ZM3.6 7.80406V16.0586L10.2 19.7252V11.4707L3.6 7.80406ZM11.8 11.4707V19.7252L18.4 16.0586V7.80406L11.8 11.4707ZM17.529 6.45758L11 2.83033L4.47095 6.45758L11 10.0848L17.529 6.45758Z" fill="#9B9B9B"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>`;

    return html;
  }

  private eventStop({ div }) {
    const arrEvent = ['onmousedown', 'onwheel', 'onmousewheel', 'onmousemove', 'ontouchstart', 'ontouchend', 'ontouchmove'];

    arrEvent.forEach((events) => {
      div[events] = (e) => {
        e.stopPropagation();
      };
    });
  }
}
