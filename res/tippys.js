document.addEventListener('DOMContentLoaded', function () {
    const commonConfig = {
        allowHTML: true,
        interactive: true,
        animation: 'shift-toward-subtle',
        duration: [100, 100],
        theme: 'light vk',
        placement: 'bottom',
        appendTo: 'parent'
    };



    window.postActionTooltipConfig = {
        content: (reference) => {
            const menuElement = reference._tippyMenuElement;
            return menuElement || document.createElement('div');
        },
        ...commonConfig,
        'placement': 'bottom-end',
        onCreate: (instance) => {
            instance.reference.setAttribute('data-tippy-initialized', 'true');
        },
        onDestroy: (instance) => {
            instance.reference.removeAttribute('data-tippy-initialized');
        }
    };

    // Function to clean up tooltip content references
    window.cleanupTooltipContent = function(container) {
        if (!container) return;

        // Clean up _tippyMenuElement references
        const elementsWithMenus = container.querySelectorAll('[data-tippy-initialized]');
        elementsWithMenus.forEach(element => {
            if (element._tippyMenuElement) {
                delete element._tippyMenuElement;
            }
        });

        // Restore hidden menus
        const hiddenMenus = container.querySelectorAll('.tippy-menu[style*="display: none"]');
        hiddenMenus.forEach(menu => {
            menu.style.display = '';
        });
    };

    window.initializeTippys = function() {
        function hasTippy(element) {
            return element && (element._tippy || element.hasAttribute('aria-describedby'));
        }

        function safeSetupTooltip(selector, contentCallback, options = {}) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!hasTippy(element)) {
                    // Create tooltip for individual element, not all elements matching selector
                    const config = {
                        ...commonConfig,
                        content: typeof contentCallback === 'function'
                            ? contentCallback
                            : contentCallback instanceof Element
                                ? contentCallback
                                : (reference) => {
                                    // First try to find adjacent menu
                                    const adjacentMenu = reference.nextElementSibling;
                                    if (adjacentMenu && adjacentMenu.classList.contains('tippy-menu')) {
                                        return adjacentMenu;
                                    }

                                    // Then try to find menu by ID in the same container context
                                    const container = reference.closest('.ovk-modal-video-window, .ovk-photo-view-window, .page_content') || document;
                                    const menu = container.querySelector(`#${contentCallback}`);
                                    if (menu) {
                                        return menu;
                                    }

                                    // Fallback to global search
                                    const globalMenu = document.getElementById(contentCallback);
                                    return globalMenu || document.createElement('div');
                                }
                    };

                    Object.assign(config, options);
                    tippy(element, config);
                }
            });
        }

        safeSetupTooltip('#moreAttachTrigger', 'moreAttachTooltip');
        safeSetupTooltip('#postOptsTrigger', 'postOptsTooltip');
        safeSetupTooltip('.video_info_more_actions', 'videoMoreActionsTooltip');
        safeSetupTooltip('.pv_actions_more', 'pv_actions_more_menu', {
            theme: 'dark vk'
        });
        safeSetupTooltip('#profile_more_btn', 'profile_actions_tooltip', {
            placement: 'bottom-end'
        });
        safeSetupTooltip('#moreOptionsLink', 'moreOptionsContent', {
            trigger: 'mouseenter focus',
            arrow: true,
            maxWidth: 300
        });

        safeSetupTooltip('#userMenuTrigger', 'userMenuTooltip', {
            trigger: 'click',
            placement: 'bottom-end',
            onShow: (instance) => {
                instance.reference.classList.add('shown');
            },
            onHide: (instance) => {
                instance.reference.classList.remove('shown');
            }
        });

        document.querySelectorAll('.post_actions_icon').forEach(element => {
            if (!hasTippy(element)) {
                const menu = element.closest('.post_actions')?.querySelector('.tippy-menu');
                if (menu) {
                    // Clone the menu instead of removing it to prevent content loss
                    const menuClone = menu.cloneNode(true);
                    menu.style.display = 'none'; // Hide original instead of removing
                    element._tippyMenuElement = menuClone;
                } else {
                    // Create empty menu if none found
                    element._tippyMenuElement = document.createElement('div');
                }

                // Create custom config for this specific element
                const customConfig = {
                    ...window.postActionTooltipConfig,
                    content: (reference) => {
                        return reference._tippyMenuElement || document.createElement('div');
                    }
                };

                tippy(element, customConfig);
            }
        });
    };

    window.initializeTippys();

    document.addEventListener('click', (event) => {
        if (event.target.closest('.tippy-menu a')) {
            tippy.hideAll({ duration: 0 });
        }
    });
});