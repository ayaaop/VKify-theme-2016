u(document).on("click", "#editPost", async (e) => {
    e.stopImmediatePropagation();

    const target = u(e.target)
    const post = target.closest(".post")
    const content = post.find(".post_content")

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
                            <div class="page_add_media">
                                <a id="__photoAttachment">
                                    <img src="/assets/packages/static/openvk/img/oxygen-icons/16x16/mimetypes/application-x-egon.png" />
                                </a>
                                <a id="__videoAttachment">
                                    <img src="/assets/packages/static/openvk/img/oxygen-icons/16x16/mimetypes/application-vnd.rn-realmedia.png" />
                                </a>
                                <a id="__audioAttachment">
                                    <img src="/assets/packages/static/openvk/img/oxygen-icons/16x16/mimetypes/audio-ac3.png" />
                                </a>
                                <a class="post-attach-menu__trigger" id="moreAttachTrigger">
                                    ${tr('show_more')}
                                </a>
                                <div class="tippy-menu" id="moreAttachTooltip2">
                                        <a id="__documentAttachment">
                                            <img src="/assets/packages/static/openvk/img/oxygen-icons/16x16/mimetypes/application-octet-stream.png" />
                                            ${tr('document')}
                                        </a>
                                        ${type == 'post' ? `<a id="__notesAttachment">
                                            <img src="/assets/packages/static/openvk/img/oxygen-icons/16x16/mimetypes/application-x-srt.png" />
                                            ${tr('note')}
                                        </a>
                                        <a id='__sourceAttacher'>
                                            <img src="/assets/packages/static/openvk/img/oxygen-icons/16x16/actions/insert-link.png" />
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

function setupTooltipCheckboxListeners() {
    u(document).on('change', 'input[name="as_group"]', function(e) {
        window.wallCheckboxStates.as_group = e.target.checked;
    });

    u(document).on('change', 'input[name="force_sign"]', function(e) {
        window.wallCheckboxStates.force_sign = e.target.checked;
    });

    u(document).on('change', 'input[name="anon"]', function(e) {
        window.wallCheckboxStates.anon = e.target.checked;

        if (e.target.checked) {
            window.wallCheckboxStates.as_group = false;

            const form = document.querySelector('#write form');
            if (form && form.dataset.originalAction) {
                form.action = form.dataset.originalAction;
            }
        }
    });

    u(document).on('change', 'input[name="nsfw"]', function(e) {
        window.wallCheckboxStates.nsfw = e.target.checked;
    });
}

setupTooltipCheckboxListeners();

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

        const currentUrl = window.location.pathname;
        const groupMatch = currentUrl.match(/^\/club(\d+)/);
        if (groupMatch && el.checked) {
            form.action = `/wall-${groupMatch[1]}/makePost`;
        } else if (form.dataset.originalAction) {
            form.action = form.dataset.originalAction;
        }
    }

    const userImg = form ? form.querySelector('._post_field_user_image') : document.querySelector('._post_field_user_image');
    const groupImg = form ? form.querySelector('._post_field_group_image') : document.querySelector('._post_field_group_image');
    const avatarLink = form ? form.querySelector('._post_field_author') : document.querySelector('._post_field_author');

    if (userImg && groupImg) {
        if (el.checked) {
            userImg.classList.remove('avatar-showing');
            userImg.classList.add('avatar-flipping');

            setTimeout(() => {
                groupImg.classList.remove('avatar-flipping');
                groupImg.classList.add('avatar-showing');
                if (avatarLink && groupImg.dataset.groupUrl) {
                    avatarLink.href = groupImg.dataset.groupUrl;
                }

                setTimeout(() => {
                    userImg.style.opacity = '0';
                    userImg.classList.remove('avatar-flipping');
                    groupImg.style.opacity = '1';
                    groupImg.classList.remove('avatar-showing');
                }, 100);
            }, 100);
        } else {
            groupImg.classList.remove('avatar-showing');
            groupImg.classList.add('avatar-flipping');

            setTimeout(() => {
                userImg.classList.remove('avatar-flipping');
                userImg.classList.add('avatar-showing');
                if (avatarLink && userImg.dataset.userUrl) {
                    avatarLink.href = userImg.dataset.userUrl;
                }

                setTimeout(() => {
                    groupImg.style.opacity = '0';
                    groupImg.classList.remove('avatar-flipping');
                    userImg.style.opacity = '1';
                    userImg.classList.remove('avatar-showing');
                }, 100);
            }, 100);
        }
    }
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