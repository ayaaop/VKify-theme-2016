/**
 * Simple System for Declarative Tooltips using Tippy.js
 * Tooltip content must be an element with a unique ID that is referenced
 * by the trigger element's 'data-tippy-content-id' attribute.
 */

const defaultTippyConfig = {
    theme: 'light vk',
    placement: 'bottom',
    trigger: 'mouseenter focus',
    interactive: true,
    interactiveBorder: 8,
    appendTo: 'parent',
    animation: 'up_down',
    duration: [100, 100],
    offset: [0, 8],
    allowHTML: true
};

const TIPPY_PRESETS = {};

function hasTippyInstance(element) {
    return element && (element._tippy || element.hasAttribute('aria-describedby'));
}

function escapeCssId(id) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(id);
    }
    return String(id).replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, (ch) => `\\${ch}`);
}

function pickClosestTemplate(triggerElement, templates) {
    const list = Array.from(templates || []).filter((el) => el && !el.contains(triggerElement));
    if (!list.length) {
        return null;
    }

    const following = list.filter((el) => {
        const pos = triggerElement.compareDocumentPosition(el);
        return (pos & Node.DOCUMENT_POSITION_FOLLOWING) === Node.DOCUMENT_POSITION_FOLLOWING;
    });
    if (following.length) {
        return following[0];
    }

    return list[list.length - 1];
}

function cloneTooltipContent(triggerElement, contentId) {
    const escapedId = escapeCssId(contentId);

    let templateElement = null;
    for (let scope = triggerElement?.parentElement; scope; scope = scope.parentElement) {
        const matches = scope.querySelectorAll(`#${escapedId}`);
        templateElement = pickClosestTemplate(triggerElement, matches);
        if (templateElement) {
            break;
        }
    }

    if (!templateElement) {
        const matches = document.querySelectorAll(`#${escapedId}`);
        templateElement = pickClosestTemplate(triggerElement, matches);
    }

    if (!templateElement) {
        return null;
    }

    const clonedContent = templateElement.cloneNode(true);
    if (clonedContent.style.display === 'none') {
        clonedContent.style.display = '';
    }
    clonedContent.removeAttribute('id');

    return clonedContent;
}

const templateRegistry = new Map();

function findTemplateNode(triggerElement, contentId) {
    const escapedId = escapeCssId(contentId);

    let templateElement = null;
    for (let scope = triggerElement?.parentElement; scope; scope = scope.parentElement) {
        const matches = scope.querySelectorAll(`#${escapedId}`);
        templateElement = pickClosestTemplate(triggerElement, matches);
        if (templateElement) {
            break;
        }
    }

    if (!templateElement) {
        const matches = document.querySelectorAll(`#${escapedId}`);
        templateElement = pickClosestTemplate(triggerElement, matches);
    }

    return templateElement || null;
}

function takeTemplateNode(triggerElement, contentId) {
    const templateElement = findTemplateNode(triggerElement, contentId);
    if (!templateElement) {
        return null;
    }

    const info = templateRegistry.get(templateElement);
    if (info?.inUse) {
        return null;
    }

    const record = {
        parent: templateElement.parentNode,
        nextSibling: templateElement.nextSibling,
        originalId: templateElement.getAttribute('id'),
        inUse: true
    };

    if (templateElement.parentNode) {
        templateElement.parentNode.removeChild(templateElement);
    }

    templateRegistry.set(templateElement, record);
    return templateElement;
}

function restoreTemplateNode(templateElement) {
    if (!templateElement) {
        return;
    }
    const info = templateRegistry.get(templateElement);
    if (!info || !info.parent) {
        return;
    }

    if (templateElement.parentNode) {
        templateElement.parentNode.removeChild(templateElement);
    }

    if (info.originalId) {
        templateElement.id = info.originalId;
    } else {
        templateElement.removeAttribute('id');
    }

    if (info.nextSibling && info.nextSibling.parentNode === info.parent) {
        info.parent.insertBefore(templateElement, info.nextSibling);
    } else {
        info.parent.appendChild(templateElement);
    }

    info.inUse = false;
    templateRegistry.set(templateElement, info);
}

function initializeTooltip(triggerElement) {
    if (!triggerElement || hasTippyInstance(triggerElement)) {
        return false;
    }
    
    const contentId = triggerElement.getAttribute('data-tippy-content-id');
    if (!contentId) {
        return false;
    }
    
    const movedContent = takeTemplateNode(triggerElement, contentId);
    const clonedContent = movedContent || cloneTooltipContent(triggerElement, contentId);
    if (!clonedContent) {
        console.error(`[Tooltips] Content template not found for ID: ${contentId}`);
        return false;
    }
    
    const presetName = triggerElement.getAttribute('data-tippy-preset');
    const presetConfig = presetName && TIPPY_PRESETS[presetName] ? TIPPY_PRESETS[presetName] : {};

    const placement = triggerElement.getAttribute('data-tippy-placement') || presetConfig.placement || defaultTippyConfig.placement;
    
    try {
        const config = {
            ...defaultTippyConfig,
            ...presetConfig,
            placement,
            content: clonedContent,
            onShow(instance) {
                triggerElement.setAttribute('aria-expanded', 'true');
                defaultTippyConfig.onShow?.(instance);
            },
            onHide(instance) {
                triggerElement.setAttribute('aria-expanded', 'false');
                defaultTippyConfig.onHide?.(instance);
            },
            onDestroy() {
                if (movedContent) {
                    restoreTemplateNode(movedContent);
                }
                defaultTippyConfig.onDestroy?.();
            }
        };

        tippy(triggerElement, config);
        return true;
    } catch (error) {
        console.error('[Tooltips] Error creating Tippy instance:', error);
        return false;
    }
}

function discoverTooltips(container = document) {
    if (!container?.querySelectorAll) return 0;
    
    let triggers;
    try {
        triggers = container.querySelectorAll('[data-tippy-content-id]');
    } catch (error) {
        console.error('[Tooltips] Error querying tooltips:', error);
        return 0;
    }
    
    if (!triggers?.length) return 0;
    
    let successCount = 0;
    triggers.forEach(trigger => {
        if (initializeTooltip(trigger)) successCount++;
    });
    
    return successCount;
}

function destroyTooltips(container = document) {
    if (!container?.querySelectorAll) return 0;
    
    let triggers;
    try {
        triggers = container.querySelectorAll('[data-tippy-content-id]');
    } catch (error) {
        console.error('[Tooltips] Error querying tooltips for destruction:', error);
        return 0;
    }
    
    let destroyCount = 0;
    
    triggers.forEach(trigger => {
        if (trigger._tippy) {
            try {
                trigger._tippy.destroy();
                destroyCount++;
            } catch (error) {
                console.error('[Tooltips] Error destroying tooltip:', error);
            }
        }
    });
    
    return destroyCount;
}

function reinitializeTooltips(container = document) {
    if (!container) return 0;
    
    try {
        destroyTooltips(container);
        return discoverTooltips(container);
    } catch (error) {
        console.error('[Tooltips] Error reinitializing tooltips:', error);
        return discoverTooltips(container); 
    }
}

function setupTooltips() {
    return discoverTooltips(document);
}

function cleanupTooltips(container = document) {
    return destroyTooltips(container);
}

window.Tooltips = {
    initializeTooltip,
    discoverTooltips,
    destroyTooltips,
    reinitializeTooltips,
    setupTooltips,
    cleanupTooltips
};

// Backward-compatible helper used by router patches (ported from old tippys.js)
window.initializeTippys = function initializeTippys() {
    const userMenuTrigger = ge('userMenuTrigger');
    if (userMenuTrigger?._tippy) {
        const tippyInstance = userMenuTrigger._tippy;
        const { onShow: originalOnShow, onHide: originalOnHide } = tippyInstance.props;

        tippyInstance.setProps({
            onShow: (instance) => {
                originalOnShow?.(instance);
                instance.reference.classList.add('shown');
            },
            onHide: (instance) => {
                originalOnHide?.(instance);
                instance.reference.classList.remove('shown');
            }
        });
    }
};

function setupTooltipObserver() {
    return vkify.observeDOM((mutations) => {
        let shouldDiscoverTooltips = false;

        for (const mutation of mutations) {
            if (shouldDiscoverTooltips) break;
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.hasAttribute?.('data-tippy-content-id') || 
                        node.querySelector?.('[data-tippy-content-id]')) {
                        shouldDiscoverTooltips = true;
                        break;
                    }
                }
            }
        }

        if (shouldDiscoverTooltips) {
            if (window._tooltipDiscoveryTimeout) {
                clearTimeout(window._tooltipDiscoveryTimeout);
            }
            window._tooltipDiscoveryTimeout = setTimeout(() => {
                discoverTooltips(document);
            }, 100);
        }
    }, {
        filter: m => m.addedNodes.length > 0
    });
}

const dismissablePopupInstances = new Map();
const dismissableShownThisSession = new Set();
const POPUP_COOKIE_PREFIX = 'vkify_popup_';
const POPUP_LOCAL_PREFIX = 'vkify_popup_shown_';

function isPopupDismissed(id) {
    return vkify.getCookie(POPUP_COOKIE_PREFIX + id) === '1';
}

function setPopupDismissed(id, days) {
    vkify.setCookie(POPUP_COOKIE_PREFIX + id, '1', days || 365);
}

function clearPopupDismissed(id) {
    vkify.setCookie(POPUP_COOKIE_PREFIX + id, '', -1);
}

function isPopupShownThisSession(id) {
    return dismissableShownThisSession.has(id) || localStorage.getItem(POPUP_LOCAL_PREFIX + id) === '1';
}

function markPopupShownThisSession(id) {
    dismissableShownThisSession.add(id);
    try { localStorage.setItem(POPUP_LOCAL_PREFIX + id, '1'); } catch (e) {}
}

function clearPopupSessionState(id) {
    dismissableShownThisSession.delete(id);
    try { localStorage.removeItem(POPUP_LOCAL_PREFIX + id); } catch (e) {}
}

function createDismissablePopup(options) {
    const {
        trigger,
        content,
        id,
        placement = 'bottom-end',
        theme = 'light vk dismissable',
        offset = [0, 8],
        closeSelector = '.popup-close',
        persistDismiss = false,
        persistDays = 365,
        autoShow = true,
        hideOnTriggerClick = true,
        onShow = null,
        onHide = null,
        onDismiss = null
    } = options;

    if (!trigger || !content) {
        console.warn('[DismissablePopup] trigger and content required');
        return null;
    }

    const triggerEl = typeof trigger === 'string' ? ge(trigger) : trigger;
    if (!triggerEl) {
        console.warn('[DismissablePopup] trigger element not found');
        return null;
    }

    let contentEl;
    if (typeof content === 'string') {
        const template = ge(content);
        if (template) {
            contentEl = template.cloneNode(true);
            contentEl.style.display = '';
            contentEl.removeAttribute('id');
        } else {
            const div = document.createElement('div');
            div.innerHTML = content;
            contentEl = div;
        }
    } else {
        contentEl = content.cloneNode(true);
        contentEl.style.display = '';
    }

    if (!contentEl) {
        console.warn('[DismissablePopup] content not found');
        return null;
    }

    if (id && dismissablePopupInstances.has(id)) {
        return dismissablePopupInstances.get(id);
    }

    if (persistDismiss && id && isPopupDismissed(id)) {
        return null;
    }

    if (id && isPopupShownThisSession(id)) {
        return null;
    }

    const anchor = document.createElement('div');
    anchor.style.cssText = 'position:fixed;pointer-events:none;';
    document.body.appendChild(anchor);

    function updateAnchorPosition() {
        const rect = triggerEl.getBoundingClientRect();
        anchor.style.left = rect.left + 'px';
        anchor.style.top = rect.top + 'px';
        anchor.style.width = rect.width + 'px';
        anchor.style.height = rect.height + 'px';
    }
    updateAnchorPosition();

    const instance = {
        id,
        triggerEl,
        contentEl,
        tippyInstance: null,
        options,
        dismissed: false,

        show() {
            this.tippyInstance?.show();
        },

        hide() {
            this.tippyInstance?.hide();
        },

        dismiss() {
            if (this.dismissed) return;
            this.dismissed = true;
            this.tippyInstance?.destroy();
            this.tippyInstance = null;
            anchor.remove();
            if (id) {
                markPopupShownThisSession(id);
                if (persistDismiss) setPopupDismissed(id, persistDays);
                dismissablePopupInstances.delete(id);
            }
            onDismiss?.();
        },

        destroy() {
            this.tippyInstance?.destroy();
            this.tippyInstance = null;
            anchor.remove();
            if (id && dismissablePopupInstances.has(id)) {
                dismissablePopupInstances.delete(id);
            }
        },

        reset() {
            if (id) {
                clearPopupDismissed(id);
                clearPopupSessionState(id);
            }
            this.dismissed = false;
        }
    };

    instance.tippyInstance = tippy(anchor, {
        theme,
        placement,
        trigger: 'manual',
        interactive: true,
        hideOnClick: false,
        appendTo: document.body,
        content: contentEl,
        offset,
        showOnCreate: autoShow,
        onShow(tippyInst) {
            const closeBtn = tippyInst.popper.querySelector(closeSelector);
            if (closeBtn) {
                closeBtn.onclick = (e) => {
                    e.preventDefault();
                    instance.dismiss();
                };
            }
            onShow?.(instance);
        },
        onHide() {
            onHide?.(instance);
        }
    });

    if (hideOnTriggerClick) {
        triggerEl.addEventListener('click', () => {
            if (instance.tippyInstance?.state.isVisible && !instance.dismissed) {
                instance.dismiss();
            }
        });
    }

    if (id) {
        dismissablePopupInstances.set(id, instance);
    }

    return instance;
}

function getDismissablePopup(id) {
    return dismissablePopupInstances.get(id) || null;
}

function dismissAllPopups() {
    dismissablePopupInstances.forEach(inst => inst.dismiss());
}

function discoverDismissablePopups(container = document) {
    const triggers = container.querySelectorAll('[data-dismissable-popup]');
    triggers.forEach(trigger => {
        const contentId = trigger.getAttribute('data-dismissable-popup');
        const id = trigger.getAttribute('data-popup-id') || contentId;
        if (dismissablePopupInstances.has(id)) return;

        createDismissablePopup({
            trigger,
            content: contentId,
            id,
            placement: trigger.getAttribute('data-popup-placement') || 'bottom-end',
            theme: trigger.getAttribute('data-popup-theme') || 'light vk dismissable',
            closeSelector: trigger.getAttribute('data-popup-close') || '.popup-close',
            persistDismiss: trigger.hasAttribute('data-popup-persist'),
            autoShow: !trigger.hasAttribute('data-popup-manual'),
            hideOnTriggerClick: !trigger.hasAttribute('data-popup-no-trigger-hide')
        });
    });
}

window.DismissablePopup = {
    create: createDismissablePopup,
    get: getDismissablePopup,
    dismissAll: dismissAllPopups,
    discover: discoverDismissablePopups,
    isDismissed: isPopupDismissed,
    clearDismissed: clearPopupDismissed,
    isShownThisSession: isPopupShownThisSession,
    clearSessionState: clearPopupSessionState
};

vkify.hook(vkify, 'onPageReady', (container) => {
    window.reinitializeTooltips?.(container);
    discoverDismissablePopups(container || document);
}, 'after');

vkify.ready(() => {
    setupTooltips();
    setupTooltipObserver();
    discoverDismissablePopups(document);
});

document.addEventListener('click', (event) => {
    if (event.target.closest('.tippy-content .top_notify_show_all')) {
        tippy.hideAll({ duration: 0 });
        return;
    }

    const link = event.target.closest('a');
    if (!link) return;

    const tooltipBox = link.closest('.tippy-box');
    if (!tooltipBox) return;

    const themeTokens = (tooltipBox.dataset.theme?.trim() ?? '').split(/\s+/);
    const persistentThemes = ['musicpopup', 'dismissable'];
    if (!persistentThemes.some(t => themeTokens.includes(t))) {
        tippy.hideAll({ duration: 0.25 });
    }
}, true);