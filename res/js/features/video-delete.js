(function () {
'use strict';

vkify.bindOnce('videoDeleteAjax', () => {
    u(document).on('click', '.video_thumb_action_delete[href*="/remove"]', async function(e) {
        e.preventDefault();
        const link = this;
        const url = link.getAttribute('href');
        if (!url) return;

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

        if (!confirmed) return;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'hash=' + encodeURIComponent(vkify.getCsrf())
            });

            if (response.ok || response.redirected) {
                const videoItem = link.closest('.video_item');
                if (videoItem) {
                    videoItem.remove();
                } else {
                    vkify.navigate(response.url || '/videos' + ((window.openvk && window.openvk.current_id) ? window.openvk.current_id : ''));
                }
            } else {
                throw new Error('Delete failed');
            }
        } catch (err) {
            console.error('Video delete error:', err);
            window.location.href = url;
        }
    });
});

})();
