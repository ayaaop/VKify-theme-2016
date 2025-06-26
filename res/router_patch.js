/**
 * OpenVK Router Patch for VKify Theme
 * 
 * This script enhances the OpenVK router to properly handle localization
 * during AJAX transitions.
 */

// Use the function from localizator.js instead of duplicating code
function processVkifyLocTags() {
    if (window.processVkifyLocTags) {
        window.processVkifyLocTags();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    processVkifyLocTags();
    
    const patchRouter = function() {
        if (window.router) {
            // Patch the public route method
            if (window.router.route) {
                const originalPublicRoute = window.router.route;
                window.router.route = async function(...args) {
                    const result = await originalPublicRoute.apply(this, args);

                    processVkifyLocTags();
                    reinitializeTooltips();

                    // Add suggested tab if on group page
                    if (window.addSuggestedTabToWall) {
                        setTimeout(window.addSuggestedTabToWall, 100);
                    }

                    return result;
                };
            }

            // Patch the internal __route method
            if (window.router.__route) {
                const originalRoute = window.router.__route;

                window.router.__route = async function(...args) {
                    const result = await originalRoute.apply(this, args);

                    processVkifyLocTags();
                    reinitializeTooltips();

                    // Add suggested tab if on group page
                    if (window.addSuggestedTabToWall) {
                        setTimeout(window.addSuggestedTabToWall, 100);
                    }

                    return result;
                };
            }

            if (window.router.__appendPage) {
                const originalAppendPage = window.router.__appendPage;
                window.router.__appendPage = function(parsedContent) {
                    const result = originalAppendPage.call(this, parsedContent);

                    if (parsedContent && parsedContent.documentElement) {
                        reinitializeTooltips();
                    }

                    // Add suggested tab if on group page
                    if (window.addSuggestedTabToWall) {
                        setTimeout(window.addSuggestedTabToWall, 100);
                    }

                    return result;
                };
            }

            if (window.router.__integratePage) {
                const originalIntegratePage = window.router.__integratePage;
                window.router.__integratePage = async function(...args) {
                    const result = await originalIntegratePage.apply(this, args);
                    processVkifyLocTags();
                    reinitializeTooltips();

                    // Add suggested tab if on group page
                    if (window.addSuggestedTabToWall) {
                        setTimeout(window.addSuggestedTabToWall, 100);
                    }

                    return result;
                };
            }

            console.log('Router patched for proper localization');
        }
    };
    
    function reinitializeTooltips() {
        // First destroy all existing tooltips
        const tippyInstances = document.querySelectorAll('[data-tippy-root]');
        tippyInstances.forEach(instance => {
            const tippyTarget = document.querySelector(`[aria-describedby="${instance.id}"]`);
            if (tippyTarget && tippyTarget._tippy) {
                tippyTarget._tippy.destroy();
            }
            instance.remove();
        });

        // Then initialize tooltips only if they haven't been initialized yet
        if (window.initializeTippys) {
            window.initializeTippys();
        }
    }
    
    if (window.router) {
        patchRouter();
    } else {
        const routerCheck = setInterval(() => {
            if (window.router) {
                clearInterval(routerCheck);
                patchRouter();
            }
        }, 100);
        
        setTimeout(() => clearInterval(routerCheck), 10000);
    }
    
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function() {
        if (arguments[0] === 'GET' && arguments[1] && !arguments[1].match(/\.(js|css|png|jpg|gif|svg|ico)$/)) {
            this.addEventListener('load', function() {
                if (this.status === 200 && 
                    (this.responseType === '' || this.responseType === 'text') && 
                    this.responseText && 
                    this.responseText.includes('<!DOCTYPE html>')) {
                    setTimeout(processVkifyLocTags, 0);
                }
            });
        }
        return originalXHROpen.apply(this, arguments);
    };
    
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        
        try {
            const cloned = response.clone();
            
            const contentType = cloned.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                cloned.text().then(html => {
                    if (html.includes('<!DOCTYPE html>')) {
                        setTimeout(processVkifyLocTags, 0); 
                    }
                }).catch(error => console.error('Error processing fetch response:', error));
            }
        } catch (error) {
            console.error('Error in fetch override:', error);
        }
        
        return response;
    };
    
    ['DOMContentLoaded', 'load', 'popstate'].forEach(eventType => {
        window.addEventListener(eventType, () => {
            setTimeout(processVkifyLocTags, 0);
            // Also add suggested tab on these events
            if (window.addSuggestedTabToWall) {
                setTimeout(window.addSuggestedTabToWall, 200);
            }
        });
    });

    // Hook into history API for SPA navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        setTimeout(() => {
            processVkifyLocTags();
            if (window.addSuggestedTabToWall) {
                window.addSuggestedTabToWall();
            }
        }, 100);
    };

    history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        setTimeout(() => {
            processVkifyLocTags();
            if (window.addSuggestedTabToWall) {
                window.addSuggestedTabToWall();
            }
        }, 100);
    };
    
    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'VKIFYLOC' || node.querySelector('vkifyloc')) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
                
                if (shouldProcess) break;
            }
        }
        
        if (shouldProcess) {
            processVkifyLocTags();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});