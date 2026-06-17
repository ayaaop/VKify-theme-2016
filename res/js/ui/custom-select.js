(() => {


vkify.bindOnce('dropdownHandlers', () => {
    let vkdropdownJustClosed = false;
    let currentOutsideClick = null;

    const removeDropdown = () => {
        document.querySelectorAll('.vkdropdown').forEach(el => { el.remove(); });
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
        menu.style.left = `${rect.left + window.scrollX - 1}px`;
        menu.style.width = `${rect.width}px`;
        menu.dataset.selectVkifyId = selectEl.dataset.vkifySelectId || '';

        Array.from(selectEl.options || []).forEach((opt) => {
            const item = document.createElement('div');
            item.className = `vkdropopt${opt.selected ? ' selected' : ''}`;
            item.textContent = opt.textContent || '';
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        const menuHeight = menu.offsetHeight;
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
            menu.style.top = `${rect.top + window.scrollY - menuHeight + 1}px`;
            menu.classList.add('vkdropdown-top');
        } else {
            menu.style.top = `${rect.bottom + window.scrollY - 2}px`;
        }

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

    vkify.observeDOM((mutations) => {
        for (const m of mutations) {
            for (const node of m.removedNodes) {
                if (node.nodeType === 1 && ((node.classList && node.classList.contains('ovk-msg-all')) || (node.querySelector && node.querySelector('.ovk-msg-all')))) {
                    removeDropdown();
                    return;
                }
            }
        }
    });
});

})();
