/**
 * Modal Component for SuperMall Web Application
 * Handles modal dialogs and overlays
 */
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.activeModal = null;
        this.init();
    }

    /**
     * Initialize modal manager
     */
    init() {
        // Add event listeners
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.hide(this.activeModal);
            }
        });

        // Handle backdrop clicks
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                const modalId = e.target.querySelector('[data-modal-id]')?.dataset.modalId;
                if (modalId) {
                    this.hide(modalId);
                }
            }
        });

        Logger.debug('Modal manager initialized');
    }

    /**
     * Create a new modal
     * @param {string} modalId - Unique modal identifier
     * @param {Object} options - Modal configuration options
     * @returns {HTMLElement} Modal element
     */
    create(modalId, options = {}) {
        try {
            Logger.info('Creating modal', { modalId, options });

            const defaultOptions = {
                title: 'Modal',
                content: '',
                size: 'medium', // small, medium, large, full
                closable: true,
                backdrop: true,
                keyboard: true,
                animation: 'fade',
                className: ''
            };

            const config = { ...defaultOptions, ...options };
            
            // Create modal HTML
            const modalHTML = this.generateModalHTML(modalId, config);
            
            // Add to DOM
            const container = document.getElementById('modalContainer') || document.body;
            container.insertAdjacentHTML('beforeend', modalHTML);
            
            const modalElement = document.getElementById(modalId);
            
            // Store modal configuration
            this.modals.set(modalId, {
                element: modalElement,
                config: config
            });

            // Add event listeners
            this.addModalEventListeners(modalId);

            Logger.debug('Modal created successfully', { modalId });
            return modalElement;
        } catch (error) {
            Logger.error('Failed to create modal', { error: error.message, modalId, options });
            throw error;
        }
    }

    /**
     * Generate modal HTML
     * @param {string} modalId - Modal ID
     * @param {Object} config - Modal configuration
     * @returns {string} Modal HTML
     */
    generateModalHTML(modalId, config) {
        const sizeClasses = {
            small: 'max-w-sm',
            medium: 'max-w-md',
            large: 'max-w-lg',
            xlarge: 'max-w-xl',
            full: 'max-w-full mx-4'
        };

                return `
            <div id="${modalId}" class="fixed inset-0 modal-backdrop flex items-center justify-center z-40 hidden" data-modal-id="${modalId}">
                <div class="bg-white rounded-lg shadow-xl ${sizeClasses[config.size]} w-full mx-4 max-h-screen overflow-y-auto ${config.className}">
                    ${config.closable ? `
                        <div class="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 class="text-xl font-bold text-gray-800">${config.title}</h2>
                            <button type="button" class="modal-close text-gray-400 hover:text-gray-600 text-2xl" data-modal-id="${modalId}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    ` : `
                        <div class="p-6 border-b border-gray-200">
                            <h2 class="text-xl font-bold text-gray-800">${config.title}</h2>
                        </div>
                    `}
                    <div class="modal-content p-6">
                        ${config.content}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Add event listeners to modal
     * @param {string} modalId - Modal ID
     */
    addModalEventListeners(modalId) {
        const modal = this.modals.get(modalId);
        if (!modal) return;

        // Close button
        const closeButton = modal.element.querySelector('.modal-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                this.hide(modalId);
            });
        }

        // Form submission handling
        const forms = modal.element.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e, modalId);
            });
        });
    }

    /**
     * Show modal
     * @param {string} modalId - Modal ID
     * @param {Object} data - Data to pass to modal
     */
    show(modalId, data = {}) {
        try {
            Logger.info('Showing modal', { modalId, data });
            Logger.userAction('modal_show', { modalId });

            const modal = this.modals.get(modalId);
            if (!modal) {
                throw new Error(`Modal ${modalId} not found`);
            }

            // Hide current active modal if any
            if (this.activeModal && this.activeModal !== modalId) {
                this.hide(this.activeModal);
            }

            // Update modal content with data if provided
            if (Object.keys(data).length > 0) {
                this.updateModalContent(modalId, data);
            }

            // Show modal
            modal.element.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            
            // Add fade-in animation
            setTimeout(() => {
                modal.element.classList.add('fade-in');
            }, 10);

            this.activeModal = modalId;

            // Trigger custom event
            const event = new CustomEvent('modalShow', { 
                detail: { modalId, data } 
            });
            document.dispatchEvent(event);

            Logger.debug('Modal shown successfully', { modalId });
        } catch (error) {
            Logger.error('Failed to show modal', { error: error.message, modalId });
            throw error;
        }
    }

    /**
     * Hide modal
     * @param {string} modalId - Modal ID
     */
    hide(modalId) {
        try {
            Logger.info('Hiding modal', { modalId });
            Logger.userAction('modal_hide', { modalId });

            const modal = this.modals.get(modalId);
            if (!modal) {
                Logger.warn(`Modal ${modalId} not found`);
                return;
            }

            // Hide modal
            modal.element.classList.add('hidden');
            modal.element.classList.remove('fade-in');
            document.body.style.overflow = 'auto';

            if (this.activeModal === modalId) {
                this.activeModal = null;
            }

            // Trigger custom event
            const event = new CustomEvent('modalHide', { 
                detail: { modalId } 
            });
            document.dispatchEvent(event);

            Logger.debug('Modal hidden successfully', { modalId });
        } catch (error) {
            Logger.error('Failed to hide modal', { error: error.message, modalId });
        }
    }

    /**
     * Update modal content
     * @param {string} modalId - Modal ID
     * @param {Object} data - Data to update
     */
    updateModalContent(modalId, data) {
        const modal = this.modals.get(modalId);
        if (!modal) return;

        const contentElement = modal.element.querySelector('.modal-content');
        if (!contentElement) return;

        // Update form fields if data provided
        Object.keys(data).forEach(key => {
            const field = contentElement.querySelector(`[name="${key}"], #${key}`);
            if (field) {
                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = data[key];
                } else {
                    field.value = data[key];
                }
            }
        });
    }

    /**
     * Handle form submission in modal
     * @param {Event} event - Form submit event
     * @param {string} modalId - Modal ID
     */
    handleFormSubmit(event, modalId) {
        Logger.info('Modal form submitted', { modalId });
        Logger.userAction('modal_form_submit', { modalId });

        // Trigger custom event for form handling
        const customEvent = new CustomEvent('modalFormSubmit', {
            detail: { 
                modalId, 
                form: event.target,
                originalEvent: event
            }
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Destroy modal
     * @param {string} modalId - Modal ID
     */
    destroy(modalId) {
        try {
            Logger.info('Destroying modal', { modalId });

            const modal = this.modals.get(modalId);
            if (!modal) {
                Logger.warn(`Modal ${modalId} not found`);
                return;
            }

            // Hide modal first
            this.hide(modalId);

            // Remove from DOM
            modal.element.remove();

            // Remove from registry
            this.modals.delete(modalId);

            Logger.debug('Modal destroyed successfully', { modalId });
        } catch (error) {
            Logger.error('Failed to destroy modal', { error: error.message, modalId });
        }
    }

    /**
     * Check if modal is active
     * @param {string} modalId - Modal ID
     * @returns {boolean} True if modal is active
     */
    isActive(modalId) {
        return this.activeModal === modalId;
    }

    /**
     * Get active modal ID
     * @returns {string|null} Active modal ID
     */
    getActiveModal() {
        return this.activeModal;
    }

    /**
     * Close all modals
     */
    closeAll() {
        this.modals.forEach((modal, modalId) => {
            this.hide(modalId);
        });
        Logger.debug('All modals closed');
    }
}

// Create global modal manager instance
const modalManager = new ModalManager();

// Global modal functions for backward compatibility
function showModal(modalId, data = {}) {
    return modalManager.show(modalId, data);
}

function closeModal(modalId) {
    modalManager.hide(modalId);
}

function createModal(modalId, options = {}) {
    return modalManager.create(modalId, options);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModalManager, modalManager, showModal, closeModal, createModal };
}
