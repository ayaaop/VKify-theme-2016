/**
 * OpenVK Router Implementation for VKify Theme
 *
 * This script provides a complete router implementation with enhanced
 * localization, tooltip management, and robust error handling for AJAX transitions.
 */

window.router = new class {
    constructor() {

        this.navigationState = {
            isNavigating: false,
            pendingNavigation: null,
            navigationTimeout: null,
            navigationQueue: [],
            timeoutDuration: 3000 
        };
    }

    get csrf() {
        return u("meta[name=csrf]").attr("value")
    }

    isNavigationInProgress() {
        return this.navigationState.isNavigating;
    }

    cancelPendingNavigation() {
        if (this.navigationState.navigationTimeout) {
            clearTimeout(this.navigationState.navigationTimeout);
            this.navigationState.navigationTimeout = null;
        }

        if (this.navigationState.pendingNavigation) {
            console.log('ROUTER | Cancelling pending navigation');
            this.navigationState.pendingNavigation = null;
        }

        this.navigationState.isNavigating = false;
        u('body').removeClass('ajax_request_made');
    }

    setNavigationTimeout(fallbackCallback, duration = null) {
        const timeoutDuration = duration || this.navigationState.timeoutDuration;

        this.navigationState.navigationTimeout = setTimeout(() => {
            console.log('ROUTER | Navigation timeout reached, falling back to browser navigation');
            this.cancelPendingNavigation();
            if (fallbackCallback && typeof fallbackCallback === 'function') {
                fallbackCallback();
            }
        }, timeoutDuration);
    }

    queueNavigation(navigationRequest) {
        if (this.navigationState.isNavigating) {
            console.log('ROUTER | Navigation in progress, queueing request');
            this.navigationState.navigationQueue.push(navigationRequest);
            return false; 
        }

        this.navigationState.isNavigating = true;
        this.navigationState.pendingNavigation = navigationRequest;
        return true; 
    }

    processNextNavigation() {
        if (this.navigationState.navigationQueue.length > 0) {
            const nextNavigation = this.navigationState.navigationQueue.shift();
            console.log('ROUTER | Processing queued navigation');

            this.navigationState.isNavigating = true;
            this.navigationState.pendingNavigation = nextNavigation;

            if (nextNavigation.type === 'route') {
                this.route(nextNavigation.params);
            }
        } else {
            this.navigationState.isNavigating = false;
            this.navigationState.pendingNavigation = null;
        }
    }

    completeNavigation() {
        this.cancelPendingNavigation();

        setTimeout(() => {
            this.processNextNavigation();
        }, 50); 
    }

    canHandleNavigation(url) {
        if (!this.checkUrl(url)) {
            return false;
        }

        if (this.navigationState.isNavigating && this.navigationState.navigationQueue.length >= 5) {
            console.warn('ROUTER | Navigation queue is full, rejecting navigation request');
            return false;
        }

        return true;
    }

    __isScriptAlreadyLoaded(script) {
        if (script.src) {
            const script_url = new URL(script.src)
            const script_main_part = script_url.pathname

            return u(`script[src^='${script_main_part}']`).length > 0
        }

        return false
    }

    __appendScript(script) {
        const _t_scr = document.createElement('script')
        _t_scr.crossorigin = 'anonymous'
        if (script.getAttribute('integrity')) {
            _t_scr.setAttribute('integrity', script.getAttribute('integrity'))
        }

        if (script.getAttribute('id')) {
            _t_scr.id = script.id
        }

        if (script.getAttribute('type')) {
            _t_scr.type = script.type
        }

        if (script.src) {
            _t_scr.src = script.src
        } else {
            _t_scr.async = false

            const wrappedContent = `
                try {
                    ${script.textContent}
                } catch (error) {
                    console.warn('Script execution failed during AJAX transition:', error);

                    if (error.message && error.message.includes("can't access property")) {
                        console.warn('DOM access error detected, this page may not be compatible with AJAX routing');
                    }
                }
            `;
            _t_scr.textContent = wrappedContent
        }

        document.body.appendChild(_t_scr)
    }

    __clearScripts() {
        u(`script:not([src])`).remove()
    }

    __closeMsgs() {
        if (window.messagebox_stack) {
            window.messagebox_stack.forEach(msg => {
                if (msg.hidden) {
                    return
                }

                msg.close()
            })
        }
    }

    __appendPage(parsed_content) {

        const requiredElements = ['.page_body', '.sidebar', '.page_header'];
        const missingElements = [];

        for (const selector of requiredElements) {
            if (!parsed_content.querySelector(selector)) {
                missingElements.push(selector);
            }
        }

        if (missingElements.length > 0) {
            console.warn('Missing required elements for AJAX transition:', missingElements);
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }

        const scripts_to_append = []
        const page_body = u(parsed_content.querySelector('.page_body'))
        const sidebar = u(parsed_content.querySelector('.sidebar'))
        const page_header = u(parsed_content.querySelector('.page_header'))
        const backdrop = u(parsed_content.querySelector('#backdrop'))

        if (page_body.length < 1) {
            throw new Error('Invalid page has been loaded')
        }

        try {
            const currentSearchInput = u('.page_header #search_box input');
            const newSearchInput = page_header.find('#search_box input');
            if (currentSearchInput.length > 0 && newSearchInput.length > 0) {
                if (!currentSearchInput.nodes[0] || !newSearchInput.nodes[0]) {
                    throw new Error('Search input elements are not properly accessible');
                }
            }
        } catch (error) {
            console.warn('Search box validation failed:', error);
            throw new Error(`Search box validation failed: ${error.message}`);
        }

        window.__current_page_audio_context = null
        this.__clearScripts()
        parsed_content.querySelectorAll('.page_body script, #_js_ep_script').forEach(script => {
            if (!this.__isScriptAlreadyLoaded(script)) {
                scripts_to_append.push(script)
                script.parentNode.removeChild(script)
            }
        })
        u('.page_body').html(page_body.html())
        u('.sidebar').html(sidebar.html())
        if (backdrop.length > 0) {
            if (u('#backdrop').length == 0) {
                u('body').append(`<div id="backdrop"></div>`)
            }
            u('#backdrop').nodes[0].outerHTML = (backdrop.nodes[0].outerHTML)
        } else {
            u('#backdrop').remove()
        }

        if (u('.page_header #search_box input').length > 0 && page_header.find('#search_box input').length > 0) {
            const currentInput = u('.page_header #search_box input').nodes[0];
            const newInput = page_header.find('#search_box input').nodes[0];
            if (currentInput && newInput) {
                currentInput.value = newInput.value;
            }
        }

        u("meta[name=csrf]").attr("value", u(parsed_content.querySelector('meta[name=csrf]')).attr('value'))

        document.title = parsed_content.title

        setTimeout(() => {
            scripts_to_append.forEach(append_me => {
                try {
                    this.__appendScript(append_me)
                } catch (error) {
                    console.warn('Failed to append script during AJAX transition:', error)
                }
            })
        }, 10)

        this.__handleVKifyContentUpdate();
    }

    __handleVKifyContentUpdate() {

        window.processVkifyLocTags();
        window.reinitializeTooltips();

        if (window.addSuggestedTabToWall) {
            setTimeout(window.addSuggestedTabToWall, 100);
        }

        if (window.location.pathname === '/search') {
            window.initializeSearchOptions;
            window.initializeSearchOptionToggle;
        }
        
        window.initializeSearchFastTips;
        window.hideSearchFastTips();
        setTimeout(window.initTabSlider, 150);

        if (window.location.pathname.includes('/albums') && !document.getElementById('photos-section')?.dataset.initialized) {
           setTimeout(window.initAlbumPhotosLoader, 100);
        }

        if (document.getElementById('editor') && typeof window.initNotesMonacoEditor === 'function') {
            window.initNotesMonacoEditor;
        }
    }

    async __integratePage(scrolling = null) {
        window.temp_y_scroll = null
        u('.toTop').removeClass('has_down')
        window.scrollTo(0, scrolling ?? 0)

        if (typeof bsdnHydrate === 'function') {
            bsdnHydrate()
        }

        if (u('.paginator:not(.paginator-at-top)').length > 0 && typeof showMoreObserver !== 'undefined') {
            showMoreObserver.observe(u('.paginator:not(.paginator-at-top)').nodes[0])
        }

        if (u(`div[class$="_small_block"]`).length > 0 && typeof smallBlockObserver !== 'undefined') {
            smallBlockObserver.observe(u(`div[class$="_small_block"]`).nodes[0])
        }

        if (window.player) {
            window.player.dump()
            await window.player._handlePageTransition()
        }
    }

    __unlinkObservers() {
        if (u('.paginator:not(.paginator-at-top)').length > 0 && typeof showMoreObserver !== 'undefined') {
            showMoreObserver.unobserve(u('.paginator:not(.paginator-at-top)').nodes[0])
        }

        if (u(`div[class$="_small_block"]`).length > 0 && typeof smallBlockObserver !== 'undefined') {
            smallBlockObserver.unobserve(u(`div[class$="_small_block"]`).nodes[0])
        }
    }

    checkUrl(url) {
        if (window.openvk && window.openvk.disable_ajax == 1) {
            return false
        }

        if ((localStorage.getItem('ux.disable_ajax_routing') ?? 0) == 1 || (window.openvk && window.openvk.current_id == 0)) {
            return false
        }

        if (!url || url == '') {
            return false
        }

        if (url.indexOf(location.origin) == -1) {
            return false
        }

        if (url.indexOf('hash=') != -1) {
            return false
        }

        if (url.indexOf('#close') != -1) {
            return false
        }

        return true
    }

    canHandlePopstateNavigation(event) {
        const targetUrl = location.href;

        if (!this.checkUrl(targetUrl)) {
            console.log('ROUTER | Popstate navigation rejected: URL failed basic validation');
            return false;
        }

        if (!this._validateHistoryState(event)) {
            console.log('ROUTER | Popstate navigation rejected: Invalid or missing history state');
            return false;
        }

        if (this._isExternalUrl(targetUrl)) {
            console.log('ROUTER | Popstate navigation rejected: External URL detected');
            return false;
        }

        if (this._hasIncompatibleHashFragment(targetUrl)) {
            console.log('ROUTER | Popstate navigation rejected: Incompatible hash fragment');
            return false;
        }

        return true;
    }

    _validateHistoryState(event) {

        if (!event.state) {

            const currentState = history.state;
            if (currentState && currentState.from_router) {

                return true;
            }

            return false;
        }

        if (typeof event.state !== 'object') {
            console.warn('ROUTER | Invalid history state: not an object');
            return false;
        }

        if (event.state.from_router && typeof event.state.from_router !== 'number') {
            console.warn('ROUTER | Corrupted history state: invalid from_router value');
            return false;
        }

        return true;
    }

    _isExternalUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.origin !== location.origin;
        } catch (e) {

            console.warn('ROUTER | Invalid URL format:', url);
            return true;
        }
    }

    _hasIncompatibleHashFragment(url) {
        try {
            const urlObj = new URL(url);
            const hash = urlObj.hash;

            const incompatibleHashes = [
                '#close',
                '#modal',
                '#popup',
                '#download',
                '#external'
            ];

            return incompatibleHashes.some(pattern => hash.includes(pattern));
        } catch (e) {
            return false;
        }
    }

    savePreviousPage() {
        this.prev_page_html = {
            url: location.href,
            pathname: location.pathname,
            html: u('.page_body').html(),
        }
    }

    async route(params = {}) {
        if (typeof params == 'string') {
            params = {
                url: params
            }
        }

        const old_url = location.href
        let url = params.url
        if (url.indexOf(location.origin)) {
            url = location.origin + url
        }

        if ((localStorage.getItem('ux.disable_ajax_routing') ?? 0) == 1 || (window.openvk && window.openvk.current_id == 0)) {
            window.location.assign(url)
            return
        }

        const navigationRequest = {
            type: 'route',
            params: params,
            url: url,
            timestamp: Date.now()
        };

        if (!this.queueNavigation(navigationRequest)) {

            return;
        }

        if (this.prev_page_html && this.prev_page_html.pathname != location.pathname) {
            this.prev_page_html = null
        }

        const push_url = params.push_state ?? true
        const next_page_url = new URL(url)
        if (push_url) {
            history.pushState({ 'from_router': 1 }, '', url)
        } else {
            history.replaceState({ 'from_router': 1 }, '', url)
        }

        u('body').addClass('ajax_request_made')

        this.setNavigationTimeout(() => {
            console.log('ROUTER | Navigation timeout, falling back to browser navigation');
            next_page_url.searchParams.delete('al', 1);
            location.assign(next_page_url);
        });

        try {
            const parser = new DOMParser
            const next_page_request = await fetch(next_page_url, {
                method: 'AJAX',
                referrer: old_url,
                headers: {
                    'X-OpenVK-Ajax-Query': '1',
                }
            })
            const next_page_text = await next_page_request.text()
            const parsed_content = parser.parseFromString(next_page_text, 'text/html')
            if (next_page_request.redirected) {
                history.replaceState({ 'from_router': 1 }, '', next_page_request.url)
            }

            this.__closeMsgs()
            this.__unlinkObservers()

            u('body').removeClass('ajax_request_made')

            this.__appendPage(parsed_content)
            await this.__integratePage()

            this.completeNavigation()
        } catch (e) {
            console.error('AJAX routing failed:', e)

            this.cancelPendingNavigation()

            if (e.message && (e.message.includes("can't access property") || e.message.includes("Missing required elements"))) {
                console.warn('Page structure incompatible with AJAX routing, falling back to regular navigation')
            }

            next_page_url.searchParams.delete('al', 1)
            location.assign(next_page_url)
        }
    }
}

u(document).on('click', 'a', async (e) => {
    if (e.defaultPrevented) {
        console.log('AJAX | Skipping because default is prevented')
        return
    }

    const target = u(e.target).closest('a')
    const dom_url = target.attr('href')
    const id = target.attr('id')
    let url = target.nodes[0].href

    if (id) {
        if (['act_tab_a', 'ki', 'used', '_pinGroup', 'profile_link', 'minilink-friends', 'minilink-albums', 'minilink-messenger', 'minilink-groups', 'minilink-notifications'].indexOf(id) == -1) {
            console.log('AJAX | Skipping cuz maybe its function call link.')
            return
        }
    }

    if (target.attr('rel') == 'nofollow') {
        console.log('AJAX | Skipped because its nofollow')
        return
    }

    if (target.nodes[0].hasAttribute('download')) {
        console.log('AJAX | Skipped because its download')
        return
    }

    if (!dom_url || dom_url == '#' || dom_url.indexOf('javascript:') != -1) {
        console.log('AJAX | Skipped because its anchor or function call')
        return
    }

    if (target.attr('target') == '_blank') {
        console.log('AJAX | Skipping because its _blank.')
        return
    }

    if (!window.router.checkUrl(url)) {
        return
    }

    if (dom_url == '/') {
        url = url + 'id0'
    }

    e.preventDefault()

    console.log(`AJAX | Going to URL ${url}`)
    await window.router.route({
        url: url,
    })
})

u(document).on('submit', 'form', async (e) => {
    if (e.defaultPrevented) {
        return
    }

    if (u('#ajloader').hasClass('shown')) {
        e.preventDefault()
        return
    }

    if (window.openvk && window.openvk.disable_ajax == 1) {
        return false
    }

    if (e.target.closest('#write')) {
        const target = u(e.target)
        if (typeof collect_attachments_node === 'function') {
            collect_attachments_node(target)
        }
    }

    if ((localStorage.getItem('ux.disable_ajax_routing') ?? 0) == 1 || (window.openvk && window.openvk.current_id == 0)) {
        return false
    }

    u('#ajloader').addClass('shown')

    const form = e.target
    const method = form.method ?? 'get'
    const url = form.action
    if (form.onsubmit || url.indexOf('/settings?act=interface') != -1) {
        u('#ajloader').removeClass('shown')
        return false
    }
    e.preventDefault()

    try {
        const url_object = new URL(url)
        if (method == 'get' || method == 'GET') {
            $(form).serializeArray().forEach(param => {
                url_object.searchParams.append(param.name, param.value)
            })
        }

        if (!url) {
            u('#ajloader').removeClass('shown')
            return
        }

        const form_data = typeof serializeForm === 'function' ? serializeForm(form, e.submitter) : new FormData(form)
        const request_object = {
            method: method,
            headers: {
                'X-OpenVK-Ajax-Query': '1',
            }
        }

        if (method != 'GET' && method != 'get') {
            request_object.body = form_data
        }

        const form_res = await fetch(url_object, request_object)
        const form_result = await form_res.text()
        switch (form_res.status) {
            case 500:
            case 502:
                if (typeof makeError === 'function') {
                    makeError(form_res.statusText)
                }
                break
        }

        const parser = new DOMParser
        const parsed_content = parser.parseFromString(form_result, 'text/html')

        if (form_res.redirected) {
            history.replaceState({ 'from_router': 1 }, '', form_res.url)
        } else {
            const __new_url = new URL(form_res.url)
            __new_url.searchParams.delete('al')
            __new_url.searchParams.delete('hash')

            history.pushState({ 'from_router': 1 }, '', __new_url)
        }

        window.router.__appendPage(parsed_content)
        window.router.__closeMsgs()
        await window.router.__integratePage()

        window.router.completeNavigation()

    } catch (error) {
        console.warn('AJAX form submission failed, falling back to regular submission:', error)

        window.router.cancelPendingNavigation()

        u('#ajloader').removeClass('shown')
        form.submit()
        return
    }

    u('#ajloader').removeClass('shown')
})

window.addEventListener('popstate', async (e) => {

    console.log('ROUTER | Popstate event triggered for:', location.href);

    const canHandleAjax = window.router.canHandlePopstateNavigation(e);

    if (!canHandleAjax) {

        console.log('ROUTER | Using browser fallback navigation');
        return;
    }

    e.preventDefault();
    console.log('ROUTER | Attempting AJAX popstate navigation');

    try {

        await window.router.route({
            url: location.href,
            push_state: false,
        });

        console.log('ROUTER | AJAX popstate navigation successful');
    } catch (error) {

        console.warn('ROUTER | AJAX popstate navigation failed, falling back to browser navigation:', error);

        window.router.cancelPendingNavigation();

        if (e.state) {

            history.go(-1);
            setTimeout(() => {

                location.assign(location.href);
            }, 100);
        } else {

            location.assign(location.href);
        }
    }
})

window.reinitializeTooltips = function (container = document) {
    if (container !== document) {
        const elementsWithTippy = container.querySelectorAll('[aria-describedby]');
        elementsWithTippy.forEach(element => {
            if (element._tippy) {
                element._tippy.destroy();
            }
        });

        const tippyRoots = document.querySelectorAll('[data-tippy-root]');
        tippyRoots.forEach(root => {
            const targetId = root.getAttribute('aria-describedby') || root.id;
            const target = container.querySelector(`[aria-describedby="${targetId}"]`);
            if (target) {
                root.remove();
            }
        });
    } else {
        const elementsWithTippy = document.querySelectorAll('[aria-describedby]');
        elementsWithTippy.forEach(element => {
            if (element._tippy) {
                element._tippy.destroy();
            }
        });

        const tippyRoots = document.querySelectorAll('[data-tippy-root]');
        tippyRoots.forEach(root => {
            root.remove();
        });

        if (window.tippy && window.tippy.instances) {
            window.tippy.instances.forEach(instance => {
                if (!instance.reference.isConnected) {
                    instance.destroy();
                }
            });
        }
    }

    if (window.initializeTippys) {
        try {
            window.initializeTippys();
        } catch (error) {
            console.warn('Error reinitializing tooltips:', error);
        }
    }
};

window.destroyTooltipsInContainer = function (container) {
    if (!container) return;

    const elementsWithTippy = container.querySelectorAll('[aria-describedby]');
    elementsWithTippy.forEach(element => {
        if (element._tippy) {
            element._tippy.destroy();
            delete element._tippy;
        }
    });

    if (window.cleanupTooltipContent) {
        window.cleanupTooltipContent(container);
    }
};

window.cleanupModalTooltips = function (modalContainer) {
    if (!modalContainer) return;

    if (window.cleanupTooltipContent) {
        window.cleanupTooltipContent(modalContainer);
    }

    window.destroyTooltipsInContainer(modalContainer);

    const allTippyRoots = document.querySelectorAll('[data-tippy-root]');
    allTippyRoots.forEach(root => {
        if (!root.isConnected || !document.body.contains(root)) {
            root.remove();
        }
    });

    if (window.tippy && window.tippy.instances) {
        window.tippy.instances = window.tippy.instances.filter(instance => {
            if (!instance.reference.isConnected) {
                try {
                    instance.destroy();
                } catch (e) {
                }
                return false;
            }
            return true;
        });
    }

    setTimeout(() => {
        if (window.reinitializeTooltips) {
            window.reinitializeTooltips();
        }
    }, 50);
};
function processVkifyLocTags() {
    if (window.processVkifyLocTags) {
        window.processVkifyLocTags();
    }
}

window.initializeSearchOptions = function () {
    const searchForm = document.getElementById('real_search_form');
    const searchOptionsContainer = document.getElementById('search_options');
    if (!searchForm || !searchOptionsContainer) return;

    const performAjaxSearch = () => {
        if (!window.router) {
            searchForm.submit();
            return;
        }

        const formData = new FormData(searchForm);
        const searchParams = new URLSearchParams();

        for (const [key, value] of formData.entries()) {
            if (value && value.trim() !== '') {
                searchParams.append(key, value);
            }
        }

        const searchUrl = `/search?${searchParams.toString()}`;

        window.router.route({
            url: searchUrl,
            push_state: false
        });
    };

    const searchOptions = searchOptionsContainer.querySelectorAll('input[type="checkbox"], input[type="radio"], select');
    searchOptions.forEach(element => {
        element.removeEventListener('change', element._searchChangeHandler);
        element._searchChangeHandler = () => {
            setTimeout(performAjaxSearch, 100);
        };
        element.addEventListener('change', element._searchChangeHandler);
    });

    const textInputs = searchOptionsContainer.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        if (input._searchInputTimeout) {
            clearTimeout(input._searchInputTimeout);
        }
        input.removeEventListener('input', input._searchInputHandler);
        input._searchInputHandler = () => {
            clearTimeout(input._searchInputTimeout);
            input._searchInputTimeout = setTimeout(performAjaxSearch, 800);
        };
        input.addEventListener('input', input._searchInputHandler);
    });

    const resetButton = document.getElementById('search_reset');
    if (resetButton) {
        resetButton.removeEventListener('click', resetButton._searchResetHandler);
        resetButton._searchResetHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = searchForm.querySelector('input[name="q"]');
            if (searchInput) {
                searchInput.value = '';
            }

            const searchOptionsContainer = document.getElementById('search_options');
            if (searchOptionsContainer) {
                searchOptionsContainer.querySelectorAll('input[type="text"]').forEach(inp => {
                    inp.value = '';
                });
                searchOptionsContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => {
                    chk.checked = false;
                });
                searchOptionsContainer.querySelectorAll('input[type="radio"]').forEach(rad => {
                    if (rad.dataset.default) {
                        rad.checked = true;
                        return;
                    }
                    rad.checked = false;
                });
                searchOptionsContainer.querySelectorAll('select').forEach(sel => {
                    sel.value = sel.dataset.default || '';
                });
            }

            resetButton.disabled = true;
            resetButton.value = resetButton.value.replace(/\.\.\.$/, '') + '...';

            setTimeout(() => {
                performAjaxSearch();
                setTimeout(() => {
                    resetButton.disabled = false;
                    resetButton.value = resetButton.value.replace(/\.\.\.$/, '');
                }, 500);
            }, 100);
        };
        resetButton.addEventListener('click', resetButton._searchResetHandler);
    }
};

window.initializeSearchOptionToggle = function () {
    const searchForm = document.getElementById('real_search_form');
    const searchOptionsContainer = document.getElementById('search_options');
    if (!searchForm || !searchOptionsContainer) return;

    const searchOptionNames = searchOptionsContainer.querySelectorAll('.search_option_name');
    searchOptionNames.forEach(nameElement => {
        nameElement.removeEventListener('click', nameElement._toggleHandler);
        nameElement._toggleHandler = () => {
            const searchOption = nameElement.closest('.search_option');
            if (searchOption) {
                const searchOptionContent = searchOption.querySelector('.search_option_content');
                if (searchOptionContent) {
                    $(searchOptionContent).slideToggle(250, "swing");
                }
            }
        };
        nameElement.addEventListener('click', nameElement._toggleHandler);
    });
};

document.addEventListener('DOMContentLoaded', function () {
    processVkifyLocTags();

    // Enhanced paginator handling
    if (window.__processPaginatorNextPage) {
        const original = window.__processPaginatorNextPage;
        window.__processPaginatorNextPage = async function (...args) {
            const result = await original.apply(this, args);
            window.router.__handleVKifyContentUpdate();
            return result;
        };
    }

    // Initial setup for current page
    setTimeout(() => {
        if (window.addSuggestedTabToWall) {
            window.addSuggestedTabToWall();
        }

        if (window.location.pathname === '/search') {
            initializeSearchOptions();
            initializeSearchOptionToggle();
        }

        if (window.initTabSlider) {
            window.initTabSlider();
        }

        if (window.location.pathname.includes('/albums') && window.initAlbumPhotosLoader && !document.getElementById('photos-section')?.dataset.initialized) {
            window.initAlbumPhotosLoader();
        }
    }, 100);

    const observer = new MutationObserver((mutations) => {
        let shouldProcess = false;
        let shouldReinitializeTooltips = false;

        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'VKIFYLOC' || node.querySelector && node.querySelector('vkifyloc')) {
                            shouldProcess = true;
                        }

                        if (node.classList && (node.classList.contains('scroll_node') || node.querySelector && node.querySelector('.post_actions_icon'))) {
                            shouldReinitializeTooltips = true;
                        }
                    }
                }
            }
        }

        if (shouldProcess) {
            processVkifyLocTags();
        }

        if (shouldReinitializeTooltips) {
            setTimeout(reinitializeTooltips, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});