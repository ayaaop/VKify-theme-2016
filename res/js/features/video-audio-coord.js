(function () {
'use strict';

function pauseAudioForVideo() {
    if (!window.player || !window.player.audioPlayer) return;
    if (!window.player.audioPlayer.paused) {
        window.player.pause();
    }
}

function pauseVideoForAudio() {
    const playing = document.querySelector('video:not([paused])');
    if (playing && !playing.paused) {
        playing.pause();
    }
}

function bindVideoListeners(video) {
    if (!video || video.__vkifyAudioCoordBound) return;
    video.__vkifyAudioCoordBound = true;

    video.addEventListener('play', pauseAudioForVideo);
}

function initVideoAudioCoordination() {
    document.querySelectorAll('video').forEach(bindVideoListeners);
}

vkify.bindOnce('videoAudioCoord', () => {
    document.addEventListener('play', (e) => {
        if (e.target.tagName === 'VIDEO') {
            bindVideoListeners(e.target);
            pauseAudioForVideo();
        }
    }, true);

    const origBsdnInit = window.bsdnInitElement;
    if (typeof origBsdnInit === 'function') {
        window.bsdnInitElement = function(el) {
            origBsdnInit.apply(this, arguments);
            const video = (el && el.querySelector) ? el.querySelector('video') : null;
            if (video) bindVideoListeners(video);
        };
    }

    vkify.ready(() => {
        if (window.player && window.player.play) {
            vkify.hook(window.player, 'play', pauseVideoForAudio, 'before');
        }
    });
});

vkify.onPage(initVideoAudioCoordination);

})();
