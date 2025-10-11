// utils/dom-utils.js
export class DomUtils {
    static createElement(tag, classes = [], attributes = {}) {
        const element = document.createElement(tag);
        if (classes.length) element.classList.add(...classes);
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        return element;
    }

    static showElement(element) {
        element.style.display = 'block';
    }

    static hideElement(element) {
        element.style.display = 'none';
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static formatAddress(displayName) {
        if (!displayName) return '';
        const parts = displayName.split(',');
        return parts.length >= 3
            ? `${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}`
            : displayName;
    }
}