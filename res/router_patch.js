/**
 * OpenVK Router Patch for VKify Theme
 * 
 * This script enhances the OpenVK router to properly handle localization
 * during AJAX transitions.
 */
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

    function reinitializeTooltips() {
        const tippyInstances = document.querySelectorAll('[data-tippy-root]');
        tippyInstances.forEach(instance => {
            const tippyTarget = document.querySelector(`[aria-describedby="${instance.id}"]`);
            if (tippyTarget && tippyTarget._tippy) {
                tippyTarget._tippy.destroy();
            }
            instance.remove();
        });

        if (window.initializeTippys) {
            window.initializeTippys();
        }
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