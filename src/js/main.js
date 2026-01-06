import Game from './game.js';
import TomSelect from 'tom-select';
import 'tom-select/dist/css/tom-select.css';

// Make TomSelect globally available
window.TomSelect = TomSelect;

document.addEventListener("DOMContentLoaded", () => {
    new Game();
});
