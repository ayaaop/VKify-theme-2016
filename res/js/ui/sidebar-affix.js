(function () {
'use strict';

vkify.once("updateNarrow", () => {
    window.updateNarrow = function () {
        const bar = document.querySelector('.narrow_column');
        const wideCol = document.querySelector('.wide_column');
        const layout = document.querySelector('.layout');

        if (!bar || !wideCol || !layout) return;
        if (document.querySelector('#ajloader.shown')) return;
        if (document.body.classList.contains('dimmed')) return;

        const doc = document.documentElement;
        const wh = Math.round(window.innerHeight || 0);
        const st = Math.round(Math.min(window.scrollY || 0, Math.max(0, doc.scrollHeight - wh)));

        const headH = 57;
        const isFixed = bar.classList.contains('fixed');
        const barH = Math.round(bar.offsetHeight);
        const pageH = Math.round(wideCol.offsetHeight);
        const pagePos = Math.round(wideCol.getBoundingClientRect().top + st);
        const tooBig = barH >= pageH;

        const barPB = Math.max(0, st + wh - pageH - pagePos);
        const barPos = Math.round(bar.getBoundingClientRect().top + st);

        const lastSt = window._lastSt || 0;
        const lastStyles = window._lastStyles || {};
        let styles = {};
        let needFix = false;

        const smallEnough = headH + barH + barPB <= wh;

        const scrollLeft = (document.body.scrollLeft || doc.scrollLeft || window.scrollX || 0);
        const layoutW = Math.round(layout.offsetWidth);
        const bodyW = Math.round(document.body.clientWidth);
        const marginLeft = Math.round(Math.min(-scrollLeft, Math.max(-scrollLeft, bodyW - layoutW)));

        const toPx = (value) => Math.round(value) + 'px';

        if ((st <= headH && !smallEnough) || tooBig) {
            styles = { marginTop: '0px' };
        } else if (st <= Math.min(lastSt, barPos - headH) || smallEnough) {
            styles = { top: toPx(headH), marginLeft: toPx(marginLeft) };
            needFix = true;
        } else if (st >= Math.max(lastSt, barPos + barH - wh) && !barPB) {
            styles = { bottom: '0px', marginLeft: toPx(marginLeft) };
            needFix = true;
        } else {
            const marginTopValue = barPB
                ? (pageH - barH)
                : Math.min(barPos - pagePos, pageH - barH + (pagePos - headH));
            styles = { marginTop: toPx(marginTopValue) };
        }

        const allKeys = ['top', 'bottom', 'marginTop', 'marginLeft'];
        const same = JSON.stringify(styles) === JSON.stringify(lastStyles);
        if (!same) {
            for (let i = 0; i < allKeys.length; i++) {
                bar.style[allKeys[i]] = styles[allKeys[i]] || '';
            }
            window._lastStyles = styles;
        }

        if (needFix !== isFixed) {
            bar.classList.toggle('fixed', needFix);
        }

        window._lastSt = st;
    };

    vkify.bindOnce("updateNarrowBound", () => {
        let scrollRafPending = false;
        const throttledScroll = () => {
            if (scrollRafPending) return;
            scrollRafPending = true;
            requestAnimationFrame(() => {
                window.updateNarrow();
                scrollRafPending = false;
            });
        };

        window.addEventListener('scroll', throttledScroll, { passive: true });
        window.addEventListener('resize', throttledScroll);

        vkify.hook(vkify, 'onPageReady', () => setTimeout(window.updateNarrow, 0), 'after');

        if (document.readyState === 'complete') {
            setTimeout(window.updateNarrow, 0);
        } else {
            window.addEventListener('load', () => setTimeout(window.updateNarrow, 0), { once: true });
        }
    });
});

vkify.once('affixedNavigation', () => {
    const HEAD_H = 57;
    const SCROLL_TOLERANCE = 4;

    let rafPending = false;
    let state = null;

    function getMenu() {
        return document.querySelector('.sidebar > .sidebar_inner');
    }

    function getPageBody() {
        return document.querySelector('.page_body');
    }

    function getScrollTop() {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        return Math.min(window.scrollY, maxScroll);
    }

    function getDocumentTop(el) {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
    }

    function setStyles(el, styles) {
        el.style.position = styles.position || '';
        el.style.top = styles.top != null ? styles.top + 'px' : '';
        el.style.width = styles.width != null ? styles.width + 'px' : '';
        el.style.marginTop = styles.marginTop != null ? styles.marginTop + 'px' : '';
    }

    function resetMenu(menu) {
        setStyles(menu, {
            position: 'relative',
            top: null,
            width: null,
            marginTop: null
        });
    }

    function affixMenu(menu, hiddenOffset) {
        setStyles(menu, {
            position: 'fixed',
            top: HEAD_H - hiddenOffset,
            width: state.anchor.offsetWidth,
            marginTop: null
        });
    }

    function updateLeftMenu() {
        const menu = getMenu();
        const pageBody = getPageBody();
        if (!menu || !pageBody || !state) {
            return;
        }

        if (menu.querySelector('#fastLogin')) {
            resetMenu(menu);
            return;
        }

        const scrollTop = getScrollTop();
        const menuHeight = menu.offsetHeight;
        const pageHeight = pageBody.offsetHeight;

        if (menuHeight >= pageHeight) {
            resetMenu(menu);
            state.lastScrollTop = scrollTop;
            state.hiddenOffset = 0;
            return;
        }

        const shouldAffix = scrollTop > state.initialTop - HEAD_H;
        const delta = scrollTop - state.lastScrollTop;
        const maxHiddenOffset = Math.max(0, menuHeight + HEAD_H);

        if (!shouldAffix) {
            resetMenu(menu);
            state.hiddenOffset = 0;
        } else {
            if (Math.abs(delta) >= SCROLL_TOLERANCE) {
                state.hiddenOffset = Math.max(0, Math.min(maxHiddenOffset, state.hiddenOffset + delta));
            }

            affixMenu(menu, state.hiddenOffset);
        }

        state.lastScrollTop = scrollTop;
    }

    function onScroll() {
        if (rafPending) {
            return;
        }

        rafPending = true;
        requestAnimationFrame(() => {
            updateLeftMenu();
            rafPending = false;
        });
    }

    function init() {
        const menu = getMenu();
        const anchor = menu ? menu.parentElement : null;
        if (!menu || !anchor) {
            state = null;
            return;
        }

        const scrollTop = getScrollTop();
        const previousState = state;
        const preserveOffset = previousState && previousState.anchor === anchor;
        const hiddenOffset = preserveOffset ? previousState.hiddenOffset : 0;
        const lastScrollTop = preserveOffset ? previousState.lastScrollTop : scrollTop;

        if (!preserveOffset) {
            resetMenu(menu);
        }

        state = {
            anchor: anchor,
            initialTop: getDocumentTop(anchor),
            hiddenOffset: hiddenOffset,
            lastScrollTop: lastScrollTop
        };

        updateLeftMenu();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', init);

    vkify.hook(vkify, 'onPageReady', () => setTimeout(init, 50), 'after');

    vkify.ready(() => {
        if (document.readyState === 'complete') {
            setTimeout(init, 0);
        } else {
            window.addEventListener('load', () => setTimeout(init, 0), { once: true });
        }
    });
});

})();
