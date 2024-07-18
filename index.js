const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const games = {};

io.on('connection', (socket) => {
    console.log('A new user connected:', socket.id);

    socket.on('create_game', () => {
        let gameId = generateGameId();
        games[gameId] = {
            players: [socket.id],
            started: false,
            currentTurn: 0,
            numbers: shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1))
        };
        socket.join(gameId);
        io.to(gameId).emit('game_created', gameId, true);
        console.log(`Game created with ID: ${gameId} by user ${socket.id}`);
    });

    socket.on('join_game', (gameId) => {
        if (games[gameId] && !games[gameId].started) {
            games[gameId].players.push(socket.id);
            socket.join(gameId);
            io.to(gameId).emit('player_joined', { playerId: socket.id, gameId: gameId });
            console.log(`User ${socket.id} joined game ${gameId}`);
        } else {
            socket.emit('error', 'Game not found or already started');
        }
    });

    socket.on('start_game', (gameId) => {
        if (games[gameId] && games[gameId].players.length >= 2 && !games[gameId].started) {
            games[gameId].started = true;
            io.to(gameId).emit('game_started', gameId);
            console.log(`Game ${gameId} started`);
        } else {
            socket.emit('error', 'Not enough players or game already started');
        }
    });

    socket.on('mark_number', ({ gameId, number }) => {
        const game = games[gameId];
        if (game && game.started) {
            io.to(gameId).emit('number_marked', { number: number, markerId: socket.id });
            game.currentTurn = (game.currentTurn + 1) % game.players.length;
            io.to(gameId).emit('turn_changed', game.players[game.currentTurn]);
            console.log(`Number ${number} marked by player ${socket.id}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        Object.keys(games).forEach((gameId) => {
            const index = games[gameId].players.indexOf(socket.id);
            if (index !== -1) {
                games[gameId].players.splice(index, 1);
                if (games[gameId].players.length === 0) {
                    delete games[gameId];
                } else {
                    io.to(gameId).emit('player_left', { playerId: socket.id, gameId: gameId });
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
