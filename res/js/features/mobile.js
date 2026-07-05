// Mobile Sidebar Drawer Logic
(function() {
    window.vkify.ready(() => {
        const body = document.body;

        // Use event delegation on document to avoid duplicate listeners on page navigation
        u(document).on('click', (e) => {
            const target = u(e.target);

            // Toggle menu on hamburger click
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

        // Close when clicking on the dimmer shadow or #clickable (using capture phase to run before message-box-overrides.js capture phase)
        document.addEventListener('click', (e) => {
            const t = e.target;
            if (!t) return;
            if (body.classList.contains('menu-expanded') && (t.classList?.contains('dimmer') || t.id === 'clickable')) {
                e.stopImmediatePropagation();
                closeSidebar();
            }
        }, true); // capture phase!

        // Also close sidebar when a link inside the sidebar is clicked
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
    });
})();
