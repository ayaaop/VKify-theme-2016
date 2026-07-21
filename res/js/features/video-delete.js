(function () {
'use strict';

vkify.bindOnce('videoDeleteAjax', () => {
    document.addEventListener('click', async function(e) {
        const link = e.target.closest('.video_thumb_action_delete[href*="/remove"]');
        if (!link || link.dataset.deleting) return;

        const url = link.getAttribute('href');
        if (!url) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        link.dataset.deleting = '1';

        const confirmed = await new Promise(resolve => {
            const msg = new CMessageBox({
                title: tr('warning'),
                body: tr('question_confirm'),
                buttons: [tr('no'), tr('yes')],
                callbacks: [
                    () => resolve(false),
                    () => resolve(true)
                ]
            });
        });

        if (!confirmed) {
            delete link.dataset.deleting;
            return;
        }

        try {
            const response = await ky.post(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'hash=' + encodeURIComponent(vkify.getCsrf()),
                throwHttpErrors: false
            });

            if (response.ok || response.redirected) {
                const videoItem = link.closest('.video_item');
                if (videoItem) {
                    videoItem.remove();

                    const countEl = document.querySelector('.ui_crumb .ui_crumb_count');
                    if (countEl) {
                        const current = parseInt(countEl.textContent.replace(/\D/g, ''), 10);
                        if (!isNaN(current)) {
                            countEl.textContent = Math.max(0, current - 1);
                        }
                    }

                    if (!document.querySelector('.video_item')) {
                        document.querySelector('.content_page_error.hidden')?.classList.remove('hidden');
                    }
                } else {
                    vkify.navigate(response.url || '/videos' + window.openvk?.current_id);
                }
            } else {
                throw new Error('Delete failed');
            }
        } catch (err) {
            console.error('Video delete error:', err);
            delete link.dataset.deleting;
            window.location.href = url;
        }
    }, true);
});

})();
