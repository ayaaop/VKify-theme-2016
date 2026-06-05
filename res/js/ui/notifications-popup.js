(function () {
'use strict';

function formatNotifyCount(count) {
    return count > 99 ? '99+' : String(count);
}

function parseNotifyCount(text) {
    const t = (text || '').trim();
    if (t === '99+') return 99;
    return parseInt(t, 10) || 0;
}

window.incrementNotificationsCounter = function () {
    const btn = document.querySelector('#top_notify_btn');
    if (!btn) return;

    btn.querySelectorAll('object').forEach(el => el.remove());

    let countEl = btn.querySelector('.top_notify_count');
    const nextCount = (countEl ? parseNotifyCount(countEl.textContent) : 0) + 1;

    if (!countEl) {
        countEl = document.createElement('div');
        countEl.className = 'top_notify_count';
        btn.appendChild(countEl);
    }

    countEl.textContent = formatNotifyCount(nextCount);
    btn.classList.add('has_notify');
};

vkify.once("initNotificationsPopup", () => {
    async function fetchNotificationsContent() {
        try {
            const notificationsContainer = await window.ContentFetcher.fetchPageContent('/notifications', '.notifications', { ajaxQuery: false });

            if (notificationsContainer) {
                return notificationsContainer.innerHTML + `<a href="/notifications" class="top_notify_show_all">${tr('show_more')}</a>`;
            }

            return `<div class="no_notifications">${tr('no_data_description')}</div>`;
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            return `<div class="notifications_error">${tr('error')}</div>`;
        }
    }

    window.__vkifyUiOwnsInitNotificationsPopup = true;

    window.initNotificationsPopup = async function () {
        const targetElement = document.querySelector('#top_notify_btn_div');
        if (!targetElement || targetElement.dataset.vkifyNotifsInit === '1') {
            return;
        }
        targetElement.dataset.vkifyNotifsInit = '1';

        const loadingContent = '<div class="notifications_loading"><div class="pr"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div></div>';

        targetElement.addEventListener('click', function (e) { e.preventDefault(); });

        tippy(targetElement, {
            content: loadingContent,
            allowHTML: true,
            trigger: 'click',
            interactive: true,
            animation: 'up_down',
            placement: 'bottom-start',
            theme: 'light vk notifications',
            maxWidth: 470,
            arrow: false,
            appendTo: 'parent',
            popperOptions: {
                modifiers: [{
                    name: 'offset',
                    options: {
                        offset: [0, 0]
                    }
                }]
            },
            onHidden() {
                document.querySelector('#top_notify_btn')?.classList.remove('top_nav_btn_active');
            },
            async onShow(instance) {
                document.querySelector('#top_notify_btn')?.classList.add('top_nav_btn_active');
                document.querySelector('#top_notify_btn')?.classList.remove('has_notify');
                instance.setContent(loadingContent);
                const freshNotificationsContent = await fetchNotificationsContent();
                instance.setContent(freshNotificationsContent);
            }
        });
    };

    vkify.hook(vkify, 'onPageReady', () => window.initNotificationsPopup(), 'after');

    vkify.ready(() => window.initNotificationsPopup());
});

})();
