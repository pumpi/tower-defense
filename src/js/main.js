import game from './game';

document.addEventListener("DOMContentLoaded", function() {
    game.init();

    document.addEventListener('click', function (event) {
        if (!event.target.matches('#buy-tower')) return;
        event.preventDefault();
        game.buyTower();

    }, false);

    document.addEventListener('click', function (event) {
        if (!event.target.matches('#next-wave')) return;
        event.preventDefault();
        game.nextWave();

    }, false);

    document.addEventListener('click', function (event) {
        if (!event.target.matches('.modal-close')) return;
        event.preventDefault();
        document.querySelector('.modal-options').classList.remove('is--open');

    }, false);
});


