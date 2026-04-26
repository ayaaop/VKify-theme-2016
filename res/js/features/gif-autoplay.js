(function () {
'use strict';

let gifObserver = null;

function initGifAutoplay() {
    if (Number(localStorage.getItem('ux.gif_autoplay') ?? 0) !== 1) return;

    if (!gifObserver) {
        gifObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const docItem = entry.target;
                if (!docItem.classList.contains('docGalleryItem') || !docItem.querySelector('.play-button')) return;
                docItem.classList.toggle('playing', entry.isIntersecting);
            });
        }, { root: null, rootMargin: '0px', threshold: 0 });
    }

    document.querySelectorAll('.docGalleryItem').forEach((item) => {
        if (item.dataset.gifObserved) return;
        item.dataset.gifObserved = '1';
        gifObserver.observe(item);
    });
}

vkify.onPage(initGifAutoplay);

})();
