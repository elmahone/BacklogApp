'use strict';
const userId = document.getElementById('user-id') ? document.getElementById('user-id').value : null;
const gameId = document.getElementById('game-id').value;
const gameName = document.getElementById('game-name').value;
const gameScore = document.getElementById('review-score').value;
const gameTime = document.getElementById('play-time').value;

const addToBacklogBtn = document.getElementById('add-to-backlog');
const addToBacklog = (e) => {
    const req = new Request('/game/addToBacklog');
    fetch(req, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userId,
            gameId: gameId,
            name: gameName,
            playTime: gameTime,
            reviewScore: gameScore
        }),
    }).then((res) => {
        if (!res.ok) {
            console.log('err');
        } else {
            console.log('OK');
        }
    });
};
const addToLibraryBtn = document.getElementById('add-to-library');
const addToLibrary = (e) => {
    const req = new Request('/game/addToLibrary');
    fetch(req, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userId,
            gameId: gameId,
            name: gameName,
            playTime: gameTime,
            reviewScore: gameScore
        }),
    }).then((res) => {
        if (!res.ok) {
            console.log('err');
        } else {
            console.log('OK');
        }
    });
};
if (addToBacklogBtn) {
    addToBacklogBtn.addEventListener('click', addToBacklog);
}
if (addToLibraryBtn) {
    addToLibraryBtn.addEventListener('click', addToLibrary);
}
