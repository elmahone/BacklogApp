'use strict';
// Welcome page slide elements
const slide1 = document.getElementById('slide1');
const slide2 = document.getElementById('slide2');
const slide3 = document.getElementById('slide3');

// User authentication forms
const signupForm = document.getElementById('signup-form');
const loginForm = document.getElementById('login-form');

// Sign up form password elements
const signupPassword = document.getElementById('signup-password');
const confirmPassword = document.getElementById('confirm-password');

const submitSignup = document.getElementById('submit-signup');
const submitLogin = document.getElementById('submit-login');

signupForm.addEventListener('submit', () => {
    submitSignup.setAttribute('disabled', 'disabled');
});
loginForm.addEventListener('submit', () => {
    submitLogin.setAttribute('disabled', 'disabled');
});



// Checks if confirm password and password values are same
const validatePassword = () => {
    if (signupPassword.value !== confirmPassword.value) {
        confirmPassword.setCustomValidity('Password does not match');
    } else {
        confirmPassword.setCustomValidity('');
    }
};
// Validate password while typing passwords
signupPassword.onchange = validatePassword;
confirmPassword.onkeyup = validatePassword;



/*
 let library = [
 {
 'id': 0,
 'title': 'Game 1',
 'time': 21.5,
 'rating': 78
 }, {
 'id': 1,
 'title': 'Game 2',
 'time': 11.2,
 'rating': 87
 }, {
 'id': 2,
 'title': 'Game 3',
 'time': 15.0,
 'rating': 81
 }, {
 'id': 3,
 'title': 'Game 4',
 'time': 45.0,
 'rating': 89
 }
 ];

 let myList = [
 {
 'id': 3,
 'title': 'Game 4',
 'time': 45.0,
 'rating': 89
 }
 ];

 const getGameIdList = (list) => {
 let listGames = [];

 for (let game of list) {
 listGames.push(game.id);
 }
 return listGames;
 };

 const getGamesNotInList = () => {
 const libraryIds = getGameIdList(library);
 const gameListIds = getGameIdList(myList);
 let list = [];
 for (let i = 0; i < libraryIds.length; i++) {
 if (!gameListIds.includes(libraryIds[i])) {
 list.push(libraryIds[i]);
 }
 }
 return list;
 };

 const printGameToList = (game) => {
 const list = document.querySelector('#myList');
 let html = list.innerHTML;
 html += `<article id="${game.id}">
 <h3>${game.title}</h3>
 <button class="button alert remove">Remove</button>
 </article>`;
 list.innerHTML = html;
 };
 const printGameToLibrary = (game) => {
 const list = document.querySelector('#games');
 let html = list.innerHTML;
 html += `<article id="${game.id}">
 <h3>${game.title}</h3>
 <button class="button success add">Add</button>
 </article>`;
 list.innerHTML = html;
 };

 const renderList = () => {
 const list = document.querySelector('#myList');
 const time = document.querySelector('#time');
 list.innerHTML = '';
 const listGames = getGameIdList(myList);
 for (let i = 0; i < listGames.length; i++) {
 printGameToList(library[listGames[i]]);
 }

 time.textContent = countLength();
 $('.remove').on('click', (e) => {
 const id = $(e.target).parent().attr('id');
 myList.pop(id);

 renderList();
 renderLibrary();

 });
 };

 const countLength = () => {
 let sum = 0;
 for (let game of myList) {
 sum += game.time;
 }
 return sum;
 };

 const renderLibrary = () => {
 const list = document.querySelector('#games');
 list.innerHTML = '';
 const listGames = getGamesNotInList();
 for (let i = 0; i < listGames.length; i++) {
 printGameToLibrary(library[listGames[i]]);
 }

 $('.add').on('click', (e) => {
 const id = $(e.target).parent().attr('id');
 myList.push(library[id]);

 renderList();
 renderLibrary();

 });
 };

 renderList();
 renderLibrary();
 */
