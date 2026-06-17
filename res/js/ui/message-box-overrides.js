(function () {
'use strict';

vkify.bindOnce('messageBoxOverrides', () => {
    const applyOverrides = () => {
        const U = window.u;
        const CMB = window.CMessageBox || (typeof CMessageBox !== 'undefined' ? CMessageBox : null);

        if (!U || !CMB || !CMB.prototype) {
            return false;
        }

        const proto = CMB.prototype;
        if (!proto) {
            return false;
        }

        const newTemplate = function () {
            return U(
                `<div class="ovk-diag-cont ovk-msg-all" data-id="${this.id}">
  <div class="ovk-diag">
     <div class="ovk-diag-head">${this.title}<div class="ovk-diag-head-close" onclick="window.__vkifyCloseDialog()"></div></div>
     <div class="ovk-diag-body">${this.body}</div>
     <div class="ovk-diag-action"></div>
  </div>
 </div>`);
        };
        newTemplate.__vkifyPatched = true;
        if (!proto.__vkifyMessageBoxTemplateHooked && typeof proto.__getTemplate === 'function') {
            proto.__vkifyMessageBoxTemplateHooked = true;
            vkify.hook(proto, '__getTemplate', newTemplate, 'replace');
        }

        const closeFn = async function () {
            const stack = window.messagebox_stack;
            const msg = Array.isArray(stack) ? stack[stack.length - 1] : null;
            if (!msg) {
                return;
            }
            if (msg.close_on_buttons) {
                msg.close();
                return;
            }

            let shouldWarn = msg.warn_on_exit;

            if (msg.attachmentDialog && typeof msg.attachmentDialog.getSelectionCount === 'function') {
                const selectionCount = msg.attachmentDialog.getSelectionCount();
                shouldWarn = selectionCount >= 1;
            }

            if (shouldWarn) {
                if (typeof msg.__showCloseConfirmationDialog === 'function') {
                    const res = await msg.__showCloseConfirmationDialog();
                    if (res === true) {
                        msg.close();
                    }
                } else {
                    if (confirm(tr('exit_confirmation'))) {
                        msg.close();
                    }
                }
            } else {
                msg.close();
            }
        };
        closeFn.__vkifyPatched = true;
        window.__vkifyCloseDialog = closeFn;

        vkify.bindOnce("dimmerClose", () => {
            document.addEventListener('click', (e) => {
                const t = e.target;
                if (!t) return;
                if (document.body && document.body.classList.contains('dimmed') && t.classList && t.classList.contains('dimmer')) {
                    e.stopImmediatePropagation();
                    if (window.__vkifyCloseDialog) window.__vkifyCloseDialog();
                }
            }, true);
        });

        vkify.bindOnce("escClose", () => {
            document.addEventListener('keyup', (e) => {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    if (window.messagebox_stack && window.messagebox_stack.length) {
                        if (window.__vkifyCloseDialog) window.__vkifyCloseDialog();
                    }
                }
            }, true);
        });

        if (!proto.__vkifyStackingHooked) {
            proto.__vkifyStackingHooked = true;

            const updateDialogVisibility = () => {
                const dialogs = document.querySelectorAll('.ovk-msg-all');
                const len = dialogs.length;
                dialogs.forEach((el, i) => {
                    if (i < len - 1) {
                        el.style.display = 'none';
                        el.classList.add('msgbox-hidden');
                    } else {
                        el.style.display = '';
                        el.classList.remove('msgbox-hidden');
                    }
                });
            };

            const origExitDialog = proto.__exitDialog;
            proto.__exitDialog = function () {
                const stack = window.messagebox_stack;
                var myIndex = -1;
                if (stack && typeof stack.findIndex === 'function') {
                    myIndex = stack.findIndex(m => m.id === this.id);
                }
                if (myIndex === -1) myIndex = -1; // Fallback
                if (myIndex > 0) {
                    const prev = stack[myIndex - 1];
                    const prevNode = prev && typeof prev.getNode === 'function' ? prev.getNode() : null;
                    if (prevNode && prevNode.length) {
                        prevNode.removeClass('msgbox-hidden');
                        if (prevNode.nodes[0]) {
                            prevNode.nodes[0].style.display = '';
                        }
                    }
                }
                origExitDialog.call(this);
            };

            vkify.bindOnce('msgboxStackObserver', () => {
                const observer = new MutationObserver((mutations) => {
                    for (const m of mutations) {
                        for (const node of m.addedNodes) {
                            if (node.nodeType === 1 && node.classList && node.classList.contains('ovk-msg-all')) {
                                if (window.tippy && window.tippy.hideAll) window.tippy.hideAll();
                                updateDialogVisibility();
                                return;
                            }
                        }
                        for (const node of m.removedNodes) {
                            if (node.nodeType === 1 && node.classList && node.classList.contains('ovk-msg-all')) {
                                updateDialogVisibility();
                                return;
                            }
                        }
                    }
                });
                observer.observe(document.body, { childList: true });
            });
        }

        return true;
    };

    applyOverrides();
    vkify.hook(vkify, 'onPageReady', applyOverrides, 'after');
});

function replaceMbTabs(mbTabs) {
    if (mbTabs.__vkifyReplaced) return;
    mbTabs.__vkifyReplaced = true;

    const tabs = [...mbTabs.querySelectorAll('.mb_tab')].map(t => ({
        name: t.dataset.name,
        label: t.textContent.trim(),
        active: t.id === 'active',
    }));

    const header = u(`
        <h2 class="page_block_h2 tabs_header">
            <ul class="ui_tabs clear_fix ui_tabs_plain ui_tabs_sliding">
                ${tabs.map(t => `
                    <li><a class="ui_tab${t.active ? ' ui_tab_sel' : ''}" href="#" data-name="${t.name}">${t.label}</a></li>
                `).join('')}
                <div class="ui_tabs_slider"></div>
            </ul>
        </h2>
    `).first();
    const ul = header.querySelector('ul');
    const slider = ul.querySelector('.ui_tabs_slider');

    mbTabs.style.display = 'none';
    mbTabs.parentNode.insertBefore(header, mbTabs);

    let currentTab = null;
    var foundTab = tabs.find(t => t.active);
    if (foundTab && foundTab.name) {
        currentTab = foundTab.name;
    } else if (tabs[0] && tabs[0].name) {
        currentTab = tabs[0].name;
    }

    function positionSlider(tabEl) {
        if (!tabEl) return;
        slider.style.transform = `translateX(${tabEl.offsetLeft}px)`;
        slider.style.width = `${tabEl.offsetWidth}px`;
    }

    function updateExtrasVisibility() {
        ul.querySelectorAll('.ui_tab_extra').forEach(el => {
            el.style.display = el.dataset.ownerTab === currentTab ? '' : 'none';
        });
    }

    function activate(name) {
        currentTab = name;
        const active = ul.querySelector(`.ui_tab[data-name='${name}']`);
        ul.querySelectorAll('.ui_tab').forEach(a => a.classList.toggle('ui_tab_sel', a === active));
        positionSlider(active);
        updateExtrasVisibility();
    }

    positionSlider(ul.querySelector('.ui_tab_sel'));

    u(ul).on('click', '.ui_tab', (e) => {
        e.preventDefault();
        const name = u(e.target).closest('.ui_tab').attr('data-name');
        activate(name);
        var tabLink = mbTabs.querySelector(`.mb_tab[data-name='${name}'] a`);
        if (tabLink) tabLink.click();
    });

    // Stock dialogs sometimes inject extra <input type=button> into .mb_tabs
    // after the fact (e.g. feed settings' #_remove_ignores). Mirror them as
    // links in the visible ul, tagged with the owning tab so they only show
    // while that tab is active, and de-duplicated on re-entry.
    new MutationObserver(() => {
        mbTabs.querySelectorAll('input[type=button]').forEach((btn) => {
            ul.querySelectorAll(`.ui_tab_extra[data-owner-tab='${currentTab}']`).forEach(el => el.remove());
            const classes = [...btn.classList].filter(c => c !== 'button').join(' ');
            const a = u(`<a class="ui_tab_extra ${classes}" href="#" id="${btn.id}" data-owner-tab="${currentTab}">${btn.value}</a>`).first();
            btn.remove();
            ul.appendChild(a);
        });
    }).observe(mbTabs, { childList: true });
}

vkify.onPage(() => {
    vkify.bindOnce('mbTabsObserver', () => {
        vkify.observeDOM((mutations) => {
            for (const m of mutations) {
                for (const node of m.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    if (node.classList.contains('mb_tabs')) {
                        replaceMbTabs(node);
                    } else {
                        if (node.querySelectorAll) node.querySelectorAll('.mb_tabs').forEach(replaceMbTabs);
                    }
                }
            }
        });
    });

    vkify.bindOnce('hookShowAudioAddDialog', () => {
        vkify.hook(window, '__showAudioAddDialog', function () {
            u('.ovk-diag-cont').last().setAttribute('style', 'width:500px');
            u('.ovk-diag-body').attr('style', 'padding:0px !important;');
            const action = document.querySelector('.ovk-diag-action');
            if (action && action.children.length >= 2) {
                action.insertBefore(action.children[1], action.children[0]);
            }
            var contentEl = document.getElementById('_content');
            if (contentEl) contentEl.classList.add('page_padding');
        }, 'then');
    });

    vkify.bindOnce('hookFeedSettingsLink', () => {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#__feed_settings_link')) return;

            u('.ovk-diag-body').attr('style', 'padding:0px !important; min-height: 290px; overflow: hidden;');

            const content = document.getElementById('__content');
            if (!content) return;

            // Stock renders a <table> into #__content for the 'main' tab and
            // an entity_vertical_list of checkboxes for the 'ignored' tab.
            // We rewrite both into nicer layouts. For the main tab we keep
            // stock's input nodes so its event handlers stay bound; for the
            // ignored tab we replace stock's checkbox+global-button UX with
            // a per-item inline "don't ignore" button.

            const rebuildMainForm = (table) => {
                const pageSelect = table.querySelector('#pageSelect');
                const pageNumber = table.querySelector('#pageNumber');
                const showIgnored = table.querySelector('#showIgnored');
                const applyBtn = table.querySelector("input[type='button']");
                if (!pageSelect || !pageNumber || !showIgnored || !applyBtn) return;

                var showIgnoredLabelEl = table.querySelector(`label[for='showIgnored']`);
                const showIgnoredLabel = showIgnoredLabelEl && showIgnoredLabelEl.textContent ? showIgnoredLabelEl.textContent : '';
                const labels = table.querySelectorAll('.nobold');
                const perPageLabel = labels[0] && labels[0].textContent ? labels[0].textContent : '';
                const startFromLabel = labels[1] && labels[1].textContent ? labels[1].textContent : '';

                const form = u(`
                    <div class="form_group">
                        <div class="form_field">
                            <div class="form_label">${perPageLabel}</div>
                            <div class="form_data" data-slot="pageSelect"></div>
                        </div>
                        <div class="form_field">
                            <div class="form_label">${startFromLabel}</div>
                            <div class="form_data" data-slot="pageNumber"></div>
                        </div>
                        <div class="form_field">
                            <div class="form_label"></div>
                            <div class="form_data">
                                <label class="checkbox" data-slot="showIgnored">
                                    <span>${showIgnoredLabel}</span>
                                </label>
                            </div>
                        </div>
                        <div class="form_field">
                            <div class="form_label"></div>
                            <div class="form_data" data-slot="apply"></div>
                        </div>
                    </div>
                `).first();

                form.querySelector('[data-slot="pageSelect"]').appendChild(pageSelect);
                form.querySelector('[data-slot="pageNumber"]').appendChild(pageNumber);
                form.querySelector('[data-slot="showIgnored"]').prepend(showIgnored);
                form.querySelector('[data-slot="apply"]').appendChild(applyBtn);

                content.replaceChildren(form);
            };

            const rebuildIgnoredItem = (item) => {
                if (item.__vkifyRebuilt) return;
                item.__vkifyRebuilt = true;

                const id = item.dataset.id;
                var thirdCol = item.querySelector('.third_column');
                if (thirdCol) thirdCol.remove();

                const slot = u(`
                    <div class="third_column" style="display: grid; align-items: center;">
                        <button type="button" class="button">${tr('stop_ignore')}</button>
                    </div>
                `).first();
                item.appendChild(slot);

                const btn = slot.querySelector('button');
                btn.addEventListener('click', async (ev) => {
                    ev.preventDefault();
                    if (btn.disabled) return;
                    btn.disabled = true;
                    btn.classList.add('lagged');

                    const params = Number(id) > 0
                        ? `user_ids=${encodeURIComponent(id)}`
                        : `group_ids=${encodeURIComponent(Math.abs(id))}`;
                    const res = await fetch(`/method/newsfeed.deleteBan?auth_mechanism=roaming&${params}`);
                    const resp = await res.json();
                    if (resp.error_code) {
                        console.error(resp.error_msg);
                        btn.disabled = false;
                        btn.classList.remove('lagged');
                        return;
                    }

                    const cached = window.openvk?.ignored_list?.response?.items;
                    if (Array.isArray(cached)) {
                        window.openvk.ignored_list.response.items =
                            cached.filter(i => String(i.real_id) !== String(id));
                    }

                    const list = item.parentNode;
                    item.remove();
                    if (list && !list.querySelector('.entity_vertical_list_item')) {
                        content.innerHTML = `<div class="information">${tr('no_ignores_count')}</div>`;
                    }
                });
            };

            const stripRemoveIgnoresButton = () => {
                document.querySelectorAll(
                    '#_feed_settings_container #_remove_ignores, #_feed_settings_container .ui_tab_extra#_remove_ignores'
                ).forEach(el => el.remove());
            };

            const onContentChange = () => {
                const table = content.querySelector('table');
                if (table) { rebuildMainForm(table); return; }

                content.querySelectorAll('.entity_vertical_list_item').forEach(rebuildIgnoredItem);
                stripRemoveIgnoresButton();
            };

            onContentChange();
            new MutationObserver(onContentChange).observe(content, { childList: true, subtree: true });
        });
    });
});

})();
