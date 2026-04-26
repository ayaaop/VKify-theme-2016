(function () {
'use strict';

let audioWasPlaying = false;
let videoWasPlaying = null;

function pauseAudioForVideo() {
    if (!window.player?.audioPlayer) return;
    if (!window.player.audioPlayer.paused) {
        audioWasPlaying = true;
        window.player.pause();
    }
}

function resumeAudioAfterVideo() {
    if (!window.player?.audioPlayer) return;
    if (audioWasPlaying) {
        audioWasPlaying = false;
        window.player.play();
    }
}

function pauseVideoForAudio() {
    const playing = document.querySelector('video:not([paused])');
    if (playing && !playing.paused) {
        videoWasPlaying = playing;
        playing.pause();
    }
}

function bindVideoListeners(video) {
    if (!video || video.__vkifyAudioCoordBound) return;
    video.__vkifyAudioCoordBound = true;

    video.addEventListener('play', pauseAudioForVideo);
    video.addEventListener('pause', resumeAudioAfterVideo);
    video.addEventListener('ended', resumeAudioAfterVideo);
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
            const video = el?.querySelector?.('video');
            if (video) bindVideoListeners(video);
        };
    }

    vkify.ready(() => {
        if (window.player?.play) {
            vkify.hook(window.player, 'play', pauseVideoForAudio, 'before');
        }
    });
});

vkify.onPage(initVideoAudioCoordination);

})();
