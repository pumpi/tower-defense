class Modal {
    constructor() {
        this.modalElement = null;
        this.titleElement = null;
        this.contentElement = null;
        this.closeButton = null;
        this.isOpen = false;

        this.init();
    }

    init() {
        // Get modal elements from DOM
        this.modalElement = document.querySelector('.modal');
        this.titleElement = this.modalElement?.querySelector('.modal-title');
        this.contentElement = this.modalElement?.querySelector('.modal-content');
        this.closeButton = this.modalElement?.querySelector('.modal-close');

        if (!this.modalElement) {
            console.error('Modal element not found in DOM');
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
        if (!event.target.closest('.modal')) {
            event.stopPropagation();
            this.close();
        }
    }

    open(title, content) {
        if (!this.modalElement) return;

        // If already open, don't reopen
        if (this.isOpen) {
            return;
        }

        this.setTitle(title);
        this.setContent(content);

        this.modalElement.classList.add('is--open');
        this.isOpen = true;

        // Add click outside listener on next tick to avoid immediate close
        requestAnimationFrame(() => {
            document.addEventListener('click', this.handleOutsideClick);
        });
    }

    close() {
        if (!this.modalElement) return;

        this.modalElement.classList.remove('is--open');
        this.isOpen = false;

        // Remove click outside listener
        document.removeEventListener('click', this.handleOutsideClick);

        // Clear content when closing
        this.setContent('');
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