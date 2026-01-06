class Modal {
    constructor() {
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