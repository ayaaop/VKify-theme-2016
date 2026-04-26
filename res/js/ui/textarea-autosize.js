(function () {
'use strict';

if (!window.vkifyTextareaAutosize) {
    window.vkifyTextareaAutosize = {};
}

if (window.vkifyTextareaAutosize.__initialized) return;
window.vkifyTextareaAutosize.__initialized = true;

const BOOST = 5;

function parseMaxHeight(el) {
    const cs = window.getComputedStyle(el);
    const max = cs.maxHeight;
    return max === 'none' ? Infinity : parseFloat(max);
}

function applyAutosize(el) {
    requestAnimationFrame(function () {
        el.style.height = 'auto';

        const required = el.scrollHeight;
        const max = parseMaxHeight(el);
        const needed = required + BOOST;

        if (max === Infinity) {
            el.style.height = needed + 'px';
            el.style.overflowY = 'hidden';
        } else {
            const finalH = Math.min(needed, max);
            el.style.height = finalH + 'px';
            el.style.overflowY = needed > max ? 'auto' : 'hidden';
        }
    });
}

function initAll(container) {
    const root = container && container.querySelectorAll ? container : document;
    root.querySelectorAll('textarea').forEach(function (ta) {
        applyAutosize(ta);
    });
}

window.vkifyTextareaAutosize.apply = applyAutosize;
window.vkifyTextareaAutosize.initAll = initAll;

const bindInputHandlerOnce = () => {
    if (window.vkifyTextareaAutosize.__inputBound) return;
    window.vkifyTextareaAutosize.__inputBound = true;

    document.addEventListener('input', function (e) {
        if (e.target && e.target.tagName === 'TEXTAREA') {
            applyAutosize(e.target);
        }
    });
};

vkify.hook(vkify, 'onPageReady', (container) => {
    bindInputHandlerOnce();
    initAll(container || document);
}, 'after');

vkify.ready(() => {
    bindInputHandlerOnce();
    initAll(document);
});

})();
