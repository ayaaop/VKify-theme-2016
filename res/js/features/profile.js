window.Profile = {
    hideWarning: function(warningType, event) {
        event?.stopPropagation();
        event?.preventDefault();
        
        let hidden = vkify.getCookie('vkify_hidden_warnings');
        let hiddenArr = hidden ? hidden.split(',') : [];
        if (!hiddenArr.includes(warningType)) {
            hiddenArr.push(warningType);
            vkify.setCookie('vkify_hidden_warnings', hiddenArr.join(','), 365);
        }
        
        const rowToHide = document.querySelector(`.profile_warning_row[data-warning="${warningType}"]`);
        if (rowToHide) {
            $(rowToHide).slideUp(200, () => {
                Profile.updateWarnings(true);
            });
        } else {
            Profile.updateWarnings(true);
        }
    },
    
    updateWarnings: function(animate = false) {
        const rows = document.querySelectorAll('.profile_warning_row');
        let shownOne = false;
        
        let hidden = vkify.getCookie('vkify_hidden_warnings');
        let hiddenArr = hidden ? hidden.split(',') : [];
        
        rows.forEach(row => {
            const warningType = row.getAttribute('data-warning');
            if (!warningType) return;
            
            let isHidden = hiddenArr.includes(warningType);
            
            if (isHidden) {
                if (!animate) $(row).hide();
                // if animating, it was already hidden by slideUp in hideWarning
            } else if (!shownOne) {
                if (animate && $(row).is(':hidden')) {
                    $(row).slideDown(200);
                } else {
                    $(row).show();
                }
                shownOne = true;
            } else {
                $(row).hide();
            }
        });
        
        const container = document.querySelector('.completeness_block');
        if (container) {
            if (shownOne) {
                $(container).show();
            } else {
                if (animate) {
                    $(container).slideUp(200);
                } else {
                    $(container).hide();
                }
            }
        }
    },

    initProfileMoreMenu: function() {
        const buttons = [
            ge('profile_more_btn'),
            ge('profileAppbarMoreBtn'),
            ge('groupAppbarMoreBtn')
        ].filter(Boolean);

        buttons.forEach(button => {
            if (button._tippy) return;

            if (!button.isConnected || button.offsetParent === null) {
                requestAnimationFrame(() => Profile.initProfileMoreMenu());
                return;
            }

            const tooltipContent = ge('profile_actions_tooltip');
            if (!tooltipContent) return;

            const clonedContent = tooltipContent.cloneNode(true);
            clonedContent.style.display = 'block';
            clonedContent.removeAttribute('id');

            // Hide the original template so it doesn't appear in the DOM
            tooltipContent.style.display = 'none';

            const isAppbar = button.id.includes('Appbar');
            const placement = isAppbar ? 'bottom-end' : 'start-end';

            try {
                const zIndex = button.closest('.ovk-msg-all') ? 9999 : 99;
                tippy(button, {
                    theme: 'light vk',
                    placement,
                    trigger: 'click',
                    interactive: true,
                    interactiveBorder: 8,
                    arrow: false,
                    appendTo: 'parent',
                    animation: isAppbar ? 'up_down' : 'none',
                    duration: isAppbar ? [150, 100] : 0,
                    allowHTML: true,
                    zIndex,
                    content: clonedContent,
                    onShow: (instance) => {
                        button.setAttribute('aria-expanded', 'true');
                        button.classList.add('shown');
                        const wrapper = button.closest('.profile_more_wrapper');
                        if (wrapper) wrapper.classList.add('profile_more_active');
                    },
                    onHide: (instance) => {
                        button.setAttribute('aria-expanded', 'false');
                        button.classList.remove('shown');
                    },
                    onHidden: (instance) => {
                        const wrapper = button.closest('.profile_more_wrapper');
                        if (wrapper) wrapper.classList.remove('profile_more_active');
                    }
                });
            } catch (error) {
                console.error('[Profile] Error creating Tippy instance:', error);
            }
        });
    }
};

vkify.hook(vkify, 'onPageReady', (container) => {
    Profile.initProfileMoreMenu();
    Profile.updateWarnings();
}, 'after');
