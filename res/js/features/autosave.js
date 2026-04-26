(function () {
    if (!window.vkify) return;

    const sidebarMap = {
        menu_bildoj: '.my_photos',
        menu_filmetoj: '.my_videos',
        menu_muziko: '.my_audios',
        menu_mesagoj: '.my_messages',
        menu_notatoj: '.my_notes',
        menu_grupoj: '.my_groups',
        menu_novajoj: '.my_feed',
        menu_aplikoj: '.my_apps',
        menu_doxc: '.my_docs',
        menu_feva: '.my_fave',
        menu_ligiloj: '.custom_link, .left_menu_nav_wrap',
        menu_standardo: '.ad_poster'
    };

    function toggleSidebarLink(name, checked) {
        const selector = sidebarMap[name];
        if (!selector) return;
        const nav = document.querySelector('.sidebar_inner');
        if (!nav) return;
        const links = nav.querySelectorAll(selector);
        links.forEach(link => link.style.display = checked ? '' : 'none');
        
        if (name === 'menu_ligiloj') {
            const langSelect = document.querySelector('#language-select');
            if (langSelect) langSelect.style.display = checked ? 'none' : 'flex';
        }
    }

    function getLabel(el) {
        const pageBlock = el.closest('.page_block');
        return pageBlock?.querySelector('.settings_saved_label') || null;
    }

    function showLoader(el) {
        const label = getLabel(el);
        if (!label || !window.LoaderUtils) return;
        clearTimeout(label._hideTimer);
        const textSpan = label.querySelector('.settings_saved_text');
        if (textSpan) textSpan.remove();
        if (!label.querySelector('.pr')) {
            LoaderUtils.show(label, { size: 'small' });
        }
    }

    function hideLoader(el) {
        const label = getLabel(el);
        if (!label) return;
        const loader = label.querySelector('.pr');
        if (loader) loader.remove();
    }

    function animateShow($el, duration = 200) {
        $el.css({ maxHeight: 0, overflow: 'hidden', display: 'block', transition: `max-height ${duration}ms ease-out` });
        const el = $el[0];
        void el.offsetHeight;
        $el.css({ maxHeight: $el.prop('scrollHeight') });
        clearTimeout(el._animTimer);
        el._animTimer = setTimeout(() => {
            $el.css({ maxHeight: '', overflow: '', transition: '' });
        }, duration);
    }

    function animateHide($el, duration = 200, callback) {
        const el = $el[0];
        $el.css({ overflow: 'hidden', transition: `max-height ${duration}ms ease-in`, maxHeight: $el.prop('scrollHeight') });
        void el.offsetHeight;
        $el.css({ maxHeight: 0 });
        clearTimeout(el._animTimer);
        el._animTimer = setTimeout(() => {
            $el.remove();
            if (callback) callback();
        }, duration);
    }

    function showSavedLabel(el) {
        const label = getLabel(el);
        const message = window.tr?.('changes_saved') || 'Changes saved.';

        if (!label) {
            const form = el.closest('form');
            if (!form) return;
            let msg = form.querySelector('.settings_saved_msg');
            if (msg) {
                clearTimeout(msg._hideTimer);
                $(msg).stop(true, true);
                msg.textContent = message;
            } else {
                msg = document.createElement('div');
                msg.className = 'information settings_saved_msg';
                msg.textContent = message;
                form.insertBefore(msg, form.firstChild);
                animateShow($(msg));
            }
            msg._hideTimer = setTimeout(() => {
                animateHide($(msg));
            }, 3000);
            return;
        }

        hideLoader(el);
        let textSpan = label.querySelector('.settings_saved_text');
        if (!textSpan) {
            textSpan = document.createElement('span');
            textSpan.className = 'settings_saved_text';
            label.appendChild(textSpan);
        }
        textSpan.textContent = message;
        void textSpan.offsetWidth;
        textSpan.classList.add('visible');

        clearTimeout(label._hideTimer);
        label._hideTimer = setTimeout(() => textSpan.classList.remove('visible'), 1500);
    }

    function showSaveError(form) {
        hideLoader(form);
        const label = getLabel(form);
        if (label) {
            const textSpan = label.querySelector('.settings_saved_text');
            if (textSpan) textSpan.remove();
        }

        let msg = form.querySelector('.settings_error_msg');
        if (msg) {
            clearTimeout(msg._hideTimer);
            $(msg).stop(true, true);
            msg.textContent = window.vkifylang?.error_saving || 'Error saving settings.';
        } else {
            msg = document.createElement('div');
            msg.className = 'msg msg_yellow settings_error_msg';
            msg.textContent = window.vkifylang?.error_saving || 'Error saving settings.';
            form.insertBefore(msg, form.firstChild);
            animateShow($(msg));
        }
        msg._hideTimer = setTimeout(() => {
            animateHide($(msg));
        }, 5000);
    }

    function initAutoSave() {
        const forms = document.querySelectorAll('form[data-autosave="true"]');
        forms.forEach(form => {
            if (form.dataset.autosaveBound) return;
            form.dataset.autosaveBound = '1';

            let lastSave = 0, pending = false, queued = false, reloadAfterSave = false;
            const MIN_INTERVAL = 1000, ERROR_COOLDOWN = 3000;

            function shouldReloadAfterSave(el) {
                if (!(el instanceof Element)) return false;
                if (!form.matches('form[action*="act=interface"]')) return false;

                return el.name === 'style' || el.name === 'theme_for_session';
            }

            function navigateToFreshPage() {
                const url = new URL(window.location.href);
                url.searchParams.set('_themeReload', Date.now().toString());
                window.location.replace(url.toString());
            }

            async function submitForm() {
                if (pending) { queued = true; return; }
                const now = Date.now(), wait = lastSave + MIN_INTERVAL - now;
                if (wait > 0) { setTimeout(submitForm, wait); return; }

                pending = true;
                const formData = new FormData(form);
                try {
                    const response = await fetch(form.action || window.location.href, {
                        method: 'POST',
                        body: formData,
                        headers: { 'X-Requested-With': 'XMLHttpRequest' },
                        credentials: 'same-origin'
                    });
                    lastSave = Date.now();
                    if (response.ok || response.status === 302) {
                        showSavedLabel(form);

                        if (reloadAfterSave) {
                            navigateToFreshPage();
                            return;
                        }
                    }
                    else { showSaveError(form); lastSave += ERROR_COOLDOWN; }
                } catch (e) {
                    vkify.warn('Auto-save failed:', e);
                    showSaveError(form);
                    lastSave = Date.now() + ERROR_COOLDOWN;
                }
                pending = false;
                reloadAfterSave = false;
                if (queued) { queued = false; submitForm(); }
            }

            form.addEventListener('submit', (e) => {
                e.preventDefault();
            });

            form.addEventListener('change', (e) => {
                const el = e.target;
                if (el.type === 'hidden' || el.type === 'file') return;
                if (el.dataset.act === 'localstorage_item' || el.closest('#vkifySettings')) {
                    showSavedLabel(el);
                    return;
                }
                if (el.type === 'checkbox' && sidebarMap[el.name]) {
                    toggleSidebarLink(el.name, el.checked);
                }
                reloadAfterSave = reloadAfterSave || shouldReloadAfterSave(el);
                showLoader(form);
                submitForm();
            });
        });
    }

    window.vkifyShowSavedLabel = showSavedLabel;
    vkify.onPage(initAutoSave);
})();
