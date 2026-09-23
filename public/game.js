const socket = io();

let gameCode = null;
let gameState = null;

let selectedColor = "#9d4edd";
let waitingForContinue = false;


// =========================
// ELEMENTOS
// =========================

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

const playerNameInput =
    document.getElementById("playerName");

const gameCodeInput =
    document.getElementById("gameCode");

const createButton =
    document.getElementById("createButton");

const joinButton =
    document.getElementById("joinButton");

const rollButton =
    document.getElementById("rollButton");

const restartButton =
    document.getElementById("restartButton");

const message =
    document.getElementById("message");

const codeDisplay =
    document.getElementById("code");

const playersDisplay =
    document.getElementById("players");

const board =
    document.getElementById("board");

const turnMessage =
    document.getElementById("turnMessage");

const dice =
    document.getElementById("dice");

const colorPicker =
    document.getElementById("colorPicker");


// =========================
// SELECCIONAR COLOR
// =========================

const colorOptions =
    document.querySelectorAll(".color-option");

colorOptions.forEach((button) => {

    button.addEventListener("click", () => {

        if (button.disabled) {
            return;
        }

        selectedColor =
            button.dataset.color;

        colorOptions.forEach((option) => {
            option.classList.remove("selected");
        });

        button.classList.add("selected");

        message.textContent = "";
    });

});


// =========================
// CREAR PARTIDA
// =========================

createButton.addEventListener("click", () => {

    const playerName =
        playerNameInput.value.trim();

    if (!playerName) {
        message.textContent =
            "Escribe tu nombre primero.";
        return;
    }

    socket.emit(
        "createGame",
        playerName,
        selectedColor,
        (response) => {

            if (!response.success) {
                message.textContent =
                    "No se pudo crear la partida.";
                return;
            }

            gameCode =
                response.code;

            startScreen.classList.add(
                "hidden"
            );

            gameScreen.classList.remove(
                "hidden"
            );

            codeDisplay.textContent =
                gameCode;
        }
    );

});


// =========================
// UNIRSE A PARTIDA
// =========================

joinButton.addEventListener("click", () => {

    const playerName =
        playerNameInput.value.trim();

    const code =
        gameCodeInput.value
            .trim()
            .toUpperCase();

    if (!playerName) {
        message.textContent =
            "Escribe tu nombre primero.";
        return;
    }

    if (!code) {
        message.textContent =
            "Escribe el código de la partida.";
        return;
    }

    socket.emit(
        "joinGame",
        {
            code: code,
            playerName: playerName,
            color: selectedColor
        },
        (response) => {

            if (!response.success) {
                message.textContent =
                    response.message;
                return;
            }

            gameCode =
                code;

            startScreen.classList.add(
                "hidden"
            );

            gameScreen.classList.remove(
                "hidden"
            );

            codeDisplay.textContent =
                gameCode;
        }
    );

});


// =========================
// ACTUALIZAR PARTIDA
// =========================

socket.on("gameUpdated", (game) => {

    gameState = game;

    renderColorAvailability();
    renderPlayers();
    renderBoard();
    renderTurn();

    if (game.lastRoll) {
        dice.textContent =
            getDiceEmoji(game.lastRoll);
    }

    checkSquare();

});


// =========================
// COLORES DISPONIBLES
// =========================

function renderColorAvailability() {

    if (!gameState) {
        return;
    }

    const usedColors =
        gameState.players.map(
            player => player.color
        );

    colorOptions.forEach((button) => {

        const color =
            button.dataset.color;

        const used =
            usedColors.includes(color);

        button.disabled = used;

        if (used) {
            button.classList.add("taken");
        } else {
            button.classList.remove("taken");
        }

        if (
            color === selectedColor &&
            !used
        ) {
            button.classList.add(
                "selected"
            );
        }

    });

}


// =========================
// JUGADORES
// =========================

function renderPlayers() {

    playersDisplay.innerHTML = "";

    gameState.players.forEach(
        (player, index) => {

            const element =
                document.createElement("div");

            element.className =
                "player";

            element.style.border =
                `3px solid ${player.color}`;

            if (
                index ===
                gameState.currentPlayer
            ) {
                element.textContent =
                    "🎯 " + player.name;
            } else {
                element.textContent =
                    player.name;
            }

            playersDisplay.appendChild(
                element
            );

        }
    );

}


// =========================
// TABLERO
// =========================

function renderBoard() {

    board.innerHTML = "";

    const totalCells = 52;

    for (
        let i = 1;
        i <= totalCells;
        i++
    ) {

        const cell =
            document.createElement("div");

        cell.className =
            "cell";

        if (i === 1) {
            cell.classList.add(
                "start"
            );
        }

        if (i === 52) {
            cell.classList.add(
                "finish"
            );
        }

        cell.textContent =
            i;

        gameState.players.forEach(
            (player) => {

                const position =
                    gameState.positions[
                        player.id
                    ];

                if (position === i) {

                    const piece =
                        document.createElement(
                            "span"
                        );

                    piece.className =
                        "player-piece";

                    piece.style.color =
                        player.color;

                    piece.textContent =
                        "●";

                    piece.title =
                        player.name;

                    cell.appendChild(
                        piece
                    );
                }

            }
        );

        board.appendChild(
            cell
        );

    }

}


// =========================
// TURNO
// =========================

function renderTurn() {

    if (gameState.finished) {
	    turnMessage.textContent =
	        "🏆 ¡Ha ganado " + gameState.winner + "!";
	
	    rollButton.disabled = true;
	    restartButton.classList.remove("hidden");
	
	    return;
	}
	
	restartButton.classList.add("hidden");

    const currentPlayer =
        gameState.players[
            gameState.currentPlayer
        ];

    if (!currentPlayer) {
        turnMessage.textContent =
            "";
        return;
    }

    if (
        currentPlayer.id ===
        socket.id
    ) {

        if (!waitingForContinue) {

            turnMessage.textContent =
                "🎯 ¡Es tu turno!";

            rollButton.disabled =
                false;
        }

    } else {

        turnMessage.textContent =
            "Turno de " +
            currentPlayer.name;

        rollButton.disabled =
            true;
    }

}


// =========================
// COMPROBAR CASILLA
// =========================

function checkSquare() {
    if (!gameState || gameState.finished) return;

    const currentPlayer =
        gameState.players[gameState.currentPlayer];

    if (!currentPlayer) return;

    if (
        gameState.pendingAction &&
        gameState.pendingPlayerId === socket.id
    ) {
        if (!waitingForContinue) {
            waitingForContinue = true;

            if (gameState.skipMessage) {
                showSkipTurn();
            } else {
                showSquare(gameState.positions[socket.id]);
            }
        }
    } else {
        waitingForContinue = false;
    }
}

function showSkipTurn() {
    if (document.getElementById("squareModal")) return;

    const modal = document.createElement("div");
    modal.id = "squareModal";
    modal.className = "modal";

    const content = document.createElement("div");
    content.className = "modal-content";

    const title = document.createElement("h2");
    title.textContent = "Turno saltado";

    const text = document.createElement("p");
    text.textContent = "Tu turno ha sido saltado";

    const button = document.createElement("button");
    button.textContent = "CONTINUAR";

    button.addEventListener("click", () => {
        button.disabled = true;
        modal.remove();

        waitingForContinue = false;

        socket.emit("continueSquare", gameCode);
    });

    content.appendChild(title);
    content.appendChild(text);
    content.appendChild(button);

    modal.appendChild(content);
    document.body.appendChild(modal);
}

// =========================
// MOSTRAR CASILLA
// =========================

function showSquare(position) {

    if (
        document.getElementById(
            "squareModal"
        )
    ) {
        return;
    }

    const modal =
        document.createElement("div");

    modal.id =
        "squareModal";

    modal.className =
        "modal";

    const content =
        document.createElement("div");

    content.className =
        "modal-content";

    const title =
        document.createElement("h2");

    title.textContent =
        "Casilla " + position;

    const text =
        document.createElement("p");

    text.textContent =
        getSquareText(position);

    const button =
        document.createElement("button");

    button.textContent =
        "CONTINUAR";

    button.addEventListener(
        "click",
        () => {

            button.disabled =
                true;

            // Eliminar la ventana
            // inmediatamente.
            modal.remove();

            waitingForContinue =
                false;

            socket.emit(
                "continueSquare",
                gameCode
            );

        }
    );

    content.appendChild(
        title
    );

    content.appendChild(
        text
    );

    content.appendChild(
        button
    );

    modal.appendChild(
        content
    );

    document.body.appendChild(
        modal
    );

}


// =========================
// TEXTOS DE LAS CASILLAS
// =========================

function getSquareText(position) {
    const square = gameState.squares.find(
        square => square.number === position
    );

    return square ? square.text : "Insertar texto";
}

// =========================
// TIRAR DADO
// =========================

rollButton.addEventListener(
    "click",
    () => {

        if (!gameCode) {
            return;
        }

        if (waitingForContinue) {
            return;
        }

        socket.emit(
            "rollDice",
            gameCode
        );

    }
);


// =========================
// DADO
// =========================

function getDiceEmoji(number) {

    const diceFaces = [
        "⚀",
        "⚁",
        "⚂",
        "⚃",
        "⚄",
        "⚅"
    ];

    return diceFaces[
        number - 1
    ];

}

restartButton.addEventListener("click", () => {
    location.reload();
});