(function() {
'use strict';

const tr = window.tr;
const u = window.u;
const LoaderUtils = window.LoaderUtils;

if (!window.wallCheckboxStates) {
    window.wallCheckboxStates = {
        as_group: false,
        force_sign: false,
        anon: false,
        nsfw: false
    };
}

const WALL_CHECKBOX_KEYS = ['as_group', 'force_sign', 'anon', 'nsfw'];
const wallCheckboxStatesByForm = new WeakMap();

function createEmptyWallCheckboxState() {
    return {
        as_group: false,
        force_sign: false,
        anon: false,
        nsfw: false
    };
}

function syncGlobalWallCheckboxState(state) {
    WALL_CHECKBOX_KEYS.forEach((key) => {
        window.wallCheckboxStates[key] = Boolean(state[key]);
    });
}

function resolveWallFormContext(el) {
    return el?.closest?.('form') || document.querySelector('#write form') || null;
}

function getActiveTippyBox(el) {
    return el?.closest?.('.tippy-box') || document.querySelector('.tippy-box') || null;
}

function queryInActiveTippyBox(el, selector) {
    const tippyBox = getActiveTippyBox(el);
    return tippyBox?.querySelector(selector) || null;
}

function renderEditMenuLayout(apiPost, type, postId) {
    const clubId = apiPost.owner_id < 0 ? Math.abs(apiPost.owner_id) : 0;

    return `
        <div class='edit_menu module_body'>
            <form id="write">
                <textarea placeholder="${tr('edit')}" name="text" style="width: 100%;resize: none;" class="expanded-textarea small-textarea">${apiPost.text}</textarea>
                <div class='post-buttons'>
                    <div class="post-horizontal"></div>
                    <div class="post-vertical"></div>
                    <div class="post-repost"></div>
                    <div class="post-source"></div>
                    <div class='post-opts'>
                        ${type == 'post' ? `<label>
                            <input type="checkbox" name="nsfw" ${apiPost.is_explicit ? 'checked' : ''} /> ${tr('contains_nsfw')}
                        </label>` : ''}
                        ${apiPost.owner_id < 0 && apiPost.can_pin ? `<label>
                            <input type="checkbox" name="as_group" ${apiPost.from_id < 0 ? 'checked' : ''} /> ${tr('post_as_group')}
                        </label>` : ''}
                    </div>
                    <input type="hidden" id="source" name="source" value="none" />
                    <div class="post-bottom-acts">
                        <div id="wallAttachmentMenu" class="page_add_media post-attach-menu">
                            <a class="attach_photo" id="__vkifyPhotoAttachment" data-club="${clubId}" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('photo')}">
                                <div class="post-attach-menu__icon"></div>
                            </a>
                            <a class="attach_video" id="__vkifyVideoAttachment" data-club="${clubId}" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('video')}">
                                <div class="post-attach-menu__icon"></div>
                            </a>
                            <a class="attach_audio" id="__vkifyAudioAttachment" data-club="${clubId}" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('audio')}">
                                <div class="post-attach-menu__icon"></div>
                            </a>
                            ${type == 'post' ? `
                            <a class="post-attach-menu__trigger" id="moreAttachTrigger${postId}" data-tippy-content-id="moreAttachTooltip${postId}">
                                ${tr('show_more')}
                            </a>
                            ` : `
                            <a class="attach_document" id="__vkifyDocumentAttachment" data-club="${clubId}" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('document')}">
                                <div class="post-attach-menu__icon"></div>
                            </a>
                            `}
                            ${type == 'post' ? `
                            <div class="tippy-menu tippy-content-template" id="moreAttachTooltip${postId}">
                                <a class="attach_document" id="__vkifyDocumentAttachment" data-club="${clubId}">
                                    <div class="post-attach-menu__icon"></div>
                                    ${tr('document')}
                                </a>
                                <a class="attach_note" id="__notesAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                    ${tr('note')}
                                </a>
                                <a class="attach_source" id='__sourceAttacher'>
                                    <div class="post-attach-menu__icon"></div>
                                    ${tr('source')}
                                </a>
                            </div>
                            ` : ''}
                        </div>
                        <div class='edit_menu_buttons post-bottom-buttons'>
                            <input class='button button_light' type='button' id='__edit_cancel' value='${tr('cancel')}'>
                            <input class='button' type='button' id='__edit_save' value='${tr('save')}'>
                        </div>
                    </div>
                </div>
            </form>
        </div>`;
}

function renderRepostBottomLayout() {
    return `
            <div class="post-bottom-acts">
                <div class="post-attach-menu">
                    <div id="wallAttachmentMenu">
                        <a id="__vkifyPhotoAttachment" class="attach_photo" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('photo')}" data-club="0">
                            <div class="post-attach-menu__icon"></div>
                        </a>
                        <a id="__vkifyVideoAttachment" class="attach_video" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('video')}" data-club="0">
                            <div class="post-attach-menu__icon"></div>
                        </a>
                        <a id="__vkifyAudioAttachment" class="attach_audio" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('audio')}" data-club="0">
                            <div class="post-attach-menu__icon"></div>
                        </a>
                        <a id="__vkifyDocumentAttachment" class="attach_document" data-tip="simple-black" data-align="bottom-start" data-tiptitle="${tr('document')}" data-club="0">
                            <div class="post-attach-menu__icon"></div>
                        </a>
                    </div>
                </div>
                <div class="post-bottom-buttons">
                    <div class="post_settings" id="__vkifyRepostOptsTrigger" role="button" style="display:none;"
                         data-tippy-content-id="__vkifyRepostOptsTooltip" data-tippy-placement="top-end">
                        <div class="common_icon"></div>
                    </div>
                    <div class="post-opts tippy-menu tippy-content-template" id="__vkifyRepostOptsTooltip">
                        <label class="checkbox">
                            <input type="checkbox" name="asGroup" /> ${tr('post_as_group')}
                        </label>
                        <label class="checkbox" id="__vkifyRepostSignedOpt" style="display:none">
                            <input type="checkbox" name="signed" /> ${tr('add_signature')}
                        </label>
                    </div>
                    <input type="button" value="${tr('send')}" class="button" id="__vkifyRepostSend" />
                </div>
            </div>
        `;
}

function getWallCheckboxState(formOrEl) {
    const form = formOrEl?.tagName === 'FORM' ? formOrEl : resolveWallFormContext(formOrEl);
    if (!form) {
        return window.wallCheckboxStates;
    }

    let state = wallCheckboxStatesByForm.get(form);
    if (!state) {
        state = createEmptyWallCheckboxState();
        wallCheckboxStatesByForm.set(form, state);
    }

    syncGlobalWallCheckboxState(state);
    return state;
}

function resetWallCheckboxStates(formOrEl) {
    const state = getWallCheckboxState(formOrEl);
    WALL_CHECKBOX_KEYS.forEach((key) => {
        state[key] = false;
    });
    syncGlobalWallCheckboxState(state);
}

function getWallCheckboxPayload(formOrEl) {
    const state = getWallCheckboxState(formOrEl);
    const payload = WALL_CHECKBOX_KEYS.map(name => ({
        name,
        checked: Boolean(state[name])
    }));

    if (state.anon && state.as_group) {
        const asGroup = payload.find(item => item.name === 'as_group');
        if (asGroup) asGroup.checked = false;
    }

    return payload;
}

function syncWallCheckboxHiddenInputs(form) {
    if (!form) return;

    getWallCheckboxPayload(form).forEach(checkbox => {
        if (!checkbox.checked) return;

        let hiddenInput = form.querySelector(`input[name="${checkbox.name}"][type="hidden"]`);
        if (!hiddenInput) {
            hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = checkbox.name;
            form.appendChild(hiddenInput);
        }

        hiddenInput.value = 'on';
    });
}

function setWallSourceContext(node) {
    const form = node?.closest?.('form');
    if (!form) return;
    window.vkifyWallSourceContext = u(form);
}

function getWallSourceContext(sourceBtn) {
    const directForm = sourceBtn?.closest?.('form');
    if (directForm) return u(directForm);

    const tippyId = sourceBtn?.closest?.('.tippy-box')?.id;
    if (tippyId) {
        const escapedId = window.CSS?.escape ? window.CSS.escape(tippyId) : tippyId.replace(/[^a-zA-Z0-9_\u00A0-\uFFFF-]/g, '\\$&');
        const trigger = document.querySelector(`[aria-describedby="${escapedId}"]`);
        const triggerForm = trigger?.closest?.('form');
        if (triggerForm) return u(triggerForm);
    }

    const stored = window.vkifyWallSourceContext;
    if (stored?.length) return stored;

    const fallbackForm = document.querySelector('#write form, form#write, #write');
    return fallbackForm ? u(fallbackForm) : null;
}

function bindSourceAttacherOnce() {
    if (!vkify.bindOnce('wallSourceAttacher', bindSourceAttacherOnce)) return;

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-tippy-content-id]');
        if (trigger) setWallSourceContext(trigger);
    }, true);

    document.addEventListener('focusin', (e) => {
        if (e.target.closest('#write')) {
            setWallSourceContext(e.target);
        }
    }, true);

    document.addEventListener('click', (e) => {
        const sourceBtn = e.target.closest('#__sourceAttacher, .attach_source');
        if (!sourceBtn || e.__vkifyHandled) return;

        const nearestTextarea = getWallSourceContext(sourceBtn);
        if (!nearestTextarea?.length) return;

        e.__vkifyHandled = true;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();

        const sourceOutput = nearestTextarea.find(`input[name='source']`);
        if (!sourceOutput.length) return;

        const msg = new CMessageBox({
            title: tr('add_source'),
            close_on_buttons: false,
            body: `
                <div id='source_flex_kunteynir'>
                    <span>${tr('set_source_tip')}</span>
                    <input type='text' maxlength='400' placeholder='...'>
                </div>
            `,
            buttons: [tr('set_source'), tr('cancel')],
            callbacks: [async () => {
                const sourceInput = u(`#source_flex_kunteynir input[type='text']`);
                const sourceValue = sourceInput.nodes[0]?.value?.trim() ?? '';
                if (sourceValue.length < 1) return;

                const submitBtn = u('.ovk-diag-action button').first()?.nodes?.[0];
                if (submitBtn) submitBtn.classList.add('lagged');

                const checkRes = await fetch(`/method/wall.checkCopyrightLink?auth_mechanism=roaming&link=${encodeURIComponent(sourceValue)}`);
                const checkResult = await checkRes.json();

                if (checkResult.error_code) {
                    switch (checkResult.error_code) {
                        default:
                        case 3102:
                            fastError(tr('error_adding_source_regex'));
                            break;
                        case 3103:
                            fastError(tr('error_adding_source_long'));
                            break;
                        case 3104:
                            fastError(tr('error_adding_source_sus'));
                            break;
                    }
                    if (submitBtn) submitBtn.classList.remove('lagged');
                    return;
                }

                sourceOutput.attr('value', sourceValue);
                nearestTextarea.find('.post-source').html(`
                    <span>${tr('source')}: <a target='_blank' href='${escapeHtml(sourceValue)}'>${ovk_proc_strtr(escapeHtml(sourceValue), 50)}</a></span>
                    <div id='remove_source_button'></div>
                `);

                nearestTextarea.find('.post-source #remove_source_button').on('click', () => {
                    nearestTextarea.find('.post-source').html('');
                    sourceOutput.attr('value', 'none');
                });

                msg.close();
            }, () => msg.close()]
        });

        u('.ovk-diag-body').attr('style', 'padding:8px;');
        u('.ovk-diag-cont').attr('style', 'width: 325px;');
        u('#source_flex_kunteynir input').nodes[0]?.focus();
    }, true);
}

function setupTooltipCheckboxListeners() {
    if (!vkify.bindOnce('wallCheckboxListeners', setupTooltipCheckboxListeners)) return;

    u(document).on('change', 'input[name="as_group"]', function (e) {
        const state = getWallCheckboxState(e.target);
        state.as_group = e.target.checked;
        syncGlobalWallCheckboxState(state);

        if (e.target.checked) {
            state.anon = false;
            const formContext = resolveWallFormContext(e.target);
            const anonCheckbox = formContext?.querySelector('input[name="anon"]') || null;
            if (anonCheckbox) {
                anonCheckbox.checked = false;
            }
        } else {
            state.force_sign = false;
            const formContext = resolveWallFormContext(e.target);
            const forceSignCheckbox = formContext?.querySelector('input[name="force_sign"]') || null;
            if (forceSignCheckbox) {
                forceSignCheckbox.checked = false;
            }
        }

        syncGlobalWallCheckboxState(state);
    });

    u(document).on('change', 'input[name="force_sign"]', function (e) {
        const state = getWallCheckboxState(e.target);
        state.force_sign = e.target.checked;
        syncGlobalWallCheckboxState(state);
    });

    u(document).on('change', 'input[name="anon"]', function (e) {
        const state = getWallCheckboxState(e.target);
        state.anon = e.target.checked;
        syncGlobalWallCheckboxState(state);

        if (e.target.checked) {
            state.as_group = false;
            const formContext = resolveWallFormContext(e.target);
            const asGroupCheckbox = formContext?.querySelector('input[name="as_group"]') || null;
            if (asGroupCheckbox) {
                asGroupCheckbox.checked = false;
            }

            const form = resolveWallFormContext(e.target);
            if (form && form.dataset.originalAction) {
                form.action = form.dataset.originalAction;
            }
        }

        syncGlobalWallCheckboxState(state);

        window.handleWallAnonClick(e.target);
    });

    u(document).on('change', 'input[name="nsfw"]', function (e) {
        const state = getWallCheckboxState(e.target);
        state.nsfw = e.target.checked;
        syncGlobalWallCheckboxState(state);
    });
}

function switchAvatar(el, targetType) {
    const formContext = el.closest('#write') || el.closest('form');
    const userImg = formContext ? formContext.querySelector('.post_field_user_image') : document.querySelector('.post_field_user_image');
    const groupImg = formContext ? formContext.querySelector('.post_field_user_image_group') : document.querySelector('.post_field_user_image_group');
    const anonImg = formContext ? formContext.querySelector('.post_field_user_image_anon') : document.querySelector('.post_field_user_image_anon');
    const avatarLink = formContext ? formContext.querySelector('.post_field_user_link') : document.querySelector('.post_field_user_link');

    if (!userImg) return;

    const targetImg = targetType === 'group' ? groupImg : anonImg;
    if (!targetImg) return;

    if (el.checked) {
        if (targetType === 'group' && anonImg) anonImg.style.opacity = '0';
        if (targetType === 'anon' && groupImg) groupImg.style.opacity = '0';

        userImg.classList.remove('avatar-showing');
        userImg.classList.add('avatar-flipping');

        setTimeout(() => {
            targetImg.classList.remove('avatar-flipping');
            targetImg.classList.add('avatar-showing');

            const targetUrl = targetType === 'group' ? targetImg.dataset.groupUrl : targetImg.dataset.anonUrl;
            if (avatarLink && targetUrl) {
                avatarLink.href = targetUrl;
            }

            setTimeout(() => {
                userImg.style.opacity = '0';
                userImg.classList.remove('avatar-flipping');
                targetImg.style.opacity = '1';
                targetImg.classList.remove('avatar-showing');
            }, 150);
        }, 150);
    } else {
        targetImg.classList.remove('avatar-showing');
        targetImg.classList.add('avatar-flipping');

        setTimeout(() => {
            userImg.classList.remove('avatar-flipping');
            userImg.classList.add('avatar-showing');

            if (avatarLink && userImg.dataset.userUrl) {
                avatarLink.href = userImg.dataset.userUrl;
            }

            setTimeout(() => {
                targetImg.style.opacity = '0';
                targetImg.classList.remove('avatar-flipping');
                userImg.style.opacity = '1';
                userImg.classList.remove('avatar-showing');
            }, 150);
        }, 150);
    }
}

window.handleWallAsGroupClick = window.handleWallAsGroupClick || function (el) {
        const state = getWallCheckboxState(el);
        state.as_group = el.checked;

        if (el.checked) {
            state.anon = false;
        } else {
            state.force_sign = false;
            const formContext = el.closest('#write') || el.closest('form') || document;
            const forceSignCheckbox = formContext ? formContext.querySelector('input[name="force_sign"]') : null;
            if (forceSignCheckbox) {
                forceSignCheckbox.checked = false;
            }
        }

        const form = el.closest('form') || document.querySelector('#write form');
        if (form) {
            if (!form.dataset.originalAction) {
                form.dataset.originalAction = form.action;
            }

            const isCommentForm = form.dataset.originalAction && form.dataset.originalAction.includes('/al_comments/create/');

            if (!isCommentForm) {
                const currentUrl = window.location.pathname;
                const groupMatch = currentUrl.match(/^\/club(\d+)/);
                if (groupMatch && el.checked) {
                    form.action = `/wall-${groupMatch[1]}/makePost`;
                } else if (form.dataset.originalAction) {
                    form.action = form.dataset.originalAction;
                }
            }
        }

        switchAvatar(el, 'group');
        syncGlobalWallCheckboxState(state);
    };

window.handleWallAnonClick = window.handleWallAnonClick || function (el) {
        const state = getWallCheckboxState(el);
        state.anon = el.checked;

        if (el.checked) {
            state.as_group = false;
        }

        const form = el.closest('form') || document.querySelector('#write form');
        if (form) {
            if (!form.dataset.originalAction) {
                form.dataset.originalAction = form.action;
            }

            if (form.dataset.originalAction) {
                form.action = form.dataset.originalAction;
            }
        }

        switchAvatar(el, 'anon');
        syncGlobalWallCheckboxState(state);
    };

window.onWallAsGroupClick = window.onWallAsGroupClick || function (el) {
        const forceSignOpt = queryInActiveTippyBox(el, '#forceSignOpt');
        if (forceSignOpt) {
            forceSignOpt.style.setProperty('display', el.checked ? 'flex' : 'none', 'important');
        }

        if (!el.checked) {
            const state = getWallCheckboxState(el);
            state.force_sign = false;
            syncGlobalWallCheckboxState(state);
            const forceSignCheckbox = queryInActiveTippyBox(el, 'input[name="force_sign"]');
            if (forceSignCheckbox) {
                forceSignCheckbox.checked = false;
            }
        }

        const anonOpt = queryInActiveTippyBox(el, '#octoberAnonOpt');
        if (anonOpt) {
            anonOpt.style.setProperty('display', el.checked ? 'none' : 'flex', 'important');
        }

        window.handleWallAsGroupClick(el);
    };

window.onWallAnonClick = window.onWallAnonClick || function (el) {
        const asGroupCheckbox = queryInActiveTippyBox(el, 'input[name="as_group"]');
        if (asGroupCheckbox) {
            asGroupCheckbox.disabled = el.checked;
        }

        window.handleWallAnonClick(el);
    };

function bindComposerSubmitOnce() {
    if (!vkify.bindOnce('composerSubmit', bindComposerSubmitOnce)) return;

    const bumpSelectedTabCountOnNewPost = () => {
        const countEl = document.querySelector('.ui_tab_sel .ui_tab_count');
        if (!countEl) return;

        const initial = parseInt((countEl.textContent || '').trim(), 10);
        if (Number.isNaN(initial)) return;

        const existingIds = new Set(
            Array.from(document.querySelectorAll('.post:not(.reply)[data-id]'))
                .map(n => n.getAttribute('data-id'))
                .filter(Boolean)
        );

        let done = false;
        const finalize = () => {
            if (done) return;
            done = true;
            try { observer.disconnect(); } catch (e) { }
            try { clearTimeout(timer); } catch (e) { }
        };

        const tryIncrement = () => {
            if (done) return;
            const nodes = document.querySelectorAll('.post:not(.reply)[data-id]');
            for (const n of nodes) {
                const id = n.getAttribute('data-id');
                if (id && !existingIds.has(id)) {
                    const current = parseInt((countEl.textContent || '').trim(), 10);
                    if (!Number.isNaN(current)) {
                        countEl.textContent = String(current + 1);
                    }
                    finalize();
                    return;
                }
            }
        };

        const observer = new MutationObserver(() => {
            tryIncrement();
        });
        observer.observe(document.body, { childList: true, subtree: true });

        const timer = setTimeout(() => {
            finalize();
        }, 5000);
    };

    u(document).on('submit', '#write form', function (e) {
        const form = e.target;

        syncWallCheckboxHiddenInputs(form);

        resetWallCheckboxStates(form);
        bumpSelectedTabCountOnNewPost();
    });
}

vkify.once('initTextareaInteraction', () => {
    window.initTextareaInteraction = function () {
        if (!vkify.bindOnce('textareaInteraction', window.initTextareaInteraction)) return;

        const showComposer = (target) => {
            if (target.tagName === 'TEXTAREA' || target.classList?.contains('submit_post_field')) {
                target.closest('.model_content_textarea')?.classList.add('shown');
            }
        };

        ['focus', 'input', 'click'].forEach(event => {
            document.addEventListener(event, e => showComposer(e.target), event === 'focus');
        });

        const checkAttachments = () => {
            document.querySelectorAll('.model_content_textarea').forEach(box => {
                const horizontal = box.querySelector('.post-horizontal');
                const vertical = box.querySelector('.post-vertical');
                if ((horizontal?.children.length || vertical?.children.length)) {
                    box.classList.add('shown');
                }
            });
        };

        checkAttachments();
        vkify.observeDOM(checkAttachments, {
            filter: m => m.type === 'childList'
        });
    };
});

setupTooltipCheckboxListeners();
bindComposerSubmitOnce();
bindSourceAttacherOnce();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        window.initTextareaInteraction();
    });
} else {
    window.initTextareaInteraction();
}

function initSuggestedTabHooksOnce() {
    if (!ge('__vkifyEnableSuggestedWallTab')) return;
    if (!vkify.bindOnce('suggestedTabHooks', initSuggestedTabHooksOnce)) return;

    const addSuggestedTabToWall = () => {
        const currentUrl = window.location.pathname;
        const groupMatch = currentUrl.match(/^\/club(\d+)/);
        if (groupMatch) {
            const groupId = groupMatch[1];
            const suggListElement = document.querySelector('.sugglist');
            if (suggListElement) {
                const wallTabs = document.querySelector('#wall_top_tabs');
                if (wallTabs) {
                    const existingTab = wallTabs.querySelector('#wall_tab_suggested');
                    if (existingTab) {
                        return;
                    }

                    const countMatch = suggListElement.textContent.match(/(\d+)/);
                    const suggestedCount = countMatch ? countMatch[1] : '0';

                    const suggestedTab = document.createElement('li');
                    suggestedTab.id = 'wall_tab_suggested';
                    suggestedTab.innerHTML = `
                        <a class="ui_tab" href="/club${groupId}/suggested">
                            ${tr('suggested')}
                            <span class="ui_tab_count">${suggestedCount}</span>
                        </a>
                    `;
                    wallTabs.appendChild(suggestedTab);
                }
            }
        }
    };

    window.addSuggestedTabToWall = addSuggestedTabToWall;

    vkify.onPage(addSuggestedTabToWall);
}

initSuggestedTabHooksOnce();

vkify.once('reportPost', () => {
    window.reportPost = function (postId) {
        let uReportMsgTxt = tr("going_to_report_post");
        uReportMsgTxt += "<br/>" + tr("report_question_text");
        uReportMsgTxt += "<br/><br/><b>" + tr("report_reason") + "</b>: <input type='text' id='uReportMsgInput' placeholder='" + tr("reason") + "' />";

        MessageBox(tr("report_question"), uReportMsgTxt, [tr("confirm_m"), tr("cancel")], [
            async () => {
                const reasonInput = document.querySelector('#uReportMsgInput');
                const reason = reasonInput?.value?.trim() ?? '';

                try {
                    const params = new URLSearchParams({ reason, type: 'post' });
                    const response = await fetch(`/report/${postId}?${params.toString()}`, { method: 'GET' });
                    const body = await response.text();
                    if (!response.ok || body.indexOf('reason') === -1) {
                        MessageBox(tr('error'), tr('error_sending_report'), ['OK'], [Function.noop]);
                        return;
                    }

                    MessageBox(tr('action_successfully'), tr('will_be_watched'), ['OK'], [Function.noop]);
                } catch (err) {
                    MessageBox(tr('error'), tr('error_sending_report'), ['OK'], [Function.noop]);
                }
            },
            Function.noop
        ]);
    };
});

function bindPostDeleteConfirmOnce() {
    if (!vkify.bindOnce('postDeleteConfirm', bindPostDeleteConfirmOnce)) return;

    document.addEventListener('click', function (e) {
        const deleteLink = e.target.closest('a.delete');
        if (!deleteLink || deleteLink.dataset.deleting) return;

        const href = deleteLink.getAttribute('href');
        if (!href || !href.includes('/wall')) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        let postElement = deleteLink.closest('.post');
        if (!postElement) {
            const match = href.match(/wall(-?\d+_\d+)/);
            if (match?.[1]) {
                postElement = document.querySelector(`.post[data-id="${match[1]}"]`);
            }
        }
        if (!postElement) return;

        deleteLink.dataset.deleting = '1';

        MessageBox(tr("confirm"), window.vkifylang.postremove, [tr("yes"), tr("cancel")], [
            async () => {
                let contentWrapper = null;

                try {
                    postElement.style.position = 'relative';
                    
                    contentWrapper = document.createElement('div');
                    contentWrapper.style.opacity = '0.25';
                    while (postElement.firstChild) {
                        contentWrapper.appendChild(postElement.firstChild);
                    }
                    postElement.appendChild(contentWrapper);
                    
                    LoaderUtils.show(postElement, { className: 'vkify-post-loader' });
                    await fetch(href, { method: 'POST' });

                    const contentDiv = contentWrapper.querySelector('.post-content') || contentWrapper;
                    const originalHeight = postElement.offsetHeight;

                    postElement.style.height = `${originalHeight}px`;
                    postElement.style.maxHeight = `${originalHeight}px`;
                    postElement.style.overflow = 'hidden';

                    contentDiv.style.transition = 'opacity 300ms ease';
                    contentDiv.style.opacity = '0';

                    await new Promise(resolve => {
                        const handler = evt => {
                            if (evt.propertyName === 'opacity') {
                                contentDiv.removeEventListener('transitionend', handler);
                                resolve();
                            }
                        };
                        contentDiv.addEventListener('transitionend', handler);
                    });

                    postElement.innerHTML = `<div>${window.vkifylang.postremoved}</div>`;
                    postElement.classList.add('post_removed');

                    const removedDiv = postElement.firstElementChild;
                    if (removedDiv) {
                        removedDiv.style.transition = 'opacity 300ms ease';
                        removedDiv.style.opacity = '0';
                        void removedDiv.offsetHeight;
                        removedDiv.style.opacity = '1';

                        await new Promise(resolve => {
                            const handler = evt => {
                                if (evt.propertyName === 'opacity') {
                                    removedDiv.removeEventListener('transitionend', handler);
                                    resolve();
                                }
                            };
                            removedDiv.addEventListener('transitionend', handler);
                        });

                        const newHeight = removedDiv.offsetHeight;
                        postElement.style.transition = 'max-height 300ms ease';
                        postElement.style.maxHeight = `${newHeight}px`;

                        await Promise.race([
                            new Promise(resolve => {
                                const handler = evt => {
                                    if (evt.propertyName === 'max-height') {
                                        postElement.removeEventListener('transitionend', handler);
                                        resolve();
                                    }
                                };
                                postElement.addEventListener('transitionend', handler);
                            }),
                            new Promise(resolve => setTimeout(resolve, 350))
                        ]);

                        postElement.style.height = '';
                        postElement.style.maxHeight = '';
                        postElement.style.overflow = '';
                        postElement.style.transition = '';
                    }

                    const countEl = document.querySelector('.ui_tab_sel .ui_tab_count');
                    if (countEl) {
                        const count = parseInt(countEl.textContent, 10);
                        if (!isNaN(count)) countEl.textContent = Math.max(0, count - 1);
                    }
                } catch (err) {
                    console.error('Failed to delete post:', err);
                } finally {
                    LoaderUtils.hide(postElement);
                    if (contentWrapper && contentWrapper.parentNode === postElement) {
                        while (contentWrapper.firstChild) {
                            postElement.appendChild(contentWrapper.firstChild);
                        }
                        contentWrapper.remove();
                    }
                    postElement.style.position = '';
                    postElement.style.height = '';
                    postElement.style.maxHeight = '';
                    postElement.style.minHeight = '';
                    postElement.style.overflow = '';
                    postElement.style.transition = '';
                    deleteLink.dataset.deleting = '';
                }
            },
            () => deleteLink.dataset.deleting = ''
        ]);
    }, true);
}

bindPostDeleteConfirmOnce();

vkify.hook(vkify, 'onPageReady', () => {
    if (!window.postPopupManager?.currentModal) {
        window.postPopupManager.checkInitialUrl();
        initSuggestedTabHooksOnce();
        bindPostDeleteConfirmOnce();
    }
}, 'after');

vkify.once('editMenuLayout', () => {
    window.__vkifyEditMenuLayout = function(api_post, type, postId) {
        return renderEditMenuLayout(api_post, type, postId);
    };
});

function bindPostEditOnce() {
    if (!vkify.bindOnce('postEdit', bindPostEditOnce)) return;

    document.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('#editPost');
        if (!editBtn) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        const post = u(editBtn).closest('.post');
        if (!post.length) return;

        if (post.hasClass('editing')) {
            post.removeClass('editing');
            return;
        }

        const edit_place_l = post.hasClass('reply') ? post.find('.reply_content > .post_edit') : post.children('.post_edit');
        const edit_place = u(edit_place_l.first());
        const rawId = post.attr('data-id') || '';
        const id = rawId.split('_');
        const type = post.hasClass('reply') ? 'comment' : 'post';

        if (edit_place.html() == '') {
            u(editBtn).addClass('lagged');
            try {
                const params = type == 'post' ? { posts: rawId } : { owner_id: 1, comment_id: id[1] };
                const api_req = await window.OVKAPI.call(`wall.${type == 'post' ? 'getById' : 'getComment'}`, params);
                const api_post = api_req.items[0];

                edit_place.html(window.__vkifyEditMenuLayout(api_post, type, rawId));

                if (api_post.copyright) {
                    edit_place.find('.post-source').html(`
                        <span>${tr('source')}: <a>${escapeHtml(api_post.copyright.link)}</a></span>
                        <div id='remove_source_button'></div>
                    `);
                    edit_place.find('.post-source #remove_source_button').on('click', () => {
                        edit_place.find('.post-source').html('');
                        edit_place.find(`input[name='source']`).attr('value', 'remove');
                    });
                }

                if (api_post.copy_history?.length > 0) {
                    edit_place.find('.post-repost').html(`<span>${tr('has_repost')}.</span>`);
                }

                api_post.attachments.forEach(att => {
                    const t = att.type;
                    let aid = att[t].owner_id + '_' + att[t].id;
                    if (att[t]?.access_key) aid += '_' + att[t].access_key;

                    if (t == 'video' || t == 'photo') {
                        const preview = t == 'photo' ? att[t].sizes[1].url : att[t].image[0].url;
                        window.__appendToTextarea({ type: t, preview, id: aid }, edit_place);
                    } else if (t == 'poll') {
                        window.__appendToTextarea({ type: t, alignment: 'vertical', html: tr('poll'), id: att[t].id, undeletable: true }, edit_place);
                    } else {
                        const found_block = post.find(`div[data-att_type='${t}'][data-att_id='${aid}']`);
                        window.__appendToTextarea({ type: t, alignment: 'vertical', html: found_block.html(), id: aid }, edit_place);
                    }
                });

                window.reinitializeTooltips(edit_place.nodes[0]);

                edit_place.find('.edit_menu #__edit_save').on('click', async (ev) => {
                    const p = {
                        owner_id: id[0],
                        post_id: id[1],
                        message: edit_place.find('.edit_menu textarea').nodes[0].value
                    };
                    const nsfw_mark = edit_place.find(`.edit_menu input[name='nsfw']`);
                    const as_group = edit_place.find(`.edit_menu input[name='as_group']`);
                    const copyright = edit_place.find(`.edit_menu input[name='source']`);
                    const collected_attachments = collect_attachments(edit_place.find('.post-buttons')).join(',');

                    if (nsfw_mark.length > 0) p.explicit = Number(nsfw_mark.nodes[0].checked);
                    p.attachments = collected_attachments.length < 1 ? 'remove' : collected_attachments;
                    if (as_group.length > 0 && as_group.nodes[0].checked) p.from_group = 1;
                    if (copyright.length && copyright.nodes[0].value != 'none') p.copyright = copyright.nodes[0].value;

                    u(ev.target).addClass('lagged');
                    try {
                        if (type == 'post') {
                            await window.OVKAPI.call('wall.edit', p);
                        } else {
                            p.comment_id = id[1];
                            await window.OVKAPI.call('wall.editComment', p);
                        }
                    } catch (err) {
                        fastError(err.message);
                        u(ev.target).removeClass('lagged');
                        return;
                    }

                    const new_post_html = await (await fetch(`/iapi/getPostTemplate/${id[0]}_${id[1]}?type=${type}`, { method: 'POST' })).text();
                    u(ev.target).removeClass('lagged');
                    post.removeClass('editing');
                    post.nodes[0].outerHTML = u(new_post_html).last().outerHTML;
                    bsdnHydrate();
                });

                edit_place.find('.edit_menu #__edit_cancel').on('click', () => post.removeClass('editing'));
            } catch (err) {
                console.error('Failed to load post for editing:', err);
                NewNotification(tr('error'), tr('error_loading_post'), null, () => {}, 4000, false);
            }
            u(editBtn).removeClass('lagged');
        }

        post.addClass('editing');
        const ta = edit_place.find('textarea').first();
        if (ta) window.vkifyTextareaAutosize?.apply?.(ta);
    }, true);
}

bindPostEditOnce();

vkify.once('shareAudioPlaylist', () => {
    window.shareAudioPlaylist = async function (event, owner_id, playlist_id) {
        event.preventDefault();
        event.stopPropagation();

        new CMessageBox({
            title: tr('share'),
            unique_name: 'repost_playlist_modal',
            body: `
                <div class="messagebox-content-header">
                    <vkifyloc name="playlist_share_explain"></vkifyloc>
                </div>
                <div class='display_flex_column' style='margin-top: 10px;'>
                    <b>${tr('auditory')}</b>

                    <div class='display_flex_column' style="gap: 2px;padding-left: 1px;">
                        <label>
                            <input type="radio" name="repost_type" value="wall" checked>
                            ${tr("in_wall")}
                        </label>

                        <label>
                            <input type="radio" name="repost_type" value="group">
                            ${tr("in_group")}
                        </label>

                        <select name="selected_repost_club" style='display:none;'></select>
                    </div>

                    <b>${tr('your_comment')}</b>

                    <div style="padding-left: 1px;">
                        <input type='hidden' id='repost_attachments'>
                        <textarea id='repostMsgInput' placeholder='...'></textarea>

                        <div id="repost_signs" class='display_flex_column' style='display:none;'>
                            <label><input type='checkbox' name="asGroup">${tr('post_as_group')}</label>
                            <label><input type='checkbox' name="signed">${tr('add_signature')}</label>
                        </div>
                    </div>
                </div>
            `,
            buttons: [tr('send'), tr('cancel')],
            callbacks: [
                async () => {
                    const { message, type, club_id, as_group, signed, attachments } = getRepostFormData();
                    const playlistUrl = `${window.location.origin}/playlist${owner_id}_${playlist_id}`;
                    const postText = message ? `${message}\n\n${playlistUrl}` : playlistUrl;

                    const params = {
                        message: postText,
                        owner_id: type === 'group' && club_id !== 0 ? -club_id : window.openvk.current_id
                    };

                    if (as_group) params.from_group = 1;
                    if (signed) params.signed = 1;
                    if (attachments !== '') params.attachments = attachments;

                    try {
                        const res = await window.OVKAPI.call('wall.post', params);
                        NewNotification(tr('information_-1'), tr('shared_succ'), null, () => {
                            window.router.route(`/wall${params.owner_id}_${res.post_id}`);
                        });
                    } catch (e) {
                        console.error(e);
                        fastError(e.message);
                    }
                },
                Function.noop
            ]
        });

        u('.ovk-diag-body').attr('style', 'padding: 18px;');
        bindRepostTypeChange();
        await setupRepostModal();
    };
});

function bindWallSearchOnce() {
    if (!vkify.bindOnce('wallSearch', bindWallSearchOnce)) return;

    const toggleSearchFieldEmptyState = (input) => {
        if (!input) return;
        input.closest('.ui_search')?.classList.toggle('ui_search_field_empty', input.value.length === 0);
    };

    document.addEventListener('click', (e) => {
        const toggle = e.target.closest('.ui_tab_search');
        if (!toggle) return;

        const tabs = toggle.closest('.ui_tabs');
        if (!tabs) return;

        if (tabs.classList.contains('ui_tabs_search_opened')) return;

        e.preventDefault();
        tabs.classList.add('ui_tabs_search_opened');
        const input = tabs.querySelector('.ui_search_field');
        if (input) input.focus();
    }, true);

    document.addEventListener('click', (e) => {
        const reset = e.target.closest('.ui_tab_search_wrap .ui_search_reset');
        if (!reset) return;

        const tabs = reset.closest('.ui_tabs');
        if (!tabs) return;

        tabs.classList.remove('ui_tabs_search_opened');
        const input = tabs.querySelector('.ui_search_field');
        if (input) {
            input.value = '';
            toggleSearchFieldEmptyState(input);
        }
    }, true);

    u(document).on('input', '.ui_tab_search_wrap .ui_search_field', (e) => {
        toggleSearchFieldEmptyState(e.target);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('type') === 'search') {
        const tabs = document.querySelector('#wall_top_tabs');
        if (tabs) tabs.classList.add('ui_tabs_search_opened');
    }
}

bindWallSearchOnce();

vkify.once('repostModalLayout', () => {
    vkify.hook(window, 'repost', (id, repost_type) => {
        const dialogBody = u('.ovk-diag-body');
        if (!dialogBody.length) return;

        const dialog = dialogBody.closest('.ovk-diag-cont');
        const footer = dialog.find('.ovk-diag-action');
        const originalSendBtn = footer.find('button').first();

        footer.attr('style', 'display:none');

        const editMenuButtons = dialogBody.find('.edit_menu_buttons');
        if (!editMenuButtons.length) return;

        const repostSignsEl = dialogBody.find('#repost_signs');
        const hasGroupOpts = repostSignsEl.length > 0;

        const newLayoutHtml = renderRepostBottomLayout();

        editMenuButtons.replace(newLayoutHtml);
        dialogBody.find('.post-buttons').attr('style', 'display:block');

        if (hasGroupOpts) {
            repostSignsEl.attr('style', 'display:none !important');
            const optsTrigger = dialogBody.find('#__vkifyRepostOptsTrigger');

            const origAsGroup = repostSignsEl.find('input[name="asGroup"]');
            const origSigned = repostSignsEl.find('input[name="signed"]');

            const signedOpt = dialogBody.find('#__vkifyRepostSignedOpt');
            dialogBody.find('#__vkifyRepostOptsTooltip input[name="asGroup"]').on('change', (e) => {
                if (origAsGroup.nodes[0]) origAsGroup.nodes[0].checked = e.target.checked;
                signedOpt.attr('style', e.target.checked ? '' : 'display:none');
            });
            dialogBody.find('#__vkifyRepostOptsTooltip input[name="signed"]').on('change', (e) => {
                if (origSigned.nodes[0]) origSigned.nodes[0].checked = e.target.checked;
            });

            dialogBody.on('change', `input[name='repost_type']`, (e) => {
                optsTrigger.attr('style', e.target.value === 'group' ? '' : 'display:none');
                repostSignsEl.attr('style', 'display:none !important');
            });
        }

        dialogBody.find('#__vkifyRepostSend').on('click', () => {
            if (originalSendBtn) originalSendBtn.click();
        });

        setTimeout(() => {
            window.reinitializeTooltips?.(dialogBody.nodes[0]);
        }, 0);
    }, 'then');
});

// Post template from post-template.js
const Hb = window.Handlebars;

const tplMapIcon = `<svg class="map_svg_icon" width="13" height="12" viewBox="0 0 3.4395833 3.175"><g><path d="M 1.7197917 0.0025838216 C 1.1850116 0.0049444593 0.72280427 0.4971031 0.71520182 1.0190592 C 0.70756921 1.5430869 1.7223755 3.1739665 1.7223755 3.1739665 C 1.7223755 3.1739665 2.7249195 1.5439189 2.7243815 0.99632161 C 2.7238745 0.48024825 2.2492929 0.00024648357 1.7197917 0.0025838216 z M 1.7197917 0.52606608 A 0.48526123 0.48526123 0 0 1 2.2050334 1.0113078 A 0.48526123 0.48526123 0 0 1 1.7197917 1.4965495 A 0.48526123 0.48526123 0 0 1 1.23455 1.0113078 A 0.48526123 0.48526123 0 0 1 1.7197917 0.52606608 z " /></g></svg>`;

const postTpl = Hb.compile(
`<div class="post page_block scroll_node" data-id="{{pretty_id}}">
    <div class="post_header">
        <a class="post_image" href="{{owner.domain}}">
            <img src="{{owner.photo_50}}" width="50" class="post-avatar">
        </a>
        <div class="post_header_info">
            <div class="post_author">
                <a class="author" href="{{owner.domain}}">{{owner.name}}</a>
                {{#if owner.verified}}<span class="page_verified"></span>{{/if}}
            </div>
            <div class="post_date">
                <a href="{{url}}" class="post_link">{{{created}}}</a>
            </div>
        </div>
    </div>
    <div class="post-content">
        <div class="text wall_text">
            <div class="really_text wall_post_text">{{message}}</div>
        </div>
        {{#if geo.name}}
        <div class="post-geo">
            <span class="post-geo-link">
                {{{map_icon}}}
                {{geo.name}}
            </span>
        </div>
        {{/if}}
    </div>
</div>`
);

function vkifyTplPost(post) {
    return postTpl({
        pretty_id: post.pretty_id || '',
        owner: {
            name: post.owner?.name || '',
            domain: post.owner?.domain || '',
            photo_50: post.owner?.photo_50 || '',
            verified: !!post.owner?.verified
        },
        url: post.url || '',
        created: post.created || '',
        message: post.message || '',
        geo: post.geo ? { name: post.geo.name || '' } : null,
        map_icon: tplMapIcon
    });
}

vkify.hook(window, 'tplPost', vkifyTplPost, 'replace');

// Stock #__ignoreSomeoneFeed handler assumes .scroll_node wraps .post as
// separate elements. In our template both classes sit on the same <div>, so
// find('.post') inside scroll_node returns nothing on unignore. We intercept
// in the capture phase (runs before stock's bubbling handler), take over, and
// animate the transition the same way post deletion does.
vkify.bindOnce('ignoreFeedFix', () => {
    // Replace the post's contents in-place with new HTML, mirroring the
    // post-delete animation: fade-out current content, swap innerHTML,
    // fade-in new content, animate height to its new natural size.
    async function morphPostContents(post, newInnerHTML, finalClasses) {
        post.style.position = 'relative';

        const wrapper = document.createElement('div');
        wrapper.style.opacity = '1';
        wrapper.style.transition = 'opacity 300ms ease';
        while (post.firstChild) wrapper.appendChild(post.firstChild);
        post.appendChild(wrapper);

        const originalHeight = post.offsetHeight;
        post.style.height   = `${originalHeight}px`;
        post.style.overflow = 'hidden';

        void wrapper.offsetHeight;
        wrapper.style.opacity = '0';

        await Promise.race([
            new Promise(resolve => {
                const handler = evt => {
                    if (evt.propertyName === 'opacity') {
                        wrapper.removeEventListener('transitionend', handler);
                        resolve();
                    }
                };
                wrapper.addEventListener('transitionend', handler);
            }),
            new Promise(resolve => setTimeout(resolve, 350))
        ]);

        post.innerHTML = newInnerHTML;
        if (finalClasses) {
            post.className = finalClasses;
        }

        const newChild = post.firstElementChild;
        if (!newChild) return;

        newChild.style.opacity = '0';
        newChild.style.transition = 'opacity 300ms ease';
        void newChild.offsetHeight;
        newChild.style.opacity = '1';

        await Promise.race([
            new Promise(resolve => {
                const handler = evt => {
                    if (evt.propertyName === 'opacity') {
                        newChild.removeEventListener('transitionend', handler);
                        resolve();
                    }
                };
                newChild.addEventListener('transitionend', handler);
            }),
            new Promise(resolve => setTimeout(resolve, 350))
        ]);

        const newHeight = newChild.offsetHeight;
        // Transition height itself so the box animates in either direction
        // (grow for undo, shrink for ignore). max-height alone can't grow
        // past style.height, and clearing height breaks shrink animations.
        post.style.transition = 'height 300ms ease';
        post.style.height     = `${newHeight}px`;

        await Promise.race([
            new Promise(resolve => {
                const handler = evt => {
                    if (evt.propertyName === 'height') {
                        post.removeEventListener('transitionend', handler);
                        resolve();
                    }
                };
                post.addEventListener('transitionend', handler);
            }),
            new Promise(resolve => setTimeout(resolve, 350))
        ]);

        post.style.position   = '';
        post.style.height     = '';
        post.style.overflow   = '';
        post.style.transition = '';
        newChild.style.transition = '';
        newChild.style.opacity    = '';
    }

    document.addEventListener('click', async (e) => {
        const target = e.target.closest('#__ignoreSomeoneFeed');
        if (!target) return;

        e.stopImmediatePropagation();
        e.preventDefault();

        const ENTITY_ID = Number(target.dataset.id);
        const VAL       = Number(target.dataset.val);
        const ACT       = VAL === 1 ? 'ignore' : 'unignore';
        const METHOD    = ACT === 'ignore' ? 'addBan' : 'deleteBan';
        const PARAM     = ENTITY_ID < 0 ? 'group_ids' : 'user_ids';
        const ENTITY    = ENTITY_ID < 0 ? 'club' : 'user';
        const URL       = `/method/newsfeed.${METHOD}?auth_mechanism=roaming&${PARAM}=${Math.abs(ENTITY_ID)}`;

        // The post element is what we morph. On ignore, target is inside
        // .post. On unignore, target is inside .ignore-message — but in our
        // setup we morph the post in-place, so unignore's target IS inside
        // the same .post element (the post was replaced in-place, not
        // moved to a sibling).
        const post = target.closest('.post');
        if (!post) return;

        post.classList.add('lagged');
        target.style.pointerEvents = 'none';

        const res  = await fetch(URL);
        const json = await res.json();

        target.style.pointerEvents = '';

        if (json.error_code) {
            post.classList.remove('lagged');
            switch (json.error_code) {
                case -10: fastError(';/'); break;
                case -50: fastError(tr('ignored_sources_limit')); break;
                default:  fastError(json.error_msg); break;
            }
            return;
        }

        if (json.response !== 1) {
            post.classList.remove('lagged');
            return;
        }

        post.classList.remove('lagged');

        if (ACT === 'ignore') {
            const ignoredText  = window.vkifylang[`feed_${ENTITY}_ignored`];
            const unignoreText = window.vkifylang.feed_unignore;
            const newHTML = `<div class="ignore-message">${ignoredText} <a id="__ignoreSomeoneFeed" data-val="0" data-id="${ENTITY_ID}" href="#">${unignoreText}</a></div>`;
            // Destroy active tippys inside the post first. tooltips.js moves
            // template nodes out of the DOM into a registry when creating a
            // tooltip; destroying triggers onDestroy → restoreTemplateNode,
            // which reinserts the template so our serialization captures it.
            window.Tooltips?.destroyTooltips?.(post);
            // Stash the original markup so we can restore on unignore.
            const originalHTML = post.innerHTML;
            const originalCls  = post.className;
            post.dataset.preIgnoreHtml      = encodeURIComponent(originalHTML);
            post.dataset.preIgnoreClassName = originalCls;
            await morphPostContents(post, newHTML, `${originalCls} post-hidden`);
        } else {
            const originalHTML = post.dataset.preIgnoreHtml ? decodeURIComponent(post.dataset.preIgnoreHtml) : '';
            const originalCls  = post.dataset.preIgnoreClassName ?? post.className.replace(/\bpost-hidden\b/g, '').trim();
            delete post.dataset.preIgnoreHtml;
            delete post.dataset.preIgnoreClassName;
            if (!originalHTML) {
                post.classList.remove('post-hidden');
                return;
            }
            // Wrap in a single root so morphPostContents' firstElementChild logic works for animation.
            await morphPostContents(post, `<div class="vkify-post-restore-wrap">${originalHTML}</div>`, originalCls);
            // Unwrap: move children up and remove the wrapper.
            const wrap = post.querySelector(':scope > .vkify-post-restore-wrap');
            if (wrap) {
                while (wrap.firstChild) post.appendChild(wrap.firstChild);
                wrap.remove();
            }
            // The serialized innerHTML preserved any aria-describedby / aria-expanded
            // attributes that tippy had set on hovered triggers. tooltips.js's
            // hasTippyInstance() treats those as "already initialized" and refuses
            // to re-bind. Strip them and reinitialize tooltips on the post.
            post.querySelectorAll('[data-tippy-content-id]').forEach(el => {
                el.removeAttribute('aria-describedby');
                el.removeAttribute('aria-expanded');
            });
            window.Tooltips?.reinitializeTooltips?.(post);
        }
    }, true);
});

})();
