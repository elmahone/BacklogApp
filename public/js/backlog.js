'use strict';
const userId = document.getElementById('user-id').value;

const patchNewOrder = (newOrder) => {
    const req = new Request('/backlog/saveNewOrder');
    fetch(req, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId: userId, newOrder: newOrder})
    });
};

const getListOrder = () => {
    const backlogGames = list.childNodes;
    let idOrder = [];
    for (const game of backlogGames) {
        if (typeof game.id !== 'undefined' && game.classList.contains('game')) {
            idOrder.push(game.id);
        }
    }
    return idOrder;
};

const moveBackButton = document.getElementById('move-back');
const moveBackToBacklog = () => {
    let listOrder = getListOrder();
    listOrder.push(listOrder.shift());
    patchNewOrder(listOrder);
    location.reload();
};
moveBackButton.addEventListener('click', moveBackToBacklog);

const removeButtons = document.getElementsByClassName('remove-game');
const removeFromBacklog = (e) => {
    const game = e.target.parentNode.parentNode.parentNode.id;
    const platform = e.target.parentNode.parentNode.parentNode.dataset.platform;
    const req = new Request('/backlog/remove');
    fetch(req, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId: userId, gameId: game, platform: platform})
    });
    $('#' + game).fadeOut();
};
for (const btn of removeButtons) {
    btn.addEventListener('click', removeFromBacklog);
}

const playNowButtons = document.getElementsByClassName('play-now');
const moveToFirstOfBacklog = (e) => {
    const game = e.target.parentNode.parentNode.parentNode.id;
    let listOrder = getListOrder();
    listOrder.push(listOrder.shift());
    listOrder.sort((a, b) => {
        return a === game ? -1 : b === game ? 1 : 0;
    });
    patchNewOrder(listOrder);
    location.reload();
};

for (const btn of playNowButtons) {
    btn.addEventListener('click', moveToFirstOfBacklog);
}

const list = document.getElementById('backlog-list');
Sortable.create(list, {
    animation: 100,
    draggable: '.movable',
    onEnd: (evt) => {
        const newOrder = getListOrder();
        patchNewOrder(newOrder);
        if (evt.item.classList.contains('first')) {
            location.reload();
        }
    }
});
