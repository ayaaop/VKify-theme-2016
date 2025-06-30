/**
 * OpenVK Router Patch for VKify Theme
 *
 * This script enhances the OpenVK router to properly handle localization
 * and tooltip management during AJAX transitions.
 */

window.reinitializeTooltips = function(container = document) {
    if (container !== document) {
        const elementsWithTippy = container.querySelectorAll('[aria-describedby]');
        elementsWithTippy.forEach(element => {
            if (element._tippy) {
                element._tippy.destroy();
            }
        });

        const tippyRoots = document.querySelectorAll('[data-tippy-root]');
        tippyRoots.forEach(root => {
            const targetId = root.getAttribute('aria-describedby') || root.id;
            const target = container.querySelector(`[aria-describedby="${targetId}"]`);
            if (target) {
                root.remove();
            }
        });
    } else {
        const elementsWithTippy = document.querySelectorAll('[aria-describedby]');
        elementsWithTippy.forEach(element => {
            if (element._tippy) {
                element._tippy.destroy();
            }
        });

        const tippyRoots = document.querySelectorAll('[data-tippy-root]');
        tippyRoots.forEach(root => {
            root.remove();
        });

        if (window.tippy && window.tippy.instances) {
            window.tippy.instances.forEach(instance => {
                if (!instance.reference.isConnected) {
                    instance.destroy();
                }
            });
        }
    }

    if (window.initializeTippys) {
        try {
            window.initializeTippys();
        } catch (error) {
            console.warn('Error reinitializing tooltips:', error);
        }
    }
};

window.destroyTooltipsInContainer = function(container) {
    if (!container) return;

    const elementsWithTippy = container.querySelectorAll('[aria-describedby]');
    elementsWithTippy.forEach(element => {
        if (element._tippy) {
            element._tippy.destroy();
            delete element._tippy;
        }
    });

    if (window.cleanupTooltipContent) {
        window.cleanupTooltipContent(container);
    }
};



window.cleanupModalTooltips = function(modalContainer) {
    if (!modalContainer) return;

    if (window.cleanupTooltipContent) {
        window.cleanupTooltipContent(modalContainer);
    }

    window.destroyTooltipsInContainer(modalContainer);

    const allTippyRoots = document.querySelectorAll('[data-tippy-root]');
    allTippyRoots.forEach(root => {
        if (!root.isConnected || !document.body.contains(root)) {
            root.remove();
        }
    });

    if (window.tippy && window.tippy.instances) {
        window.tippy.instances = window.tippy.instances.filter(instance => {
            if (!instance.reference.isConnected) {
                try {
                    instance.destroy();
                } catch (e) {
                }
                return false;
            }
            return true;
        });
    }

    setTimeout(() => {
        if (window.reinitializeTooltips) {
            window.reinitializeTooltips();
        }
    }, 50);
};
function processVkifyLocTags() {
    if (window.processVkifyLocTags) {
        window.processVkifyLocTags();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    processVkifyLocTags();

    function handleContentUpdate() {
        processVkifyLocTags();
        reinitializeTooltips();
        if (window.addSuggestedTabToWall) {
            setTimeout(window.addSuggestedTabToWall, 100);
        }
    }

    function patchFunction(obj, methodName, callback) {
        if (obj && obj[methodName]) {
            const original = obj[methodName];
            obj[methodName] = async function(...args) {
                const result = await original.apply(this, args);
                callback();
                return result;
            };
        }
    }

    function waitForAndPatch(checkFn, patchFn, timeout = 10000) {
        if (checkFn()) {
            patchFn();
        } else {
            const check = setInterval(() => {
                if (checkFn()) {
                    clearInterval(check);
                    patchFn();
                }
            }, 100);
            setTimeout(() => clearInterval(check), timeout);
        }
    }

    function reinitializeTooltips(container = document) {
        window.reinitializeTooltips(container);
    }

    waitForAndPatch(
        () => window.router,
        () => {
            patchFunction(window.router, '__appendPage', () => {
                handleContentUpdate();
            });
            patchFunction(window.router, '__integratePage', handleContentUpdate);
        }
    );

    waitForAndPatch(
        () => window.__processPaginatorNextPage,
        () => {
            const original = window.__processPaginatorNextPage;
            window.__processPaginatorNextPage = async function(...args) {
                const result = await original.apply(this, args);
                handleContentUpdate();
                return result;
            };
        }
    );

    ['DOMContentLoaded', 'load', 'popstate'].forEach(eventType => {
        window.addEventListener(eventType, () => {
            setTimeout(processVkifyLocTags, 0);
            if (window.addSuggestedTabToWall) {
                setTimeout(window.addSuggestedTabToWall, 200);
            }
        });
    });

    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        let shouldReinitializeTooltips = false;

        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'VKIFYLOC' || node.querySelector && node.querySelector('vkifyloc')) {
                            shouldProcess = true;
                        }

                        if (node.classList && (node.classList.contains('scroll_node') || node.querySelector && node.querySelector('.post_actions_icon'))) {
                            shouldReinitializeTooltips = true;
                        }
                    }
                }
            }
        }

        if (shouldProcess) {
            processVkifyLocTags();
        }

        if (shouldReinitializeTooltips) {
            setTimeout(reinitializeTooltips, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});