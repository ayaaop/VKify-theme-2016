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
            if (btn && btn.classList) btn.classList.add('lagged');
            if (btn && (!btn.dataset || !btn.dataset.vkifyPaginatorOriginalClass)) {
                btn.dataset.vkifyPaginatorOriginalClass = btn.className || '';
            }
        }
    } else {
        const orig = isUmbrella ? btn.attr('data-paginator-original-class') : (btn && btn.dataset && btn.dataset.vkifyPaginatorOriginalClass) ? btn.dataset.vkifyPaginatorOriginalClass : null;
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
            if (btn && btn.classList) btn.classList.remove('lagged');
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

const scrollNodeUid = (node) => (node && node.dataset && node.dataset.uniqueid) ? node.dataset.uniqueid : ((node && node.dataset && node.dataset.id) ? node.dataset.id : null);

const scrollNodeExists = (uid) => {
    if (!uid) return false;
    return u(`.scroll_node[data-uniqueid='${uid}']`).length > 0
        || u(`.scroll_node[data-id='${uid}']`).length > 0;
};

const checkExhaustion = (paginatorEl, pageToCheck) => {
    if (!paginatorEl) return false;

    const current = Number((paginatorEl.dataset && paginatorEl.dataset.currentPage) ? paginatorEl.dataset.currentPage : 0);
    const total = Number((paginatorEl.dataset && paginatorEl.dataset.totalPages) ? paginatorEl.dataset.totalPages : 0);
    if ((total && pageToCheck > total) || (total && current >= total)) {
        const containerEl = getScrollContainer(paginatorEl);
        if (containerEl) containerEl.dataset.paginatorExhausted = 'true';
        return true;
    }
    return false;
};

// State is now tracked per container to allow multiple paginators
window.__resetPaginatorState = function(containerEl = null) {
    if (!containerEl) {
        document.querySelectorAll('.scroll_container').forEach(el => {
            delete el.dataset.paginatorLoading;
            delete el.dataset.paginatorLastLoaded;
            delete el.dataset.paginatorExhausted;
        });
    } else {
        delete containerEl.dataset.paginatorLoading;
        delete containerEl.dataset.paginatorLastLoaded;
        delete containerEl.dataset.paginatorExhausted;
    }
};

const PAGINATOR_ROOT_MARGIN = 200;

const isPaginatorNearViewport = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight + PAGINATOR_ROOT_MARGIN && rect.bottom > -PAGINATOR_ROOT_MARGIN;
};

const getPaginatorElement = () => u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];

const getScrollContainer = (paginatorEl) => {
    if (paginatorEl) {
        const host = paginatorEl.closest('.scroll_container');
        if (host) return host;
        const scope = paginatorEl.closest('.page_padding, .page_block, #content, main');
        const scoped = scope ? scope.querySelector('.scroll_container') : null;
        if (scoped) return scoped;
    }
    return u('.scroll_container').nodes[0] || null;
};

const getPaginatorInsertAnchor = (containerEl, paginatorEl) => {
    if (!containerEl || !paginatorEl || !containerEl.contains(paginatorEl)) return null;
    return paginatorEl.closest('.clear_fix') || paginatorEl.parentElement;
};

const appendScrollNode = (containerEl, paginatorEl, node) => {
    const uid = scrollNodeUid(node);
    if (uid && scrollNodeExists(uid)) return;

    const imported = document.importNode(node, true);
    const anchor = getPaginatorInsertAnchor(containerEl, paginatorEl);
    if (anchor) {
        containerEl.insertBefore(imported, anchor);
    } else {
        containerEl.appendChild(imported);
    }
};

const refreshAlbumMasonry = (containerEl) => {
    const masonryContainer = (containerEl && containerEl.classList && containerEl.classList.contains('album-flex'))
        ? containerEl
        : (containerEl ? containerEl.querySelector('.album-flex') : null);
    if (!masonryContainer || !window.Masonry) return;

    if (window.Masonry && window.Masonry.get && window.Masonry.get(masonryContainer)) {
        window.Masonry.refresh(masonryContainer);
    } else {
        window.Masonry.initAll('.album-flex', {
            itemSelector: '.masonry-item',
            columns: 3,
            gap: 10,
            breakpoints: { 600: 2, 450: 1 },
        });
    }

    if (window.__vkifySchedulePaginatorCheck) window.__vkifySchedulePaginatorCheck();
};

const isNearDocumentBottom = () => (
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - PAGINATOR_ROOT_MARGIN
);

const isPaginatorTriggerZone = (paginatorEl) => (
    isPaginatorNearViewport(paginatorEl) || isNearDocumentBottom()
);

const getLastLoadedPage = (paginatorEl, containerEl) => {
    if (containerEl && containerEl.dataset.paginatorLastLoaded) {
        return Number(containerEl.dataset.paginatorLastLoaded);
    }
    return Number((paginatorEl && paginatorEl.dataset && paginatorEl.dataset.currentPage) ? paginatorEl.dataset.currentPage : 0);
};

const canLoadNextPage = (paginatorEl) => {
    if (!paginatorEl) return false;
    const containerEl = getScrollContainer(paginatorEl);
    if (containerEl && containerEl.dataset.paginatorExhausted) return false;
    
    const nextPage = getNextPageNumber(paginatorEl);
    if (!nextPage || Number.isNaN(nextPage)) return false;
    return nextPage > getLastLoadedPage(paginatorEl, containerEl);
};

const shouldAllowAutoScroll = () => {
    const autoScrollVal = localStorage.getItem('ux.auto_scroll');
    const autoScrollDisabled = Number(autoScrollVal !== null ? autoScrollVal : 0) === 0;
    const ajaxRoutingVal = localStorage.getItem('ux.disable_ajax_routing');
    const ajaxRoutingDisabled = Number(ajaxRoutingVal !== null ? ajaxRoutingVal : 0) === 1
        || (window.openvk && window.openvk.current_id === 0)
        || (window.openvk && window.openvk.disable_ajax === 1);

    if (autoScrollDisabled || ajaxRoutingDisabled) return false;
    if (u('.scroll_container').length < 1) return false;

    const currentUrl = new URL(location.href);
    const pageParam = parseInt(currentUrl.searchParams.get('p'), 10);
    if (!Number.isNaN(pageParam) && pageParam > 1) return false;

    return true;
};

window.__processPaginatorNextPage = async function (page, targetPaginator = null) {
        const paginatorEl = targetPaginator || getPaginatorElement();
        if (!paginatorEl) return;
        
        const containerEl = getScrollContainer(paginatorEl);
        if (!containerEl) return;
        if (containerEl.dataset.paginatorExhausted) return;

        const lastLoaded = getLastLoadedPage(paginatorEl, containerEl);
        if (page <= lastLoaded) return;
        if (checkExhaustion(paginatorEl, page)) return;

        try {
            const parser = new DOMParser();

            let fetchUrlStr = location.href;
            const isModal = paginatorEl && paginatorEl.closest('.ovk-photo-view-window, .ovk-modal-video-window');
            if (isModal) {
                const zParam = new URLSearchParams(window.location.search).get('z');
                if (zParam) {
                    const cleanZ = zParam.split('/')[0];
                    fetchUrlStr = '/' + cleanZ;
                }
            }

            const replaceUrl = new URL(fetchUrlStr, location.origin);
            replaceUrl.searchParams.set('p', page);

            const response = await fetch(replaceUrl.href);
            const htmlText = await response.text();
            const doc = parser.parseFromString(htmlText, 'text/html');

            const newNodes = doc.querySelectorAll('.scroll_node');
            newNodes.forEach(node => appendScrollNode(containerEl, paginatorEl, node));

            const newPaginator = doc.querySelector('.vkify-paginator:not(.vkify-paginator-at-top)');
            const currentPaginator = paginatorEl;

            if (newPaginator && currentPaginator) {
                currentPaginator.innerHTML = newPaginator.innerHTML;
                currentPaginator.dataset.currentPage = newPaginator.dataset.currentPage || '';
                currentPaginator.dataset.totalPages = newPaginator.dataset.totalPages || '';
            } else if (newPaginator && !currentPaginator && containerEl) {
                containerEl.appendChild(newPaginator.closest('.clear_fix') || newPaginator.parentElement || newPaginator);
            } else if (!newPaginator && currentPaginator) {
                currentPaginator.remove();
                if (containerEl) {
                    containerEl.dataset.paginatorLastLoaded = page;
                    containerEl.dataset.paginatorExhausted = 'true';
                }
                return;
            } else if (!newPaginator && !currentPaginator) {
                if (containerEl) {
                    containerEl.dataset.paginatorLastLoaded = page;
                    containerEl.dataset.paginatorExhausted = 'true';
                }
                return;
            }

            const updatedPaginator = currentPaginator || getPaginatorElement();
            const paginatorWrap = (updatedPaginator && updatedPaginator.closest) ? updatedPaginator.closest('.clear_fix') : (updatedPaginator ? updatedPaginator.parentElement : null);
            if (containerEl && paginatorWrap && paginatorWrap.parentElement === containerEl && containerEl.lastElementChild !== paginatorWrap) {
                containerEl.appendChild(paginatorWrap);
            }

            refreshAlbumMasonry(containerEl);

            if (updatedPaginator) {
                const currentFromDom = Number(updatedPaginator.dataset.currentPage || 0);
                const effectiveCurrent = Math.max(currentFromDom || 0, page);
                updatedPaginator.dataset.currentPage = String(effectiveCurrent);

                const totalPagesNum = Number(updatedPaginator.dataset.totalPages || 0);
                if (containerEl) containerEl.dataset.paginatorLastLoaded = effectiveCurrent;

                if (totalPagesNum && effectiveCurrent >= totalPagesNum) {
                    u(updatedPaginator).remove();
                    if (containerEl) containerEl.dataset.paginatorExhausted = 'true';
                    return;
                }

                if (checkExhaustion(updatedPaginator, page)) {
                    return;
                }
            }

            if (window.player && window.player.isAtAudiosPage && window.player.isAtAudiosPage() && window.player.isAtCurrentContextPage && window.player.isAtCurrentContextPage()) {
                window.player.loadContext(page);
                window.player.__highlightActiveTrack();
            }

            if (typeof __scrollHook !== 'undefined') {
                __scrollHook(page);
            }
        } catch (e) {
            console.error('Paginator Error:', e);
        }
};

const handlePaginationTrigger = async (paginatorNode, btnNode) => {
    const paginator = u(paginatorNode);
    const containerEl = getScrollContainer(paginatorNode);
    if (containerEl && (containerEl.dataset.paginatorLoading || containerEl.dataset.paginatorExhausted)) return;

    const btn = u(btnNode);
    if (btn.hasClass('lagged')) return;

    if (containerEl) containerEl.dataset.paginatorLoading = 'true';

    setButtonLoadingState(btn, true);

    const pageNumber = getNextPageNumber(paginatorNode);
    if (!pageNumber || Number.isNaN(pageNumber) || checkExhaustion(paginatorNode, pageNumber)) {
        if (containerEl) delete containerEl.dataset.paginatorLoading;
        setButtonLoadingState(btn, false);
        return;
    }

    try {
        await window.__processPaginatorNextPage(pageNumber, paginatorNode);
        try { bsdnHydrate(); } catch (e) { }

        const updatedEl = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
        checkExhaustion(updatedEl, pageNumber);
    } catch (e) {
        console.error(e);
    } finally {
        if (containerEl) delete containerEl.dataset.paginatorLoading;
        const stillExists = u('.vkify-paginator:not(.vkify-paginator-at-top)');
        if (stillExists.length > 0) {
            const refreshedBtn = stillExists.find('.vkify-paginator-loader');
            setButtonLoadingState(refreshedBtn, false);
        }
        if (!containerEl || !containerEl.dataset.paginatorExhausted) {
            if (window.__vkifySchedulePaginatorCheck) window.__vkifySchedulePaginatorCheck();
        }
    }
};

if (!window.__vkifyPaginatorAutoScrollInit) {
    window.__vkifyPaginatorAutoScrollInit = true;

    if (typeof showMoreObserver !== 'undefined' && u('.vkify-paginator').length > 0) {
        try {
            showMoreObserver.disconnect();
        } catch (e) { /* stock al_wall observer */ }
    }

    let scrollCheckScheduled = false;
    let scrollCheckTimer = null;

    const checkPaginatorInView = () => {
        const paginatorEl = getPaginatorElement();
        if (!paginatorEl) return;
        if (!isPaginatorTriggerZone(paginatorEl)) return;
        if (!shouldAllowAutoScroll()) return;
        if (!canLoadNextPage(paginatorEl)) return;

        const btn = u(paginatorEl).find('.vkify-paginator-loader');
        if (btn.length < 1) return;

        handlePaginationTrigger(paginatorEl, btn.nodes[0]);
    };

    const schedulePaginatorCheck = () => {
        if (scrollCheckTimer) {
            clearTimeout(scrollCheckTimer);
        }
        scrollCheckTimer = setTimeout(() => {
            scrollCheckTimer = null;
            checkPaginatorInView();
        }, 80);
    };

    const schedulePaginatorCheckBurst = () => {
        schedulePaginatorCheck();
        setTimeout(checkPaginatorInView, 250);
        setTimeout(checkPaginatorInView, 600);
    };

    const schedulePaginatorCheckSoon = () => {
        if (scrollCheckScheduled) return;
        scrollCheckScheduled = true;
        requestAnimationFrame(() => {
            scrollCheckScheduled = false;
            checkPaginatorInView();
            schedulePaginatorCheck();
        });
    };

    window.__vkifyPaginatorCheck = checkPaginatorInView;
    window.__vkifySchedulePaginatorCheck = schedulePaginatorCheckBurst;

    const initPaginatorAutoScroll = () => {
        schedulePaginatorCheckSoon();
    };

    if (!window.__vkifyPaginatorScrollBound) {
        window.__vkifyPaginatorScrollBound = true;
        window.addEventListener('scroll', schedulePaginatorCheckSoon, { passive: true });
        window.addEventListener('resize', schedulePaginatorCheckSoon, { passive: true });
    }

    u(document).on('click', '.vkify-paginator-loader', async (e) => {
        const ajaxRoutingVal = localStorage.getItem('ux.disable_ajax_routing');
        const ajaxRoutingDisabled = Number(ajaxRoutingVal !== null ? ajaxRoutingVal : 0) === 1 || (window.openvk && window.openvk.current_id === 0) || (window.openvk && window.openvk.disable_ajax === 1);
        if (ajaxRoutingDisabled) {
            return;
        }

        e.preventDefault();
        const btn = u(e.currentTarget);
        const paginatorEl = btn.closest('.vkify-paginator').nodes[0];
        await handlePaginationTrigger(paginatorEl, btn.nodes[0]);
    });

    vkify.onPage(initPaginatorAutoScroll);
}

})();
