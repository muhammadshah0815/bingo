const socket = io();

document.getElementById('createGame').addEventListener('click', () => {
    const playerName = document.getElementById('playerNameInput').value.trim();
    if (playerName.length > 0 && playerName.length <= 10) {
        socket.emit('create_game', { playerName });
    } else {
        alert('Please enter your name (1-10 characters).');
    }
});

document.getElementById('joinGame').addEventListener('click', () => {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const gameId = document.getElementById('gameIdInput').value.trim();
    if (playerName.length > 0 && playerName.length <= 10 && gameId) {
        socket.emit('join_game', { gameId, playerName });
    } else {
        alert('Please enter your name (1-10 characters) and game code.');
    }
});

document.getElementById('gameIdInput').addEventListener('input', () => {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const gameId = document.getElementById('gameIdInput').value.trim();
    const playerQueue = document.getElementById('playerList').children.length;
    document.getElementById('startGame').disabled = !(playerName && gameId && playerQueue >= 2);
});

document.getElementById('startGame').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value.trim();
    socket.emit('start_game', gameId);
});

document.getElementById('copyGameCode').addEventListener('click', () => {
    const gameId = document.getElementById('gameIdInput').value.trim();
    if (gameId) {
        navigator.clipboard.writeText(gameId).then(() => {
            alert('Game code copied to clipboard');
        }).catch(err => {
            alert('Failed to copy: ', err);
        });
    } else {
        alert('No game code to copy');
    }
});

socket.on('game_created', (gameId) => {
    document.getElementById('gameStatus').textContent = `Game Created. Game ID: ${gameId}. You are automatically joined.`;
    document.getElementById('gameIdInput').value = gameId;
    updateStartButton();
});

socket.on('joined_game', (data) => {
    document.getElementById('gameStatus').textContent = `Joined game with ID: ${data.gameId}. Waiting for more players or start of the game.`;
    updatePlayerQueue(data.players);
    updateStartButton();
});

socket.on('player_joined', (data) => {
    document.getElementById('gameStatus').textContent = `A new player has joined the game!`;
    updatePlayerQueue(data.players);
    updateStartButton();
});

socket.on('game_started', (players) => {
    document.querySelector('.start-screen').style.display = 'none';
    document.querySelector('.game-screen').style.display = 'flex';
    document.getElementById('gameStatus').textContent = 'Game has started! Get ready!';
    document.getElementById('bingoBoard').style.display = 'grid';
    updatePlayerQueue(players, 'playerQueueGame');
    generateBingoBoard();
    const playerName = document.getElementById('playerNameInput').value.trim();
    document.getElementById('playerInfo').textContent = `Player: ${playerName}`;
});

socket.on('number_marked', ({ number, markerName }) => {
    const cells = document.querySelectorAll('.bingo-cell');
    cells.forEach(cell => {
        if (parseInt(cell.textContent) === number) {
            cell.classList.add('marked');
            cell.removeEventListener('click', cell.clickHandler); // Disable click after marking
        }
    });
});

socket.on('turn_changed', currentTurnPlayer => {
    setTimeout(() => {
        highlightCurrentPlayer(currentTurnPlayer);
    }, 0);
});

socket.on('player_left', data => {
    document.getElementById('gameStatus').textContent = `A player has left the game.`;
    updatePlayerQueue(data.players, 'playerQueueGame');
    updateStartButton();
});

socket.on('game_ended', message => {
    document.getElementById('gameStatus').textContent = message;
    document.getElementById('bingoBoard').style.display = 'none';
    document.getElementById('playerQueueGame').style.display = 'none';
});

socket.on('error', message => {
    alert(message);
});

function updateStartButton() {
    const playerName = document.getElementById('playerNameInput').value.trim();
    const gameId = document.getElementById('gameIdInput').value.trim();
    const playerQueue = document.getElementById('playerList').children.length;
    document.getElementById('startGame').disabled = !(playerName && gameId && playerQueue >= 2);
}

function generateBingoBoard() {
    const boardElement = document.querySelector('#bingoBoard');
    boardElement.innerHTML = '';
    const numbers = shuffleArray(Array.from({ length: 25 }, (_, i) => i + 1));
    numbers.forEach(number => {
        const cell = document.createElement('div');
        cell.textContent = number;
        cell.className = 'bingo-cell';
        cell.clickHandler = function() {
            const gameId = document.getElementById('gameIdInput').value.trim();
            socket.emit('mark_number', { gameId, number: parseInt(cell.textContent) });
        };
        cell.addEventListener('click', cell.clickHandler);
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

function updatePlayerQueue(players, queueId = 'playerList') {
    const queueElement = document.getElementById(queueId);
    queueElement.innerHTML = '';
    players.forEach(player => {
        const playerElement = document.createElement('div');
        playerElement.textContent = player.name;
        playerElement.className = 'player-name';
        queueElement.appendChild(playerElement);
    });
}

function highlightCurrentPlayer(currentPlayer) {
    const playerElements = document.querySelectorAll('.player-name');
    playerElements.forEach(playerElement => {
        playerElement.classList.remove('current-turn');
        if (playerElement.textContent === currentPlayer) {
            playerElement.classList.add('current-turn');
        }
    });
}
