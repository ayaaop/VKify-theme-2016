(function () {
'use strict';

vkify.bindOnce('dropdownHandlers', () => {
    let vkdropdownJustClosed = false;
    let currentOutsideClick = null;

    const removeDropdown = () => {
        document.querySelectorAll('.vkdropdown').forEach(el => el.remove());
        if (currentOutsideClick) {
            document.removeEventListener('click', currentOutsideClick, true);
            currentOutsideClick = null;
        }
    };

    const showCustomMenu = (selectEl) => {
        if (!selectEl) return;
        removeDropdown();

        const rect = selectEl.getBoundingClientRect();
        const menu = document.createElement('div');
        menu.className = 'vkdropdown';
        menu.style.position = 'absolute';
        menu.style.left = (rect.left + window.scrollX - 1) + 'px';
        menu.style.top = (rect.bottom + window.scrollY - 2) + 'px';
        menu.style.width = rect.width + 'px';
        menu.dataset.selectVkifyId = selectEl.dataset.vkifySelectId || '';
        document.body.appendChild(menu);

        Array.from(selectEl.options || []).forEach((opt) => {
            const item = document.createElement('div');
            item.className = 'vkdropopt' + (opt.selected ? ' selected' : '');
            item.textContent = opt.textContent || '';
            menu.appendChild(item);
        });

        const selectedItem = menu.querySelector('.vkdropopt.selected');
        if (selectedItem && menu.scrollHeight > menu.clientHeight) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }

        menu.addEventListener('click', (e) => {
            const item = e.target && e.target.closest ? e.target.closest('.vkdropopt') : null;
            if (!item) return;
            const index = Array.from(menu.querySelectorAll('.vkdropopt')).indexOf(item);
            if (index >= 0 && selectEl.options && selectEl.options[index]) {
                selectEl.selectedIndex = index;
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            removeDropdown();
            vkdropdownJustClosed = true;
            setTimeout(() => { vkdropdownJustClosed = false; }, 100);
        });

        setTimeout(() => {
            currentOutsideClick = (e) => {
                const t = e.target;
                if (!t) return;
                if (!t.closest('.vkdropdown') && t !== selectEl) {
                    removeDropdown();
                }
            };
            document.addEventListener('click', currentOutsideClick, true);
        }, 0);
    };

    const onSelectMouseDown = (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const sel = t.closest('select');
        if (!sel) return;
        e.preventDefault();
    };

    const onSelectClick = (e) => {
        const t = e.target;
        if (!(t instanceof Element)) return;
        const sel = t.closest('select');
        if (!sel) return;

        if (vkdropdownJustClosed) {
            e.preventDefault();
            return;
        }

        e.preventDefault();

        if (!sel.dataset.vkifySelectId) {
            sel.dataset.vkifySelectId = String(Math.random()).slice(2);
        }

        const activeDropdown = document.querySelector('.vkdropdown');
        if (activeDropdown) {
            const isSameSelect = activeDropdown.dataset.selectVkifyId === sel.dataset.vkifySelectId;
            removeDropdown();
            if (isSameSelect) {
                vkdropdownJustClosed = true;
                setTimeout(() => { vkdropdownJustClosed = false; }, 100);
                return;
            }
        }

        showCustomMenu(sel);
    };

    document.addEventListener('mousedown', onSelectMouseDown, true);
    document.addEventListener('click', onSelectClick, true);

    vkify.hook(vkify, 'onPageReady', removeDropdown, 'after');
});

})();
