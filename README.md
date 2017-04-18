## A gaming backlog app

### Description
This app is meant to help you if you have gathered a long backlog of games from Humble Bundle, Xbox Games With Gold, PS+ or any other way.

Project uses third party APIs

Links to APIs:
* [Steam API](https://developer.valvesoftware.com/wiki/Steam_Web_API)
* [XboxAPI](https://xboxapi.com/)
* [IGDB API](https://igdb.github.io/api/about/welcome/)


### API

    /getGames/:platform/:username

:platform = refers to the platform username is under

Takes either xbox or steam

:username = Xbox gamertag, Steam vanity name or steam user id

----

### Configuration

#### MongoDB required to run the app

#### Environment variables
Create a .env file and add following lines. Replace values in curly brackets with your own data.

````
DB_NAME={backlog}
DB_HOST={localhost}
DB_USER={username}
DB_PASS={password}
DB_PORT={27017}

STEAM_API={F99XXXXXXXXXXXXXXXXXXXXXXXXXXXXX}
XBOX_API={d87XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX}
IGDB_API={d0rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX}
````

#### Create certificates
create certificates to root directory (where server.js is located)
````
$ openssl genrsa -out ssl-key.pem 1024
$ openssl req -new -key ssl-key.pem -out certrequest.csr
$ openssl x509 -req -in certrequest.csr -signkey ssl-key.pem -out ssl-cert.pem
````

### Installation
`git clone https://github.com/elmahone/BacklogApp.git`

`cd BacklogApp`

`npm install`

`npm start`

### License
MIT