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
    animation: 50, // ms, animation speed moving items when sorting, `0` — without animation
    onStart: (evt) => {
        const item = evt.item.id; // the current dragged HTMLElement
        // console.log($('#' + item).index());
    },
    onUpdate: (evt) => {
        const item = evt.item.id; // the current dragged HTMLElement
        // console.log($('#' + item).index());
    },
    onEnd: (evt) => {
        const item = evt.item.id; // the current dragged HTMLElement
        // console.log($('#' + item).index());
        const newOrder = getListOrder();
        console.log(newOrder);
        const req = new Request('/saveNewOrder');
        fetch(req, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({userId: userId, newOrder: newOrder})
        }).then((resp) => {
            console.log('ok');
        });
    }
});
