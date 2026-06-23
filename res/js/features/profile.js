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

    initializeProfileTippys: function() {
        const profileMoreBtn = ge('profile_more_btn');
        if (profileMoreBtn?._tippy) {
            const tippyInstance = profileMoreBtn._tippy;
            const { onShow: origShow, onHide: origHide } = tippyInstance.props;

            tippyInstance.setProps({
                onShow: (instance) => {
                    origShow?.(instance);
                    const wrapper = profileMoreBtn.closest('.profile_more_wrapper');
                    if (wrapper) wrapper.classList.add('profile_more_active');
                },
                onHide: (instance) => {
                    origHide?.(instance);
                },
                onHidden: (instance) => {
                    const wrapper = profileMoreBtn.closest('.profile_more_wrapper');
                    if (wrapper) wrapper.classList.remove('profile_more_active');
                }
            });
        }
    }
};

vkify.hook(vkify, 'onPageReady', (container) => {
    Profile.initializeProfileTippys();
    Profile.updateWarnings();
}, 'after');
