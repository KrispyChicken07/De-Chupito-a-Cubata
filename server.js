const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const games = {};

const playerColors = [
    "#9d4edd",
    "#4895ef",
    "#43aa8b",
    "#f8961e",
    "#f94144",
    "#f72585",
    "#f9c74f",
    "#4cc9f0"
];

const squares = [
    { number: 1, text: "Elige a alguien para que se tome un chupito" },
    { number: 2, text: "Yo nunca nunca" },
    { number: 3, text: "Bebe agua" },
    { number: 4, text: "Pégale a alguien en el cachete" },
    { number: 5, text: "Avanza dos casillas", action: "move", amount: 2 },
    { number: 6, text: "¡Dos chupitos!" },
    { number: 7, text: "Bebe el más bajito" },
    { number: 8, text: "¡Beben todos!" },
    { number: 9, text: "Añade alcohol" },
    { number: 10, text: "Retrocede dos casillas", action: "move", amount: -2 },
    { number: 11, text: "Haz una regla" },
    { number: 12, text: "Salta tu turno" },
    { number: 13, text: "Elige a alguien y no riáis" },
    { number: 14, text: "Tú, sí tú, BEBE" },
    { number: 15, text: "TODO DE GOLPE" },
    { number: 16, text: "Bebe agua, lo necesitarás..." },
    { number: 17, text: "¡Chupito sin manos!" },
    { number: 18, text: "Elige compañero para las próximas dos rondas" },
    { number: 19, text: "Zona segura" },
    { number: 20, text: "Mímica" },
    { number: 21, text: "Vuelves al inicio, jaja" },
    { number: 22, text: "Bebe el más alto" },
    { number: 23, text: "Bebe el de tu izquierda" },
    { number: 24, text: "Beben los hombres" },
    { number: 25, text: "Besa a alguien ¡MUACK!" },
    { number: 26, text: "Zona segura" },
    { number: 27, text: "Aguanta con la boca llena de agua hasta tu próximo turno" },
    { number: 28, text: "Simón dice" },
    { number: 29, text: "Verdad o reto" },
    { number: 30, text: "Piedra papel o tijera" },
    { number: 31, text: "Beben las mujeres" },
    { number: 32, text: "HIDRÁTATE" },
    { number: 33, text: "Doble chupito" },
    { number: 34, text: "Casar, Follar, Matar" },
    { number: 35, text: "Retrocede tres casillas", action: "move", amount: -3 },
    { number: 36, text: "Zona segura" },
    { number: 37, text: "Salta tu turno", action: "skipTurn" },
    { number: 38, text: "Anda en línea recta" },
    { number: 39, text: "Bebe el de tu derecha" },
    { number: 40, text: "Verdad o reto" },
    { number: 41, text: "¡Selfie!" },
    { number: 42, text: "Snack" },
    { number: 43, text: "Awita" },
    { number: 44, text: "Bebe el más joven" },
    { number: 45, text: "Zona segura" },
    { number: 46, text: "Yo nunca nunca" },
    { number: 47, text: "Bebe el más mayor" },
    { number: 48, text: "AGUA, AGUA, AGUA" },
    { number: 49, text: "Mímica" },
    { number: 50, text: "Zona segura" },
    { number: 51, text: "Besa a alguien 😘" },
    { number: 52, text: "¡FINAL!", action: "finish" }
];


io.on("connection", (socket) => {

    console.log("Jugador conectado:", socket.id);


    // =========================
    // CREAR PARTIDA
    // =========================

    socket.on("createGame", (playerName, color, callback) => {

        let code;

        do {
            code = Math.random()
                .toString(36)
                .substring(2, 7)
                .toUpperCase();

        } while (games[code]);


        games[code] = {
		players: [],
    		currentPlayer: 0,
    		positions: {},
    		lastRoll: null,
    		finished: false,
    		pendingAction: false,
    		pendingPlayerId: null,
		skipNextTurn: false,
    		squares: squares
	};


        games[code].players.push({
            id: socket.id,
            name: playerName,
            color: color
        });

        games[code].positions[socket.id] = 1;

        socket.join(code);

        callback({
            success: true,
            code: code
        });

        io.to(code).emit(
            "gameUpdated",
            games[code]
        );
    });


    // =========================
    // UNIRSE A PARTIDA
    // =========================

    socket.on("joinGame", ({ code, playerName, color }, callback) => {

        const game = games[code];

        if (!game) {
            callback({
                success: false,
                message: "No existe esa partida."
            });

            return;
        }

        if (game.finished) {
            callback({
                success: false,
                message: "Esta partida ya ha terminado."
            });

            return;
        }


        // Comprobar que el color elegido
        // existe y está disponible.

        if (!playerColors.includes(color)) {

            callback({
                success: false,
                message: "Ese color no es válido."
            });

            return;
        }


        const colorTaken =
            game.players.some(
                player => player.color === color
            );


        if (colorTaken) {

            callback({
                success: false,
                message: "Ese color ya está ocupado."
            });

            return;
        }


        game.players.push({
            id: socket.id,
            name: playerName,
            color: color
        });

        game.positions[socket.id] = 1;

        socket.join(code);

        callback({
            success: true
        });

        io.to(code).emit(
            "gameUpdated",
            game
        );
    });


    // =========================
    // TIRAR DADO
    // =========================

    socket.on("rollDice", (code) => {

        const game = games[code];

        if (!game || game.finished) {
            return;
        }

        if (game.pendingAction) {
            return;
        }


        const currentPlayer =
            game.players[game.currentPlayer];

        if (!currentPlayer) {
            return;
        }

        if (currentPlayer.id !== socket.id) {
            return;
        }

	if (game.skipNextTurn) {
	    game.skipNextTurn = false;
	    game.pendingAction = true;
	    game.pendingPlayerId = socket.id;
	    game.skipMessage = true;

	    io.to(code).emit("gameUpdated", game);
	    return;
	}


        const dice =
            Math.floor(Math.random() * 6) + 1;


        let newPosition =
            game.positions[socket.id] + dice;


        if (newPosition > 52) {
            newPosition = 52;
        }


        game.positions[socket.id] =
            newPosition;

        game.lastRoll = dice;


        // FINAL

        if (newPosition === 52) {

            game.finished = true;

            game.winner =
                currentPlayer.name;

            io.to(code).emit(
                "gameUpdated",
                game
            );

            return;
        }


        // El jugador mantiene su turno
        // hasta pulsar CONTINUAR.

        game.pendingAction = true;

        game.pendingPlayerId =
            socket.id;


        io.to(code).emit(
            "gameUpdated",
            game
        );
    });


    // =========================
    // CONTINUAR
    // =========================

    socket.on("continueSquare", (code) => {

	    const game = games[code];

	    if (!game || game.finished) {
	        return;
	    }

	    if (!game.pendingAction) {
	        return;
	    }
	
	    if (game.pendingPlayerId !== socket.id) {
	        return;
	    }
	
	    // SI ES UN TURNO QUE HA SIDO SALTADO
	    if (game.skipMessage) {

	        game.skipMessage = false;
	        game.pendingAction = false;
	        game.pendingPlayerId = null;
	        game.lastRoll = null;

	        game.currentPlayer =
	            (game.currentPlayer + 1) %
	            game.players.length;
	
	        io.to(code).emit(
	            "gameUpdated",
	            game
	        );
	
	        return;
	    }

	    const player =
	        game.players[game.currentPlayer];
	
	    if (!player) {
	        return;
	    }
	
	    const position =
	        game.positions[socket.id];
	
	    const square =
	        squares.find(
	            s => s.number === position
	        );
	
	    if (!square) {
	        return;
	    }
	
	    // MOVIMIENTO ESPECIAL
	
	    if (square.action === "move") {
	
	        let newPosition =
	            position + square.amount;
	
	        if (newPosition < 1) {
	            newPosition = 1;
	        }
	
	        if (newPosition > 52) {
	            newPosition = 52;
	        }

	        game.positions[socket.id] =
	            newPosition;

	        if (newPosition === 52) {
	
	            game.finished = true;
	
	            game.winner =
	                player.name;
	
	            game.pendingAction = false;
	            game.pendingPlayerId = null;
	
	            io.to(code).emit(
	                "gameUpdated",
	                game
	            );
	
	            return;
	        }
	    }
	
	    // SALTAR TURNO
	
	    if (square.action === "skipTurn") {
	        game.skipNextTurn = true;
	    }
	
	    // PASAR AL SIGUIENTE JUGADOR
	
	    game.currentPlayer =
	        (game.currentPlayer + 1) %
	        game.players.length;
	
	    game.pendingAction = false;
	    game.pendingPlayerId = null;
	
	    game.lastRoll = null;
	
	    io.to(code).emit(
	        "gameUpdated",
	        game
	    );
	});


    // =========================
    // DESCONECTAR
    // =========================

    socket.on("disconnect", () => {

        console.log(
            "Jugador desconectado:",
            socket.id
        );


        for (const code in games) {

            const game = games[code];

            const playerIndex =
                game.players.findIndex(
                    player => player.id === socket.id
                );


            if (playerIndex === -1) {
                continue;
            }


            game.players.splice(
                playerIndex,
                1
            );

            delete game.positions[socket.id];


            if (game.players.length === 0) {

                delete games[code];

            } else {

                if (
                    game.currentPlayer >=
                    game.players.length
                ) {

                    game.currentPlayer = 0;
                }


                if (
                    game.pendingPlayerId === socket.id
                ) {

                    game.pendingAction = false;
                    game.pendingPlayerId = null;
                    game.lastRoll = null;
                }


                io.to(code).emit(
                    "gameUpdated",
                    game
                );
            }
        }
    });

});


server.listen(process.env.PORT || 3000, () => {

    console.log(
        "🎲 Oca del Caos funcionando en http://localhost:3000"
    );

});