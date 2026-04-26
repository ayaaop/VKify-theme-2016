(function () {
'use strict';

try {
    if (window.player) {
        const desc = Object.getOwnPropertyDescriptor(window.player, 'ajCreate');
        if (!desc || desc.configurable !== false || desc.writable !== false) {
            Object.defineProperty(window.player, 'ajCreate', {
                value: function () { },
                writable: false,
                configurable: false
            });
        }
    }
} catch (e) {
}

})();
