(function () {
'use strict';

function moveTabSlider(container, tabAnchor, animate = true) {
    const slider = container?.querySelector('.ui_tabs_slider');
    if (!slider || !tabAnchor) return;

    tabAnchor.offsetHeight;

    const { offsetLeft, offsetWidth } = tabAnchor;

    if (animate) {
        container.classList.add('ui_tabs_sliding');
        slider.style.transform = `translateX(${offsetLeft}px)`;
        slider.style.width = `${offsetWidth}px`;
    } else {
        container.classList.remove('ui_tabs_sliding');
        slider.style.transform = `translateX(${offsetLeft}px)`;
        slider.style.width = `${offsetWidth}px`;
    }
}

window.__vkifyMoveTabSlider = moveTabSlider;

window.__vkifyInitTabSliderSafe = window.__vkifyInitTabSliderSafe || function () {
    const tabContainers = document.querySelectorAll('.ui_tabs');

    tabContainers.forEach(container => {
        if (container.dataset.vkifyTabSliderInit === '1') {
            return;
        }

        const slider = container.querySelector('.ui_tabs_slider');
        if (!slider) return;

        container.dataset.vkifyTabSliderInit = '1';

        if (!container._tabSliderState) {
            container._tabSliderState = {
                isAnimating: false,
                pendingTab: null,
                animationTimeout: null,
                transitionEndHandler: null
            };
        }

        const state = container._tabSliderState;

        function initSliderPosition() {
            const activeTab = container.querySelector('.ui_tab_sel');
            if (activeTab) {
                moveTabSlider(container, activeTab, false);
            }
        }

        function finishTabSwitch(targetTab) {
            if (!targetTab) return;

            if (state.animationTimeout) {
                clearTimeout(state.animationTimeout);
                state.animationTimeout = null;
            }

            const currentActive = container.querySelector('.ui_tab_sel');
            if (currentActive) {
                currentActive.classList.remove('ui_tab_sel');
            }
            targetTab.classList.add('ui_tab_sel');

            const href = targetTab.getAttribute('href');
            let handled = false;

            if (typeof window.__vkifyOnWallTabSwitch === 'function') {
                handled = window.__vkifyOnWallTabSwitch(targetTab) === true;
            }

            if (!handled && href) {
                const fullUrl = new URL(href, window.location.href).href;
                vkify.navigate(fullUrl);
            }

            state.isAnimating = false;
            state.pendingTab = null;

            setTimeout(() => {
                container.classList.remove('ui_tabs_sliding');
            }, 50);
        }

        container.addEventListener('click', function (e) {
            const clickedTab = e.target.closest('.ui_tab');
            if (!clickedTab || clickedTab.classList.contains('ui_tab_sel')) return;

            e.preventDefault();

            if (state.isAnimating) {
                state.pendingTab = clickedTab;
                moveTabSlider(container, clickedTab, true);
                return;
            }

            state.isAnimating = true;
            state.pendingTab = clickedTab;

            moveTabSlider(container, clickedTab, true);

            state.animationTimeout = setTimeout(() => {
                finishTabSwitch(state.pendingTab);
            }, 200);
        });

        slider.addEventListener('transitionend', function (e) {
            if (e.target === slider && state.isAnimating) {
                if (state.pendingTab) {
                    if (state.animationTimeout) {
                        clearTimeout(state.animationTimeout);
                        state.animationTimeout = null;
                    }

                    setTimeout(() => {
                        finishTabSwitch(state.pendingTab);
                    }, 50);
                }
            }
        });

        window.addEventListener('resize', () => {
            initSliderPosition();
        });

        initSliderPosition();
    });
};

if (window.initTabSlider !== window.__vkifyInitTabSliderSafe) {
    window.initTabSlider = window.__vkifyInitTabSliderSafe;
}

})();
