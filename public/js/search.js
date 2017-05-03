'use strict';
const searchResultsContainer = document.getElementById('search-results');
const searchTitle = document.getElementById('search-title');
const search = (e) => {
    e.preventDefault();
    const title = searchTitle.value;
    const req = new Request('/search/games/' + title);
    fetch(req).then((res) => {
        if (!res.ok) {
            console.log('err');
        } else {
            res.json().then((games) => {
                console.log(games);
                displaySearchResults(games);
            });
        }
    });
};
const form = document.getElementById('search-form');
form.addEventListener('submit', search);

const displaySearchResults = (results) => {
    searchResultsContainer.innerHTML = '';
    let htmlStr = searchResultsContainer.innerHTML;
    htmlStr += `<b>${results.length} results for: ${searchTitle.value} </b>`;
    for (const result of results) {
        htmlStr +=
            `<div id="${result.id}" class="search-result">
                <img src="https:${result.cover.url}">
                <h4>${result.name}</h4><b>(${moment(result.first_release_date).format('YYYY')})</b>
                <a href="search/${result.id}">Game Details</a>
            </div><hr>`;
    }
    searchResultsContainer.innerHTML = htmlStr;
};