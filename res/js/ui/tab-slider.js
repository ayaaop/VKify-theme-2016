(function () {
'use strict';

function findHorizontalScroller(element) {
    let el = element;
    while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return el;
        }
        el = el.parentElement;
    }
    return null;
}

function scrollActiveTabIntoView(container, tabAnchor, animate = true) {
    const scroller = findHorizontalScroller(container);
    if (!scroller || !tabAnchor) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const tabRect = tabAnchor.getBoundingClientRect();
    const scrollerStyle = window.getComputedStyle(scroller);
    const borderLeft = parseFloat(scrollerStyle.borderLeftWidth) || 0;
    const paddingLeft = parseFloat(scrollerStyle.paddingLeft) || 0;

    const contentLeft = scrollerRect.left + borderLeft + paddingLeft;
    const tabLeft = tabRect.left - contentLeft;
    const tabRight = tabLeft + tabRect.width;
    const visibleLeft = scroller.scrollLeft;
    const visibleRight = visibleLeft + scroller.clientWidth;

    let targetScroll = scroller.scrollLeft;
    if (tabRight > visibleRight) {
        targetScroll = tabRight - scroller.clientWidth;
    } else if (tabLeft < visibleLeft) {
        targetScroll = tabLeft;
    } else {
        return;
    }

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    scroller.scrollTo({
        left: Math.max(0, Math.min(targetScroll, maxScroll)),
        behavior: animate ? 'smooth' : 'auto'
    });
}

function moveTabSlider(container, tabAnchor, animate = true) {
    const slider = container?.querySelector('.ui_tabs_slider');
    if (!slider || !tabAnchor) return;

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

    scrollActiveTabIntoView(container, tabAnchor, animate);
}

window.__vkifyMoveTabSlider = moveTabSlider;

function repositionInitializedTabSliders() {
    document.querySelectorAll('.ui_tabs[data-vkify-tab-slider-init="1"]').forEach(container => {
        const activeTab = container.querySelector('.ui_tab_sel');
        if (activeTab) {
            moveTabSlider(container, activeTab, false);
        }
    });
}

if (!window.__vkifyTabSliderResizeBound) {
    window.__vkifyTabSliderResizeBound = true;
    let resizeRafPending = false;
    window.addEventListener('resize', () => {
        if (resizeRafPending) return;
        resizeRafPending = true;
        requestAnimationFrame(() => {
            resizeRafPending = false;
            repositionInitializedTabSliders();
        });
    });
}

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

            if (!handled && href && !href.startsWith('#')) {
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

        initSliderPosition();
    });
};

if (window.initTabSlider !== window.__vkifyInitTabSliderSafe) {
    window.initTabSlider = window.__vkifyInitTabSliderSafe;
}

function getTabScrollKey(el, index) {
    return el.id || `__vkify_tab_${index}`;
}

window.__vkifyCaptureTabScrolls = function (container) {
    const scrolls = {};
    if (!container) return scrolls;

    container.querySelectorAll('.ui_tabs').forEach((el, i) => {
        scrolls[getTabScrollKey(el, i)] = el.scrollLeft;
    });

    return scrolls;
};

window.__vkifyRestoreTabScrolls = function (container, scrolls) {
    if (!container || !scrolls) return;

    container.querySelectorAll('.ui_tabs').forEach((el, i) => {
        const key = getTabScrollKey(el, i);
        if (key in scrolls) {
            el.scrollLeft = scrolls[key];
        }
    });
};

})();
