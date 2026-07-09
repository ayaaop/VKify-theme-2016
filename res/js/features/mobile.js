(function() {
    window.vkify.ready(() => {
        const body = document.body;

        u(document).on('click', (e) => {
            const target = u(e.target);

            if (target.closest('#mobileMenuTrigger').length > 0) {
                e.preventDefault();
                e.stopPropagation();
                if (body.classList.contains('menu-expanded')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
                return;
            }
        });

        document.addEventListener('click', (e) => {
            const t = e.target;
            if (!t) return;
            if (body.classList.contains('menu-expanded') && (t.classList?.contains('dimmer') || t.id === 'clickable')) {
                e.stopImmediatePropagation();
                closeSidebar();
            }
        }, true);

        u(document).on('click', '.sidebar a:not([href^="javascript:"])', () => {
            if (body.classList.contains('menu-expanded')) {
                closeSidebar();
            }
        });

        function openSidebar() {
            body.classList.add('menu-expanded');
            body.classList.add('dimmed');
        }

        function closeSidebar() {
            body.classList.remove('menu-expanded');
            body.classList.remove('dimmed');
        }

        function updateHamburgerBadge() {
            const sidebar = document.querySelector('.sidebar');
            const badge = document.getElementById('hamburgerBadge');
            if (!sidebar || !badge) return;

            let total = 0;
            sidebar.querySelectorAll('.link b').forEach(el => {
                const value = parseInt(el.textContent.trim(), 10);
                if (!isNaN(value)) {
                    total += value;
                }
            });

            badge.textContent = total > 0 ? total : '';
        }

        updateHamburgerBadge();

        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            new MutationObserver(updateHamburgerBadge).observe(sidebar, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        setupSidebarPlayerOnce();
    });

    vkify.onPage(bindSidebarPlayerDOM);

    function setupTransparentAppbar() {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (!isMobile) return;

        const appbar = document.getElementById('appbar');
        if (!appbar || !appbar.classList.contains('appbar--transparent')) return;

        const hero = document.querySelector('.mobile-profile-hero');

        document.body.classList.add('has-transparent-appbar');
        const heroHeight = hero ? hero.offsetHeight : 200;
        window.__profileAppbarScrollHandler = function() {
            const scrollY = window.scrollY || window.pageYOffset;
            const progress = Math.min(scrollY / Math.max(heroHeight - 56, 1), 1);
            appbar.style.setProperty('--appbar-bg-alpha', progress);
            if (progress <= 0) {
                appbar.classList.add('appbar--transparent');
                appbar.classList.remove('appbar--scrolled');
            } else if (progress >= 1) {
                appbar.classList.remove('appbar--transparent');
                appbar.classList.add('appbar--scrolled');
            } else {
                appbar.classList.remove('appbar--transparent', 'appbar--scrolled');
            }
        };
        window.__profileAppbarScrollHandler();
        window.addEventListener('scroll', window.__profileAppbarScrollHandler, {'passive': true});
    }

    vkify.hook(vkify, 'onPageReady', setupTransparentAppbar, 'after');

    function setupSidebarPlayerOnce() {
        if (!vkify.bindOnce('sidebarPlayerSetup', setupSidebarPlayerOnce)) return;

        function updateSidebarPlayer() {
            const sidebarPlayer = document.querySelector('#sidebar_audio_player');
            if (!sidebarPlayer) return;
            const sidebarTrackName = sidebarPlayer.querySelector('.sidebar_ap_track_name');
            const sidebarTrackPerformer = sidebarPlayer.querySelector('.sidebar_ap_track_performer');

            if (window.player && window.player.currentTrack) {
                sidebarPlayer.classList.add('sidebar_audio_player_active');

                const trackId = window.player.currentTrack.id;
                if (sidebarPlayer.dataset.currentTrackId !== String(trackId)) {
                    sidebarPlayer.dataset.currentTrackId = trackId;
                    if (sidebarTrackName) sidebarTrackName.style.opacity = '0';
                    if (sidebarTrackPerformer) sidebarTrackPerformer.style.opacity = '0';
                    setTimeout(() => {
                        if (sidebarTrackName) {
                            sidebarTrackName.textContent = window.player.currentTrack.name;
                            sidebarTrackName.style.opacity = '1';
                        }
                        if (sidebarTrackPerformer) {
                            sidebarTrackPerformer.textContent = window.player.currentTrack.performer;
                            sidebarTrackPerformer.style.opacity = '1';
                        }
                    }, 80);
                }

                sidebarPlayer.classList.toggle('sidebar_audio_player_playing', !window.player.audioPlayer.paused);
            } else {
                sidebarPlayer.classList.remove('sidebar_audio_player_active', 'sidebar_audio_player_playing');
                sidebarPlayer.dataset.currentTrackId = '';
                if (sidebarTrackName) sidebarTrackName.textContent = '';
                if (sidebarTrackPerformer) sidebarTrackPerformer.textContent = '';
            }
        }

        window.__vkifyMusicPopupUpdateSidebarPlayer = updateSidebarPlayer;

        function attachAudioListeners() {
            if (!window.player?.audioPlayer) return;
            window.player.audioPlayer.addEventListener('play', updateSidebarPlayer);
            window.player.audioPlayer.addEventListener('pause', updateSidebarPlayer);
        }

        const tryWrapUpdateFace = () => {
            if (!window.player || typeof window.player.__updateFace !== 'function') return false;
            if (window.player.__vkifyMusicPopupWrappedUpdateFaceSidebar) return true;
            window.player.__vkifyMusicPopupWrappedUpdateFaceSidebar = true;
            vkify.hook(window.player, '__updateFace', updateSidebarPlayer, 'after');
            return true;
        };

        if (window.player && typeof window.player.initEvents === 'function' && !window.player.__vkifySidebarPatchedInitEvents) {
            window.player.__vkifySidebarPatchedInitEvents = true;
            vkify.hook(window.player, 'initEvents', function() {
                attachAudioListeners();
                tryWrapUpdateFace();
                updateSidebarPlayer();
            }, 'after');
        }

        attachAudioListeners();
        tryWrapUpdateFace();
        updateSidebarPlayer();

        window.__vkifyMusicPopupTryWrapUpdateFaceSidebar = tryWrapUpdateFace;
    }

    function bindSidebarPlayerDOM() {
        const sidebarPlayer = document.querySelector('#sidebar_audio_player');
        if (!sidebarPlayer) return;

        const sidebarPlayBtn = sidebarPlayer.querySelector('#sidebar_ap_play_btn');
        const sidebarRightBtn = sidebarPlayer.querySelector('#sidebar_ap_right_btn');
        const sidebarTrackInfo = sidebarPlayer.querySelector('.sidebar_ap_track_info');

        if (sidebarPlayBtn) {
            sidebarPlayBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!window.player?.audioPlayer) return;
                if (window.player.audioPlayer.paused) {
                    window.player.play();
                } else {
                    window.player.pause();
                }
                if (typeof window.__vkifyMusicPopupUpdateSidebarPlayer === 'function') {
                    window.__vkifyMusicPopupUpdateSidebarPlayer();
                }
            });
        }

        if (sidebarRightBtn) {
            sidebarRightBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!window.player?.currentTrack) return;
                if (window.player.audioPlayer && !window.player.audioPlayer.paused) {
                    window.player.playNextTrack();
                } else {
                    if (typeof window.player.__resetContext === 'function') {
                        window.player.__resetContext();
                    }
                    window.player.current_track_id = null;
                    window.player.pause();
                    if (typeof window.__vkifyMusicPopupUpdateSidebarPlayer === 'function') {
                        window.__vkifyMusicPopupUpdateSidebarPlayer();
                    }
                    if (typeof window.__vkifyMusicPopupUpdateTopPlayer === 'function') {
                        window.__vkifyMusicPopupUpdateTopPlayer();
                    }
                    if (typeof window.player.__updateFace === 'function') {
                        window.player.__updateFace();
                    }
                }
            });
        }

        if (sidebarTrackInfo) {
            sidebarTrackInfo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const uid = window.openvk?.current_id;
                if (!uid) return;
                const url = `/audios${uid}`;
                document.body.classList.remove('menu-expanded', 'dimmed');
                if (window.router?.checkUrl(url)) {
                    window.router.route({ url });
                } else {
                    location.assign(url);
                }
            });
        }

        if (typeof window.__vkifyMusicPopupUpdateSidebarPlayer === 'function') {
            window.__vkifyMusicPopupUpdateSidebarPlayer();
        }
        if (typeof window.__vkifyMusicPopupTryWrapUpdateFaceSidebar === 'function') {
            window.__vkifyMusicPopupTryWrapUpdateFaceSidebar();
        }
    }
})();
