'use strict';

const userId = document.getElementById('user-id').value;
const getListOrder = () => {
    const backlogGames = list.childNodes;
    let idOrder = [];
    for (const game of backlogGames) {
        if (typeof game.id !== 'undefined') {
            idOrder.push(game.id);
        }
    }
    return idOrder;
};

const list = document.getElementById('backlog-list');
Sortable.create(list, {
    animation: 50,
    onEnd: (evt) => {
        const newOrder = getListOrder();
        const req = new Request('/backlog/saveNewOrder');
        fetch(req, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({userId: userId, newOrder: newOrder})
        });
    }
});
