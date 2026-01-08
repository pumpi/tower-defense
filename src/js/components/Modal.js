class Modal {
    constructor(game = null) {
        this.game = game;
        this.containerElement = null;
        this.modalElement = null;
        this.titleElement = null;
        this.contentElement = null;
        this.closeButton = null;
        this.isOpen = false;
        this.cleanupCallbacks = [];

        this.init();
    }

    init() {
        // Get modal elements from DOM
        this.containerElement = document.querySelector('.modal');
        this.modalElement = this.containerElement?.querySelector('.modal-content');
        this.titleElement = this.modalElement?.querySelector('.modal-title');
        this.contentElement = this.modalElement?.querySelector('.modal-body');
        this.closeButton = this.modalElement?.querySelector('.modal-close');

        if (!this.containerElement || !this.modalElement) {
            console.error('Modal elements not found in DOM');
            return;
        }

        // Add close button listener
        this.closeButton?.addEventListener('click', () => this.close());

        // Close on ESC key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Bind the outside click handler so we can add/remove it
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
    }

    handleOutsideClick(event) {
        if (!event.target.closest('.modal-content')) {
            event.stopPropagation();
            this.close();
        }
    }

    open(title, content) {
        if (!this.containerElement) return;

        // If already open, don't reopen
        if (this.isOpen) {
            return;
        }

        this.setTitle(title);
        this.setContent(content);

        // Prevent body scroll and compensate for scrollbar width
        this.preventBodyScroll();

        this.containerElement.classList.add('is--open');
        this.isOpen = true;

        // Add click outside listener on next tick to avoid immediate close
        requestAnimationFrame(() => {
            document.addEventListener('click', this.handleOutsideClick);
        });

        // Auto-setup coin-based buttons if game instance available
        if (this.game) {
            this.setupCoinBasedButtons();
        }
    }

    setupCoinBasedButtons() {
        // Find all buttons with data-required-coins attribute
        const buttons = this.contentElement?.querySelectorAll('[data-required-coins]');
        if (!buttons || buttons.length === 0) return;

        // Function to update button states
        const updateButtons = () => {
            const currentCoins = this.game.stat('coins');
            buttons.forEach(button => {
                const requiredCoins = parseInt(button.getAttribute('data-required-coins'), 10);
                button.disabled = currentCoins < requiredCoins;

                // Update parent disabled class if specified via data-disable-parent
                const parentSelector = button.getAttribute('data-disable-parent');
                if (parentSelector) {
                    const parent = button.closest(parentSelector);
                    if (parent) {
                        if (currentCoins < requiredCoins) {
                            parent.classList.add('disabled');
                        } else {
                            parent.classList.remove('disabled');
                        }
                    }
                }
            });
        };

        // Initial update
        updateButtons();

        // Listen to coin changes
        this.game.on('stat:coins', updateButtons);

        // Cleanup on modal close
        this.onClose(() => {
            this.game.off('stat:coins', updateButtons);
        });
    }

    preventBodyScroll() {
        // Measure scrollbar width before hiding it
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        // Add padding to compensate for scrollbar removal
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        // Prevent scrolling
        document.body.style.overflow = 'hidden';
    }

    restoreBodyScroll() {
        // Remove overflow and padding
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }

    close() {
        if (!this.containerElement) return;

        this.containerElement.classList.remove('is--open');
        this.isOpen = false;

        // Restore body scrolling
        this.restoreBodyScroll();

        // Remove click outside listener
        document.removeEventListener('click', this.handleOutsideClick);

        // Execute cleanup callbacks
        this.cleanupCallbacks.forEach(callback => callback());
        this.cleanupCallbacks = [];

        // Clear content when closing
        this.setContent('');
    }

    onClose(callback) {
        if (typeof callback === 'function') {
            this.cleanupCallbacks.push(callback);
        }
    }

    setTitle(title) {
        if (this.titleElement) {
            this.titleElement.innerHTML = title;
        }
    }

    setContent(content) {
        if (this.contentElement) {
            if (typeof content === 'string') {
                this.contentElement.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                this.contentElement.innerHTML = '';
                this.contentElement.appendChild(content);
            }
        }
    }
}

export default Modal;