(function () {
'use strict';

const Hb = window.Handlebars;

const userItemTpl = Hb.compile(
    '<a class="fastavatarlnk" href="/id{{id}}">' +
        '<img class="fastavatar" src="{{photo_50}}" alt="{{first_name}}">' +
        '<span>{{first_name}}</span>' +
    '</a>'
);

const resultsTpl = Hb.compile(
    '<div>' +
        '<div class="useravas">{{{users_html}}}</div>' +
        '<a href="/search?section=users&q={{q_enc}}">' +
            '<div class="fastresult">{{{users_label}}} <b>{{q}}</b> ({{users_count}})<div class="arrow"></div></div>' +
        '</a>' +
    '</div>' +
    '<div>' +
        '<a href="/search?section=groups&q={{q_enc}}">' +
            '<div class="fastresult">{{{groups_label}}} <b>{{q}}</b> ({{groups_count}})<div class="arrow"></div></div>' +
        '</a>' +
    '</div>' +
    '<div>' +
        '<a href="/search?section=audios&q={{q_enc}}">' +
            '<div class="fastresult">{{{audios_label}}} <b>{{q}}</b> ({{audios_count}})<div class="arrow"></div></div>' +
        '</a>' +
    '</div>' +
    '<div>' +
        '<a href="/search?section=docs&q={{q_enc}}">' +
            '<div class="fastresult">{{{docs_label}}} <b>{{q}}</b> ({{docs_count}})<div class="arrow"></div></div>' +
        '</a>' +
    '</div>'
);

vkify.once("initializeSearchFastTips", () => {
    window.__vkifyInitializeSearchFastTipsSafe = function () {
        const searchInput = u('#search_box input[type="search"]');
        const fastTipsContainer = u('#searchBoxFastTips');

        if (!searchInput.length || !fastTipsContainer.length) return;

        if (searchInput.first().dataset.vkifyFastTipsInit === '1') {
            return;
        }
        searchInput.first().dataset.vkifyFastTipsInit = '1';

        let searchTimeout;
        let currentSearchId = 0;

        function hideFastTips() {
            fastTipsContainer.first().style.display = 'none';
        }

        searchInput.on('input', async function (e) {
            const query = u(e.target).first().value.trim();

            if (query.length >= 3) {
                fastTipsContainer.first().style.display = 'block';
                clearTimeout(searchTimeout);

                currentSearchId++;
                const thisSearchId = currentSearchId;

                searchTimeout = setTimeout(async () => {
                    const currentQuery = u(e.target).first().value.trim();
                    if (currentQuery !== query || currentQuery.length < 3 || thisSearchId !== currentSearchId) return;

                    fastTipsContainer.html('<div class="fastpreload"></div>');

                    try {
                        const [groupsd, usersd, audiosd, docsd] = await Promise.all([
                            window.OVKAPI.call('groups.search', { 'q': currentQuery }),
                            window.OVKAPI.call('users.search', { 'q': currentQuery, 'fields': 'photo_50' }),
                            window.OVKAPI.call('audio.search', { 'q': currentQuery }),
                            window.OVKAPI.call('docs.search', { 'q': currentQuery })
                        ]);

                        if (thisSearchId !== currentSearchId) return;

                        const maxUsers = Math.min(5, usersd.count);
                        const users_html = usersd.items.slice(0, maxUsers).map(item => userItemTpl({
                            id: item.id,
                            photo_50: item.photo_50,
                            first_name: item.first_name
                        })).join('');

                        fastTipsContainer.html(resultsTpl({
                            q: currentQuery,
                            q_enc: encodeURIComponent(currentQuery),
                            users_html,
                            users_label: tr('users'),
                            users_count: usersd.count,
                            groups_label: tr('groups'),
                            groups_count: groupsd.count,
                            audios_label: tr('audios'),
                            audios_count: audiosd.count,
                            docs_label: tr('documents'),
                            docs_count: docsd.count
                        }));

                        setTimeout(() => {
                            u('#searchBoxFastTips a').on('click', function () {
                                hideFastTips();
                            });
                        }, 50);
                    } catch (error) {
                        console.error('Failed to load search tip results:', error);
                        if (thisSearchId !== currentSearchId) return;
                    }
                }, 1000);
            } else {
                fastTipsContainer.first().style.display = 'none';
            }
        });

        searchInput.on('focus', function (e) {
            const inputValue = u(e.target).first().value;
            if (inputValue.length >= 3) {
                fastTipsContainer.first().style.display = 'block';

                setTimeout(() => {
                    u('#searchBoxFastTips a').on('click', function () {
                        hideFastTips();
                    });
                }, 50);
            } else {
                fastTipsContainer.first().style.display = 'none';
            }
        });

        searchInput.on('blur', function () {
            setTimeout(() => {
                const focusedElement = document.activeElement;
                if (!u(focusedElement).closest('#search_box').length) {
                    fastTipsContainer.first().style.display = 'none';
                }
            }, 250);
        });

        u(document).on('click', function (e) {
            const searchBox = u('#search_box').first();
            const fastTips = fastTipsContainer.first();

            if (fastTips.style.display === 'block' &&
                !searchBox.contains(e.target) &&
                !fastTips.contains(e.target)) {
                hideFastTips();
            }
        });
    };
});

if (window.initializeSearchFastTips !== window.__vkifyInitializeSearchFastTipsSafe) {
    window.initializeSearchFastTips = window.__vkifyInitializeSearchFastTipsSafe;
}

window.hideSearchFastTips = window.hideSearchFastTips || function () {
    const fastTipsContainer = u('#searchBoxFastTips');
    if (fastTipsContainer.length) {
        fastTipsContainer.first().style.display = 'none';
    }
};

})();
