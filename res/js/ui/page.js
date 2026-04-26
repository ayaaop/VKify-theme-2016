(function () {
'use strict';

window.toggle_comment_textarea = window.toggle_comment_textarea || function (id) {
    const el = ge('commentTextArea' + id);
    const wi = ge('wall-post-input' + id);
    if (!el) {
        return;
    }
    if (!el.classList.contains('hidden')) {
        el.classList.add('hidden');
        if (wi) {
            wi.blur();
        }
    } else {
        el.classList.remove('hidden');
        if (wi) {
            wi.focus();
        }
    }
};

window.setTip = window.setTip || function (obj, text, interactive = false) {
    tippy(obj, {
        content: `<text style="font-size: 11px;">${text}</text>`,
        allowHTML: true,
        placement: 'top',
        theme: 'light vk',
        animation: 'up_down',
        interactive: interactive
    });
};

window.toggleLongText = window.toggleLongText || function (el) {
    const container = el.parentNode;
    const truncated = container.querySelector('.truncated_text');
    const full = container.querySelector('.full_text');

    if (!truncated || !full) {
        return;
    }

    if (full.classList.contains('hidden')) {
        truncated.style.display = 'none';
        full.classList.remove('hidden');
        el.innerHTML = "<vkifyloc name='show_less'></vkifyloc>";
    } else {
        truncated.style.display = 'inline';
        full.classList.add('hidden');
        el.textContent = tr('show_more');
    }
};

window.showBlueWarning = window.showBlueWarning || function (content) {
    NewNotification(tr('warning'), content, null, () => { }, 10000, false);
};

window.allLangsPopup = window.allLangsPopup || async function () {
    const CF = window.ContentFetcher;
    const loader = CF.createLoader();
    loader.show();

    try {
        const content = await CF.fetchPageContent('/language', '#all_languages_list');
        const returnTo = encodeURI(window.location.pathname + window.location.search);
        content.querySelectorAll('a[href^="/language?lg="]').forEach(link => {
            const url = new URL(link.href);
            url.searchParams.set('jReturnTo', returnTo);
            link.href = url.pathname + url.search;
        });

        loader.hide();

        window.langPopup = new CMessageBox({
            title: tr('select_language'),
            body: content.outerHTML,
            buttons: [tr('close')],
            callbacks: [() => { langPopup.close(); }]
        });

        setTimeout(() => {
            $('.ovk-msg-all[data-id]').css('width', '700px');
            $('.ovk-diag-body')[0].style.setProperty('padding', '20px 0 20px 30px', 'important');
            window.reinitializeTooltips?.();
        }, 0);
    } catch (e) {
        loader.hide();
        console.error('Failed to load languages:', e);
    }
};

window.changeLangPopup = window.changeLangPopup || function () {
    const currentLang = window.openvk.current_language;
    const langs = [
        { code: 'ru', name: 'Русский', flag: 'ru.png' },
        { code: 'uk', name: 'Україньска', flag: 'uk.png' },
        { code: 'en', name: 'English', flag: 'en.png' },
        { code: 'ru_sov', name: 'Советский', flag: 'sov.png' },
        { code: 'ru_old', name: 'Дореволюціонный', flag: 'imp.png' }
    ];

    let body = langs.map(lang => `
    <a href="/language?lg=${lang.code}&hash=${encodeURIComponent(window.router.csrf)}&jReturnTo=${encodeURI(window.location.pathname + window.location.search)}">
       <div class="langSelect${currentLang === lang.code ? ' selected' : ''}"><img src="/themepack/vkify16/3.3.2.5/resource/lang_flags/${lang.flag}" style="margin-right: 14px;"><b>${lang.name}</b></div>
    </a>`).join('');

    body += `
    <a href="/language" onclick="langPopup.close(); allLangsPopup(); return false;">
       <div class="langSelect"><b style="padding: 2px 2px 2px 48px;">All languages »</b></div>
    </a>`;

    window.langPopup = new CMessageBox({
        title: tr('select_language'),
        body: body,
        buttons: [tr('close')],
        callbacks: [() => { langPopup.close(); }]
    });

    langPopup.getNode().nodes[0]?.style.setProperty('width', '320px');
    langPopup.getNode().find('.ovk-diag-body').nodes[0]?.style.setProperty('padding', '15px 20px', 'important');
};

window.reportNote = window.reportNote || function (noteId) {
    let uReportMsgTxt = '<vkifyloc name="going_to_report_note"></vkifyloc>';
    uReportMsgTxt += '<br/>' + tr('report_question_text');
    uReportMsgTxt += '<br/><br/><b>' + tr('report_reason') + '</b>: <input type=\'text\' id=\'uReportMsgInput\' placeholder=\'' + tr('reason') + '\' />';

    MessageBox(tr('report_question'), uReportMsgTxt, [tr('confirm_m'), tr('cancel')], [
        (function () {
            const res = document.querySelector('#uReportMsgInput')?.value || '';
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '/report/' + noteId + '?reason=' + encodeURIComponent(res) + '&type=note', true);
            xhr.onload = (function () {
                if (xhr.responseText.indexOf('reason') === -1) {
                    MessageBox(tr('error'), tr('error_sending_report'), ['OK'], [Function.noop]);
                } else {
                    MessageBox(tr('action_successfully'), tr('will_be_watched'), ['OK'], [Function.noop]);
                }
            });
            xhr.send(null);
        }),
        Function.noop
    ]);
};

window.switchProfileInfo = window.switchProfileInfo || function () {
    const infoblock = document.querySelector('.profileinfoblock');
    const infobtn = document.querySelector('#showFullInfoButton');
    if (!infoblock || !infobtn) return;

    if (infoblock.style.display === 'none') {
        infoblock.style.display = 'block';
        infobtn.text = tr('close_comments');
    } else {
        infoblock.style.display = 'none';
        infobtn.text = tr('additional_information');
    }
};

function initLocalStorageCheckboxes() {
    document.querySelectorAll('input[data-act="localstorage_item"]').forEach((input) => {
        const stored = localStorage.getItem(input.name);
        if (stored === null) return;
        const val = Number(stored);
        input.checked = input.dataset.inverse ? !val : !!val;
    });
}

vkify.onPage(initLocalStorageCheckboxes);

// Orchestrator: trigger per-page initializers provided by extracted modules.
vkify.hook(vkify, 'onPageReady', () => {
    window.initializeSearchFastTips?.();
    window.hideSearchFastTips?.();
    setTimeout(window.initTabSlider, 150);

    if (window.location.pathname.includes('/albums') && !ge('photos-section')?.dataset?.initialized) {
        setTimeout(window.initAlbumPhotosLoader, 100);
    }

    if (ge('editor') && typeof window.initNotesMonacoEditor === 'function') {
        setTimeout(window.initNotesMonacoEditor, 100);
    }

    if (document.querySelector('.album-flex') && window.Masonry) {
        Masonry.initAll('.album-flex', { itemSelector: '.masonry-item', columns: 3, gap: 10, breakpoints: { 600: 2, 450: 1 } });
    }
}, 'after');

})();
