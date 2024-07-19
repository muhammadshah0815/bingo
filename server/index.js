const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, '../public')));

const games = {};

io.on('connection', (socket) => {
    console.log('A new user connected:', socket.id);

    socket.on('create_game', ({ playerName }) => {
        let gameId = generateGameId();
        games[gameId] = {
            players: [{ id: socket.id, name: playerName }],
            started: false,
            currentTurn: 0,
            numbers: shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1))
        };
        socket.join(gameId);
        io.to(gameId).emit('game_created', gameId);
        io.to(gameId).emit('joined_game', { gameId, players: games[gameId].players });
        console.log(`Game created with ID: ${gameId} by user ${socket.id}`);
    });

    socket.on('join_game', ({ gameId, playerName }) => {
        if (games[gameId] && !games[gameId].started) {
            if (games[gameId].players.some(player => player.id === socket.id)) {
                socket.emit('error', 'You have already joined this game.');
                return;
            }
            games[gameId].players.push({ id: socket.id, name: playerName });
            socket.join(gameId);
            io.to(gameId).emit('player_joined', { playerId: socket.id, gameId: gameId, players: games[gameId].players });
            io.to(gameId).emit('joined_game', { gameId, players: games[gameId].players });
            console.log(`User ${socket.id} joined game ${gameId}`);
        } else {
            socket.emit('error', 'Game not found or already started');
        }
    });

    socket.on('start_game', (gameId) => {
        if (games[gameId] && games[gameId].players.length >= 2 && !games[gameId].started) {
            games[gameId].started = true;
            games[gameId].players = shuffleArray(games[gameId].players);
            games[gameId].currentTurn = 0;
            io.to(gameId).emit('game_started', games[gameId].players);
            io.to(gameId).emit('turn_changed', games[gameId].players[games[gameId].currentTurn].name);
            console.log(`Game ${gameId} started`);
        } else {
            socket.emit('error', 'Not enough players or game already started');
        }
    });

    socket.on('mark_number', ({ gameId, number }) => {
        const game = games[gameId];
        if (game && game.started && game.players[game.currentTurn].id === socket.id) {
            io.to(gameId).emit('number_marked', { number: number, markerName: game.players[game.currentTurn].name });
            game.currentTurn = (game.currentTurn + 1) % game.players.length;
            io.to(gameId).emit('turn_changed', game.players[game.currentTurn].name);
            console.log(`Number ${number} marked by player ${socket.id}`);
        } else {
            socket.emit('error', 'Not your turn or game not started');
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        Object.keys(games).forEach((gameId) => {
            const playerIndex = games[gameId].players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                games[gameId].players.splice(playerIndex, 1);
                if (games[gameId].players.length === 0) {
                    delete games[gameId];
                    io.to(gameId).emit('game_ended', 'Game ended, insufficient players.');
                } else {
                    io.to(gameId).emit('player_left', { playerId: socket.id, gameId: gameId, players: games[gameId].players });
                }
                console.log(`User ${socket.id} removed from game ${gameId}`);
            }
        });
    });
});

function generateGameId() {
    return Math.random().toString(36).substr(2, 9);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
