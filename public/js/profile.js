'use strict';

const userId = document.getElementById('user-id').value;
const steamUserBlock = document.getElementById('steam-user-block');
const importSteamWrap = document.getElementById('import-steam-button');
const importXboxWrap = document.getElementById('import-xbox-button');
const xboxUserBlock = document.getElementById('xbox-user-block');
const steamUserField = document.getElementById('steam-user');
const saveSteamUserBtn = document.getElementById('save-steamuser');
const xboxUserField = document.getElementById('xbox-user');
const saveXboxUserBtn = document.getElementById('save-xboxuser');

// Save steam username to database
saveSteamUserBtn.addEventListener('click', () => {
    if (!saveSteamUserBtn.hasAttribute('disabled')) {
        const username = steamUserField.value;
        const originalHTML = saveSteamUserBtn.innerHTML;
        saveSteamUserBtn.setAttribute('disabled', 'disabled');
        saveSteamUserBtn.innerHTML = '<div id="spinner" class="spinner"></div>';
        validateUsername('steam', username, (res, err) => {
            saveSteamUserBtn.innerHTML = originalHTML;
            saveSteamUserBtn.removeAttribute('disabled');
            if (err) {
                steamUserField.className += ' failed';
                alert(err);
            } else {
                steamUserField.classList.remove('failed');
                const userInfo = {id: res, name: username};
                // If username is OK save it to database
                saveUsername('steam', userInfo, () => {
                    if (!document.getElementById('import-xbox')) {
                        importSteamWrap.innerHTML = '<a id="import-steam">Import Steam library</a>';
                        // initImportListeners();
                    }
                })
            }
        });
    }
});

saveXboxUserBtn.addEventListener('click', () => {
    if (!saveXboxUserBtn.hasAttribute('disabled')) {
        const username = xboxUserField.value;
        const originalHTML = saveXboxUserBtn.innerHTML;
        saveXboxUserBtn.setAttribute('disabled', 'disabled');
        saveXboxUserBtn.innerHTML = '<div id="spinner" class="spinner"></div>';
        validateUsername('xbox', username, (res, err) => {
            saveXboxUserBtn.innerHTML = originalHTML;
            saveXboxUserBtn.removeAttribute('disabled');
            if (err) {
                xboxUserField.className += ' failed';
                alert(err);
            } else {
                console.log(res);
                xboxUserField.classList.remove('failed');
                const userInfo = {id: res, name: username};
                // If username is OK save it to database
                saveUsername('xbox', userInfo, () => {
                    if (!document.getElementById('import-xbox')) {
                        importXboxWrap.innerHTML = '<a id="import-xbox">Import Xbox library</a>';
                        // initImportListeners();
                    }
                })
            }
        });
    }
});

const validateUsername = (platform, username, cb) => {
    const req = new Request(`/validateUsername/${platform}/${username}`);
    fetch(req).then((res) => {
        console.log(res);
        if (!res.ok) {
            console.log('err');
        } else {
            res.json().then((json) => {
                console.log(json);
                if (json.success === false) {
                    cb(null, json.message);
                } else {
                    cb(json, null);
                }
            })
        }
    });
};

const saveUsername = (platform, userInfo, cb) => {
    const req = new Request(`/savePlatformUsername`);
    fetch(req, {
        method: 'PATCH',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId: userId, platform: platform, userInfo: userInfo}),
    }).then((res) => {
        if (!res.ok) {
            console.log('err');
        } else {
            cb();
        }
    })
};

// const initImportListeners = () => {
if (document.getElementById('import-xbox')) {
    const importXbox = document.getElementById('import-xbox');
    importXbox.addEventListener('click', () => {
        importXboxWrap.innerHTML = `
                <div class="loading">
                <b>Importing Xbox library. Please Wait</b>
                <br>
                <div class="loading__item1"></div>
                <div class="loading__item2"></div>
                <div class="loading__item3"></div>
                <div class="loading__item4"></div>
                </div>`;
        const request = new Request(`/importGames/xbox/${xboxUserField.value}/${userId}`);
        fetch(request).then((res) => {
            if (!res.ok) {
                console.log('err');
            } else {
                importXboxWrap.innerHTML = '<a id="import-xbox">Import Xbox library</a>';
            }
        })
    });
}
if (document.getElementById('import-steam')) {
    const importSteam = document.getElementById('import-steam');
    importSteam.addEventListener('click', () => {
        importSteam.className = 'hide';
        importSteamWrap.innerHTML = `
                <div class="loading">
                <b>Importing Steam library. Please Wait</b>
                <br>
                <div class="loading__item1"></div>
                <div class="loading__item2"></div>
                <div class="loading__item3"></div>
                <div class="loading__item4"></div>
                </div>`;
        const request = new Request(`/importGames/steam/${steamUserField.value}/${userId}`);
        fetch(request).then((res) => {
            if (!res.ok) {
                console.log('err');
            } else {
                importSteamWrap.innerHTML = '<a id="import-steam">Import Steam library</a>';
            }
        })
    });
}

const addToBacklogBtns = document.getElementsByClassName('backlog-add');
const addToBacklog = (e) => {
    const game = JSON.parse(e.target.parentNode.dataset.game);
    const platform = e.target.parentNode.dataset.platform;
    e.target.setAttribute('disabled', 'disabled');
    console.log(game.id);
    // $('#all-' + game.id).fadeOut();
    // $('#xbox-' + game.id).fadeOut();
    // $('#steam-' + game.id).fadeOut();
    // $('#other-' + game.id).fadeOut();
    const req = new Request('/addToBacklog');
    fetch(req, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({userId: userId, game: JSON.stringify(game), platform: platform}),
    }).then((res) => {
        if (!res.ok) {
            console.log('err');
            e.target.removeAttribute('disabled');
        } else {
            console.log(res);
            console.log(e.target.parentNode.id);
            $('#all-' + game.id).fadeOut();
            $('#xbox-' + game.id).fadeOut();
            $('#steam-' + game.id).fadeOut();
            $('#other-' + game.id).fadeOut();
        }

    })
};
for (const btn of addToBacklogBtns) {
    btn.addEventListener('click', addToBacklog);
}
