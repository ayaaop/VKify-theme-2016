vkify.once('mediaModals', function () {

    const tr = window.tr;
    const escapeHtml = window.escapeHtml;
    const LoaderUtils = window.LoaderUtils;
    const fastError = window.fastError;
    const findAuthor = window.find_author;
    const CF = window.ContentFetcher;

    async function vkifyOpenVideo(video_arr = [], init_player = true, skipUrlUpdate = false, startAtTime = 0) {
        try {
            const loader = CF.createLoader();
            if (loader.isShown()) return;

            loader.show();
            const video_owner = video_arr[0];
            const video_id = video_arr[1];
            let video_api = null;
            let isPrivacyRestricted = await CF.checkPrivacyRestriction(video_owner, 'user');

            if (!isPrivacyRestricted) {
                try {
                    video_api = await window.OVKAPI.call('video.get', { 'videos': `${video_owner}_${video_id}`, 'extended': 1 });

                    if (!video_api.items || !video_api.items[0]) {
                        throw new Error('Not found');
                    }
                } catch (e) {
                    const errorMessage = e.message ? e.message.toLowerCase() : '';
                    if (errorMessage.includes('access') || errorMessage.includes('private') ||
                        errorMessage.includes('permission') || errorMessage.includes('forbidden') ||
                        errorMessage.includes('denied') || e.code === 15 || e.code === 18) {
                        isPrivacyRestricted = true;
                    } else {
                        loader.hide();
                        fastError(e.message);
                        return;
                    }
                }
            }

            const video_object = video_api?.items?.[0];
            if (!video_object) {
                loader.hide();
                fastError(tr('access_denied'));
                return;
            }

            const pretty_id = `${video_object.owner_id}_${video_object.id}`;

            function updateVideoUrl(videoId) {
                CF.updateUrlParam('z', `video${videoId}`, { skip: skipUrlUpdate });
            }

            function clearVideoUrl() {
                CF.clearUrlParam('z');
            }

            const author = findAuthor(video_object.owner_id, video_api?.profiles, video_api?.groups);

            let player_html = '';
            if (init_player) {
                if (video_object.platform == 'youtube') {
                    const video_url = new URL(video_object.player);
                    const video_id = video_url.pathname.replace('/', '');
                    player_html = `
                <div class="video-player-container" style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
                    <iframe
                       style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                       src="https://www.youtube-nocookie.com/embed/${video_id}?autoplay=1&start=${Math.floor(startAtTime)}"
                       frameborder="0"
                       sandbox="allow-same-origin allow-scripts allow-popups"
                       allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                       allowfullscreen></iframe>
                </div>
            `;
                } else {
                    if (!video_object.is_processed) {
                        player_html = `<span class='gray'>${tr('video_processing')}</span>`;
                    } else {
                        const author_name = `${author.first_name} ${author.last_name}`;
                        player_html = `
                    <div class="video-player-container" style="position: relative; width: 100%; height: 0; padding-bottom: 56.25%;">
                        <div class='bsdn media' data-id="${pretty_id}" data-name="${escapeHtml(video_object.title)}" data-author="${escapeHtml(author_name)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                            <video class='media' data-src='${video_object.player}' style="width: 100%; height: 100%; object-fit: contain;"></video>
                        </div>
                    </div>
                `;
                    }
                }
            }

            const content = `
        <div class="page_block">
            <div class="video_block_layout">
                ${player_html}
            </div>
            <div class="video_info">
                <div id='video_info_loader'></div>
            </div>
            <div class="clear_fix video_comments" id="video_comments_section" style="display: none;">
                <div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>
            </div>
        </div>`;

            const msgbox = CF.createModal({
                type: 'video',
                title: escapeHtml(video_object.title),
                content: content,
                isPrivate: isPrivacyRestricted,
                showMinimize: true,
                closeOnButtons: false,
                warnOnExit: false
            });

            if (video_object.platform != 'youtube' && video_object.is_processed) {
                bsdnInitElement(msgbox.getNode().find('.bsdn').nodes[0]);
                const modalPlayer = msgbox.getNode().find('.bsdn > video').nodes[0];
                if (modalPlayer && startAtTime > 0) {
                    if (!modalPlayer.src && modalPlayer.dataset.src) {
                        modalPlayer.src = modalPlayer.dataset.src;
                        modalPlayer.load();
                    }
                    modalPlayer.addEventListener('loadedmetadata', function() {
                        modalPlayer.currentTime = startAtTime;
                        modalPlayer.play();
                    }, { once: true });
                    if (modalPlayer.readyState >= 1) {
                        modalPlayer.currentTime = startAtTime;
                        modalPlayer.play();
                    }
                }
            }


            async function loadVideoInfo() {
                u('#video_info_loader').html(`<div class="pr pr_medium"><div class="pr_bt"></div><div class="pr_bt"></div><div class="pr_bt"></div></div>`);

                const doc = await CF.fetchPageContent(`/video${pretty_id}`, null, { ajaxQuery: false });
                const results = u(doc);

                const videoInfo = results.find('.video_info');
                if (videoInfo.length > 0) {
                    const viewButton = `
            <a href="/video${pretty_id}" class="video_view_button button button_light">
                <span class="video_view_link" style="display: inline!important">${tr("view_video")}</span>
            </a>`;
                    const moreActions = videoInfo.find('.video_info_more_actions');
                    if (moreActions.length > 0) {
                        moreActions.before(viewButton);
                    } else {
                        videoInfo.append(viewButton);
                    }
                    msgbox.getNode().find('.video_info').html(videoInfo.html());
                    bsdnHydrate();

                    setTimeout(() => {
                        window.reinitializeTooltips();
                    }, 200);
                } else {

                    msgbox.getNode().find('.video_info').html(`<div class="video_info_title">${escapeHtml(video_object.title)}</div>`);
                }

                const videoComments = results.find('.video_comments');
                if (videoComments.length > 0) {
                    msgbox.getNode().find('#video_comments_section').html(videoComments.html());
                    msgbox.getNode().find('#video_comments_section').attr('style', '');
                    bsdnHydrate();

                    setTimeout(() => {
                        window.reinitializeTooltips();
                    }, 200);
                }

                window._currentMediaModalRefresh = () => {
                    if (document.contains(msgbox.getNode().nodes[0])) {
                        loadVideoInfo();
                    }
                };
            }

            loadVideoInfo();

            CF.setupCloseButton(msgbox, '#__modalPlayerClose');
            CF.setupDimmerClose(msgbox);
            msgbox.getNode().find('#__modalPlayerClose').on('click', (e) => {
                e.preventDefault();
                msgbox.close();
            });

            CF.setupCleanup(msgbox, () => {
                CF.unregisterModal(msgbox);
                clearVideoUrl();
                window.cleanupModalTooltips?.(msgbox.getNode().nodes[0]);
                window._currentMediaModalRefresh = null;
            });

            updateVideoUrl(pretty_id);

            loader.hide();
        } catch (err) {
            console.error(err);
            CF.createLoader().hide();
        }
    }

    if (typeof window.OpenVideo === 'function') {
        vkify.hook(window, 'OpenVideo', vkifyOpenVideo, 'replace');
    } else {
        window.OpenVideo = vkifyOpenVideo;
    }

    u(document).on('click', '#videoOpen', (e) => {
        e.preventDefault()
        e.stopPropagation()

        try {
            const target = e.target.closest('#videoOpen')
            const vid = target.dataset.id
            const split = vid.split('_')

            OpenVideo(split)
        } catch(ec) {
            return
        }
    });

    async function vkifyOpenMiniature(e, photo, post, photo_id, type = "post", skipUrlUpdate = false) {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        if (e && typeof e.stopPropagation === 'function') {
            e.stopPropagation();
        }

        try {
            let photoOwnerId = parseInt(photo_id.split('_')[0]);
            let photoRealId = parseInt(photo_id.split('_')[1]);
            const currentUserId = window.openvk?.current_id || 0;

            const content = `
        <div class="pv_wrapper">
            <div class="pv_left">
                <div class="pv_photo">
                    <img src="${photo}" id="pv_photo_img" />
                    <div class="pv_nav_left" id="pv_nav_left" style="display: none;">
                        <div class="pv_nav_arrow"></div>
                    </div>
                    <div class="pv_nav_right" id="pv_nav_right" style="display: none;">
                        <div class="pv_nav_arrow"></div>
                    </div>
                </div>
                <div class="pv_bottom_info">
                    <div class="pv_bottom_info_left">
                        <div class="pv_album_name"><div id='pv_actions_loader'></div></div>
                        <div class="pv_counter"></div>
                    </div>
                    <div class="pv_bottom_actions"></div>
                </div>
            </div>
            <div class="pv_right">
                <div id='pv_right_loader' class='pv_author_block'></div>
            </div>
        </div>`;


            const msgbox = CF.createModal({
                type: 'photo',
                title: tr('photo'),
                content: content,
                closeOnButtons: false,
                warnOnExit: false
            });

            const pretty_id = photo_id;

            function updatePhotoUrl(photoId, albumId = null) {
                const value = albumId ? `photo${photoId}%2Falbum${albumId}` : `photo${photoId}`;
                CF.updateUrlParam('z', value, { skip: skipUrlUpdate });
            }

            function clearPhotoUrl() {
                CF.clearUrlParam('z');
            }

            CF.setupCloseButton(msgbox, '#__modal_photo_close');

            let json = null;
            let imagesCount = 0;
            let currentImageid = pretty_id;
            let shown_offset = 1;
            let offset = 0;
            const albums_per_page = 50;
            let currentAlbumId = null;

            function getIndex(photo_id = null) {
                if (!json || !json.body) return 1;
                return Object.keys(json.body).findIndex(item => item == (photo_id ?? currentImageid)) + 1;
            }

            function getByIndex(id) {
                if (!json || !json.body) return null;
                const ids = Object.keys(json.body);
                const _id = ids[id - 1];
                return json.body[_id];
            }

            function reloadTitleBar() {
                const countText = imagesCount > 1 ? tr("photo_x_from_y", shown_offset, imagesCount) : '';
                msgbox.getNode().find('.pv_counter').html(countText);
            }

            async function loadContext(contextType, contextId) {
                if (contextType == 'post' || contextType == 'comment') {
                    const form_data = new FormData();
                    form_data.append('parentType', contextType);

                    const endpoint_url = `/iapi/getPhotosFromPost/${contextId}`;

                    const fetcher = await fetch(endpoint_url, {
                        method: 'POST',
                        body: form_data,
                    });
                    json = await fetcher.json();
                    imagesCount = Object.entries(json.body).length;
                } else if (contextType == 'album') {
                    currentAlbumId = contextId;
                    const params = {
                        'offset': offset,
                        'count': albums_per_page,
                        'owner_id': contextId.split('_')[0],
                        'album_id': contextId.split('_')[1],
                        'photo_sizes': 1
                    };

                    const result = await window.OVKAPI.call('photos.get', params);
                    const converted_items = {};

                    result.items.forEach(item => {
                        const id = item.owner_id + '_' + item.id;
                        converted_items[id] = {
                            'url': item.src_xbig,
                            'id': id,
                        };
                    });
                    imagesCount = result.count;

                    if (!json) json = { 'body': {} };
                    json.body = Object.assign(converted_items, json.body);
                }

                currentImageid = pretty_id;
            }

            async function slidePhoto(direction) {
                if (!json) {
                    return;
                }

                let current_index = getIndex();
                if (current_index >= imagesCount && direction == 1) {
                    shown_offset = 1;
                    current_index = 1;
                } else if (current_index <= 1 && direction == 0) {
                    shown_offset += imagesCount - 1;
                    current_index = imagesCount;
                } else if (direction == 1) {
                    shown_offset += 1;
                    current_index += 1;
                } else if (direction == 0) {
                    shown_offset -= 1;
                    current_index -= 1;
                }

                const nextPhoto = getByIndex(current_index);
                if (!nextPhoto) return;

                currentImageid = nextPhoto.id;
                const photoURL = json?.body?.[currentImageid]?.url || photo;

                msgbox.getNode().find('#pv_photo_img').attr('src', photoURL);

                reloadTitleBar();
                updatePhotoUrl(currentImageid, currentAlbumId);

                msgbox.getNode().find('.pv_right').html(`<div id='pv_right_loader' class='pv_author_block'></div>`);

                await loadPhotoInfoForPhoto(currentImageid);
            }

            async function initializeNavigation() {
                if (type === 'album' && post && post.length > 0) {
                    currentAlbumId = post;
                    await loadContext('album', post);
                    shown_offset = getIndex();
                } else if (post && post.length > 0) {
                    await loadContext('post', post);
                    shown_offset = getIndex();
                } else if (type === 'album') {
                    try {
                        const photoApi = await window.OVKAPI.call('photos.getById', {
                            'photos': pretty_id,
                            'extended': 1
                        });

                        if (photoApi && photoApi[0] && photoApi[0].album_id) {
                            const albumId = `${photoApi[0].owner_id}_${photoApi[0].album_id}`;
                            currentAlbumId = albumId;
                            await loadContext('album', albumId);
                            shown_offset = getIndex();
                        } else {
                            throw new Error('No album info available');
                        }
                    } catch (e) {
                        json = {
                            body: {
                                [pretty_id]: {
                                    url: photo,
                                    id: pretty_id,
                                    cached: false
                                }
                            }
                        };
                        imagesCount = 1;
                        shown_offset = 1;
                    }
                } else {
                    json = {
                        body: {
                            [pretty_id]: {
                                url: photo,
                                id: pretty_id,
                                cached: false
                            }
                        }
                    };
                    imagesCount = 1;
                    shown_offset = 1;
                }

                if (imagesCount > 1) {
                    msgbox.getNode().find('#pv_nav_left').attr('style', '');
                    msgbox.getNode().find('#pv_nav_right').attr('style', '');
                } else {
                    msgbox.getNode().find('#pv_nav_left').attr('style', 'display: none;');
                    msgbox.getNode().find('#pv_nav_right').attr('style', 'display: none;');
                }

                reloadTitleBar();
            }

            msgbox.getNode().find('#pv_nav_left').on('click', (e) => {
                e.preventDefault();
                slidePhoto(0);
            });

            msgbox.getNode().find('#pv_nav_right').on('click', (e) => {
                e.preventDefault();
                slidePhoto(1);
            });

            initializeNavigation();

            CF.setupKeyboardNav(msgbox, {
                37: () => slidePhoto(0),
                39: () => slidePhoto(1),
                27: () => msgbox.close()
            });

            CF.setupCleanup(msgbox, () => {
                CF.unregisterModal(msgbox);
                clearPhotoUrl();
                window.cleanupModalTooltips?.(msgbox.getNode().nodes[0]);
                window._currentMediaModalRefresh = null;
            });

            async function loadPhotoInfoForPhoto(photoId) {
                u('#pv_right_loader').html('');
                LoaderUtils.show('#pv_right_loader', { size: 'medium' });

                u('#pv_actions_loader').html('');

                msgbox.getNode().find('.pv_bottom_actions').html('<div id="pv_bottom_actions_loader" style="height: 18px"></div>');
                LoaderUtils.show('#pv_bottom_actions_loader', { theme: 'baw', size: 'small' });

                try {
                    const body = await CF.fetchPageContent(`/photo${photoId}`, null, { ajaxQuery: false });

                    const pvRight = body.querySelector('.pv_right');
                    if (!pvRight) throw new Error('No content');

                    msgbox.getNode().find('.ovk-photo-view-window').removeClass('private');
                    msgbox.getNode().find('.pv_right').html(pvRight.innerHTML);

                    const pvAlbumName = body.querySelector('.pv_album_name');
                    msgbox.getNode().find('.pv_album_name').html(pvAlbumName ? pvAlbumName.innerHTML : '');

                    const pvActions = body.querySelector('.pv_bottom_actions');
                    msgbox.getNode().find('.pv_bottom_actions').html(pvActions ? pvActions.innerHTML : '');

                    msgbox.getNode().find(".pv_right .bsdn").nodes.forEach(bsdnInitElement);
                } catch (e) {
                    msgbox.getNode().find('.ovk-photo-view-window').addClass('private');
                    msgbox.getNode().find('.pv_right').html('');
                    msgbox.getNode().find('.pv_album_name').html('');
                }

                setTimeout(window.reinitializeTooltips, 200);

                window._currentMediaModalRefresh = () => {
                    if (document.contains(msgbox.getNode().nodes[0])) {
                        loadPhotoInfoForPhoto(currentImageid);
                    }
                };
            }

            async function loadPhotoInfo() {
                if (pretty_id) {
                    return loadPhotoInfoForPhoto(pretty_id);
                } else {
                    console.error('No photo ID available for loading photo info');
                    msgbox.getNode().find('.pv_right').html(`
                <div class="pv_author_block">
                    <div class="pv_author_name">${tr('error')}</div>
                </div>
            `);
                }
            }

            loadPhotoInfo();
            updatePhotoUrl(pretty_id, currentAlbumId);

            CF.setupDimmerClose(msgbox);
        } catch (err) {
            console.error(err);
        }
    }

    if (typeof window.OpenMiniature === 'function') {
        vkify.hook(window, 'OpenMiniature', vkifyOpenMiniature, 'replace');
    } else {
        window.OpenMiniature = vkifyOpenMiniature;
    }

    function clearZParam() {
        const url = new URL(window.location);
        url.searchParams.delete('z');
        history.replaceState(null, '', url);
    }

    function parseZParam() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const zParam = urlParams.get('z');
            if (!zParam) return null;

            const decoded = decodeURIComponent(zParam);

            const photoMatch = decoded.match(/^photo(-?\d+)_(\d+)(?:\/album(-?\d+)_(\d+))?$/i);
            if (photoMatch) {
                return {
                    type: 'photo',
                    photoId: `${photoMatch[1]}_${photoMatch[2]}`,
                    albumId: photoMatch[3] && photoMatch[4] ? `${photoMatch[3]}_${photoMatch[4]}` : null
                };
            }

            const videoMatch = decoded.match(/^video(-?\d+)_(\d+)$/i);
            if (videoMatch) {
                return {
                    type: 'video',
                    videoId: [videoMatch[1], videoMatch[2]]
                };
            }

            return null;
        } catch (err) {
            return null;
        }
    }

    async function openModalFromUrl() {
        const data = parseZParam();
        if (!data) return;

        if (data.type === 'photo') {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 2000);

                const photoApi = await window.OVKAPI.call('photos.getById', {
                    'photos': data.photoId,
                    'photo_sizes': 1
                }).catch(() => null);

                clearTimeout(timeout);

                if (!photoApi || !photoApi[0]) {
                    const msg = new CMessageBox({
                        title: tr('forbidden'),
                        body: tr('forbidden_comment'),
                        buttons: ['OK'],
                        callbacks: [clearZParam]
                    });
                    return;
                }

                const photo = photoApi[0];
                const photoUrl = photo.src_xbig || photo.src_big || photo.src;
                const type = data.albumId ? 'album' : 'photo';

                await window.OpenMiniature(null, photoUrl, null, data.photoId, type, true);
            } catch (err) {
                clearZParam();
            }
        } else if (data.type === 'video') {
            try {
                await window.OpenVideo(data.videoId, true, true);
            } catch (err) {
                clearZParam();
            }
        }
    }

    vkify.ready(openModalFromUrl);

    window.addEventListener('popstate', () => {
        if (parseZParam()) openModalFromUrl();
    });

    class PostPopupManager {
        constructor() {
            this.currentModal = null;
            this.originalUrl = null;
            this.modalPaginationObserver = null;
            this.setupEventListeners();
            this.checkInitialUrl();
        }

        setupEventListeners() {
            u(document).on('click', '.scroll_container .post_link, .scroll_container .wall_text a[href^="/wall"]', (e) => {
                const link = u(e.target).closest('.post_link, .wall_text a[href^="/wall"]');
                const href = link.attr('href');

                if (href && href.match(/^\/wall-?\d+_\d+$/)) {
                    e.preventDefault();
                    this.openPostPopup(href);
                }
            });

            window.addEventListener('popstate', () => {
                const wallParam = CF.getUrlParam('w');
                const sortParam = CF.getUrlParam('sort');
                const pageParam = CF.getUrlParam('p');

                if (wallParam && wallParam.startsWith('wall')) {
                    const postPath = '/' + wallParam;
                    this.openPostPopup(postPath, false, sortParam, pageParam);
                } else if (this.currentModal) {
                    this.closePostPopup(false);
                }
            });
        }

        checkInitialUrl() {
            const wallParam = CF.getUrlParam('w');
            const sortParam = CF.getUrlParam('sort');
            const pageParam = CF.getUrlParam('p');
            if (wallParam && wallParam.startsWith('wall')) {
                const postPath = '/' + wallParam;
                this.openPostPopup(postPath, false, sortParam, pageParam);
            }
        }

        async openPostPopup(postPath, updateUrl = true, sortParam = null, pageParam = null) {
            try {
                const loader = CF.createLoader();
                if (loader.isShown()) return;

                const postId = this.extractPostId(postPath);
                if (!postId) return;

                if (updateUrl) {
                    this.originalUrl = location.href;
                    const params = { w: postPath.substring(1) };
                    if (sortParam) params.sort = sortParam;
                    if (pageParam) params.p = pageParam;
                    CF.updateMultipleUrlParams(params, { state: { postPopup: postPath } });
                }

                loader.show();

                const fetchUrl = new URL(postPath, location.origin);
                if (sortParam) fetchUrl.searchParams.set('sort', sortParam);
                if (pageParam) fetchUrl.searchParams.set('p', pageParam);

                const postContent = await CF.fetchPageContent(fetchUrl.toString(), '.wide_column');

                loader.hide();

                this.currentModal = CF.createModal({
                    type: 'post',
                    title: tr('post'),
                    content: `<div class="post-popup-content">${postContent.innerHTML}</div>`,
                    closeOnButtons: false,
                    warnOnExit: false
                });

                const modalNode = this.currentModal.getNode();

                const originalExitDialog = this.currentModal.__exitDialog.bind(this.currentModal);
                this.currentModal.__exitDialog = () => {
                    originalExitDialog();
                    this.handleModalClosed();
                };

                CF.setupCleanup(this.currentModal, () => {
                    CF.unregisterModal(this.currentModal);
                });
                CF.setupCloseButton(this.currentModal, '#__modalPlayerClose');
                CF.setupDimmerClose(this.currentModal, '.ovk-photo-view-dimmer');
                CF.setupKeyboardNav(this.currentModal, {
                    27: () => this.closePostPopup()
                });
                modalNode.on('click', '#__modalPlayerClose', () => {
                    this.closePostPopup();
                });

                modalNode.on('click', '.sort_link', (e) => {
                    e.preventDefault();
                    const sortLink = u(e.target).closest('.sort_link');
                    const href = sortLink.attr('href');
                    const sortMatch = href.match(/[?&]sort=([^&]+)/);

                    if (sortMatch) {
                        const sortParam = sortMatch[1];
                        this.refreshModalWithSort(postPath, sortParam);
                    }
                });

                modalNode.on('click', '.vkify-paginator a', (e) => {
                    e.preventDefault();
                    const paginatorLink = u(e.target).closest('a');
                    const href = paginatorLink.attr('href');

                    if (href && href.includes('?')) {
                        const urlParams = new URLSearchParams(href.split('?')[1]);
                        const pageParam = urlParams.get('p');
                        const sortParam = urlParams.get('sort');

                        if (pageParam) {
                            this.appendModalComments(postPath, pageParam, sortParam);
                        }
                    }
                });

                window.processVkifyLocTags();

                this.setupModalPaginationObserver(postPath, sortParam);

            } catch (error) {
                console.error('Failed to load post:', error);
                CF.createLoader().hide();
                if (this.currentModal) {
                    this.closePostPopup(false);
                }
                if (updateUrl) {
                    location.href = postPath;
                }
            }
        }

        handleModalClosed() {
            if (this.modalPaginationObserver) {
                this.modalPaginationObserver.disconnect();
                this.modalPaginationObserver = null;
            }

            this.currentModal = null;

            CF.clearMultipleUrlParams(['w', 'sort', 'p'], {
                replace: !this.originalUrl || this.originalUrl === location.href.split('?')[0]
            });
            this.originalUrl = null;
        }

        async refreshModalWithSort(postPath, sortParam) {
            if (!this.currentModal) return;

            try {
                const modalNode = this.currentModal.getNode();
                const commentsContainer = modalNode.find('.page_block.comments');
                if (commentsContainer.length === 0) {
                    console.warn('Comments container not found in modal');
                    return;
                }

                const fetchUrl = new URL(postPath, location.origin);
                fetchUrl.searchParams.set('sort', sortParam);

                const content = await CF.injectContent(
                    this.currentModal,
                    '.page_block.comments',
                    fetchUrl.toString(),
                    '.page_block.comments',
                    { showLoader: true, loaderOptions: { size: 'medium' } }
                );

                const modalPaginator = modalNode.find('.vkify-paginator:not(.vkify-paginator-at-top)');
                const newPaginator = content.querySelector('.vkify-paginator:not(.vkify-paginator-at-top)');
                if (modalPaginator.length > 0 && newPaginator) {
                    modalPaginator.html(newPaginator.innerHTML);
                }

                CF.updateUrlParam('sort', sortParam, { replace: true, state: { postPopup: postPath } });

                window.processVkifyLocTags();

                this.setupModalPaginationObserver(postPath, sortParam);

            } catch (error) {
                console.error('Failed to refresh post with sort:', error);
                if (this.currentModal) {
                    const commentsContainer = this.currentModal.getNode().find('.page_block.comments');
                    if (commentsContainer.length > 0) {
                        LoaderUtils.hide(commentsContainer);
                        commentsContainer.html('<div class="post-popup-error">Failed to sort comments. Please try again.</div>');
                    }
                }
            }
        }

        async appendModalComments(postPath, pageParam, sortParam = null) {
            if (!this.currentModal) return;

            try {
                const modalNode = this.currentModal.getNode();
                const scrollContainer = modalNode.find('.scroll_container');
                if (scrollContainer.length === 0) {
                    console.warn('Scroll container not found in modal');
                    return;
                }

                const fetchUrl = new URL(postPath, location.origin);
                fetchUrl.searchParams.set('p', pageParam);
                if (sortParam) fetchUrl.searchParams.set('sort', sortParam);

                const doc = await CF.fetchPageContent(fetchUrl.toString(), null);

                const newComments = doc.querySelectorAll('.scroll_container .post.reply');
                newComments.forEach(commentNode => {
                    const commentId = commentNode.getAttribute('data-comment-id');
                    if (commentId) {

                        const existingComment = modalNode.find(`[data-comment-id='${commentId}']`);
                        if (existingComment.length > 0) {
                            console.info('AJAX | Found duplicate comment, skipping');
                            return;
                        }
                    }

                    scrollContainer.nodes[0].appendChild(commentNode);
                });

                const modalPaginator = modalNode.find('.vkify-paginator:not(.vkify-paginator-at-top)');
                const newPaginator = doc.querySelector('.vkify-paginator:not(.vkify-paginator-at-top)');
                if (modalPaginator.length > 0 && newPaginator) {
                    modalPaginator.html(newPaginator.innerHTML);

                    if (modalPaginator.nodes[0].closest('.scroll_container')) {
                        scrollContainer.nodes[0].appendChild(modalPaginator.nodes[0].parentNode);
                    }
                }

                const params = { p: pageParam };
                if (sortParam) params.sort = sortParam;
                CF.updateMultipleUrlParams(params, { replace: true, state: { postPopup: postPath } });

                window.processVkifyLocTags();

            } catch (error) {
                console.error('Failed to append comments:', error);

            }
        }

        setupModalPaginationObserver(postPath, sortParam = null) {
            if (!this.currentModal) return;

            const modalNode = this.currentModal.getNode();
            const paginator = modalNode.find('.vkify-paginator:not(.vkify-paginator-at-top)');
            if (paginator.length === 0) return;

            if (this.modalPaginationObserver) {
                this.modalPaginationObserver.disconnect();
            }

            this.modalPaginationObserver = new IntersectionObserver(entries => {
                entries.forEach(async x => {
                    if (x.isIntersecting) {

                        if (Number(localStorage.getItem('ux.auto_scroll') ?? 1) == 0) {
                            return;
                        }

                        const target = u(x.target);
                        if (target.length < 1 || target.hasClass('vkify-paginator-at-top')) {
                            return;
                        }
                        if (target.hasClass('lagged')) {
                            return;
                        }

                        const modalScrollContainer = target.closest('.post_popup_modal').find('.scroll_container');
                        if (modalScrollContainer.length < 1) {
                            return;
                        }

                        target.addClass('lagged');
                        const activeTab = target.find('.active');
                        const nextPage = u(activeTab.nodes[0] ? activeTab.nodes[0].nextElementSibling : null);
                        if (nextPage.length < 1) {
                            target.removeClass('lagged');
                            return;
                        }

                        const pageNumber = Number(nextPage.html());

                        try {
                            await this.appendModalComments(postPath, pageNumber, sortParam);
                        } catch (e) {
                            console.error(e);
                        }

                        target.removeClass('lagged');
                    }
                });
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 0,
            });

            this.modalPaginationObserver.observe(paginator.nodes[0]);
        }

        closePostPopup(updateUrl = true) {
            if (this.currentModal) {
                const modal = this.currentModal;
                this.currentModal = null;
                modal.__exitDialog();

                if (updateUrl) {
                    CF.clearMultipleUrlParams(['w', 'sort', 'p'], {
                        replace: !this.originalUrl || this.originalUrl === location.href.split('?')[0]
                    });
                    this.originalUrl = null;
                }
            } else if (updateUrl) {
                CF.clearMultipleUrlParams(['w', 'sort', 'p'], {
                    replace: !this.originalUrl || this.originalUrl === location.href.split('?')[0]
                });
                this.originalUrl = null;
            }
        }

        extractPostId(postPath) {
            const match = postPath.match(/^\/wall(-?\d+)_(\d+)$/);
            return match ? { ownerId: match[1], postId: match[2] } : null;
        }
    }

    window.PostPopupManager = PostPopupManager;
    window.postPopupManager = new PostPopupManager();
});