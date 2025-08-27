/**
 * Toast Notification Component for SuperMall Web Application
 * Provides user feedback through toast notifications
 */
class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }

    /**
     * Initialize toast container
     */
    init() {
        // Create toast container if it doesn't exist
        this.container = document.getElementById('notificationToast');
        if (!this.container) {
            this.createToastContainer();
        }
    }

    /**
     * Create toast container element
     */
    createToastContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notificationToast';
        this.container.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300 z-50';
        this.container.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                <span id="toastMessage">Success message</span>
                <button class="ml-4 text-white hover:text-gray-200" onclick="hideToast()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (default: 5000)
     */
    show(message, type = 'success', duration = 5000) {
        try {
            Logger.info('Showing toast notification', { message, type, duration });

            const toast = {
                id: generateId(),
                message,
                type,
                duration,
                timestamp: new Date().toISOString()
            };

            this.toasts.push(toast);
            this.renderToast(toast);

            // Auto-hide toast after duration
            if (duration > 0) {
                setTimeout(() => {
                    this.hide(toast.id);
                }, duration);
            }

            return toast.id;
        } catch (error) {
            Logger.error('Failed to show toast', { error: error.message, message, type });
            console.error('Toast error:', error);
        }
    }

    /**
     * Hide toast notification
     * @param {string} toastId - Toast ID (optional, hides current if not provided)
     */
    hide(toastId = null) {
        try {
            if (toastId) {
                this.toasts = this.toasts.filter(toast => toast.id !== toastId);
            }

            if (this.container) {
                this.container.style.transform = 'translateX(100%)';
                
                // Remove from DOM after animation
                setTimeout(() => {
                    if (this.toasts.length === 0) {
                        this.container.style.display = 'none';
                    }
                }, 300);
            }

            Logger.debug('Toast hidden', { toastId });
        } catch (error) {
            Logger.error('Failed to hide toast', { error: error.message, toastId });
        }
    }

    /**
     * Render toast notification
     * @param {Object} toast - Toast object
     */
    renderToast(toast) {
        if (!this.container) return;

        // Update toast styling based on type
        const typeClasses = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const iconClasses = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        this.container.className = `fixed top-4 right-4 ${typeClasses[toast.type] || typeClasses.success} text-white p-4 rounded-lg shadow-lg transform transition-transform duration-300 z-50`;
        
        const messageElement = this.container.querySelector('#toastMessage');
        const iconElement = this.container.querySelector('i');
        
        if (messageElement) {
            messageElement.textContent = toast.message;
        }
        
        if (iconElement) {
            iconElement.className = `${iconClasses[toast.type] || iconClasses.success} mr-2`;
        }

        // Show toast
        this.container.style.display = 'block';
        this.container.style.transform = 'translateX(0)';

        // Add click handler for close button
        const closeButton = this.container.querySelector('button');
        if (closeButton) {
            closeButton.onclick = () => this.hide(toast.id);
        }
    }

    /**
     * Show success toast
     * @param {string} message - Success message
     * @param {number} duration - Duration in milliseconds
     */
    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error toast
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds
     */
    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning toast
     * @param {string} message - Warning message
     * @param {number} duration - Duration in milliseconds
     */
    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info toast
     * @param {string} message - Info message
     * @param {number} duration - Duration in milliseconds
     */
    info(message, duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// Create global toast manager instance
const toastManager = new ToastManager();

// Global toast functions for backward compatibility
function showToast(message, type = 'success', duration = 5000) {
    return toastManager.show(message, type, duration);
}

function hideToast() {
    toastManager.hide();
}

// Make globally available
window.toastManager = toastManager;
window.showToast = showToast;
window.hideToast = hideToast;
