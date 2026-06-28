window.router = new class Router {
    constructor() {
        window.__vkifyResourceBase = window.vkify?.resourceBase || window.__vkifyResourceBase;
        window.__vkifyThemeBase = window.vkify?.themeBase || window.__vkifyThemeBase;

        this.navigationState = {
            isNavigating: false,
            pendingNavigation: null,
            navigationQueue: []
        };
        this.managedStyleLinks = new Map();
        this._loadedScriptPaths = new Set();
        this._pendingScripts = new Map();
        this._captureExistingManagedStyles();
        this._cacheExistingScripts();
    }

    _cacheExistingScripts() {
        for (const s of document.querySelectorAll('script[src]')) {
            const path = this._normalizeScriptPath(s.src);
            if (path) this._loadedScriptPaths.add(path);
        }
    }

    _normalizeScriptPath(src) {
        if (!src) return null;
        try {
            return new URL(src, location.origin).pathname;
        } catch (e) {
            return null;
        }
    }

    get csrf() {
        return u("meta[name=csrf]").attr("value");
    }

    isNavigationInProgress() {
        return this.navigationState.isNavigating;
    }

    cancelPendingNavigation() {
        if (this.navigationState.pendingNavigation) {
            console.log('ROUTER | Cancelling pending navigation');
            this.navigationState.pendingNavigation = null;
        }

        this.navigationState.isNavigating = false;
        u('body').removeClass('ajax_request_made');
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
            this.navigationState.isNavigating = false;
            this.navigationState.pendingNavigation = null;

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

    _isScriptAlreadyLoaded(script) {
        if (!script.src) return false;
        const scriptPath = this._normalizeScriptPath(script.src);
        if (!scriptPath) return false;

        if (scriptPath.includes('monaco-editor') && scriptPath.includes('loader.js')) {
            return typeof window.require !== 'undefined' && typeof window.require.config === 'function';
        }

        return this._loadedScriptPaths.has(scriptPath);
    }

    loadScriptOnce(src, { id = null, crossorigin = 'anonymous', integrity = null } = {}) {
        const scriptPath = this._normalizeScriptPath(src);
        if (!scriptPath) {
            return Promise.reject(new Error('Invalid script src'));
        }

        if (this._loadedScriptPaths.has(scriptPath)) {
            return Promise.resolve(null);
        }

        const pending = this._pendingScripts.get(scriptPath);
        if (pending) return pending;

        const promise = new Promise((resolve, reject) => {
            const s = document.createElement('script');
            if (id) s.id = id;
            if (crossorigin) s.crossOrigin = crossorigin;
            if (integrity) s.integrity = integrity;
            s.async = false;
            s.src = src;
            s.onload = () => {
                this._loadedScriptPaths.add(scriptPath);
                resolve(s);
            };
            s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(s);
        }).finally(() => {
            this._pendingScripts.delete(scriptPath);
        });

        this._pendingScripts.set(scriptPath, promise);
        return promise;
    }

    _appendScript(script) {
        return new Promise((resolve, reject) => {
            const newScript = document.createElement('script');
            newScript.crossOrigin = 'anonymous';
            if (script.getAttribute('integrity')) {
                newScript.setAttribute('integrity', script.getAttribute('integrity'));
            }
            if (script.getAttribute('id')) {
                newScript.id = script.id;
            }
            if (script.getAttribute('type')) {
                newScript.type = script.type;
            }

            if (script.src) {
                const scriptPath = this._normalizeScriptPath(script.src);
                newScript.async = false;
                newScript.src = script.src;
                newScript.onload = () => {
                    if (scriptPath) this._loadedScriptPaths.add(scriptPath);
                    resolve();
                };
                newScript.onerror = () => {
                    console.warn('Failed to load external script:', script.src);
                    resolve();
                };
            } else {
                newScript.async = false;
                const wrappedContent = `
                    try {
                        ${script.textContent}
                    } catch (error) {
                        console.warn('Script execution failed during AJAX transition:', error);
                        if (error.message?.includes("can't access property")) {
                            console.warn('DOM access error detected, this page may not be compatible with AJAX routing');
                        }
                    }
                `;
                newScript.textContent = wrappedContent;
            }

            document.body.appendChild(newScript);

            if (!script.src) {
                resolve();
            }
        });
    }

    _clearScripts() {
        u(`script:not([src])`).remove();
    }

    _closeMsgs() {
        window.messagebox_stack?.forEach(msg => {
            if (!msg.hidden) {
                msg.close();
            }
        });
    }

    _captureExistingManagedStyles() {
        document.querySelectorAll('link[rel="stylesheet"][data-vkify-route-style]').forEach(link => {
            const key = link.getAttribute('data-vkify-route-style') || link.href;
            if (key && !this.managedStyleLinks.has(key)) {
                this.managedStyleLinks.set(key, link);
            }
        });
    }

    _cloneManagedLink(source, key) {
        const link = document.createElement('link');
        link.rel = source.rel || 'stylesheet';
        Array.from(source.attributes).forEach(({ name, value }) => {
            if (name !== 'data-vkify-route-style') {
                link.setAttribute(name, value);
            }
        });
        link.setAttribute('data-vkify-route-style', key);
        return link;
    }

    _syncManagedStyles(parsed_content) {
        if (!parsed_content) return;

        const desiredStyles = Array.from(parsed_content.querySelectorAll('link[rel="stylesheet"][data-vkify-route-style]')).map(link => {
            const key = link.getAttribute('data-vkify-route-style') || link.href;
            return key ? { key, link } : null;
        }).filter(Boolean);

        const desiredKeys = new Set(desiredStyles.map(item => item.key));

        for (const key of this.managedStyleLinks.keys()) {
            if (!desiredKeys.has(key)) {
                this.managedStyleLinks.get(key)?.remove();
                this.managedStyleLinks.delete(key);
            }
        }

        desiredStyles.forEach(({ key, link }) => {
            if (!this.managedStyleLinks.has(key)) {
                const managedLink = this._cloneManagedLink(link, key);
                document.head.appendChild(managedLink);
                this.managedStyleLinks.set(key, managedLink);
            }
        });
    }

    _appendPage(parsed_content) {
        const requiredElements = ['.page_body', '.sidebar', '.page_header'];
        const missingElements = requiredElements.filter(selector => !parsed_content.querySelector(selector));
        if (missingElements.length > 0) {
            console.warn('Missing required elements for AJAX transition:', missingElements);
            throw new Error(`Missing required elements: ${missingElements.join(', ')}`);
        }

        const scriptsToAppend = [];
        const pageBody = u(parsed_content.querySelector('.page_body'));
        const sidebar = u(parsed_content.querySelector('.sidebar'));
        const pageHeader = u(parsed_content.querySelector('.page_header'));
        const backdrop = u(parsed_content.querySelector('#backdrop'));

        this._syncManagedStyles(parsed_content);

        if (pageBody.length < 1) {
            throw new Error('Invalid page has been loaded');
        }

        const currentSearchInput = u('.page_header #search_box input').nodes[0];
        const newSearchInput = pageHeader.find('#search_box input').nodes[0];
        if (currentSearchInput && newSearchInput) {
            currentSearchInput.value = newSearchInput.value;
        }

        window.__current_page_audio_context = null;
        this._clearScripts();

        const collectedScripts = new Set();

        parsed_content.querySelectorAll('script').forEach(script => {
            if (!this._isScriptAlreadyLoaded(script) && !collectedScripts.has(script)) {
                scriptsToAppend.push(script);
                collectedScripts.add(script);
            }
        });

        if (typeof window.__resetPaginatorState === 'function') {
            window.__resetPaginatorState();
        }

        u('.page_body').html(pageBody.html());
        u('.sidebar').html(sidebar.html());

        if (backdrop.length > 0) {
            if (u('#backdrop').length === 0) {
                u('body').append('<div id="backdrop"></div>');
            }
            u('#backdrop').nodes[0].outerHTML = backdrop.nodes[0].outerHTML;
        } else {
            u('#backdrop').remove();
        }

        u("meta[name=csrf]").attr("value", u(parsed_content.querySelector('meta[name=csrf]')).attr('value'));
        window.setBaseTitle(parsed_content.title)

        requestAnimationFrame(() => {
            requestAnimationFrame(async () => {
                for (const script of scriptsToAppend) {
                    try {
                        await this._appendScript(script);
                    } catch (error) {
                        console.warn('Failed to append script during AJAX transition:', error);
                    }
                }
            });
        });

        this._handleVKifyContentUpdate();
    }

    _handleVKifyContentUpdate() {
        if (window.vkify?.onPageReady) {
            vkify.onPageReady();
            return;
        }

        window.processVkifyLocTags?.();
        window.reinitializeTooltips?.();

        if (location.pathname === '/search') {
            window.initializeSearchOptions;
            window.initializeSearchOptionToggle;
        }

        window.initializeSearchFastTips;
        window.hideSearchFastTips?.();
        setTimeout(window.initTabSlider, 150);

        if (location.pathname.includes('/albums') && !ge('photos-section')?.dataset.initialized) {
            setTimeout(window.initAlbumPhotosLoader, 100);
        }

        if (ge('editor') && window.initNotesMonacoEditor) {
            setTimeout(window.initNotesMonacoEditor, 100);
        }
    }

    async _integratePage(scrolling = 0) {
        window.temp_y_scroll = null;
        u('.toTop').removeClass('has_down');
        window.scrollTo(0, scrolling);

        if (typeof bsdnHydrate === 'function') {
            bsdnHydrate();
        }

        const paginator = u('.vkify-paginator:not(.vkify-paginator-at-top)').nodes[0];
        if (paginator) {
            if (typeof window.__resetPaginatorState === 'function') {
                window.__resetPaginatorState();
            }
            window.__vkifySchedulePaginatorCheck?.();
        }

        const smallBlock = u(`div[class$="_small_block"]`).nodes[0];
        if (smallBlock && typeof smallBlockObserver !== 'undefined') {
            smallBlockObserver.observe(smallBlock);
        }

        if (window.player) {
            window.player.dump();
            await window.player._handlePageTransition();
        }
    }

    _unlinkObservers() {
        const smallBlock = u(`div[class$="_small_block"]`).nodes[0];
        if (smallBlock && typeof smallBlockObserver !== 'undefined') {
            smallBlockObserver.unobserve(smallBlock);
        }
    }

    checkUrl(url) {
        if (window.openvk?.disable_ajax === 1) return false;
        if (parseInt(localStorage.getItem('ux.disable_ajax_routing') ?? '0', 10) === 1 || window.openvk?.current_id === 0) return false;
        if (!url) return false;

        try {
            const resolvedUrl = new URL(url, location.origin);
            if (resolvedUrl.origin !== location.origin) return false;
            if (resolvedUrl.searchParams.has('hash') || resolvedUrl.hash.includes('#close')) return false;
            return true;
        } catch (e) {
            return false;
        }
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

        return true;
    }

    _validateHistoryState(event) {
        const state = event.state ?? history.state;
        if (!state || typeof state !== 'object' || typeof state.from_router !== 'number') {
            console.warn('ROUTER | Invalid history state');
            return false;
        }
        return true;
    }

    savePreviousPage() {
        this.prev_page_html = {
            url: location.href,
            pathname: location.pathname,
            html: u('.page_body').html(),
        };
    }

    async route(params = {}) {
        if (typeof params === 'string') {
            params = { url: params };
        }

        let url = params.url;
        const resolvedUrl = new URL(url, location.origin);
        url = resolvedUrl.toString();

        const navigationRequest = {
            type: 'route',
            params,
            url,
            timestamp: Date.now()
        };

        if (!this.queueNavigation(navigationRequest)) {
            return;
        }

        if (this.prev_page_html && this.prev_page_html.pathname !== location.pathname) {
            this.prev_page_html = null;
        }

        const pushState = params.push_state ?? true;
        if (pushState) {
            history.pushState({ from_router: 1 }, '', url);
        } else {
            history.replaceState({ from_router: 1 }, '', url);
        }

        u('body').addClass('ajax_request_made');

        try {
            const oldUrl = location.href;
            const response = await fetch(resolvedUrl, {
                method: 'GET',
                referrer: oldUrl,
                redirect: 'manual',
                headers: {
                    'X-OpenVK-Ajax-Query': '1',
                }
            });

            if (response.status === 404 || response.status === 402 || response.status === 401) {
                let errorBody = tr('error');
                
                if (response.status === 404) {
                    errorBody = tr('app_err_not_found');
                } else if (response.status === 403 || response.status === 401) {
                    errorBody = tr('forbidden');
                }

                MessageBox(tr('error'), errorBody, [tr('close')], [() => {}]);
                this.cancelPendingNavigation();
                return;
            }

            const text = await response.text();
            const parser = new DOMParser();
            const parsedContent = parser.parseFromString(text, 'text/html');

            this._closeMsgs();
            this._unlinkObservers();
            u('body').removeClass('ajax_request_made');

            this._appendPage(parsedContent);
            await this._integratePage();

            this.completeNavigation();
        } catch (e) {
            console.error('AJAX routing failed:', e);
            this.cancelPendingNavigation();

            if (e.message?.includes("can't access property") || e.message?.includes("Missing required elements")) {
                console.warn('Page structure incompatible with AJAX routing, falling back to regular navigation');
            }

            resolvedUrl.searchParams.delete('al');
            location.assign(resolvedUrl);
        }
    }
};

u(document).on('click', 'a', async (e) => {
    if (e.defaultPrevented) {
        console.log('AJAX | Skipping because default is prevented');
        return;
    }

    const target = u(e.target).closest('a');
    const domUrl = target.attr('href');
    const id = target.attr('id');
    let url = target.nodes[0].href;

    if (id && !['act_tab_a', 'ki', 'used', '_pinGroup', 'profile_link', 'minilink-friends', 'minilink-albums', 'minilink-messenger', 'minilink-groups', 'minilink-notifications'].includes(id)) {
        console.log('AJAX | Skipping cuz maybe its function call link.');
        return;
    }

    if (target.attr('rel') === 'nofollow') {
        console.log('AJAX | Skipped because its nofollow');
        return;
    }

    if (target.nodes[0].hasAttribute('download')) {
        console.log('AJAX | Skipped because its download');
        return;
    }

    if (!domUrl || domUrl === '#' || domUrl.startsWith('javascript:')) {
        console.log('AJAX | Skipped because its anchor or function call');
        return;
    }

    if (target.attr('target') === '_blank') {
        console.log('AJAX | Skipping because its _blank.');
        return;
    }

    if (!window.router.checkUrl(url)) {
        return;
    }

    if (domUrl === '/') {
        url += 'id0';
    }

    e.preventDefault();
    console.log(`AJAX | Going to URL ${url}`);
    await window.router.route({ url });
});

u(document).on('submit', 'form', async (e) => {
    if (e.defaultPrevented) return;
    if (u('#ajloader').hasClass('shown')) {
        e.preventDefault();
        return;
    }

    if (window.openvk?.disable_ajax === 1) return;
    if (parseInt(localStorage.getItem('ux.disable_ajax_routing') ?? '0', 10) === 1 || window.openvk?.current_id === 0) return;

    const target = u(e.target);
    if (target.closest('#write') && typeof collect_attachments_node === 'function') {
        const hasHorizontalInput = target.find(`input[name='horizontal_attachments']`).length > 0;
        const hasVerticalInput = target.find(`input[name='vertical_attachments']`).length > 0;
        if (hasHorizontalInput && hasVerticalInput) {
            collect_attachments_node(target);
        }
    }

    u('#ajloader').addClass('shown');

    const form = e.target;
    const method = form.method?.toUpperCase() ?? 'GET';
    const action = form.action;
    if (form.onsubmit || action.includes('/settings?act=interface')) {
        u('#ajloader').removeClass('shown');
        return;
    }

    e.preventDefault();

    try {
        const urlObj = new URL(action, location.origin);
        const formData = typeof serializeForm === 'function' ? serializeForm(form, e.submitter) : new FormData(form);

        if (method === 'GET') {
            for (const [key, value] of formData.entries()) {
                if (value?.trim()) {
                    urlObj.searchParams.append(key, value);
                }
            }
        }

        const request = {
            method,
            headers: { 'X-OpenVK-Ajax-Query': '1' }
        };

        if (method !== 'GET') {
            request.body = formData;
        }

        const response = await fetch(urlObj, request);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const text = await response.text();
        const parser = new DOMParser();
        const parsedContent = parser.parseFromString(text, 'text/html');

        if (response.redirected) {
            history.replaceState({ from_router: 1 }, '', response.url);
        } else {
            const newUrl = new URL(response.url);
            newUrl.searchParams.delete('al');
            newUrl.searchParams.delete('hash');
            history.pushState({ from_router: 1 }, '', newUrl);
        }

        window.router._appendPage(parsedContent);
        window.router._closeMsgs();
        await window.router._integratePage();

        window.router.completeNavigation();
    } catch (error) {
        console.warn('AJAX form submission failed, falling back to regular submission:', error);
        window.router.cancelPendingNavigation();
        u('#ajloader').removeClass('shown');
        HTMLFormElement.prototype.submit.call(form);
    } finally {
        u('#ajloader').removeClass('shown');
    }
});

window.addEventListener('popstate', async (e) => {
    console.log('ROUTER | Popstate event triggered for:', location.href);

    if (!window.router.canHandlePopstateNavigation(e)) {
        console.log('ROUTER | Using browser fallback navigation');
        return;
    }

    e.preventDefault();
    console.log('ROUTER | Attempting AJAX popstate navigation');

    try {
        await window.router.route({
            url: location.href,
            push_state: false
        });
        console.log('ROUTER | AJAX popstate navigation successful');
    } catch (error) {
        console.warn('ROUTER | AJAX popstate navigation failed, falling back to browser navigation:', error);
        window.router.cancelPendingNavigation();
        if (e.state) {
            history.go(-1);
            setTimeout(() => location.assign(location.href), 100);
        } else {
            location.assign(location.href);
        }
    }
});

window.reinitializeTooltips = function (container = document) {
    const elementsWithTippy = container.querySelectorAll('[aria-describedby]');
    elementsWithTippy.forEach(element => {
        if (element._tippy) {
            element._tippy.destroy();
            delete element._tippy;
        }
    });

    const tippyRoots = document.querySelectorAll('[data-tippy-root]');
    tippyRoots.forEach(root => {
        if (!document.body.contains(root)) {
            root.remove();
        }
    });

    if (window.tippy?.instances) {
        window.tippy.instances = window.tippy.instances.filter(instance => {
            if (!instance.reference.isConnected) {
                instance.destroy();
                return false;
            }
            return true;
        });
    }

    if (window.Tooltips?.reinitializeTooltips) {
        try {
            window.Tooltips.reinitializeTooltips(container);
        } catch (error) {
            console.warn('Error reinitializing declarative tooltips:', error);
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

    if (window.Tooltips?.cleanupTooltips) {
        try {
            window.Tooltips.cleanupTooltips(container, false);
        } catch (error) {
            console.warn('Error cleaning up declarative tooltips in container:', error);
        }
    }
};

window.cleanupModalTooltips = function (modalContainer) {
    if (!modalContainer) return;

    if (window.Tooltips?.cleanupTooltips) {
        try {
            window.Tooltips.cleanupTooltips(modalContainer, false);
        } catch (error) {
            console.warn('Error cleaning up declarative tooltips in modal:', error);
        }
    }

    window.destroyTooltipsInContainer(modalContainer);

    const allTippyRoots = document.querySelectorAll('[data-tippy-root]');
    allTippyRoots.forEach(root => {
        if (!root.isConnected) {
            root.remove();
        }
    });

    if (window.tippy?.instances) {
        window.tippy.instances = window.tippy.instances.filter(instance => instance.reference.isConnected);
    }

    setTimeout(window.reinitializeTooltips, 50);
};

window.processVkifyLocTags = function() {
    if (!window.vkifylang) return;
    
    document.querySelectorAll('vkifyloc').forEach(element => {
        const locName = element.getAttribute('name');
        if (locName && window.vkifylang[locName]) {
            let translatedText = window.vkifylang[locName];
            
            const args = element.getAttribute('args');
            if (args) {
                args.split(',').map(arg => arg.trim()).forEach((arg, index) => {
                    translatedText = translatedText.replace(new RegExp(`\\$${index + 1}`, 'g'), arg);
                });
            }
            
            element.outerHTML = translatedText;
        }
    });
};

window.initializeSearchOptions = function () {
    const searchForm = ge('real_search_form');
    const searchOptionsContainer = ge('search_options');
    if (!searchForm || !searchOptionsContainer) return;

    const performAjaxSearch = () => {
        if (!window.router) {
            searchForm.submit();
            return;
        }

        const formData = new FormData(searchForm);
        const searchParams = new URLSearchParams();
        for (const [key, value] of formData.entries()) {
            if (value?.trim()) {
                searchParams.append(key, value);
            }
        }

        const searchUrl = `/search?${searchParams.toString()}`;
        window.router.route({ url: searchUrl, push_state: false });
    };

    const searchOptions = searchOptionsContainer.querySelectorAll('input[type="checkbox"], input[type="radio"], select');
    searchOptions.forEach(element => {
        element.removeEventListener('change', element._searchChangeHandler);
        element._searchChangeHandler = () => setTimeout(performAjaxSearch, 100);
        element.addEventListener('change', element._searchChangeHandler);
    });

    const textInputs = searchOptionsContainer.querySelectorAll('input[type="text"]');
    textInputs.forEach(input => {
        clearTimeout(input._searchInputTimeout);
        input.removeEventListener('input', input._searchInputHandler);
        input._searchInputHandler = () => {
            clearTimeout(input._searchInputTimeout);
            input._searchInputTimeout = setTimeout(performAjaxSearch, 800);
        };
        input.addEventListener('input', input._searchInputHandler);
    });

    const resetButton = ge('search_reset');
    if (resetButton) {
        resetButton.removeEventListener('click', resetButton._searchResetHandler);
        resetButton._searchResetHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const searchInput = searchForm.querySelector('input[name="q"]');
            if (searchInput) {
                searchInput.value = '';
            }

            searchOptionsContainer.querySelectorAll('input[type="text"]').forEach(inp => inp.value = '');
            searchOptionsContainer.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = false);
            searchOptionsContainer.querySelectorAll('input[type="radio"]').forEach(rad => {
                rad.checked = !!rad.dataset.default;
            });
            searchOptionsContainer.querySelectorAll('select').forEach(sel => sel.value = sel.dataset.default || '');

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
    const searchOptionsContainer = ge('search_options');
    if (!searchOptionsContainer) return;

    const searchOptionNames = searchOptionsContainer.querySelectorAll('.search_option_name');
    searchOptionNames.forEach(nameElement => {
        nameElement.removeEventListener('click', nameElement._toggleHandler);
        nameElement._toggleHandler = () => {
            const searchOption = nameElement.closest('.search_option');
            const searchOptionContent = searchOption?.querySelector('.search_option_content');
            if (searchOptionContent) {
                $(searchOptionContent).slideToggle(250, "swing");
            }
        };
        nameElement.addEventListener('click', nameElement._toggleHandler);
    });
};

vkify.ready(function () {
    if (window.__processPaginatorNextPage) {
        const original = window.__processPaginatorNextPage;
        window.__processPaginatorNextPage = async function (...args) {
            const result = await original.apply(this, args);
            window.router._handleVKifyContentUpdate();
            return result;
        };
    }

    setTimeout(() => {
        window.router?._handleVKifyContentUpdate();
    }, 100);

    const observer = new MutationObserver(mutations => {
        let shouldProcessLoc = false;
        let shouldReinitTooltips = false;

        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.tagName === 'VKIFYLOC' || node.querySelector('vkifyloc')) {
                        shouldProcessLoc = true;
                    }
                    if (node.classList?.contains('scroll_node') || node.querySelector('.post_actions_icon')) {
                        shouldReinitTooltips = true;
                    }
                }
            });
        });

        if (shouldProcessLoc) window.processVkifyLocTags?.();
        if (shouldReinitTooltips) setTimeout(window.reinitializeTooltips, 100);
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

vkify.hook(vkify, 'onPageReady', () => {
    if (window.location.pathname === '/search') {
        window.initializeSearchOptions?.();
        window.initializeSearchOptionToggle?.();
    }
}, 'after');