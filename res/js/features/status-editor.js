(function () {
'use strict';

vkify.bindOnce('statusEditorOverrides', () => {
    const hookStatusEditor = () => {
        const LoaderUtils = window.LoaderUtils;

        if (typeof window.setStatusEditorShown === 'function' && !window.__vkifySetStatusEditorShownHooked) {
            window.__vkifySetStatusEditorShownHooked = true;
            vkify.hook(window, 'setStatusEditorShown', function (shown) {
                const editor = ge('status_editor');
                if (!editor) return;
                editor.style.display = shown ? 'block' : 'none';
                if (shown) {
                    const input = editor.querySelector('input[name="status"]');
                    if (input) input.focus();
                }
            }, 'replace');
        }

        if (typeof window.changeStatus === 'function' && !window.__vkifyChangeStatusHooked) {
            window.__vkifyChangeStatusHooked = true;
            vkify.hook(window, 'changeStatus', async function () {
                const form = document.status_popup_form || document.forms['status_popup_form'];
                if (!form) return;

                const submitBtn = form.submit;
                if (submitBtn && LoaderUtils) {
                    LoaderUtils.showInButton(submitBtn, { theme: 'baw' });
                }

                const status = form.status?.value || '';
                const formData = new FormData();
                formData.append('status', status);
                formData.append('broadcast', Number(Boolean(form.broadcast?.checked)));
                formData.append('hash', form.hash?.value || '');

                try {
                    const response = await ky.post('/edit?act=status', { body: formData });

                    if (!parseAjaxResponse(await response.text())) {
                        return;
                    }

                    const statusEl = document.querySelector('#page_status_text');
                    if (statusEl) {
                        if (status === '') {
                            statusEl.outerHTML = `<div id="page_status_text" class="page_status edit_link page_status_edit_button">${tr('change_status')}</div>`;
                        } else {
                            statusEl.outerHTML = `<div id="page_status_text" class="page_status page_status_edit_button">${escapeHtml(status)}</div>`;
                        }
                    }

                    window.setStatusEditorShown(false);
                } catch (e) {
                    console.error(e);
                } finally {
                    if (submitBtn && LoaderUtils) {
                        LoaderUtils.restoreButton(submitBtn);
                    }
                }
            }, 'replace');
        }
    };

    hookStatusEditor();
    vkify.hook(vkify, 'onPageReady', hookStatusEditor, 'after');
});

})();
