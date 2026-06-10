(function () {
'use strict';

function shouldSkipChoiceLabel(label) {
    if (!(label instanceof HTMLLabelElement)) return true;
    if (label.dataset.vkifyChoiceLabel) return true;
    if (label.classList.contains('field') || label.classList.contains('button')) return true;
    if (label.classList.contains('entity_vertical_list_item')) return true;
    if (label.closest('.page_module_upload')) return true;
    if (label.querySelector('input[type="file"]')) return true;
    if (label.hasAttribute('for') && !label.querySelector(':scope > input[type="checkbox"], :scope > input[type="radio"]')) {
        return true;
    }
    return false;
}

function isChoiceLabelNormalized(label, input) {
    const span = label.querySelector(':scope > span');
    if (!span) return false;
    const nonInputChildren = [...label.children].filter((el) => el !== input);
    return nonInputChildren.length === 1 && nonInputChildren[0] === span;
}

function hasChoiceLabelContent(nodes) {
    return nodes.some((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) return true;
        return node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0;
    });
}

function normalizeChoiceLabel(label) {
    if (shouldSkipChoiceLabel(label)) return false;

    const input = label.querySelector(':scope > input[type="checkbox"], :scope > input[type="radio"]');
    if (!input || input.parentElement !== label) return false;

    label.classList.add(input.type === 'checkbox' ? 'checkbox' : 'radio');

    if (label.style.display === 'block') {
        label.style.removeProperty('display');
    }

    if (isChoiceLabelNormalized(label, input)) {
        label.dataset.vkifyChoiceLabel = '1';
        return false;
    }

    const nodesToWrap = [];
    let node = input.nextSibling;
    while (node) {
        nodesToWrap.push(node);
        node = node.nextSibling;
    }

    if (!hasChoiceLabelContent(nodesToWrap)) return false;

    const span = document.createElement('span');
    for (const child of nodesToWrap) {
        span.appendChild(child);
    }

    while (span.firstChild?.nodeType === Node.TEXT_NODE && !span.firstChild.textContent.trim()) {
        span.removeChild(span.firstChild);
    }

    label.appendChild(span);
    label.dataset.vkifyChoiceLabel = '1';
    return true;
}

function normalizeChoiceLabels(root) {
    if (!(root instanceof Element)) return;
    if (root.matches('label')) normalizeChoiceLabel(root);
    root.querySelectorAll('label').forEach(normalizeChoiceLabel);
}

function subtreeNeedsChoiceLabels(node) {
    if (!(node instanceof Element)) return false;
    if (node.matches('label, .ovk-diag-body, .ovk-diag-cont, [id^="poll_editor"]')) {
        return true;
    }
    return !!node.querySelector('label, .ovk-diag-body, [id^="poll_editor"]');
}

vkify.bindOnce('choiceLabels', () => {
    vkify.observeDOM((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!subtreeNeedsChoiceLabels(node)) continue;
                normalizeChoiceLabels(node);
            }
        }
    });

    if (typeof initPoll === 'function') {
        vkify.hook(window, 'initPoll', () => {
            const editor = document.querySelector('[id^="poll_editor"]');
            if (editor) normalizeChoiceLabels(editor);
        }, 'then');
    }
});

})();
