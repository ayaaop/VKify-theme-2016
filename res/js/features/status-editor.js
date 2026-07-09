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

    function openMobileStatusEditor(opts) {
        const { value, placeholder, onSave } = opts;
        const inputId = 'mobile_status_input_' + Date.now();
        const safePlaceholder = placeholder ? escapeHtml(placeholder) : '';
        const html = `<div style="padding:8px 0"><textarea id="${inputId}" style="width:100%;box-sizing:border-box;height:90px;resize:vertical;" maxlength="255" placeholder="${safePlaceholder}">${escapeHtml(value)}</textarea></div>`;

        MessageBox(tr('status'), html, [tr('save'), tr('close')], [
            async function() {
                const input = document.getElementById(inputId);
                if (!input) return;
                await onSave(input.value);
            },
            Function.noop,
        ]);

        requestAnimationFrame(() => {
            const input = document.getElementById(inputId);
            if (input) { input.focus(); input.select(); }
        });
    }

    window.__mobileEditStatus = function() {
        const form = document.status_popup_form || document.forms['status_popup_form'];
        const currentStatus = form?.status?.value ?? '';
        openMobileStatusEditor({
            value: currentStatus,
            placeholder: tr('change_status'),
            onSave: async function(newStatus) {
                if (form?.status) form.status.value = newStatus;
                const csrf = form?.hash?.value || document.querySelector('meta[name=csrf]')?.getAttribute('value') || '';
                const fd = new FormData();
                fd.append('status', newStatus);
                fd.append('broadcast', 0);
                fd.append('hash', csrf);
                try {
                    const response = await ky.post('/edit?act=status', { body: fd });
                    if (!parseAjaxResponse(await response.text())) return;
                    const el = document.getElementById('mobile_status_display');
                    if (el) {
                        el.textContent = newStatus || tr('change_status');
                        el.className = newStatus ? 'mir-text' : 'mir-text';
                    }
                } catch (e) {
                    console.error(e);
                }
            },
        });
    };

});

})();
