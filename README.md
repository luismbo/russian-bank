# Russian Bank [![Node.js CI](https://github.com/RheaMars/russian-bank/actions/workflows/node.js.yml/badge.svg)](https://github.com/RheaMars/russian-bank/actions/workflows/node.js.yml) [![Deploy to GitHub Pages](https://github.com/RheaMars/russian-bank/actions/workflows/pages.yml/badge.svg)](https://github.com/RheaMars/russian-bank/actions/workflows/pages.yml)

A solitaire card playing game for one player, based on the version available at [https://zankpatience.net](https://zankpatience.net).

The game is fully playable on mobile devices: the playing field is scaled automatically to fit the current viewport and all options are available through a menu that is opened with the button in the top right corner.

See [docs/development-notes.md](docs/development-notes.md) for an overview of the project structure and a record of the mobile-support and GitHub Pages changes.

## Play online (GitHub Pages)
The game is deployed automatically to GitHub Pages on every push to the `main` branch (see `.github/workflows/pages.yml`).

To enable it once for a repository:
1. Go to **Settings → Pages** of the repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the "Deploy to GitHub Pages" workflow manually from the **Actions** tab).

The game will then be available at `https://<owner>.github.io/<repository>/`.

## Prerequisites and Setup
There are 2 ways to setup with different prerequisites, easiest way should be docker:

### Docker
- Install docker for your OS [Docker](https://www.docker.com/)

(the names `russianbank` and `russianbank-demo` are just examples and free to choose)

1. Checkout the repository
2. Create image `russianbank`:
```
# docker build -t russianbank .
```
3. Create and run container `russianbank-demo`:
```
# docker run --name russianbank-demo -p 8080:80 -d russianbank
```
4. Call [http://127.0.0.1:8080/app/pages/game.html](http://127.0.0.1:8080/app/pages/game.html)) 
5. Have fun playing the game

### Development environment
- [Node.js](https://nodejs.org/en/)
- A JS package manager (e.g. [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/))
- [Webpack](https://webpack.js.org/)
- Any webserver (e.g. Apache or NGINX)

1. Checkout the repository
2. Install the external JS libraries listed in the `package.json` file, e.g. by running 
```
# npm install
```
3. Run 
```
# npm run build
```
to generate the bundeled JS file in the `app/js/dist` directory

   On Node.js 17 or newer the old webpack version used by this project needs an additional flag:
```
# NODE_OPTIONS=--openssl-legacy-provider npm run build
```

4. Call the `index.html` file in the browser of your choice
5. Have fun playing with the code and the game
