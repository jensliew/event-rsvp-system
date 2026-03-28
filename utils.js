// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Format date to readable string
 * @param {string|number} dateInput - Date string or timestamp
 * @param {string} format - 'short' or 'long'
 * @returns {string} Formatted date
 */
export function formatDate(dateInput, format = 'short') {
    const date = new Date(dateInput);

    const shortFormat = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    const longFormat = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return date.toLocaleDateString('en-US', format === 'long' ? longFormat : shortFormat);
}

/**
 * Show message to user
 * @param {string} text - Message text
 * @param {string} type - Message type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (0 = permanent for errors/warnings)
 */
export function showMessage(text, type = 'info', duration = null) {
    const container = document.getElementById('message-container');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.textContent = text;

    // Add close button for manual dismissal
    if (type === 'error' || type === 'warning') {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'message-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => message.remove();
        message.appendChild(closeBtn);
    }

    container.innerHTML = '';
    container.appendChild(message);

    // Auto-remove based on type
    if (type === 'success' || type === 'info') {
        // Auto-remove success/info messages after 5 seconds
        const timeoutDuration = duration || 5000;
        setTimeout(() => {
            if (container.contains(message)) {
                message.remove();
            }
        }, timeoutDuration);
    }
    // Error and warning messages stay until manually closed
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Get DOM element or throw error
 * @param {string} selector - Element ID or selector
 * @returns {HTMLElement} Element
 */
export function getElement(selector) {
    const element = document.getElementById(selector) || document.querySelector(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    return element;
}

/**
 * Set active class on elements and remove from others
 * @param {HTMLElement|NodeList} elements - Elements to search
 * @param {HTMLElement} target - Element to mark as active
 * @param {string} className - Class name to toggle (default: 'active')
 */
export function setActive(elements, target, className = 'active') {
    elements.forEach(el => el.classList.remove(className));
    target.classList.add(className);
}

/**
 * Generic API fetch wrapper with error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {*} defaultReturn - Default return value on error
 * @returns {Promise<*>} Response data or default
 */
export async function apiFetch(url, options = {}, defaultReturn = []) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        return defaultReturn;
    }
}
