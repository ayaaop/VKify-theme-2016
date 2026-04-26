(function () {
'use strict';

const setButtonLoadingState = (btn, isLoading) => {
    if (!btn || btn.length < 1) return;

    const isUmbrella = typeof btn.addClass === 'function';

    if (isLoading) {
        if (isUmbrella) {
            btn.addClass('lagged');
            if (!btn.attr('data-paginator-original-class')) {
                btn.attr('data-paginator-original-class', btn.attr('class') || '');
            }
            btn.removeClass('button_gray').addClass('button_light');
            if (!btn.find('.pr').length) {
                LoaderUtils.showInButton(btn);
            }
        } else {
            btn.classList?.add('lagged');
            if (!btn.dataset?.vkifyPaginatorOriginalClass) {
                btn.dataset.vkifyPaginatorOriginalClass = btn.className || '';
            }
        }
    } else {
        const orig = isUmbrella ? btn.attr('data-paginator-original-class') : btn?.dataset?.vkifyPaginatorOriginalClass;
        LoaderUtils.restoreButton(isUmbrella ? btn : u(btn));
        if (typeof orig === 'string') {
            if (isUmbrella) {
                btn.attr('class', orig);
                if (typeof btn.removeAttr === 'function') {
                    btn.removeAttr('data-paginator-original-class');
                }
            } else {
                btn.className = orig;
                delete btn.dataset.vkifyPaginatorOriginalClass;
            }
        }
        if (isUmbrella) {
            btn.removeClass('lagged');
        } else {
            btn.classList?.remove('lagged');
        }
    }
};

const getNextPageNumber = (paginatorEl) => {
    const paginator = u(paginatorEl);
    const activeTab = paginator.find('.active');
    const nextAnchor = u(activeTab.nodes[0] ? activeTab.nodes[0].nextElementSibling : null);

    if (nextAnchor.length > 0) {
        const num = Number(nextAnchor.html());
        if (!Number.isNaN(num)) {
            return num;
        }
    }

    if (paginatorEl && paginatorEl.dataset) {
        const current = Number(paginatorEl.dataset.currentPage || 0);
        const total = Number(paginatorEl.dataset.totalPages || 0);
        if (current > 0 && total > 0 && current < total) {
            return current + 1;
        }
    }

    return null;
};

const checkExhaustion = (paginatorEl, pageToCheck) => {
    if (!paginatorEl) return false;

    const current = Number(paginatorEl.dataset?.currentPage || 0);
    const total = Number(paginatorEl.dataset?.totalPages || 0);
    if ((total && pageToCheck > total) || (total && current >= total)) {
        u(paginatorEl).remove();
        window.__vkifyPaginatorExhausted = true;
        return true;
    }

    return false;
};

window.__vkifyPaginatorLoading = window.__vkifyPaginatorLoading || false;
window.__vkifyPaginatorLastLoaded = window.__vkifyPaginatorLastLoaded || 0;
window.__vkifyPaginatorExhausted = window.__vkifyPaginatorExhausted || false;

window.__resetPaginatorState = function() {
    window.__vkifyPaginatorLoading = false;
    window.__vkifyPaginatorLastLoaded = 0;
    window.__vkifyPaginatorExhausted = false;
};

window.__processPaginatorNextPage = async function (page) {
        if (window.__vkifyPaginatorLoading) return;
        if (window.__vkifyPaginatorExhausted) return;

        const paginatorEl = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
        const lastLoaded = Number(window.__vkifyPaginatorLastLoaded || paginatorEl?.dataset?.currentPage || 0);
        if (page <= lastLoaded) return;
        if (checkExhaustion(paginatorEl, page)) return;

        window.__vkifyPaginatorLoading = true;

        try {
            const container = u('.scroll_container');
            const parser = new DOMParser();

            const replaceUrl = new URL(location.href);
            replaceUrl.searchParams.set('p', page);

            const response = await fetch(replaceUrl.href);
            const htmlText = await response.text();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const newNodes = doc.querySelectorAll('.scroll_node');
            newNodes.forEach(node => {
                const uid = node.dataset.uniqueid;
                if (uid && u(`.scroll_node[data-uniqueid='${uid}']`).length > 0) {
                    return;
                }
                container.append(node);
            });

            const newPaginator = doc.querySelector('.vkify-paginator:not(.vkify-paginator-at-top)');
            const currentPaginator = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];

            if (newPaginator && currentPaginator) {
                currentPaginator.innerHTML = newPaginator.innerHTML;
                currentPaginator.dataset.currentPage = newPaginator.dataset.currentPage || '';
                currentPaginator.dataset.totalPages = newPaginator.dataset.totalPages || '';
            } else if (newPaginator && !currentPaginator && container.length > 0) {
                container.nodes[0].append(newPaginator.parentNode ? newPaginator.parentNode : newPaginator);
            } else if (!newPaginator && currentPaginator) {
                currentPaginator.remove();
                window.__vkifyPaginatorLastLoaded = page;
                window.__vkifyPaginatorExhausted = true;
                return;
            } else if (!newPaginator && !currentPaginator) {
                window.__vkifyPaginatorLastLoaded = page;
                window.__vkifyPaginatorExhausted = true;
                return;
            }

            const updatedPaginator = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
            const containerEl = container.nodes[0];
            if (containerEl && updatedPaginator && containerEl.lastElementChild !== updatedPaginator) {
                containerEl.appendChild(updatedPaginator);
            }

            if (updatedPaginator) {
                const currentFromDom = Number(updatedPaginator.dataset.currentPage || 0);
                const effectiveCurrent = Math.max(currentFromDom || 0, page);
                updatedPaginator.dataset.currentPage = String(effectiveCurrent);

                const totalPagesNum = Number(updatedPaginator.dataset.totalPages || 0);
                window.__vkifyPaginatorLastLoaded = effectiveCurrent;

                if (totalPagesNum && effectiveCurrent >= totalPagesNum) {
                    u(updatedPaginator).remove();
                    window.__vkifyPaginatorExhausted = true;
                    return;
                }

                if (checkExhaustion(updatedPaginator, page)) {
                    return;
                }
            }

            if (window.player?.isAtAudiosPage?.() && window.player?.isAtCurrentContextPage?.()) {
                window.player.loadContext(page);
                window.player.__highlightActiveTrack();
            }

            if (window.__vkifyPaginatorObserver) {
                try {
                    window.__vkifyPaginatorObserver.disconnect();
                    const target = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
                    if (target) {
                        window.__vkifyPaginatorObserver.observe(target);
                    }
                } catch (e) {
                    console.warn('Failed to reconnect paginator observer:', e);
                }
            }

            if (typeof __scrollHook !== 'undefined') {
                __scrollHook(page);
            }
        } catch (e) {
            console.error('Paginator Error:', e);
        } finally {
            window.__vkifyPaginatorLoading = false;
        }
};

const handlePaginationTrigger = async (paginatorNode, btnNode) => {
    const paginator = u(paginatorNode);
    const btn = u(btnNode);
    if (btn.hasClass('lagged')) return;

    setButtonLoadingState(btn, true);

    const pageNumber = getNextPageNumber(paginatorNode);
    if (!pageNumber || Number.isNaN(pageNumber) || checkExhaustion(paginatorNode, pageNumber)) {
        setButtonLoadingState(btn, false);
        return;
    }

    try {
        await window.__processPaginatorNextPage(pageNumber);
        try { bsdnHydrate(); } catch (e) { }

        const updatedEl = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
        checkExhaustion(updatedEl, pageNumber);
    } catch (e) {
        console.error(e);
    } finally {
        const stillExists = u('.vkify-paginator:not(.vkify-paginator-at-top)');
        if (stillExists.length > 0) {
            const refreshedBtn = stillExists.find('.vkify-paginator-loader');
            setButtonLoadingState(refreshedBtn, false);
        }
    }
};

if (!window.__vkifyPaginatorAutoScrollInit) {
    window.__vkifyPaginatorAutoScrollInit = true;

    const initObserver = () => {
        if (typeof IntersectionObserver !== 'function') return;
        if (window.__vkifyPaginatorObserver) {
            window.__vkifyPaginatorObserver.disconnect();
        }

        window.__vkifyPaginatorObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                const autoScrollDisabled = Number(localStorage.getItem('ux.auto_scroll') ?? 1) === 0;
                const ajaxRoutingDisabled = Number(localStorage.getItem('ux.disable_ajax_routing') ?? 0) === 1 || window.openvk?.current_id === 0 || window.openvk?.disable_ajax === 1;

                if (autoScrollDisabled || ajaxRoutingDisabled) return;
                if (u('.scroll_container').length < 1) return;

                const target = u(entry.target);
                if (target.length < 1 || target.hasClass('vkify-paginator-at-top')) return;

                const currentUrl = new URL(location.href);
                if (currentUrl.searchParams && !Number.isNaN(parseInt(currentUrl.searchParams.get('p'), 10))) return;

                const btn = target.find('.vkify-paginator-loader');
                if (btn.length < 1) return;

                handlePaginationTrigger(target.nodes[0], btn.nodes[0]);
            });
        }, { root: null, rootMargin: '200px', threshold: 0 });

        const paginatorEl = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
        if (paginatorEl) {
            window.__vkifyPaginatorObserver.observe(paginatorEl);
        }
    };

    u(document).on('click', '.vkify-paginator-loader', async (e) => {
        const ajaxRoutingDisabled = Number(localStorage.getItem('ux.disable_ajax_routing') ?? 0) === 1 || window.openvk?.current_id === 0 || window.openvk?.disable_ajax === 1;
        if (ajaxRoutingDisabled) {
            return;
        }

        e.preventDefault();
        const btn = u(e.currentTarget);
        const paginatorEl = btn.closest('.vkify-paginator').nodes[0];
        await handlePaginationTrigger(paginatorEl, btn.nodes[0]);
    });

    vkify.onPage(initObserver);
}

})();
