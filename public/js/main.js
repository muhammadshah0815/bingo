const socket = io();

document.getElementById('createGame').addEventListener('click', () => {
    socket.emit('create_game');
});

document.getElementById('joinGame').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value;
    socket.emit('join_game', gameId);
});

document.getElementById('startGame').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value;
    socket.emit('start_game', gameId);
});

socket.on('game_created', (gameId) => {
    document.getElementById('gameStatus').textContent = `Game Created. Game ID: ${gameId}. You are automatically joined.`;
    document.getElementById('gameIdInput').value = gameId;
});

socket.on('joined_game', gameId => {
    document.getElementById('gameStatus').textContent = `Joined game with ID: ${gameId}. Waiting for more players or start of the game.`;
});

socket.on('player_joined', data => {
    document.getElementById('gameStatus').textContent = `Player ${data.playerId} joined the game!`;
});

socket.on('game_started', () => {
    document.getElementById('gameStatus').textContent = 'Game has started! Get ready!';
    generateBingoBoard();
    document.getElementById('bingoBoard').style.display = 'block';
});

socket.on('number_marked', ({ number, markerId }) => {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        if (cell.textContent === number) {
            cell.classList.add('marked');
        }
    });
    document.getElementById('gameStatus').textContent = `Number ${number} marked by player ${markerId}`;
});

socket.on('error', message => {
    alert(message);
});

function generateBingoBoard() {
    const boardElement = document.querySelector('#bingoBoard');
    boardElement.innerHTML = '';
    const numbers = shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1));
    numbers.forEach(number => {
        const cell = document.createElement('div');
        cell.textContent = number;
        cell.className = 'bingo-cell';
        cell.addEventListener('click', function() {
            if (!this.classList.contains('marked')) {
                socket.emit('mark_number', { gameId: document.getElementById('gameIdInput').value, number: this.textContent });
                this.classList.add('marked');
            }
        });
        boardElement.appendChild(cell);
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
