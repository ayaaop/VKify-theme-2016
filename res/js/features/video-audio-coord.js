(function () {
'use strict';

function pauseAudioForVideo() {
    if (!window.player?.audioPlayer) return;
    if (!window.player.audioPlayer.paused) {
        window.player.pause();
    }
}

function pauseOtherMedia(currentMedia) {
    document.querySelectorAll('video, audio').forEach(media => {
        if (media !== currentMedia && !media.paused) {
            media.pause();
        }
    });
}

function bindMediaListeners(media) {
    if (!media || media.__vkifyAudioCoordBound) return;
    media.__vkifyAudioCoordBound = true;

    media.addEventListener('play', function() {
        if (media.tagName === 'VIDEO') {
            pauseAudioForVideo();
        }
        pauseOtherMedia(media);
    });
}

function initMediaCoordination() {
    document.querySelectorAll('video, audio').forEach(bindMediaListeners);
}

vkify.bindOnce('videoAudioCoord', () => {
    document.addEventListener('play', (e) => {
        if (e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO') {
            bindMediaListeners(e.target);
            if (e.target.tagName === 'VIDEO') {
                pauseAudioForVideo();
            }
            pauseOtherMedia(e.target);
        }
    }, true);

    const origBsdnInit = window.bsdnInitElement;
    if (typeof origBsdnInit === 'function') {
        window.bsdnInitElement = function(el) {
            origBsdnInit.apply(this, arguments);
            const video = el?.querySelector?.('video');
            if (video) bindMediaListeners(video);
        };
    }

    vkify.ready(() => {
        if (window.player?.play) {
            vkify.hook(window.player, 'play', function() {
                pauseOtherMedia(window.player.audioPlayer);
            }, 'before');
        }
    });
});

vkify.onPage(initMediaCoordination);

})();
