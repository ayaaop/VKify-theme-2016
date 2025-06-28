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

    function setupTooltip(selector, contentCallback, options = {}) {
        if (!selector) return;

        const config = {
            ...commonConfig,
            content: typeof contentCallback === 'function'
                ? contentCallback
                : contentCallback instanceof Element
                    ? contentCallback
                    : (reference) => {
                        const adjacentMenu = reference.nextElementSibling;
                        if (adjacentMenu && adjacentMenu.classList.contains('tippy-menu')) {
                            return adjacentMenu;
                        }

                        const menu = document.getElementById(contentCallback);
                        return menu || document.createElement('div');
                    }
        };

        Object.assign(config, options);

        return tippy(selector, config);
    }

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

    window.initializeTippys = function() {
        function hasTippy(element) {
            return element && (element._tippy || element.hasAttribute('aria-describedby'));
        }

        function safeSetupTooltip(selector, contentCallback, options = {}) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (!hasTippy(element)) {
                    setupTooltip(selector, contentCallback, options);
                }
            });
        }

        safeSetupTooltip('#moreAttachTrigger', 'moreAttachTooltip');
        safeSetupTooltip('#postOptsTrigger', 'postOptsTooltip');
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
                    menu.remove();
                    element._tippyMenuElement = menu;
                }
                tippy(element, window.postActionTooltipConfig);
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