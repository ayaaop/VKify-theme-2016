(function () {
'use strict';

const Hb = window.Handlebars;

const loadingTpl = Hb.compile(
    `<div class='like_tooltip_wrapper'>
        <div class="pr pr_baw"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>
    </div>`
);

const bodyTpl = Hb.compile(
    `<div class='like_tooltip_wrapper'>
        <a href="/{{final_type}}/{{id}}/likes" class='like_tooltip_head'>
            <span>{{{count_label}}}</span>
        </a>
        <div class='like_tooltip_body'>
            <div class='like_tooltip_body_grid'>
                {{#each items}}
                <a title="{{first_name}} {{last_name}}" href='/id{{id}}'>
                    <img class="object_fit_ava" src='{{photo_50}}' alt='.'>
                </a>
                {{/each}}
            </div>
        </div>
    </div>`
);

const errorTpl = Hb.compile(
    `<div class='like_tooltip_wrapper'><div style='padding: 10px;'>{{message}}</div></div>`
);

const _likesCache = new Map();
const _likesCacheLimit = 100;
const _likesCacheSet = (key, value) => {
    if (_likesCache.size >= _likesCacheLimit) {
        const oldest = _likesCache.keys().next().value;
        _likesCache.delete(oldest);
    }
    _likesCache.set(key, value);
};

vkify.bindOnce('likeHandlers', () => {
    u(document).on('click', '.video_like_button, .post_like', async function (e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = u(this);
        if (btn.attr('data-vkify-like-pending') === '1') return false;

        const link = btn.attr('href');
        const heart = btn.find('.action_icon');
        const isLiked = heart.attr('id') === 'liked';
        const isPost = btn.hasClass('post_like');

        let counter = btn.find('.action_count');
        if (counter.length < 1) {
            btn.append('<span class="action_count"></span>');
            counter = btn.find('.action_count');
        }

        const currentLikes = parseInt(btn.attr('data-likes') || counter.text(), 10) || 0;
        const nextLikes = Math.max(0, currentLikes + (isLiked ? -1 : 1));

        btn.attr('data-vkify-like-pending', '1');
        heart.attr('id', isLiked ? '' : 'liked');
        btn.attr('data-liked', isLiked ? '0' : '1');
        btn.attr('data-likes', nextLikes);
        counter.text(nextLikes || '');
        if (isPost) btn.toggleClass('my_like', !isLiked);

        const tip = isPost && btn.first()?._tippy;
        if (tip) nextLikes <= 0 ? (tip.hide(), tip.destroy()) : tip.enable();

        const cacheKey = isPost && btn.attr('data-type') && btn.attr('data-id')
            ? `${btn.attr('data-type')}:${btn.attr('data-id')}` : null;
        if (cacheKey) _likesCache.delete(cacheKey);

        let ok = false;
        try {
            if (link) {
                ok = window.ky
                    ? (await window.ky.post(link), true)
                    : (await fetch(link, { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })).ok;
            }
        } catch { }

        if (ok && !isLiked && typeof Doge !== 'undefined') Doge.show();

        if (!ok) {
            heart.attr('id', isLiked ? 'liked' : '');
            btn.attr('data-liked', isLiked ? '1' : '0');
            btn.attr('data-likes', currentLikes);
            counter.text(currentLikes || '');
            if (isPost) btn.toggleClass('my_like', isLiked);
        }

        btn.attr('data-vkify-like-pending', '0');
        return false;
    });
});

vkify.bindOnce('likesTooltip', () => {
    window.tippy.delegate(document.body, {
        animation: 'up_down',
        target: `.post_like[data-type]:not([data-likes="0"])`,
        theme: 'special vk',
        placement: 'top-start',
        content: '',
        delay: 400,
        allowHTML: true,
        interactive: true,
        interactiveDebounce: 350,
        onCreate: async function (that) {
            that._vkifyLikesKey = null;
            that._vkifyLoadingLikesTooltip = false;
        },
        onHidden: function (that) {
            try {
                if (that && that._vkifyLoadingLikesTooltip) {
                    that._vkifyLoadingLikesTooltip = false;
                }
                if (that) {
                    that._vkifyLikesKey = null;
                }
            } catch (e) { }
        },
        onShow: function (that) {
            const likesNow = that.reference?.getAttribute('data-likes');
            if (!likesNow || likesNow === '0') return false;
        },
        onMount: async function (that) {

            const id = that.reference.dataset.id;
            const type = that.reference.dataset.type;
            let final_type = type;
            if (type === 'post') final_type = 'wall';

            const cacheKey = `${type}:${id}`;
            that._vkifyLikesKey = cacheKey;

            try {
                that._vkifyLoadingLikesTooltip = true;

                let likesList = _likesCache.get(cacheKey);
                if (!likesList) {
                    try { that.setContent(loadingTpl({})); } catch (e) { }
                    likesList = await window.OVKAPI.call('likes.getList', {
                        extended: 1,
                        count: 6,
                        type: type,
                        owner_id: id.split('_')[0],
                        item_id: id.split('_')[1]
                    });
                    _likesCacheSet(cacheKey, likesList);
                }

                // if the user already moved to another target, don't overwrite
                if (that._vkifyLikesKey !== cacheKey) {
                    return;
                }

                that.setContent(bodyTpl({
                    final_type,
                    id,
                    count_label: tr('liked_by_x_people', likesList.count),
                    items: likesList.items || []
                }));
                return;
            } catch (e) {
                that.setContent(errorTpl({ message: tr('error') }));
                return;
            } finally {
                try {
                    that._vkifyLoadingLikesTooltip = false;
                } catch (e) { }
            }
        }
    });

});

})();
