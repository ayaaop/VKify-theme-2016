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
                                <a class="attach_photo" id="__vkifyPhotoAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                </a>
                                <a class="attach_video" id="__vkifyVideoAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                </a>
                                <a class="attach_audio" id="__vkifyAudioAttachment">
                                    <div class="post-attach-menu__icon"></div>
                                </a>
                                <a class="post-attach-menu__trigger" id="moreAttachTrigger">
                                    ${tr('show_more')}
                                </a>
                                <div class="tippy-menu" id="moreAttachTooltip2">
                                        <a class="attach_document" id="__vkifyDocumentAttachment">
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
    let isPrivacyRestricted = false;

    // First, check if the owner's profile is closed (but not if current user is the owner)
    if (video_owner > 0) { // Only check for user profiles, not groups (negative IDs)
        try {
            const userInfo = await window.OVKAPI.call('users.get', {
                'user_ids': video_owner,
                'fields': 'is_closed'
            });

            // Check if profile is closed AND current user is not the owner
            if (userInfo && userInfo[0] && userInfo[0].is_closed) {
                // Get current user ID to check if they're the owner
                const currentUser = window.openvk.current_id;
                if (currentUser != video_owner) {
                    isPrivacyRestricted = true;
                }
            }
        } catch(e) {
            // If we can't get user info, continue with normal flow
            console.warn('Could not check user privacy status:', e);
        }
    }

    // If not privacy restricted by profile closure, try to get video data
    if (!isPrivacyRestricted) {
        try {
            video_api = await window.OVKAPI.call('video.get', {'videos': `${video_owner}_${video_id}`, 'extended': 1});

            if(!video_api.items || !video_api.items[0]) {
                throw new Error('Not found');
            }
        } catch(e) {
            // Check if this is a privacy-related error
            const errorMessage = e.message ? e.message.toLowerCase() : '';
            if (errorMessage.includes('access') || errorMessage.includes('private') ||
                errorMessage.includes('permission') || errorMessage.includes('forbidden') ||
                errorMessage.includes('denied') || e.code === 15 || e.code === 18) {
                isPrivacyRestricted = true;
            } else {
                CMessageBox.toggleLoader();
                fastError(e.message);
                return;
            }
        }
    }

    // Always get video object data - privacy only affects info, not the video itself
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
            <div class="ovk-modal-video-window${isPrivacyRestricted ? ' private' : ''}">
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
        // Show loading indicator
        u('#video_info_loader').html(`<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>`);

        // Fetch video page - exactly like original implementation
        const fetcher = await fetch(`/video${pretty_id}`);
        const fetch_r = await fetcher.text();
        const dom_parser = new DOMParser();
        const results = u(dom_parser.parseFromString(fetch_r, 'text/html'));

        // Copy original pattern: if element exists, use content; if not, show minimal fallback
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
        } else {
            // If video info element doesn't exist (due to privacy or other reasons), show minimal info
            msgbox.getNode().find('.video_info').html(`<div class="video_info_title">${escapeHtml(video_object.title)}</div>`);
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

    let isPrivacyRestricted = false;

    const photo_owner = photo_id ? photo_id.split('_')[0] : null;

    if (photo_owner && photo_owner > 0) {
        try {
            const userInfo = await window.OVKAPI.call('users.get', {
                'user_ids': photo_owner,
                'fields': 'is_closed'
            });

            if (userInfo && userInfo[0] && userInfo[0].is_closed) {
                const currentUser = window.openvk.current_id;
                if (currentUser != photo_owner) {
                    isPrivacyRestricted = true;
                }
            }
        } catch(e) {
            console.warn('Could not check user privacy status:', e);
        }
    }

    const msgbox = new CMessageBox({
        title: tr('photo'),
        close_on_buttons: false,
        warn_on_exit: false,
        custom_template: u(`
        <div class="ovk-photo-view-dimmer">
            <div class="ovk-photo-view-window${isPrivacyRestricted ? ' private' : ''}">
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
        type: type,
        isPrivacyRestricted: isPrivacyRestricted
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
        // Show loading indicators
        u('#pv_right_loader').html(`<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div">`);
        u('#pv_actions_loader').html(`<div class="pr pr_baw"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div">`);

        // Fetch photo page - exactly like original implementation
        const photo_url = `/photo${photoId}`;
        const photo_page = await fetch(photo_url);
        const photo_text = await photo_page.text();
        const parser = new DOMParser();
        const body = parser.parseFromString(photo_text, "text/html");

        // Copy original pattern: if element exists, use innerHTML; if not, use empty string
        const pvRight = body.querySelector('.pv_right');
        msgbox.getNode().find('.pv_right').html(pvRight ? pvRight.innerHTML : '');

        const pvBottomActions = body.querySelector('.pv_bottom_actions');
        msgbox.getNode().find('.pv_bottom_actions').html(pvBottomActions ? pvBottomActions.innerHTML : '');

        const pvAlbumName = body.querySelector('.pv_album_name');
        msgbox.getNode().find('.pv_album_name').html(pvAlbumName ? pvAlbumName.innerHTML : '');

        // Initialize any dynamic elements that were loaded
        msgbox.getNode().find(".pv_right .bsdn").nodes.forEach(bsdnInitElement);

        setTimeout(() => {
            if (window.reinitializeTooltips) {
                window.reinitializeTooltips();
            }
        }, 200);
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

if (typeof window.random_int === 'undefined') {
    window.random_int = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

class BaseRequestManager {
    constructor() {
        this.currentRequestId = 0;
    }

    cancelOngoingRequests() {
        this.currentRequestId++;
    }

    createCancellableRequest() {
        this.cancelOngoingRequests();
        return ++this.currentRequestId;
    }

    isRequestCancelled(requestId) {
        return requestId !== this.currentRequestId;
    }
}

class RequestManager extends BaseRequestManager {}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';

    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return tr('time_just_now');

    if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        if (mins === 5) {
            return tr('time_exactly_five_minutes_ago');
        }
        return tr('time_minutes_ago', mins);
    }

    const videoDate = new Date(timestamp * 1000);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (videoDate.toDateString() === today.toDateString()) {
        return tr('time_today');
    }

    if (videoDate.toDateString() === yesterday.toDateString()) {
        return tr('time_yesterday');
    }

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    try {
        return videoDate.toLocaleDateString(document.documentElement.lang, options);
    } catch (e) {
        return videoDate.toLocaleDateString();
    }
}

class BaseAttachmentManager {
    constructor(messageBox, requestManager, form = null, attachmentType, constants = {}) {
        this.messageBox = messageBox;
        this.requestManager = requestManager;
        this.form = form;
        this.attachmentType = attachmentType;
        this.selectedItems = new Set();
        this.CONSTANTS = {
            ...constants
        };
    }

    isItemAttached(itemId) {
        if (!this.form) return false;

        const selector = this.attachmentType === 'photo'
            ? `.post-horizontal > a[data-type="${this.attachmentType}"][data-id="${itemId}"], .post-vertical .vertical-attachment[data-type="${this.attachmentType}"][data-id="${itemId}"]`
            : `.post-vertical .vertical-attachment[data-type="${this.attachmentType}"][data-id="${itemId}"]`;

        return this.form.find(selector).length > 0;
    }

    detachItemIfAttached(itemId) {
        if (!this.form) return;

        const selector = this.attachmentType === 'photo'
            ? `.post-horizontal > a[data-type="${this.attachmentType}"][data-id="${itemId}"], .post-vertical .vertical-attachment[data-type="${this.attachmentType}"][data-id="${itemId}"]`
            : `.post-vertical .vertical-attachment[data-type="${this.attachmentType}"][data-id="${itemId}"]`;

        const attachmentElement = this.form.find(selector);
        if (attachmentElement.length > 0) {
            attachmentElement.remove();
        }
    }

    checkAttachmentLimit(newItemsCount = 1) {
        const currentAttachments = this.form.find('.post-horizontal > a, .post-vertical > .vertical-attachment').length;

        if (currentAttachments + newItemsCount > 10) {
            NewNotification(
                tr('error'),
                tr('too_many_attachments'),
                null,
                () => {},
                5000,
                false
            );
            return false;
        }
        return true;
    }

    isAlreadyAttached(itemId) {
        return this.isItemAttached(itemId);
    }

    toggleItemSelection(itemId, elementSelector, selectedClass = 'selected') {
        const element = u(elementSelector);

        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
            element.removeClass(selectedClass);

            this.detachItemIfAttached(itemId);

            return false;
        } else {
            this.selectedItems.add(itemId);
            element.addClass(selectedClass);

            return true;
        }
    }

    syncSelectionState(itemId, isSelected) {
        if (!isSelected && this.isItemAttached(itemId)) {
            this.selectedItems.add(itemId);
            return true;
        }
        return isSelected;
    }

    filterNewItems(itemIds) {
        return itemIds.filter(itemId => !this.isAlreadyAttached(itemId));
    }

    clearSelection() {
        this.selectedItems.clear();
        this.updateChooseButton(0);
    }

    getSelectionCount() {
        return this.selectedItems.size;
    }

    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    setupDialogStyles() {
        if (this.attachmentType === 'photo' || this.attachmentType === 'video') {
            this.messageBox.getNode().attr('style', 'width: 640px;');
            this.messageBox.getNode().find('.ovk-diag-body').attr('style', 'max-height: 640px; padding: 0px !important;');
        }
    }

    showLoader(container) {
        container.append(`<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>`);
    }

    showLoaderInButton(button) {
        const loaderHTML = `<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>`;
        const span = button.find('span');

        if (span.length > 0) {
            span.html(loaderHTML);
        } else {
            button.html(`<span>${loaderHTML}</span>`);
        }

        button.addClass('lagged');
    }

    hideLoader() {
        u('.pr').remove();
    }

    hideGeneralLoader() {
        u('.pr').each(function(node) {
            const element = u(node);
            if (!element.closest('.button').length) {
                element.remove();
            }
        });
    }

    showError(container, message) {
        this.hideLoader();
        container.html(`<div class="information">${message}</div>`);
    }

    calculatePages(totalCount, itemsPerPage) {
        return Math.ceil(Number(totalCount) / itemsPerPage);
    }

    createShowMoreButton(pagesCount, className) {
        return `
            <div class="${className} button button_gray button_wide" data-pagesCount="${pagesCount}">
                <span>${tr('show_more')}</span>
            </div>
        `;
    }

    updateChooseButton(selectedCount) {
    }


}

class AlbumManager {
    constructor(photoManager, requestManager, club) {
        this.photoManager = photoManager;
        this.requestManager = requestManager;
        this.club = club;
        this.viewingUserPhotos = false;
    }

    async loadAlbums(page = 0, append = false) {
        const requestId = this.requestManager.createCancellableRequest();
        const albumsList = u('#albums_list');

        if (!append) {
            albumsList.html('');
            this.photoManager.showLoader(albumsList);
        }

        try {
            const ownerId = this.getOwnerId();
            const albums = await window.OVKAPI.call('photos.getAlbums', {
                'owner_id': ownerId,
                'need_covers': 1,
                'photo_sizes': 1,
                'need_system': 1,
                'count': this.photoManager.CONSTANTS.ALBUMS_PER_PAGE,
                'offset': page * this.photoManager.CONSTANTS.ALBUMS_PER_PAGE
            });

            if (this.requestManager.isRequestCancelled(requestId)) return;

            this.photoManager.hideGeneralLoader();

            if (albums.count === 0) {
                this.photoManager.showError(albumsList, tr('albums_zero'));
                return;
            }

            if (append) {
                albumsList.find('.show_more_albums').remove();
            }

            this.renderAlbums(albums.items, append);
            this.handleAlbumPagination(albums.count, page);

        } catch (error) {
            if (this.requestManager.isRequestCancelled(requestId)) return;
            console.error('Error loading albums:', error);
            this.photoManager.showError(albumsList, tr('error_loading_albums'));
        }
    }

    renderAlbums(albums, append) {
        const albumsList = u('#albums_list');
        let albumsHTML = '';

        albums.forEach(album => {
            const coverImg = album.thumb_src ?
                `<img src="${album.thumb_src}" class="page_album_thumb" loading="lazy" />` :
                '';

            albumsHTML += `
                <div class="clear_fix clear page_album_row">
                    <a href="javascript:void(0)" class="page_album_link photos_choose_album_row ${!album.thumb_src ? 'page_album_nocover' : ''}" data-album-id="${album.id}">
                        <div class="page_album_thumb_wrap">
                            ${coverImg}
                        </div>
                        <div class="page_album_title">
                            <div class="page_album_size">${album.size}</div>
                            <div class="page_album_title_text">${escapeHtml(album.title)}</div>
                            <div class="page_album_description">${album.description ? escapeHtml(album.description).substring(0, 100) : ''}</div>
                        </div>
                    </a>
                </div>
            `;
        });

        if (append) {
            albumsList.append(albumsHTML);
        } else {
            albumsList.html(albumsHTML);
        }
    }

    handleAlbumPagination(totalCount, currentPage) {
        const pagesCount = this.photoManager.calculatePages(totalCount, this.photoManager.CONSTANTS.ALBUMS_PER_PAGE);
        const albumsList = u('#albums_list');

        if (currentPage + 1 < pagesCount) {
            const showMoreButton = this.photoManager.createShowMoreButton(pagesCount, 'show_more_albums');
            albumsList.append(showMoreButton);
        }
    }

    getOwnerId() {
        return (this.club != 0 && !this.viewingUserPhotos) ? Math.abs(this.club) * -1 : window.openvk.current_id;
    }

    setViewingUserPhotos(viewing) {
        this.viewingUserPhotos = viewing;
    }
}

class PhotoManager extends BaseAttachmentManager {
    constructor(messageBox, requestManager, club, form = null) {
        super(messageBox, requestManager, form, 'photo', {
            PHOTOS_PER_PAGE: 16,
            ALBUMS_PER_PAGE: 2
        });
        this.club = club;
        this.viewingUserPhotos = false;
    }

    get selectedPhotos() {
        return this.selectedItems;
    }

    initialize(club) {
        this.setupDialogStyles();
        if (club != 0) {
            this.addUserPhotosLink();
        }
    }

    async loadPhotos(albumId, page = 0, append = false) {
        const requestId = this.requestManager.createCancellableRequest();
        const photosContainer = u('#photos_content .photos_choose_rows');
        const moreContainer = u('#photos_content .photos_choose_more_container');

        if (!append) {
            photosContainer.html('');
            moreContainer.html('');
            this.showLoader(photosContainer);
        }

        try {
            const ownerId = this.getOwnerId();
            const params = {
                'owner_id': ownerId,
                'photo_sizes': 1,
                'count': this.CONSTANTS.PHOTOS_PER_PAGE,
                'offset': page * this.CONSTANTS.PHOTOS_PER_PAGE
            };

            if (albumId == 0 && this.club != 0 && !this.viewingUserPhotos) {
                throw new Error('Clubs are not supported for getAll photos');
            }

            const method = albumId == 0 ? 'photos.getAll' : 'photos.get';
            if (albumId != 0) {
                params.album_id = albumId;
            }

            const photos = await window.OVKAPI.call(method, params);

            if (this.requestManager.isRequestCancelled(requestId)) return;

            this.hideGeneralLoader();

            if (photos.count === 0) {
                this.showError(photosContainer, tr('is_x_photos_zero'));
                return;
            }

            this.renderPhotos(photos.items, append);
            this.handlePhotoPagination(photos.count, page, albumId);

        } catch (error) {
            if (this.requestManager.isRequestCancelled(requestId)) return;
            console.error('Error loading photos:', error);
            this.showError(photosContainer, tr('error_loading_photos'));
        }
    }

    renderPhotos(photos, append) {
        const photosContainer = u('#photos_content .photos_choose_rows');
        let photosHTML = '';

        photos.forEach(photo => {
            const attachmentData = `${photo.owner_id}_${photo.id}`;
            let isSelected = this.selectedPhotos.has(attachmentData);
            isSelected = this.syncSelectionState(attachmentData, isSelected);

            const selectedClass = isSelected ? 'selected' : '';
            const thumbnailUrl = photo.sizes[2]?.url || photo.sizes[1]?.url || photo.sizes[0]?.url;
            const previewUrl = photo.sizes[1]?.url || photo.sizes[0]?.url;

            photosHTML += `
                <a class="photos_choose_row fl_l ${selectedClass}" href="javascript:void(0)"
                   data-photo-id="${attachmentData}" data-preview="${previewUrl}">
                    <div class="photo_row_img" style="background-image: url('${thumbnailUrl}')"></div>
                    <div class="photos_choose_row_bg"></div>
                    <div class="media_check_btn_wrap">
                        <div class="media_check_btn" data-testid="photos_choose_check_button"></div>
                    </div>
                </a>
            `;
        });

        if (append) {
            photosContainer.append(photosHTML);
        } else {
            photosContainer.html(photosHTML);
        }

        this.updateChooseButton(this.getSelectionCount());
    }

    handlePhotoPagination(totalCount, currentPage, albumId) {
        const pagesCount = this.calculatePages(totalCount, this.CONSTANTS.PHOTOS_PER_PAGE);
        const moreContainer = u('#photos_content .photos_choose_more_container');

        if (currentPage + 1 < pagesCount) {
            const showMoreButton = this.createShowMoreButton(pagesCount, 'show_more_photos');
            moreContainer.html(showMoreButton);
            moreContainer.find('.show_more_photos').attr('data-album-id', albumId);
        } else {
            moreContainer.html('');
        }
    }

    togglePhotoSelection(photoId) {
        const isSelected = this.toggleItemSelection(photoId, `[data-photo-id="${photoId}"]`);
        this.updateChooseButton(this.getSelectionCount());
        return isSelected;
    }

    attachSelectedPhotos(form) {
        const selectedPhotoIds = this.getSelectedItems();
        const newPhotoIds = this.filterNewItems(selectedPhotoIds);

        if (!this.checkAttachmentLimit(newPhotoIds.length)) {
            return;
        }

        newPhotoIds.forEach(photoId => {
            const photoElement = u(`[data-photo-id="${photoId}"]`);
            const previewUrl = photoElement.attr('data-preview');

            __appendToTextarea({
                'type': 'photo',
                'preview': previewUrl,
                'id': photoId,
                'fullsize_url': previewUrl
            }, form);
        });
    }

    attachSinglePhoto(photoId, form) {
        if (this.isAlreadyAttached(photoId)) {
            return;
        }

        if (!this.checkAttachmentLimit(1)) {
            return;
        }

        const photoElement = u(`[data-photo-id="${photoId}"]`);
        const previewUrl = photoElement.attr('data-preview');

        __appendToTextarea({
            'type': 'photo',
            'preview': previewUrl,
            'id': photoId,
            'fullsize_url': previewUrl
        }, form);
    }

    getOwnerId() {
        return (this.club != 0 && !this.viewingUserPhotos) ? Math.abs(this.club) * -1 : window.openvk.current_id;
    }

    setViewingUserPhotos(viewing) {
        this.viewingUserPhotos = viewing;
    }

    clearSelection() {
        super.clearSelection();
        u('.photos_choose_row').removeClass('selected');
    }

    addUserPhotosLink() {
        const header = this.messageBox.getNode().find('.ovk-diag-head');
        const userPhotosLink = `<span id="photos_choose_right_link"><span class="divider">|</span><a href="#" id="user_photos_link" class="tab_link"><vkifyloc name="choose_from_my_photos"></a></span>`;
        header.append(userPhotosLink);
    }

    updateMessageBoxButtons(currentAlbum) {
        const actionBar = this.messageBox.getNode().find('.ovk-diag-action');

        if (currentAlbum === 0) {
            actionBar.html('');
        } else {
            actionBar.html(`
                <input type="button" class="button back-to-albums-btn" value="${tr('paginator_back')}">
            `);
        }
    }

    toggleUserClubLink(isViewingUserPhotos) {
        const rightLinkContainer = u('#photos_choose_right_link');
        if (isViewingUserPhotos) {
            rightLinkContainer.html(`<span class="divider">|</span><a href="#" id="back_to_club_link" class="tab_link"><vkifyloc name="back_to_club_photos"></a>`);
        } else {
            rightLinkContainer.html(`<span class="divider">|</span><a href="#" id="user_photos_link" class="tab_link"><vkifyloc name="choose_from_my_photos"></a>`);
        }
        rightLinkContainer.attr('style', '');
    }

    showHideUserClubSwitcher(show) {
        const switcher = u('#photos_choose_right_link');
        switcher.attr('style', show ? '' : 'display: none;');
    }

    clearPhotosContent() {
        u('#photos_content .photos_choose_rows').html('');
        u('#photos_content .photos_choose_more_container').html('');
    }

    static createDialogBody() {
        return `
        <div class='attachment_selector no_hack'>
            <input type="file" multiple accept="image/*" id="__pickerQuickUpload" style="display:none">
            <div class="choose_upload_area" role="button" tabindex="0">
                <span class="choose_upload_area_label">${tr("upload_button")}</span>
            </div>
            <div id='attachment_insert' style='height: unset; padding: 0'>
                <div id='albums_list' class='photos_choose_album_rows photos_container_albums'>
                    <!-- Albums will be loaded here -->
                </div>
                <div id='photos_content'>
                    <div class="photos_choose_rows clear_fix"></div>
                    <div class="photos_choose_more_container"></div>
                </div>
            </div>
        </div>
        `;
    }
}

class PhotoAttachmentDialog {
    constructor(form, club) {
        this.form = form;
        this.club = club;
        this.currentAlbum = 0;
        this.requestManager = new RequestManager();
        this.messageBox = new CMessageBox({
            title: tr('select_photo'),
            body: PhotoManager.createDialogBody(),
        });
        this.photoManager = new PhotoManager(this.messageBox, this.requestManager, club, this.form);
        this.photoManager.initialize(club);
        this.albumManager = new AlbumManager(this.photoManager, this.requestManager, club);
        this.photoManager.updateChooseButton = (selectedCount) => {
            const chooseBtn = this.messageBox.getNode().find('#choose-photos-btn');
            if (selectedCount > 0) {
                const buttonText = `${tr('attach')} (${selectedCount})`;
                if (chooseBtn.length === 0) {
                    this.messageBox.getNode().find('.ovk-diag-action').prepend(`
                        <input type="button" id="choose-photos-btn" class="button close-dialog-btn" value="${buttonText}">
                    `);
                } else {
                    chooseBtn.attr('value', buttonText);
                }
            } else {
                chooseBtn.remove();
            }
        };
    }

    async initialize() {
        this.setupEventHandlers();
        await this.loadInitialContent();
    }

    async loadInitialContent() {
        if (this.club == 0) {
            u('#albums_list').attr('style', 'display: flex');
            u('#photos_content').attr('style', 'display: block');
            await this.albumManager.loadAlbums(0, false);
            await this.photoManager.loadPhotos(0, 0, false);
        } else {
            u('#albums_list').attr('style', 'display: flex');
            u('#photos_content').attr('style', 'display: none');
            await this.albumManager.loadAlbums(0, false);
        }
    }

    setupEventHandlers() {
        const node = this.messageBox.getNode();

        node.on('click', '.photos_choose_album_row', async (e) => {
            const albumId = Number(e.currentTarget.dataset.albumId);
            this.currentAlbum = albumId;

            u('#albums_list').attr('style', 'display: none');
            u('#photos_content').attr('style', 'display: block');
            this.photoManager.updateMessageBoxButtons(albumId);
            this.photoManager.showHideUserClubSwitcher(false);

            await this.photoManager.loadPhotos(albumId, 0, false);
        });

        node.on('click', '.back-to-albums-btn', async () => {
            this.currentAlbum = 0;
            this.photoManager.clearSelection();

            u('#albums_list').attr('style', 'display: flex');
            u('#photos_content').attr('style', 'display: block');
            this.photoManager.updateMessageBoxButtons(0);
            this.photoManager.showHideUserClubSwitcher(true);

            if (this.club == 0 || this.albumManager.viewingUserPhotos) {
                await this.photoManager.loadPhotos(0, 0, false);
            } else {
                u('#photos_content').attr('style', 'display: none');
            }
        });

        node.on('click', '.media_check_btn_wrap', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const photoRow = u(e.target).closest('.photos_choose_row');
            const photoId = photoRow.attr('data-photo-id');
            this.photoManager.togglePhotoSelection(photoId);
        });

        node.on('click', '.photo_row_img', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const photoRow = u(e.target).closest('.photos_choose_row');
            const photoId = photoRow.attr('data-photo-id');
            this.photoManager.attachSinglePhoto(photoId, this.form);
            this.messageBox.close();
        });

        node.on('click', '.show_more_albums', async (e) => {
            const button = u(e.target).closest('.show_more_albums');
            const currentAlbumsCount = u('#albums_list .page_album_row').length;
            const nextPage = Math.floor(currentAlbumsCount / this.photoManager.CONSTANTS.ALBUMS_PER_PAGE);

            this.photoManager.showLoaderInButton(button);
            await this.albumManager.loadAlbums(nextPage, true);
        });

        node.on('click', '.show_more_photos', async (e) => {
            const button = u(e.target).closest('.show_more_photos');
            const albumId = Number(button.attr('data-album-id'));
            const currentPage = Math.floor(u('#photos_content .photos_choose_row').length / this.photoManager.CONSTANTS.PHOTOS_PER_PAGE);

            this.photoManager.showLoaderInButton(button);
            await this.photoManager.loadPhotos(albumId, currentPage, true);
        });

        node.on('click', '#choose-photos-btn', () => {
            this.photoManager.attachSelectedPhotos(this.form);
            this.messageBox.close();
        });

        node.on('click', '#user_photos_link', async () => {
            this.requestManager.cancelOngoingRequests();

            this.albumManager.setViewingUserPhotos(true);
            this.photoManager.setViewingUserPhotos(true);
            this.currentAlbum = 0;

            this.photoManager.toggleUserClubLink(true);
            this.photoManager.updateMessageBoxButtons(0);

            u('#albums_list').html('');
            this.photoManager.clearPhotosContent();

            u('#albums_list').attr('style', 'display: flex');
            u('#photos_content').attr('style', 'display: block');

            try {
                await this.albumManager.loadAlbums(0, false);
                await this.photoManager.loadPhotos(0, 0, false);
            } catch (error) {
                console.error('Error loading user photos:', error);
                this.photoManager.showError(u('#photos_content'), 'Error loading user photos');
            }
        });

        node.on('click', '#back_to_club_link', async () => {
            this.requestManager.cancelOngoingRequests();
            this.albumManager.setViewingUserPhotos(false);
            this.photoManager.setViewingUserPhotos(false);
            this.currentAlbum = 0;
            this.photoManager.toggleUserClubLink(false);
            this.photoManager.updateMessageBoxButtons(0);
            u('#albums_list').html('');
            this.photoManager.clearPhotosContent();
            u('#albums_list').attr('style', 'display: flex');
            u('#photos_content').attr('style', 'display: none');

            try {
                await this.albumManager.loadAlbums(0, false);
            } catch (error) {
                console.error('Error loading club albums:', error);
                this.photoManager.showError(u('#albums_list'), 'Error loading club albums');
            }
        });

        node.on('click', '.choose_upload_area', () => {
            node.find('#__pickerQuickUpload').nodes[0]?.click();
        });

        node.on('change', '#__pickerQuickUpload', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                Array.from(e.target.files).forEach(file => {
                    __uploadToTextarea(file, this.form);
                });
                this.messageBox.close();
            }
        });
    }
}

class VideoManager extends BaseAttachmentManager {
    constructor(messageBox, requestManager, form = null) {
        super(messageBox, requestManager, form, 'video', {
            VIDEOS_PER_PAGE: 10
        });
        this.currentQuery = '';
    }

    get selectedVideos() {
        return this.selectedItems;
    }

    async loadVideos(page = 0, query = '', append = false) {
        const requestId = this.requestManager.createCancellableRequest();
        const videosContainer = u('.videosInsert');
        const moreContainer = u('.videos_choose_more_container');

        if (!append) {
            videosContainer.html('');
            moreContainer.html('');
            this.showLoader(videosContainer);
        } else {
            moreContainer.find('.show_more_videos').remove();
        }

        try {
            let videos;
            if (query === '') {
                videos = await window.OVKAPI.call('video.get', {
                    'owner_id': window.openvk.current_id,
                    'extended': 1,
                    'count': this.CONSTANTS.VIDEOS_PER_PAGE,
                    'offset': page * this.CONSTANTS.VIDEOS_PER_PAGE
                });
            } else {
                videos = await window.OVKAPI.call('video.search', {
                    'q': escapeHtml(query),
                    'extended': 1,
                    'count': this.CONSTANTS.VIDEOS_PER_PAGE,
                    'offset': page * this.CONSTANTS.VIDEOS_PER_PAGE
                });
            }

            if (this.requestManager.isRequestCancelled(requestId)) return;

            this.hideGeneralLoader();

            if (videos.count === 0) {
                this.showError(videosContainer, tr('no_videos'));
                return;
            }

            this.renderVideos(videos.items, append, videos.profiles, videos.groups);
            this.handleVideoPagination(videos.count, page, query);

        } catch (error) {
            if (this.requestManager.isRequestCancelled(requestId)) return;
            console.error('Error loading videos:', error);
            this.showError(videosContainer, tr('error_loading_videos'));
        }
    }

    renderVideos(videos, append, profiles = [], groups = []) {
        const videosContainer = u('.videosInsert');
        let videosHTML = '';

        videos.forEach(video => {
            const videoId = `${video.owner_id}_${video.id}`;

            let isSelected = this.selectedVideos.has(videoId);
            isSelected = this.syncSelectionState(videoId, isSelected);

            const selectedClass = isSelected ? 'selected' : '';
            const thumbnailUrl = video.image && video.image[0] ? video.image[0].url : '';
            const duration = fmtTime(video.duration);
            const title = escapeHtml(video.title || '');
            const videoUrl = `/video${video.owner_id}_${video.id}`;
            const author = find_author(video.owner_id, profiles, groups);
            const authorName = author ? (author.first_name ? `${author.first_name} ${author.last_name}` : author.name) : 'Unknown';
            const authorUrl = author ? (video.owner_id > 0 ? `/${author.id}` : `/club${Math.abs(video.owner_id)}`) : '#';
            const platform = video.platform || (video.type && video.type !== 0 && video.type !== 'video' ? 'External' : '');
            const formattedDate = video.date ? formatRelativeTime(video.date) : '';

            videosHTML += `
                <div class="video_item ${selectedClass}" data-video-id="${videoId}" data-video-url="${video.player || videoUrl}">
                    <a class="video_item__thumb_link" href="javascript:void(0)">
                        <div class="video_item_thumb_wrap">
                            <div class="video_item_thumb" style="background-image: url('${thumbnailUrl}')"></div>
                            <div class="video_item_controls">
                                <div class="video_thumb_label">
                                    ${platform ? `<span class="video_thumb_label_item video_thumb_label_platform">${platform}</span>` : ''}
                                    ${!platform && duration ? `<span class="video_thumb_label_item video_thumb_label_duration">${duration}</span>` : ''}
                                </div>
                                <div class="media_check_btn_wrap">
                                    <div class="media_check_btn"></div>
                                </div>
                            </div>
                        </div>
                    </a>
                    <div class="video_item_info">
                        <a class="video_item_title" href="javascript:void(0)" title="${title}">
                            ${title}
                        </a>
                        <div class="video_item_author">
                            <a class="mem_link" href="${authorUrl}" target="_blank">${authorName}</a>
                        </div>
                        <div class="video_item_add_info">
                            <div>
                                ${formattedDate ? `
                                    <span class="video_item_date_info">
                                        <span class="video_item_updated">${formattedDate}</span>
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        if (append) {
            videosContainer.append(videosHTML);
        } else {
            videosContainer.html(videosHTML);
        }

        this.updateChooseButton(this.getSelectionCount());
    }

    handleVideoPagination(totalCount, currentPage, query) {
        const pagesCount = this.calculatePages(totalCount, this.CONSTANTS.VIDEOS_PER_PAGE);
        const moreContainer = u('.videos_choose_more_container');

        if (currentPage + 1 < pagesCount) {
            const showMoreButton = this.createShowMoreButton(pagesCount, 'show_more_videos');
            moreContainer.html(showMoreButton);
            moreContainer.find('.show_more_videos').attr('data-query', query);
        } else {
            moreContainer.html('');
        }
    }

    toggleVideoSelection(videoId) {
        const isSelected = this.toggleItemSelection(videoId, `[data-video-id="${videoId}"]`);
        this.updateChooseButton(this.getSelectionCount());
        return isSelected;
    }

    attachSelectedVideos(form) {
        const selectedVideoIds = this.getSelectedItems();
        const newVideoIds = this.filterNewItems(selectedVideoIds);

        if (!this.checkAttachmentLimit(newVideoIds.length)) {
            return;
        }

        newVideoIds.forEach(videoId => {
            const videoElement = u(`[data-video-id="${videoId}"]`);
            const videoUrl = videoElement.attr('data-video-url');

            __appendToTextarea({
                'type': 'video',
                'preview': videoUrl,
                'id': videoId,
                'fullsize_url': videoUrl
            }, form);
        });
    }

    attachSingleVideo(videoId, form) {
        if (this.isAlreadyAttached(videoId)) {
            return;
        }

        if (!this.checkAttachmentLimit(1)) {
            return;
        }

        const videoElement = u(`[data-video-id="${videoId}"]`);
        const videoUrl = videoElement.attr('data-video-url');

        __appendToTextarea({
            'type': 'video',
            'preview': videoUrl,
            'id': videoId,
            'fullsize_url': videoUrl
        }, form);
    }

    clearSelection() {
        super.clearSelection();
        u('.video_item').removeClass('selected');
    }

    initialize() {
        this.setupDialogStyles();

        if (window.uiSearch) {
            window.uiSearch.init(this.messageBox.getNode().find('.ui_search').nodes[0]);
        }
    }

    static createDialogBody() {
        return `
        <div class='attachment_selector no_hack'>
            <a href="/videos/upload" class="choose_upload_area" role="button" tabindex="0">
                <span class="choose_upload_area_label">${tr("upload_button")}</span>
            </a>
            <div class="videos_choose_search">
                <div class="ui_search_new ui_search ui_search_field_empty">
                    <div class="ui_search_input_block">
                        <button class="ui_search_button_search">&nbsp;</button>
                        <div class="ui_search_input_inner">
                            <div class="ui_search_reset" style="visibility: hidden; opacity: 0;"></div>
                            <input type="search" maxlength="100" name="q" class="ui_search_field" placeholder="${tr("search_for_videos")}" id="video_query">
                        </div>
                    </div>
                </div>
            </div>
            <div id='attachment_insert' style='height: unset; padding: 0'>
                <div class="videosInsert video_block_layout"></div>
                <div class="videos_choose_more_container"></div>
            </div>
        </div>
        `;
    }
}

class VideoAttachmentDialog {
    constructor(form) {
        this.form = form;
        this.requestManager = new BaseRequestManager();
        this.messageBox = new CMessageBox({
            title: tr('selecting_video'),
            body: VideoManager.createDialogBody(),
        });
        this.videoManager = new VideoManager(this.messageBox, this.requestManager, this.form);
        this.videoManager.initialize();
        this.videoManager.updateChooseButton = (selectedCount) => {
            const chooseBtn = this.messageBox.getNode().find('#choose-videos-btn');
            if (selectedCount > 0) {
                const buttonText = `${tr('attach')} (${selectedCount})`;
                if (chooseBtn.length === 0) {
                    this.messageBox.getNode().find('.ovk-diag-action').prepend(`
                        <input type="button" id="choose-videos-btn" class="button close-dialog-btn" value="${buttonText}">
                    `);
                } else {
                    chooseBtn.attr('value', buttonText);
                }
            } else {
                chooseBtn.remove();
            }
        };
    }

    async initialize() {
        this.setupEventHandlers();
        await this.loadInitialContent();
    }

    async loadInitialContent() {
        await this.videoManager.loadVideos(0, '', false);
    }

    setupEventHandlers() {
        const node = this.messageBox.getNode();

        node.on('click', '.media_check_btn_wrap', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const videoRow = u(e.target).closest('.video_item');
            const videoId = videoRow.attr('data-video-id');
            this.videoManager.toggleVideoSelection(videoId);
        });

        node.on('click', '.video_item__thumb_link', (e) => {
            if (u(e.target).closest('.media_check_btn_wrap').length > 0) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            const videoRow = u(e.target).closest('.video_item');
            const videoId = videoRow.attr('data-video-id');
            this.videoManager.attachSingleVideo(videoId, this.form);
            this.messageBox.close();
        });

        node.on('click', '.show_more_videos', async (e) => {
            const button = u(e.target).closest('.show_more_videos');
            const query = button.attr('data-query') || '';
            const currentPage = Math.floor(u('.video_item').length / this.videoManager.CONSTANTS.VIDEOS_PER_PAGE);

            this.videoManager.showLoaderInButton(button);
            await this.videoManager.loadVideos(currentPage, query, true);
        });

        node.on('click', '#choose-videos-btn', () => {
            this.videoManager.attachSelectedVideos(this.form);
            this.messageBox.close();
        });

        node.on('input', '.ui_search_field', async (e) => {
            const query = e.target.value.trim();
            this.videoManager.currentQuery = query;

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(async () => {
                await this.videoManager.loadVideos(0, query, false);
            }, 500);
        });

        node.on('click', '.ui_search_button_search', (e) => {
            e.preventDefault();
            const input = node.find('.ui_search_field').nodes[0];
            if (input) {
                const query = input.value.trim();
                this.videoManager.currentQuery = query;
                this.videoManager.loadVideos(0, query, false);
            }
        });

        node.on('change', '.ui_search_field', (e) => {
            const query = e.target.value.trim();
            this.videoManager.currentQuery = query;
            this.videoManager.loadVideos(0, query, false);
        });
    }
}

class AudioManager extends BaseAttachmentManager {
    constructor(messageBox, requestManager, form = null) {
        super(messageBox, requestManager, form, 'audio', {
            AUDIOS_PER_PAGE: 10
        });
        this.currentQuery = '';
        this.searchType = 'by_name';
    }

    get selectedAudios() {
        return this.selectedItems;
    }

    async loadAudios(page = 0, query = '', append = false) {
        const requestId = this.requestManager.createCancellableRequest();
        const audiosContainer = u('.audiosInsert');

        if (!append) {
            audiosContainer.html('');
            this.showLoader(audiosContainer);
        }

        try {
            let searcher = new playersSearcher("entity_audios", 0);

            if (query !== '') {
                searcher.context_type = "search_context";
                searcher.query = query;
                searcher.searchType = this.searchType;
            }

            return new Promise((resolve, reject) => {
                searcher.successCallback = (response, thisc) => {
                    if (this.requestManager.isRequestCancelled(requestId)) return;

                    let domparser = new DOMParser();
                    let result = domparser.parseFromString(response, "text/html");

                    let pagesCount = result.querySelector("input[name='pagesCount']").value;
                    let count = Number(result.querySelector("input[name='count']").value);

                    if (count < 1) {
                        this.showError(audiosContainer, thisc.context_type == "entity_audios" ? tr("no_audios_thisuser") : tr("no_results"));
                        resolve({ count: 0, items: [] });
                        return;
                    }

                    const audioElements = Array.from(result.querySelectorAll(".audioEmbed"));
                    this.renderAudios(audioElements, append);
                    this.handleAudioPagination(thisc.page, pagesCount);

                    resolve({ count, items: audioElements, page: thisc.page, pagesCount });
                };

                searcher.errorCallback = () => {
                    if (this.requestManager.isRequestCancelled(requestId)) return;
                    this.showError(audiosContainer, 'Error when loading audios.');
                    reject(new Error('Error loading audios'));
                };

                searcher.movePage(page + 1);
            });

        } catch (error) {
            if (this.requestManager.isRequestCancelled(requestId)) return;
            console.error('Error loading audios:', error);
            this.showError(audiosContainer, tr('error_loading_audios'));
        }
    }

    renderAudios(audioElements, append) {
        const audiosContainer = u('.audiosInsert');
        let audiosHTML = '';

        audioElements.forEach(el => {
            const audioId = el.dataset.prettyid;
            let isSelected = this.selectedAudios.has(audioId);
            if (this.form && !isSelected) {
                const attachmentExists = this.form.find(`.post-vertical .vertical-attachment[data-type="audio"][data-id="${audioId}"]`).length > 0;
                if (attachmentExists) {
                    isSelected = true;
                    this.selectedAudios.add(audioId);
                }
            }

            const selectedClass = isSelected ? 'selected' : '';
            const buttonText = isSelected ? tr("detach") : tr("attach");

            audiosHTML += `
                <div class='audio_attachment_header ${selectedClass}' style="display: flex;width: 100%;" data-audio-id="${audioId}">
                    <div class='player_part'>${el.outerHTML}</div>
                    <div class="attachAudio" data-attachmentdata="${audioId}">
                        <span>${buttonText}</span>
                    </div>
                </div>
            `;
        });

        if (append) {
            audiosContainer.append(audiosHTML);
        } else {
            audiosContainer.html(audiosHTML);
        }
    }

    handleAudioPagination(currentPage, pagesCount) {
        const moreContainer = u('.audios_choose_more_container');

        if (currentPage < pagesCount) {
            moreContainer.html(`
                <div id="show_more" data-pagesCount="${pagesCount}" data-page="${currentPage + 1}" class="showMore">
                    <span>${tr("show_more_audios")}</span>
                </div>
            `);
        } else {
            moreContainer.html('');
        }
    }

    toggleAudioSelection(audioId) {
        const audioElement = u(`[data-audio-id="${audioId}"]`);

        if (this.selectedAudios.has(audioId)) {
            this.selectedAudios.delete(audioId);
            audioElement.removeClass('selected');
            audioElement.find('.attachAudio span').html(tr("attach"));

            if (this.form) {
                const attachmentElement = this.form.find(`.post-vertical .vertical-attachment[data-type="audio"][data-id="${audioId}"]`);
                if (attachmentElement.length > 0) {
                    attachmentElement.remove();
                }
            }
        } else {
            const currentAttachments = this.form.find('.post-horizontal > a, .post-vertical > .vertical-attachment').length;
            if (currentAttachments >= 10) {
                NewNotification(
                    tr('error'),
                    tr('too_many_attachments'),
                    null,
                    () => {},
                    5000,
                    false
                );
                return false;
            }

            this.selectedAudios.add(audioId);
            audioElement.addClass('selected');
            audioElement.find('.attachAudio span').html(tr("detach"));

            const playerPart = audioElement.find('.player_part');
            this.form.find('.post-vertical').append(`
                <div class="vertical-attachment upload-item" data-type='audio' data-id="${audioId}">
                    <div class='vertical-attachment-content'>
                        ${playerPart.html()}
                    </div>
                    <div class='vertical-attachment-remove'>
                        <div id='small_remove_button'></div>
                    </div>
                </div>
            `);
        }

        return this.selectedAudios.has(audioId);
    }

    initialize() {
        this.setupDialogStyles();
    }

    static createDialogBody() {
        return `
        <div class='attachment_selector no_hack'>
            <div class="choose_upload_area audio-upload-btn" role="button" tabindex="0">
                <span class="choose_upload_area_label">${tr("upload_button")}</span>
            </div>
            <div class='audios_tab_content'>
                <div class='audios_search_container clear_fix'>
                    <div class='ui_search_new ui_search'>
                        <div class='ui_search_input_block'>
                            <button class="ui_search_button_search">&nbsp;</button>
                            <div class="ui_search_input_inner">
                                <div class='ui_search_reset'></div>
                                <input type='text' class='ui_search_field' placeholder='${tr("header_search")}' />
                            </div>
                        </div>
                    </div>
                    <select name="perf" class="audio_search_type">
                        <option value="by_name">${tr("by_name")}</option>
                        <option value="by_performer">${tr("by_performer")}</option>
                    </select>
                </div>
                <div class='audiosInsert'></div>
                <div class='audios_choose_more_container'></div>
            </div>
        </div>
        `;
    }
}

class AudioAttachmentDialog {
    constructor(form) {
        this.form = form;
        this.searchTimeout = null; // Debounce timeout for search functionality

        // Initialize managers
        this.requestManager = new BaseRequestManager();

        // Create message box with audio-specific dialog body
        this.messageBox = new CMessageBox({
            title: tr('select_audio'),
            body: AudioManager.createDialogBody(),
        });

        // Set custom dimensions
        this.messageBox.getNode().attr('style', 'width: 560px');
        this.messageBox.getNode().find('.ovk-diag-body').attr('style', 'padding: 0px!important; height: 850px');

        // Create and initialize managers
        this.audioManager = new AudioManager(this.messageBox, this.requestManager, this.form);
        this.audioManager.initialize();


    }

    async loadInitialContent() {
        try {
            await this.audioManager.loadAudios(0, '', false);
        } catch (error) {
            console.error('Error loading initial audio content:', error);
        }
    }

    setupEventHandlers() {
        const node = this.messageBox.getNode();

        node.on('click', '.audio-upload-btn', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.messageBox.close();

            showAudioUploadPopup();
        });

        node.on('click', '.attachAudio', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const audioHeader = u(e.target).closest('.audio_attachment_header');
            const audioId = audioHeader.attr('data-audio-id');
            const wasAttached = this.audioManager.selectedAudios.has(audioId);

            this.audioManager.toggleAudioSelection(audioId);

            if (!wasAttached && !e.ctrlKey) {
                this.messageBox.close();
            }
        });

        node.on('click', '#show_more', async (e) => {
            e.preventDefault();
            const target = u(e.target).closest('#show_more');
            target.addClass('lagged');

            const page = Number(target.attr('data-page')) - 1;
            await this.audioManager.loadAudios(page, this.audioManager.currentQuery, true);
        });

        node.on('input', '.ui_search_field', (e) => {
            const query = e.target.value.trim();
            this.audioManager.currentQuery = query;

            this.requestManager.cancelOngoingRequests();

            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.audioManager.loadAudios(0, query, false);
            }, 300);
        });

        node.on('change', '.audio_search_type', (e) => {
            this.audioManager.searchType = e.target.value;
            this.audioManager.loadAudios(0, this.audioManager.currentQuery, false);
        });

        node.on('click', '.ui_search_reset', () => {
            node.find('.ui_search_field').nodes[0].value = '';
            this.audioManager.currentQuery = '';
            this.audioManager.loadAudios(0, '', false);
        });
    }

    async initialize() {
        this.setupEventHandlers();
        await this.loadInitialContent();
    }
}

class DocumentManager extends BaseAttachmentManager {
    constructor(messageBox, requestManager, form = null, source = "user", sourceArg = 0) {
        super(messageBox, requestManager, form, 'document', {
            DOCS_PER_PAGE: 10
        });
        this.source = source;
        this.sourceArg = sourceArg;
        this.currentQuery = '';
        this.searchTimeout = null;
        this.isSearching = false;
    }

    get selectedDocuments() {
        return this.selectedItems;
    }

    async loadDocuments(page = 0, query = '', append = false) {
        const requestId = this.requestManager.createCancellableRequest();
        const docsContainer = u('.docsInsert');

        if (!append) {
            docsContainer.html('');
            this.showLoader(docsContainer);
        }

        try {
            const fd = new FormData();
            fd.append("context", query ? "search" : "list");
            fd.append("hash", window.router.csrf);
            if (query) {
                fd.append("ctx_query", query);
            }

            let url = `/docs${this.source == "club" ? this.sourceArg : ""}?picker=1&p=${page + 1}`;

            const req = await fetch(url, {
                method: "POST",
                body: fd
            });

            if (this.requestManager.isRequestCancelled(requestId)) return;

            const res = await req.text();
            const dom = new DOMParser();
            const pre = dom.parseFromString(res, "text/html");

            const pagesCount = Number(pre.querySelector("input[name='pagesCount']").value);
            const count = Number(pre.querySelector("input[name='count']").value);

            if (count < 1) {
                this.showError(docsContainer, tr("no_documents"));
                return { count: 0, items: [] };
            }

            const docElements = Array.from(pre.querySelectorAll("._content"));
            this.renderDocuments(docElements, append);
            this.handleDocumentPagination(page, pagesCount);

            return { count, items: docElements, page, pagesCount };
        } catch (error) {
            if (this.requestManager.isRequestCancelled(requestId)) return;
            console.error('Error loading documents:', error);
            this.showError(docsContainer, tr('error_loading_documents'));
        }
    }

    renderDocuments(docElements, append) {
        const docsContainer = u('.docsInsert');
        let docsHTML = '';

        docElements.forEach(el => {
            const docId = el.dataset.attachmentdata;

            let isSelected = this.selectedDocuments.has(docId);
            if (this.form && !isSelected) {
                const attachmentExists = this.form.find(`.post-vertical .vertical-attachment[data-type="document"][data-id="${docId}"]`).length > 0;
                if (attachmentExists) {
                    isSelected = true;
                    this.selectedDocuments.add(docId);
                }
            }

            const selectedClass = isSelected ? 'selected' : '';
            const buttonText = isSelected ? tr("detach") : tr("attach");

            docsHTML += `
                <div class='document_attachment_header ${selectedClass}' data-document-id="${docId}">
                    <div class="attachDocument" data-attachmentdata="${docId}">
                        <span>${buttonText}</span>
                    </div>
                    <div class='document_content'>${el.outerHTML}</div>
                </div>
            `;
        });

        if (append) {
            docsContainer.append(docsHTML);
        } else {
            docsContainer.html(docsHTML);
        }
    }

    handleDocumentPagination(currentPage, pagesCount) {
        const moreContainer = u('.docs_choose_more_container');

        if (currentPage < pagesCount - 1) {
            moreContainer.html(`
                <div id="show_more" data-pagesCount="${pagesCount}" data-page="${currentPage + 1}" class="showMore">
                    <span>${tr("show_more")}</span>
                </div>
            `);
        } else {
            moreContainer.html('');
        }
    }

    toggleDocumentSelection(docId) {
        const docElement = u(`[data-document-id="${docId}"]`);

        if (this.selectedDocuments.has(docId)) {
            this.selectedDocuments.delete(docId);
            docElement.removeClass('selected');
            docElement.find('.attachDocument span').html(tr("attach"));

            if (this.form) {
                const attachmentElement = this.form.find(`.post-vertical .vertical-attachment[data-type="doc"][data-id="${docId}"]`);
                if (attachmentElement.length > 0) {
                    attachmentElement.remove();
                }
            }
        } else {
            const currentAttachments = this.form.find('.post-horizontal > a, .post-vertical > .vertical-attachment').length;
            if (currentAttachments >= 10) {
                NewNotification(
                    tr('error'),
                    tr('too_many_attachments'),
                    null,
                    () => {},
                    5000,
                    false
                );
                return false;
            }

            this.selectedDocuments.add(docId);
            docElement.addClass('selected');
            docElement.find('.attachDocument span').html(tr("detach"));

            const docContent = docElement.find('.document_content ._content').nodes[0];
            const dataset = docContent.dataset;
            const _url = dataset.attachmentdata.split("_");

            this.form.find('.post-vertical').append(`
                <div class="vertical-attachment upload-item" draggable="true" data-type='doc' data-id="${dataset.attachmentdata}">
                    <div class='vertical-attachment-content' draggable="false">
                        <div class="docMainItem attachment_doc attachment_note">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 10"><polygon points="0 0 0 10 8 10 8 4 4 4 4 0 0 0"/><polygon points="5 0 5 3 8 3 5 0"/></svg>
                            <div class='attachment_note_content'>
                                <span class="attachment_note_text">${tr("document")}</span>
                                <span class="attachment_note_name"><a href="/doc${_url[0]}_${_url[1]}?key=${_url[2]}">${ovk_proc_strtr(escapeHtml(dataset.name), 50)}</a></span>
                            </div>
                        </div>
                    </div>
                    <div class='vertical-attachment-remove'>
                        <div id='small_remove_button'></div>
                    </div>
                </div>
            `);
        }

        return this.selectedDocuments.has(docId);
    }

    async searchDocuments(query) {
        if (this.isSearching) {
            return;
        }

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(async () => {
            this.isSearching = true;
            this.currentQuery = query;

            try {
                await this.loadDocuments(0, query, false);
            } finally {
                this.isSearching = false;
            }
        }, 300);
    }

    initialize() {
        if (window.uiSearch) {
            window.uiSearch.init(this.messageBox.getNode().find('.ui_search').nodes[0]);
        }
    }

    static createDialogBody() {
        return `
        <div class="docs_choose_wrap">
            <div class="choose_upload_area document-upload-btn" role="button" tabindex="0">
                <span class="choose_upload_area_label">${tr("upload_button")}</span>
            </div>
            <div class="docs_choose_search">
                <div class="ui_search_new ui_search ui_search_field_empty">
                    <div class="ui_search_input_block">
                        <button class="ui_search_button_search">&nbsp;</button>
                        <div class="ui_search_input_inner">
                            <div class="ui_search_reset" style="visibility: hidden; opacity: 0;"></div>
                            <input type="search" maxlength="100" name="q" class="ui_search_field" placeholder="${tr("search_by_documents")}">
                        </div>
                    </div>
                </div>
            </div>
            <div id='_attachment_insert' class='clear_fix'>
                <div class="docsInsert"></div>
                <div class="docs_choose_more_container"></div>
            </div>
        </div>
        `;
    }
}

class DocumentAttachmentDialog {
    constructor(form, source = "user", sourceArg = 0) {
        this.form = form;
        this.source = source;
        this.sourceArg = sourceArg;
        this.searchTimeout = null;

        this.requestManager = new BaseRequestManager();

        this.messageBox = new CMessageBox({
            title: tr('select_doc'),
            body: DocumentManager.createDialogBody(),
            buttons: source != "user" ? [tr("go_to_my_documents"), tr("close")] : [tr("close")],
            callbacks: source != "user" ? [
                async () => {
                    this.messageBox.close();
                    const dialog = new DocumentAttachmentDialog(form, "user", 0);
                    await dialog.initialize();
                },
                () => {
                    this.messageBox.close();
                }
            ] : [
                () => {
                    this.messageBox.close();
                }
            ]
        });

        this.messageBox.getNode().attr('style', 'width: 636px;');

        this.documentManager = new DocumentManager(this.messageBox, this.requestManager, this.form, source, sourceArg);
        this.documentManager.initialize();
    }

    async loadInitialContent() {
        try {
            await this.documentManager.loadDocuments(0, '', false);
        } catch (error) {
            console.error('Error loading initial document content:', error);
        }
    }

    setupEventHandlers() {
        const node = this.messageBox.getNode();

        node.on('click', '.document-upload-btn', (e) => {
            e.preventDefault();
            e.stopPropagation();

            this.messageBox.close();

            showDocumentUploadDialog("search", this.sourceArg >= 0 ? NaN : Math.abs(this.sourceArg), () => {
            });
        });

        node.on('click', '.attachDocument', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const docHeader = u(e.target).closest('.document_attachment_header');
            const docId = docHeader.attr('data-document-id');
            const wasAttached = this.documentManager.selectedDocuments.has(docId);
            this.documentManager.toggleDocumentSelection(docId);
            if (!wasAttached && !e.ctrlKey) {
                this.messageBox.close();
            }
        });

        node.on('click', '#show_more', async (e) => {
            e.preventDefault();
            const target = u(e.target).closest('#show_more');
            target.addClass('lagged');

            const page = Number(target.attr('data-page'));
            await this.documentManager.loadDocuments(page, this.documentManager.currentQuery, true);
            target.remove();
        });

        node.on('input', '.ui_search_field', (e) => {
            const query = ovk_proc_strtr(e.target.value, 100);
            this.documentManager.searchDocuments(query);
        });

        node.on('click', '.ui_search_button_search', (e) => {
            e.preventDefault();
            const input = node.find('.ui_search_field').nodes[0];
            if (input) {
                const query = ovk_proc_strtr(input.value, 100);
                this.documentManager.searchDocuments(query);
            }
        });
    }

    async initialize() {
        this.setupEventHandlers();
        await this.loadInitialContent();
    }
}

u(document).on("click", "#__vkifyPhotoAttachment", async (e) => {
    const form = u(e.target).closest('form');
    const club = Number(e.currentTarget.dataset.club ?? 0);

    const dialog = new PhotoAttachmentDialog(form, club);
    await dialog.initialize();
});

u(document).on('click', '#__vkifyVideoAttachment', async (e) => {
    const form = u(e.target).closest('form');

    const dialog = new VideoAttachmentDialog(form);
    await dialog.initialize();
});

u(document).on('click', '#__vkifyAudioAttachment', async (e) => {
    const form = u(e.target).closest('form');

    const dialog = new AudioAttachmentDialog(form);
    await dialog.initialize();
});

u(document).on('click', '#__vkifyDocumentAttachment', async (e) => {
    const form = u(e.target).closest('form');

    const dialog = new DocumentAttachmentDialog(form);
    await dialog.initialize();
});