(function () {
'use strict';

if (!window.__vkifySimpleTooltips) {
    window.__vkifySimpleTooltips = {};
}

vkify.once('simpleTooltips', () => {

    function getOptimalPlacement(element) {
        const rect = element.getBoundingClientRect();
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        const space = {
            top: rect.top,
            bottom: viewportHeight - rect.bottom,
            left: rect.left,
            right: viewportWidth - rect.right,
        };

        let placement = 'top';

        if (space.bottom > space.top && space.bottom > 100) {
            placement = 'bottom';
        } else if (space.right > space.left && space.right > 100) {
            placement = 'right';
        } else if (space.left > space.right && space.left > 100) {
            placement = 'left';
        }

        if (rect.top < 50 && placement === 'top') {
            placement = 'bottom';
        }

        return placement;
    }

    function getPlacement(element) {
        const align = element.getAttribute('data-align');
        if (align === 'top-center') return 'top';
        if (align === 'bottom-center') return 'bottom';
        return align || getOptimalPlacement(element);
    }

    function getDelayMs(element) {
        const raw = element.getAttribute('data-delay');
        if (raw == null || raw === '') return 50;
        const seconds = parseFloat(raw);
        if (!Number.isFinite(seconds) || seconds < 0) return 50;
        return Math.round(seconds * 1000);
    }

    function getOffset(element) {
        const raw = element.getAttribute('data-tipoffset');
        if (!raw) return [2, 4];
        const parts = raw.split(',').map(p => parseFloat((p || '').trim()));
        if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return [2, 4];
        return [parts[0], parts[1]];
    }

    function getAppendTo(element) {
        const fs = document.fullscreenElement;
        return fs || document.body;
    }

    function getBoundary(element) {
        const explicit = element.closest('[data-tip-boundary]');
        if (explicit) return explicit;

        for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
            try {
                const cs = window.getComputedStyle(node);
                if (!cs) continue;
                const oy = cs.overflowY, ox = cs.overflowX;
                if ((oy && oy !== 'visible') || (ox && ox !== 'visible')) return node;
            } catch (e) { break; }
        }

        return null;
    }

    function getTheme(element) {
        const extra = element.getAttribute('data-tiptheme');
        return extra ? ('special vk small ' + extra) : 'special vk small';
    }

    function initializeSimpleTooltips(container = document) {
        const root = container && container.querySelectorAll ? container : document;
        const elements = root.querySelectorAll('[data-tip="simple-black"]');
        elements.forEach(element => {
            if (element._tippy || element.hasAttribute('aria-describedby') || element.dataset.vkifySimpleTipInit === '1') {
                return;
            }

            const title = element.getAttribute('data-tiptitle');
            if (!title || title.trim() === '') {
                return;
            }

            const placement = getPlacement(element);
            const delayMs = getDelayMs(element);
            const theme = getTheme(element);
            const offset = getOffset(element);
            const boundary = getBoundary(element);

            element.dataset.vkifySimpleTipInit = '1';
            tippy(element, {
                content: title,
                theme: theme,
                placement: placement,
                animation: 'fade',
                duration: [100, 100],
                delay: [delayMs, 0],
                offset: offset,
                appendTo: () => getAppendTo(element),
                popperOptions: {
                    strategy: 'fixed',
                    modifiers: boundary ? [
                        { name: 'preventOverflow', options: { boundary: boundary, padding: 4 } },
                    ] : [],
                },
            });
        });
    }

    window.__vkifySimpleTooltips.init = initializeSimpleTooltips;

    const bindObserverOnce = () => {
        if (window.__vkifySimpleTooltips.__observerBound) return;
        window.__vkifySimpleTooltips.__observerBound = true;

        vkify.observeDOM((mutations) => {
            let shouldReinit = false;
            for (const mutation of mutations) {
                if (shouldReinit) break;
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if ((node.hasAttribute && node.hasAttribute('data-tip')) ||
                            (node.querySelector && node.querySelector('[data-tip="simple-black"]'))) {
                            shouldReinit = true;
                            break;
                        }
                    }
                }
            }
            if (shouldReinit) initializeSimpleTooltips(document);
        }, {
            filter: m => m.type === 'childList' && m.addedNodes.length > 0
        });
    };

    vkify.hook(vkify, 'onPageReady', (container) => {
        bindObserverOnce();
        initializeSimpleTooltips(container || document);
    }, 'after');

    vkify.ready(() => {
        bindObserverOnce();
        initializeSimpleTooltips(document);
    });
});

})();
