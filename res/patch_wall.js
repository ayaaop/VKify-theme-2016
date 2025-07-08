u(document).on("click", "#editPost", async (e) => {
    e.stopImmediatePropagation();

    const target = u(e.target)
    const post = target.closest(".post")
    const content = post.find(".post-content")

    const edit_place_l = post.hasClass('reply')
        ? post.find('.reply_content > .post_edit')
        : post.children('.post_edit')

    const edit_place = u(edit_place_l.first())
    const id = post.attr('data-id').split('_')

    let type = 'post'
    if (post.hasClass('reply')) {
        type = 'comment'
    }

    if (edit_place.html() == '') {
        target.addClass('lagged')
        const params = {}
        if (type == 'post') {
            params['posts'] = post.attr('data-id')
        } else {
            params['owner_id'] = 1
            params['comment_id'] = id[1]
        }

        const api_req = await window.OVKAPI.call(`wall.${type == 'post' ? 'getById' : 'getComment'}`, params)
        const api_post = api_req.items[0]

        edit_place.html(`
            <div class='edit_menu module_body'>
                <form id="write">
                    <textarea placeholder="${tr('edit')}" name="text" style="width: 100%;resize: none;" class="expanded-textarea small-textarea">${api_post.text}</textarea>
                    
                    <div class='post-buttons'>
                        <div class="post-horizontal"></div>
                        <div class="post-vertical"></div>
                        <div class="post-repost"></div>
                        <div class="post-source"></div>

                        <div class='post-opts'>
                            ${type == 'post' ? `<label>
                                <input type="checkbox" name="nsfw" ${api_post.is_explicit ? 'checked' : ''} /> ${tr('contains_nsfw')}
                            </label>` : ''}

                            ${api_post.owner_id < 0 && api_post.can_pin ? `<label>
                                <input type="checkbox" name="as_group" ${api_post.from_id < 0 ? 'checked' : ''} /> ${tr('post_as_group')}
                            </label>` : ''}
                        </div>

                        <input type="hidden" id="source" name="source" value="none" />
                        <div class="post-bottom-acts">
                            <div id="wallAttachmentMenu" class="page_add_media post-attach-menu">
                                <a class="attach_photo" id="__photoAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                </a>
                                <a class="attach_video" id="__videoAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                </a>
                                <a class="attach_audio" id="__audioAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                </a>
                                <a class="post-attach-menu__trigger" id="moreAttachTrigger">
                                    ${tr('show_more')}
                                </a>
                                <div class="tippy-menu" id="moreAttachTooltip2">
                                        <a class="attach_document" id="__documentAttachment">
                                            <div class="post-attach-menu__icon"></div>
                                            ${tr('document')}
                                        </a>
                                        ${type == 'post' ? `<a class="attach_note" id="__notesAttachment">
                                            <div class="post-attach-menu__icon"></div>
                                            ${tr('note')}
                                        </a>
                                        <a class="attach_source" id='__sourceAttacher'>
                                            <div class="post-attach-menu__icon"></div>
                                            ${tr('source')}
                                        </a>` : ''}
                                </div>
                            </div>
                            <div class='edit_menu_buttons post-bottom-buttons'>
                                <input class='button button_light' type='button' id='__edit_cancel' value='${tr('cancel')}'>
                                <input class='button' type='button' id='__edit_save' value='${tr('save')}'>
                            </div>
                        </div>
                    </div>
                </form>
            </div>`)

        if (api_post.copyright) {
            edit_place.find('.post-source').html(`
                <span>${tr('source')}: <a>${escapeHtml(api_post.copyright.link)}</a></span>
                <div id='remove_source_button'></div>
            `)

            edit_place.find('.post-source #remove_source_button').on('click', (e) => {
                edit_place.find('.post-source').html('')
                edit_place.find(`input[name='source']`).attr('value', 'remove')
            })
        }

        if (api_post.copy_history && api_post.copy_history.length > 0) {
            edit_place.find('.post-repost').html(`
                <span>${tr('has_repost')}.</span>
            `)
        }

        api_post.attachments.forEach(att => {
            const type = att.type
            let aid = att[type].owner_id + '_' + att[type].id
            if (att[type] && att[type].access_key) {
                aid += "_" + att[type].access_key
            }

            if (type == 'video' || type == 'photo') {
                let preview = ''

                if (type == 'photo') {
                    preview = att[type].sizes[1].url
                } else {
                    preview = att[type].image[0].url
                }

                __appendToTextarea({
                    'type': type,
                    'preview': preview,
                    'id': aid
                }, edit_place)
            } else if (type == 'poll') {
                __appendToTextarea({
                    'type': type,
                    'alignment': 'vertical',
                    'html': tr('poll'),
                    'id': att[type].id,
                    'undeletable': true,
                }, edit_place)
            } else {
                const found_block = post.find(`div[data-att_type='${type}'][data-att_id='${aid}']`)
                __appendToTextarea({
                    'type': type,
                    'alignment': 'vertical',
                    'html': found_block.html(),
                    'id': aid,
                }, edit_place)
            }
        })

        target.removeClass('lagged')

        edit_place.find('.edit_menu #__edit_save').on('click', async (ev) => {
            const text_node = edit_place.find('.edit_menu textarea')
            const nsfw_mark = edit_place.find(`.edit_menu input[name='nsfw']`)
            const as_group = edit_place.find(`.edit_menu input[name='as_group']`)
            const copyright = edit_place.find(`.edit_menu input[name='source']`)
            const collected_attachments = collect_attachments(edit_place.find('.post-buttons')).join(',')
            const params = {}

            params['owner_id'] = id[0]
            params['post_id'] = id[1]
            params['message'] = text_node.nodes[0].value

            if (nsfw_mark.length > 0) {
                params['explicit'] = Number(nsfw_mark.nodes[0].checked)
            }

            params['attachments'] = collected_attachments
            if (collected_attachments.length < 1) {
                params['attachments'] = 'remove'
            }

            if (as_group.length > 0 && as_group.nodes[0].checked) {
                params['from_group'] = 1
            }

            if (copyright.nodes[0].value != 'none') {
                params['copyright'] = copyright.nodes[0].value
            }

            u(ev.target).addClass('lagged')
            try {
                if (type == 'post') {
                    await window.OVKAPI.call('wall.edit', params)
                } else {
                    params['comment_id'] = id[1]
                    await window.OVKAPI.call('wall.editComment', params)
                }
            } catch (e) {
                fastError(e.message)
                u(ev.target).removeClass('lagged')
                return
            }

            const new_post_html = await (await fetch(`/iapi/getPostTemplate/${id[0]}_${id[1]}?type=${type}`, {
                'method': 'POST'
            })).text()
            u(ev.target).removeClass('lagged')
            post.removeClass('editing')
            post.nodes[0].outerHTML = u(new_post_html).last().outerHTML

            bsdnHydrate()
        })

        edit_place.find('.edit_menu #__edit_cancel').on('click', (e) => {
            post.removeClass('editing')
        })

        tippy(edit_place.find('#moreAttachTrigger').nodes[0], {
            content: edit_place.find('#moreAttachTooltip2').nodes[0],
            allowHTML: true,
            interactive: true,
            trigger: 'mouseenter',
            placement: 'bottom',
            theme: 'light vk'
        })
    }

    post.addClass('editing')
})

window.wallCheckboxStates = {
    as_group: false,
    force_sign: false,
    anon: false,
    nsfw: false
};

function resetWallCheckboxStates() {
    window.wallCheckboxStates.as_group = false;
    window.wallCheckboxStates.force_sign = false;
    window.wallCheckboxStates.anon = false;
    window.wallCheckboxStates.nsfw = false;
}

function setupTooltipCheckboxListeners() {
    u(document).on('change', 'input[name="as_group"]', function(e) {
        window.wallCheckboxStates.as_group = e.target.checked;

        if (e.target.checked) {
            window.wallCheckboxStates.anon = false;
            const anonCheckbox = document.querySelector('input[name="anon"]');
            if (anonCheckbox) {
                anonCheckbox.checked = false;
            }
        }
    });

    u(document).on('change', 'input[name="force_sign"]', function(e) {
        window.wallCheckboxStates.force_sign = e.target.checked;
    });

    u(document).on('change', 'input[name="anon"]', function(e) {
        window.wallCheckboxStates.anon = e.target.checked;

        if (e.target.checked) {
            window.wallCheckboxStates.as_group = false;
            const asGroupCheckbox = document.querySelector('input[name="as_group"]');
            if (asGroupCheckbox) {
                asGroupCheckbox.checked = false;
            }

            const form = document.querySelector('#write form');
            if (form && form.dataset.originalAction) {
                form.action = form.dataset.originalAction;
            }
        }

        if (window.handleWallAnonClick) {
            window.handleWallAnonClick(e.target);
        }
    });

    u(document).on('change', 'input[name="nsfw"]', function(e) {
        window.wallCheckboxStates.nsfw = e.target.checked;
    });
}

setupTooltipCheckboxListeners();

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

window.handleWallAsGroupClick = function(el) {
    window.wallCheckboxStates.as_group = el.checked;

    if (el.checked) {
        window.wallCheckboxStates.anon = false;
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
};

window.handleWallAnonClick = function(el) {
    window.wallCheckboxStates.anon = el.checked;

    if (el.checked) {
        window.wallCheckboxStates.as_group = false;
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
};

u(document).on("submit", "#write form", function(e) {
    const form = e.target;

    const checkboxes = [
        { name: 'as_group', checked: window.wallCheckboxStates.as_group },
        { name: 'force_sign', checked: window.wallCheckboxStates.force_sign },
        { name: 'anon', checked: window.wallCheckboxStates.anon },
        { name: 'nsfw', checked: window.wallCheckboxStates.nsfw }
    ];

    if (window.wallCheckboxStates.anon && window.wallCheckboxStates.as_group) {
        checkboxes.find(cb => cb.name === 'as_group').checked = false;
    }

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let hiddenInput = form.querySelector(`input[name="${checkbox.name}"][type="hidden"]`);
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = checkbox.name;
                hiddenInput.value = 'on';
                form.appendChild(hiddenInput);
            } else {
                hiddenInput.value = 'on';
            }
        }
    });

    resetWallCheckboxStates();
});

u(document).on("click", "#write input[type='submit']", function(e) {
    const form = u(e.target).closest('form').nodes[0];

    const checkboxes = [
        { name: 'as_group', checked: window.wallCheckboxStates.as_group },
        { name: 'force_sign', checked: window.wallCheckboxStates.force_sign },
        { name: 'anon', checked: window.wallCheckboxStates.anon },
        { name: 'nsfw', checked: window.wallCheckboxStates.nsfw }
    ];

    if (window.wallCheckboxStates.anon && window.wallCheckboxStates.as_group) {
        checkboxes.find(cb => cb.name === 'as_group').checked = false;
    }

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            let hiddenInput = form.querySelector(`input[name="${checkbox.name}"][type="hidden"]`);
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = checkbox.name;
                hiddenInput.value = 'on';
                form.appendChild(hiddenInput);
            } else {
                hiddenInput.value = 'on';
            }
        }
    });

    resetWallCheckboxStates();
});

window.initTextareaInteraction = function() {
    document.addEventListener('focus', function(e) {
        if (e.target && (e.target.tagName === 'TEXTAREA' || (e.target.classList && e.target.classList.contains('submit_post_field')))) {
            const submitPostBox = e.target.closest('.model_content_textarea');
            if (submitPostBox) {
                submitPostBox.classList.add('shown');
            }
        }
    }, true);

    document.addEventListener('input', function(e) {
        if (e.target && (e.target.tagName === 'TEXTAREA' || (e.target.classList && e.target.classList.contains('submit_post_field')))) {
            const submitPostBox = e.target.closest('.model_content_textarea');
            if (submitPostBox) {
                submitPostBox.classList.add('shown');
            }
        }
    });

    document.addEventListener('click', function(e) {
        if (e.target && (e.target.tagName === 'TEXTAREA' || (e.target.classList && e.target.classList.contains('submit_post_field')))) {
            const submitPostBox = e.target.closest('.model_content_textarea');
            if (submitPostBox) {
                submitPostBox.classList.add('shown');
            }
        }
    });
};

document.addEventListener('DOMContentLoaded', function() {
    window.initTextareaInteraction();
});

function reportPost(postId) {
    uReportMsgTxt = tr("going_to_report_post");
    uReportMsgTxt += "<br/>" + tr("report_question_text");
    uReportMsgTxt += "<br/><br/><b>" + tr("report_reason") + "</b>: <input type='text' id='uReportMsgInput' placeholder='" + tr("reason") + "' />"

    MessageBox(tr("report_question"), uReportMsgTxt, [tr("confirm_m"), tr("cancel")], [
        (function () {
            res = document.querySelector("#uReportMsgInput").value;
            xhr = new XMLHttpRequest();
            xhr.open("GET", "/report/" + postId + "?reason=" + res + "&type=post", true);
            xhr.onload = (function () {
                if (xhr.responseText.indexOf("reason") === -1)
                    MessageBox(tr("error"), tr("error_sending_report"), ["OK"], [Function.noop]);
                else
                    MessageBox(tr("action_successfully"), tr("will_be_watched"), ["OK"], [Function.noop]);
            });
            xhr.send(null);
        }),
        Function.noop
    ]);
}

function addSuggestedTabToWall() {
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
}

document.addEventListener('DOMContentLoaded', function() {
    addSuggestedTabToWall();
});

if (window.router && window.router.addEventListener) {
    window.router.addEventListener('route', addSuggestedTabToWall);
} else {
    document.addEventListener('page:loaded', addSuggestedTabToWall);
}

window.onWallAsGroupClick = function(el) {
    const forceSignOpt = document.querySelector("#forceSignOpt");
    if (forceSignOpt) {
        forceSignOpt.style.display = el.checked ? "block" : "none";
    }

    const anonOpt = document.querySelector("#octoberAnonOpt");
    if (anonOpt) {
        anonOpt.style.display = el.checked ? "none" : "block";
    }

    if (window.handleWallAsGroupClick) {
        window.handleWallAsGroupClick(el);
    }
};

window.onWallAnonClick = function(el) {
    const asGroupCheckbox = document.querySelector('input[name="as_group"]');
    if (asGroupCheckbox) {
        asGroupCheckbox.disabled = el.checked;
    }

    if (window.handleWallAnonClick) {
        window.handleWallAnonClick(el);
    }
};

function toggleLongText(el) {
    const container = el.parentNode;
    const truncated = container.querySelector('.truncated_text');
    const full = container.querySelector('.full_text');

    if (!truncated || !full) {
        return;
    }

    if(full.classList.contains('hidden')) {
        truncated.style.display = 'none';
        full.classList.remove('hidden');
        el.innerHTML = "<vkifyloc name='show_less'></vkifyloc>";
    } else {
        truncated.style.display = 'inline';
        full.classList.add('hidden');
        el.textContent = tr('show_more');
    }
}

window.toggleLongText = toggleLongText;

let sourceAttacherContext = null;

u(document).on('click', '#__sourceAttacher', (e) => {
    sourceAttacherContext = u(e.target).closest('#write');
});

u(document).on('click', '.ovk-diag-action #__setsrcbutton', async function(ev) {
    ev.preventDefault();
    ev.stopImmediatePropagation();

    if (!sourceAttacherContext || !sourceAttacherContext.length) return;

    const source_input = u(`#source_flex_kunteynir input[type='text']`);
    const source_value = source_input.nodes[0].value ?? '';

    if(source_value.length < 1) {
        return;
    }

    ev.target.classList.add('lagged');

    try {
        const response = await fetch(`/method/wall.checkCopyrightLink?auth_mechanism=roaming&link=${encodeURIComponent(source_value)}`);
        const result = await response.json();

        if(result.error_code) {
            __removeDialog();
            switch(result.error_code) {
                case 3102:
                    fastError(tr('error_adding_source_regex'));
                    return;
                case 3103:
                    fastError(tr('error_adding_source_long'));
                    return;
                case 3104:
                    fastError(tr('error_adding_source_sus'));
                    return;
                default:
                    fastError(tr('error_adding_source_regex'));
                    return;
            }
        }

        __removeDialog();
        const source_output = sourceAttacherContext.find(`input[name='source']`);
        source_output.attr('value', source_value);

        sourceAttacherContext.find('.post-source').html(`
            <span>${tr('source')}: <a target='_blank' href='${source_value.escapeHtml()}'>${ovk_proc_strtr(source_value.escapeHtml(), 50)}</a></span>
            <div id='remove_source_button'></div>
        `);

        sourceAttacherContext.find('.post-source #remove_source_button').on('click', function() {
            const writeContainer = u(this).closest('#write');
            writeContainer.find('.post-source').html('');
            writeContainer.find(`input[name='source']`).attr('value', 'none');
        });

    } catch (error) {
        __removeDialog();
        fastError('Error validating source');
    }

    sourceAttacherContext = null;
});

let graffitiContext = null;

u(document).on('click', '.attach_graffiti', (e) => {
    graffitiContext = u(e.target).closest('#write');
    window.graffitiWriteContext = graffitiContext;
});

async function OpenVideo(video_arr = [], init_player = true) {
    CMessageBox.toggleLoader();
    const video_owner = video_arr[0];
    const video_id = video_arr[1];
    let video_api = null;

    try {
        video_api = await window.OVKAPI.call('video.get', {'videos': `${video_owner}_${video_id}`, 'extended': 1});

        if(!video_api.items || !video_api.items[0]) {
            throw new Error('Not found');
        }
    } catch(e) {
        CMessageBox.toggleLoader();
        fastError(e.message);
        return;
    }

    const video_object = video_api.items[0];
    const pretty_id = `${video_object.owner_id}_${video_object.id}`;
    const author = find_author(video_object.owner_id, video_api.profiles, video_api.groups);

    let player_html = '';
    if(init_player) {
        if(video_object.platform == 'youtube') {
            const video_url = new URL(video_object.player);
            const video_id = video_url.pathname.replace('/', '');
            player_html = `
                <div class="video-player-container" style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
                    <iframe
                       style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                       src="https://www.youtube-nocookie.com/embed/${video_id}"
                       frameborder="0"
                       sandbox="allow-same-origin allow-scripts allow-popups"
                       allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                       allowfullscreen></iframe>
                </div>
            `;
        } else {
            if(!video_object.is_processed) {
                player_html = `<span class='gray'>${tr('video_processing')}</span>`;
            } else {
                const author_name = `${author.first_name} ${author.last_name}`;
                player_html = `
                    <div class="video-player-container" style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
                        <div class='bsdn media' data-name="${escapeHtml(video_object.title)}" data-author="${escapeHtml(author_name)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                            <video class='media' src='${video_object.player}' style="width: 100%; height: 100%; object-fit: contain;"></video>
                        </div>
                    </div>
                `;
            }
        }
    }

    const msgbox = new CMessageBox({
        title: escapeHtml(video_object.title),
        close_on_buttons: false,
        warn_on_exit: false,
        custom_template: u(`
        <div class="ovk-photo-view-dimmer">
            <div class="ovk-modal-video-window">
                <div id="video_top_controls">
                    <div id="__modalPlayerClose" class="video_top_button video_top_close" role="button" tabindex="0" aria-label="Close">
                        <div class="video_close_icon"></div>
                    </div>
                    <div id="__modalPlayerMinimize" class="video_top_button video_top_minimize">
                        <div class="video_minimize_icon"></div>
                    </div>
                </div>
                <div class="page_block">
                    <div class="video_block_layout">
                        ${player_html}
                    </div>
                    <div class="video_info">
                        <div id='video_info_loader'></div>
                    </div>
                    <div class="clear_fix video_comments" id="video_comments_section" style="display: none;">
                        <div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>
                    </div>
                </div>
            </div>
        </div>
        `)
    });

    if(video_object.platform != 'youtube' && video_object.is_processed) {
        bsdnInitElement(msgbox.getNode().find('.bsdn').nodes[0]);
    }

    async function loadVideoInfo() {
        try {
            u('#video_info_loader').html(`<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>`);

            const fetcher = await fetch(`/video${pretty_id}`);
            const fetch_r = await fetcher.text();
            const dom_parser = new DOMParser();
            const results = u(dom_parser.parseFromString(fetch_r, 'text/html'));
            const videoInfo = results.find('.video_info');

            if (videoInfo.length > 0) {
                const viewButton = `<a href="/video${pretty_id}" class="video_view_button button button_light _view_wrap">
                    <span class="video_view_link _link">${tr("view_video")}</span>
                </a>`;
                const moreActions = videoInfo.find('.video_info_more_actions');
                if (moreActions.length > 0) {
                    moreActions.before(viewButton);
                } else {
                    videoInfo.append(viewButton);
                }
                msgbox.getNode().find('.video_info').html(videoInfo.html());
                bsdnHydrate();

                setTimeout(() => {
                    if (window.reinitializeTooltips) {
                        window.reinitializeTooltips();
                    }
                }, 200);
            }

            const videoComments = results.find('.video_comments');
            if (videoComments.length > 0) {
                msgbox.getNode().find('#video_comments_section').html(videoComments.html());
                msgbox.getNode().find('#video_comments_section').attr('style', '');
                bsdnHydrate();

                setTimeout(() => {
                    if (window.reinitializeTooltips) {
                        window.reinitializeTooltips();
                    }
                }, 200);
            }
        } catch (error) {
            console.error('Error loading video info:', error);
            msgbox.getNode().find('.video_info').html(`<div class="video_info_title">${escapeHtml(video_object.title)}</div>`);
        }
    }

    loadVideoInfo();

    msgbox.getNode().find('#__modalPlayerClose').on('click', (e) => {
        e.preventDefault();
        u('.miniplayer').remove();
        msgbox.close();
    });

    const originalVideoClose = msgbox.close;
    msgbox.close = function() {
        if (window.cleanupModalTooltips) {
            window.cleanupModalTooltips(msgbox.getNode().nodes[0]);
        }

        originalVideoClose.call(this);
    };

    msgbox.getNode().find('#__modalPlayerMinimize').on('click', (e) => {
        e.preventDefault();

        u('.miniplayer').remove();

        const miniplayer = u(`
            <div class='miniplayer' data-video-id="${pretty_id}">
                <div class='miniplayer-head'>
                    <b>${escapeHtml(video_object.title)}</b>
                    <div class='miniplayer-head-buttons'>
                        <div id='__miniplayer_return' title="Restore"></div>
                        <div id='__miniplayer_close' title="Close"></div>
                    </div>
                </div>
                <div class='miniplayer-body' style="overflow: hidden;"></div>
            </div>
        `);

        msgbox.hide();

        u('body').append(miniplayer);

        const videoContent = msgbox.getNode().find('.video_block_layout').nodes[0];
        if (videoContent) {
            miniplayer.find('.miniplayer-body').nodes[0].appendChild(videoContent);
        }

        miniplayer.attr('style', 'position: fixed; left: 20px; bottom: 20px; z-index: 9999; width: 320px;');

        miniplayer.find('#__miniplayer_return').on('click', (e) => {
            e.preventDefault();

            const videoContent = miniplayer.find('.miniplayer-body > *').nodes[0];
            if (videoContent) {
                msgbox.getNode().find('.page_block').nodes[0].insertBefore(videoContent, msgbox.getNode().find('.video_info').nodes[0]);
            }

            msgbox.reveal();
            u('.miniplayer').remove();
        });

        miniplayer.find('#__miniplayer_close').on('click', (e) => {
            e.preventDefault();
            msgbox.close();
            u('.miniplayer').remove();
        });

        $(miniplayer.nodes[0]).draggable({
            cursor: 'grabbing',
            containment: 'window',
            handle: '.miniplayer-head',
            cancel: '.miniplayer-head-buttons'
        });

        function adjustVideoPlayerSize() {
            const miniplayerBody = miniplayer.find('.miniplayer-body').nodes[0];
            const videoBlockLayout = miniplayer.find('.video_block_layout').nodes[0];

            if (videoBlockLayout && miniplayerBody) {
                const bodyWidth = miniplayerBody.offsetWidth;
                const bodyHeight = miniplayerBody.offsetHeight;
                const aspectRatio = 16 / 9;

                // Calculate dimensions that fit within the container while maintaining aspect ratio
                let newWidth = bodyWidth;
                let newHeight = bodyWidth / aspectRatio;

                if (newHeight > bodyHeight) {
                    newHeight = bodyHeight;
                    newWidth = bodyHeight * aspectRatio;
                }

                // Apply the calculated dimensions to the video block
                videoBlockLayout.style.width = newWidth + 'px';
                videoBlockLayout.style.height = newHeight + 'px';
                videoBlockLayout.style.position = 'absolute';

                // Center the video if it's smaller than the container
                const leftOffset = (bodyWidth - newWidth) / 2;
                const topOffset = (bodyHeight - newHeight) / 2;
                videoBlockLayout.style.left = leftOffset + 'px';
                videoBlockLayout.style.top = topOffset + 'px';

                // Also adjust any iframe or video elements inside
                const iframe = videoBlockLayout.querySelector('iframe');
                const video = videoBlockLayout.querySelector('video');

                if (iframe) {
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                }

                if (video) {
                    video.style.width = '100%';
                    video.style.height = '100%';
                }
            }
        }

        $(miniplayer.nodes[0]).resizable({
            maxHeight: 2000,
            maxWidth: 3000,
            minHeight: 150,
            minWidth: 200,
            resize: function() {
                adjustVideoPlayerSize();
            }
        });

        // Initial size adjustment
        setTimeout(adjustVideoPlayerSize, 100);

        // Adjust on window resize
        const resizeHandler = () => adjustVideoPlayerSize();
        window.addEventListener('resize', resizeHandler);

        // Clean up resize handler when miniplayer is removed
        const originalRemove = miniplayer.remove;
        miniplayer.remove = function() {
            window.removeEventListener('resize', resizeHandler);
            return originalRemove.call(this);
        };
    });


    msgbox.getNode().find('.ovk-photo-view-dimmer').on('click', (e) => {
        if (u(e.target).hasClass('ovk-photo-view-dimmer') || u(e.target).hasClass('dimmer')) {
            msgbox.close();
        }
    });

    CMessageBox.toggleLoader();
}

async function OpenMiniature(e, photo, post, photo_id, type = "post") {
    e.preventDefault();
    e.stopPropagation();

    CMessageBox.toggleLoader();

    const msgbox = new CMessageBox({
        title: tr('photo'),
        close_on_buttons: false,
        warn_on_exit: false,
        custom_template: u(`
        <div class="ovk-photo-view-dimmer">
            <div class="ovk-photo-view-window">
                <div id="photo_top_controls">
                    <div id="__modal_photo_close" class="photo_top_button photo_top_close" role="button" tabindex="0" aria-label="Close">
                        <div class="photo_close_icon"></div>
                    </div>
                </div>
                <div class="pv_wrapper">
                    <div class="pv_left">
                        <div class="pv_photo">
                            <img src="${photo}" id="pv_photo_img" />
                            <div class="pv_nav_left" id="pv_nav_left" style="display: none;">
                                <div class="pv_nav_arrow"></div>
                            </div>
                            <div class="pv_nav_right" id="pv_nav_right" style="display: none;">
                                <div class="pv_nav_arrow"></div>
                            </div>
                        </div>
                        <div class="pv_bottom_info">
                            <div class="pv_bottom_info_left">
                                <div class="pv_album_name"><div id='pv_actions_loader'></div></div>
                                <div class="pv_counter"></div>
                            </div>
                            <div class="pv_bottom_actions">
                            </div>
                        </div>
                    </div>
                    <div class="pv_right">
                        <div id='pv_right_loader' class='pv_author_block'></div>
                    </div>
                </div>
            </div>
        </div>
        `)
    });

    const pretty_id = photo_id;

    console.log('OpenMiniature called with:', {
        photo: photo,
        post: post,
        photo_id: photo_id,
        pretty_id: pretty_id,
        type: type
    });

    msgbox.getNode().find('#__modal_photo_close').on('click', (e) => {
        e.preventDefault();
        msgbox.close();
    });

    let json = null;
    let imagesCount = 0;
    let currentImageid = pretty_id;
    let shown_offset = 1;
    let offset = 0;
    const albums_per_page = 50;

    function getIndex(photo_id = null) {
        if (!json || !json.body) return 1;
        return Object.keys(json.body).findIndex(item => item == (photo_id ?? currentImageid)) + 1;
    }

    function getByIndex(id) {
        if (!json || !json.body) return null;
        const ids = Object.keys(json.body);
        const _id = ids[id - 1];
        return json.body[_id];
    }

    function reloadTitleBar() {
        const countText = imagesCount > 1 ? tr("photo_x_from_y", shown_offset, imagesCount) : '';
        msgbox.getNode().find('.pv_counter').html(countText);
    }



    async function loadContext(contextType, contextId) {
        if (contextType == 'post' || contextType == 'comment') {
            const form_data = new FormData();
            form_data.append('parentType', contextType);

            const endpoint_url = `/iapi/getPhotosFromPost/${contextId}`;

            const fetcher = await fetch(endpoint_url, {
                method: 'POST',
                body: form_data,
            });
            json = await fetcher.json();
            imagesCount = Object.entries(json.body).length;
        } else if (contextType == 'album') {
            const params = {
                'offset': offset,
                'count': albums_per_page,
                'owner_id': contextId.split('_')[0],
                'album_id': contextId.split('_')[1],
                'photo_sizes': 1
            };

            const result = await window.OVKAPI.call('photos.get', params);
            const converted_items = {};

            result.items.forEach(item => {
                const id = item.owner_id + '_' + item.id;
                converted_items[id] = {
                    'url': item.src_xbig,
                    'id': id,
                };
            });
            imagesCount = result.count;

            if (!json) json = {'body': {}};
            json.body = Object.assign(converted_items, json.body);
        }

        currentImageid = pretty_id;
    }

    async function slidePhoto(direction) {
        if (!json) {
            return;
        }

        let current_index = getIndex();
        if (current_index >= imagesCount && direction == 1) {
            shown_offset = 1;
            current_index = 1;
        } else if (current_index <= 1 && direction == 0) {
            shown_offset += imagesCount - 1;
            current_index = imagesCount;
        } else if (direction == 1) {
            shown_offset += 1;
            current_index += 1;
        } else if (direction == 0) {
            shown_offset -= 1;
            current_index -= 1;
        }

        const nextPhoto = getByIndex(current_index);
        if (!nextPhoto) return;

        currentImageid = nextPhoto.id;
        const photoURL = json.body[currentImageid].url;

        msgbox.getNode().find('#pv_photo_img').attr('src', photoURL);

        reloadTitleBar();

        msgbox.getNode().find('.pv_right').html(`<div id='pv_right_loader' class='pv_author_block'></div>`);

        await loadPhotoInfoForPhoto(currentImageid);
    }

    async function initializeNavigation() {
        if (post && post.length > 0) {
            await loadContext('post', post);
            shown_offset = getIndex();
        } else if (type === 'album') {
            try {
                const photoApi = await window.OVKAPI.call('photos.getById', {
                    'photos': pretty_id,
                    'extended': 1
                });

                if (photoApi && photoApi[0] && photoApi[0].album_id) {
                    const albumId = `${photoApi[0].owner_id}_${photoApi[0].album_id}`;
                    await loadContext('album', albumId);
                    shown_offset = getIndex();
                } else {
                    throw new Error('No album info available');
                }
            } catch (e) {
                json = {
                    body: {
                        [pretty_id]: {
                            url: photo,
                            id: pretty_id,
                            cached: false
                        }
                    }
                };
                imagesCount = 1;
                shown_offset = 1;
            }
        } else {
            json = {
                body: {
                    [pretty_id]: {
                        url: photo,
                        id: pretty_id,
                        cached: false
                    }
                }
            };
            imagesCount = 1;
            shown_offset = 1;
        }

        if (imagesCount > 1) {
            msgbox.getNode().find('#pv_nav_left').attr('style', '');
            msgbox.getNode().find('#pv_nav_right').attr('style', '');
        } else {
            msgbox.getNode().find('#pv_nav_left').attr('style', 'display: none;');
            msgbox.getNode().find('#pv_nav_right').attr('style', 'display: none;');
        }

        reloadTitleBar();
    }

    msgbox.getNode().find('#pv_nav_left').on('click', (e) => {
        e.preventDefault();
        slidePhoto(0); // left
    });

    msgbox.getNode().find('#pv_nav_right').on('click', (e) => {
        e.preventDefault();
        slidePhoto(1); // right
    });

    initializeNavigation();

    const keyboardHandler = function(e) {
        if (msgbox.hidden) return;

        if (e.keyCode === 37) { // Left arrow
            e.preventDefault();
            slidePhoto(0); // left
        } else if (e.keyCode === 39) { // Right arrow
            e.preventDefault();
            slidePhoto(1); // right
        } else if (e.keyCode === 27) { // Escape
            e.preventDefault();
            msgbox.close();
        }
    };

    u(document).on('keydown', keyboardHandler);

    const originalPhotoClose = msgbox.close;
    msgbox.close = function() {
        u(document).off('keydown', keyboardHandler);

        if (window.cleanupModalTooltips) {
            window.cleanupModalTooltips(msgbox.getNode().nodes[0]);
        }

        originalPhotoClose.call(this);
    };



    async function loadPhotoInfoForPhoto(photoId) {
        try {
            u('#pv_right_loader').html(`<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div">`);
            u('#pv_actions_loader').html(`<div class="pr pr_baw"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div">`);

            const photo_url = `/photo${photoId}`;
            const photo_page = await fetch(photo_url);
            const photo_text = await photo_page.text();
            const parser = new DOMParser();
            const body = parser.parseFromString(photo_text, "text/html");

            const pvRight = body.querySelector('.pv_right');
            if (pvRight) {
                msgbox.getNode().find('.pv_right').html(pvRight.innerHTML);
            }

            const pvBottomActions = body.querySelector('.pv_bottom_actions');
            if (pvBottomActions) {
                msgbox.getNode().find('.pv_bottom_actions').html(pvBottomActions.innerHTML);
            }

            const pvAlbumName = body.querySelector('.pv_album_name');
            if (pvAlbumName) {
                msgbox.getNode().find('.pv_album_name').html(pvAlbumName.innerHTML);
            } else {
                msgbox.getNode().find('.pv_album_name').html('');
            }

            msgbox.getNode().find(".pv_right .bsdn").nodes.forEach(bsdnInitElement);

            setTimeout(() => {
                if (window.reinitializeTooltips) {
                    window.reinitializeTooltips();
                }
            }, 200);

        } catch (error) {
            console.error('Error loading photo info:', error);
            msgbox.getNode().find('.pv_right').html(`
                <div class="pv_author_block">
                    <div class="pv_author_name">Photo</div>
                </div>
            `);
            msgbox.getNode().find('.pv_bottom_actions').html('');
        }
    }

    async function loadPhotoInfo() {
        if (pretty_id) {
            return loadPhotoInfoForPhoto(pretty_id);
        } else {
            console.error('No photo ID available for loading photo info');
            msgbox.getNode().find('.pv_right').html(`
                <div class="pv_author_block">
                    <div class="pv_author_name">Photo</div>
                </div>
            `);
        }
    }

    loadPhotoInfo();

    msgbox.getNode().find('.ovk-photo-view-dimmer').on('click', (e) => {
        if (u(e.target).hasClass('ovk-photo-view-dimmer') || u(e.target).hasClass('dimmer')) {
            msgbox.close();
        }
    });

    CMessageBox.toggleLoader();
}