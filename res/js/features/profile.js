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
    },

    initProfileSubMenu: function() {
        const buttonIds = ['profile_sub_btn', 'mobile_profile_sub_btn'];
        const tooltipIds = {
            profile_sub_btn: 'profile_sub_tooltip',
            mobile_profile_sub_btn: 'mobile_profile_sub_tooltip'
        };

        buttonIds.map(ge).filter(Boolean).forEach(button => {
            if (button._tippy) return;

            const tooltipContent = ge(tooltipIds[button.id]);
            if (!tooltipContent) return;

            const clonedContent = tooltipContent.cloneNode(true);
            clonedContent.style.display = 'block';
            clonedContent.removeAttribute('id');
            tooltipContent.style.display = 'none';

            try {
                const isMobile = window.isMobile && window.isMobile();
                tippy(button, {
                    theme: 'light vk',
                    placement: isMobile ? 'bottom' : 'bottom-end',
                    trigger: 'click',
                    interactive: true,
                    interactiveBorder: 8,
                    arrow: isMobile,
                    appendTo: 'parent',
                    animation: isMobile ? 'up_down' : 'none',
                    duration: isMobile ? [100, 100] : 0,
                    offset: isMobile ? [0, 8] : undefined,
                    allowHTML: true,
                    zIndex: 99,
                    content: clonedContent,
                    onShow: (instance) => {
                        button.setAttribute('aria-expanded', 'true');
                        if (isMobile) return;
                        button.classList.add('shown');
                        const wrapper = button.closest('.profile_sub_wrapper');
                        if (wrapper) wrapper.classList.add('profile_sub_active');
                    },
                    onHide: (instance) => {
                        button.setAttribute('aria-expanded', 'false');
                        if (isMobile) return;
                        button.classList.remove('shown');
                    },
                    onHidden: (instance) => {
                        if (isMobile) return;
                        const wrapper = button.closest('.profile_sub_wrapper');
                        if (wrapper) wrapper.classList.remove('profile_sub_active');
                    }
                });
            } catch (error) {
                console.error('[Profile] Error creating Tippy instance:', error);
            }
        });
    },

    initEventStatus: function() {
        if (Profile._eventStatusInited) return;
        Profile._eventStatusInited = true;
        document.addEventListener('click', function(event) {
            const link = event.target.closest('a[data-event-action]');
            if (!link) return;
            const tooltip = link.closest('.tippy-menu');
            if (!tooltip) return;
            event.preventDefault();
            Profile.setEventStatus(link, tooltip);
        });
    },

    setEventStatus: async function(link, tooltip) {
        const action = link.getAttribute('data-event-action');
        const clubId = tooltip.getAttribute('data-club-id');
        const currentFlag = parseInt(tooltip.getAttribute('data-current-flag') || '-1', 10);
        const desiredFlags = { going: 0, maybe: 1 };
        const desiredFlag = desiredFlags[action];

        const posts = [];
        if (action === 'notgoing') {
            if (currentFlag !== -1) posts.push(currentFlag);
        } else {
            if (currentFlag !== -1 && currentFlag !== desiredFlag) posts.push(currentFlag);
            if (currentFlag !== desiredFlag) posts.push(desiredFlag);
        }
        if (posts.length === 0) return;

        try {
            for (const flag of posts) {
                const formData = new FormData();
                formData.set('id', clubId);
                formData.set('flag', String(flag));
                formData.set('hash', vkify.getCsrf());
                await ky.post('/setSub/club', {
                    body: formData,
                    redirect: 'manual',
                    throwHttpErrors: false
                });
            }

            if (window.router) {
                await window.router.route({ url: location.href, push_state: false });
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error('[Profile] setEventStatus error:', error);
        }
    }

};

vkify.hook(vkify, 'onPageReady', (container) => {
    Profile.initProfileSubMenu();
    Profile.initProfileMoreMenu();
    Profile.initEventStatus();
    Profile.updateWarnings();
}, 'after');
