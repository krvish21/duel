const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const wss = new WebSocket.Server({ port: config.port });

let gameState = {
    players: new Map(),
    currentSentence: '',
    gameActive: false,
    countdown: 0
};

function getRandomSentence() {
    return config.sentences[Math.floor(Math.random() * config.sentences.length)];
}

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function getPlayerStates() {
    return Array.from(gameState.players.values()).map(player => ({
        id: player.id,
        name: player.name,
        progress: player.progress,
        completed: player.completed,
        wpm: player.wpm
    }));
}

function startGame() {
    if (gameState.players.size < config.minPlayers) {
        return;
    }

    gameState.currentSentence = getRandomSentence();
    gameState.gameActive = false;
    gameState.countdown = config.countdownSeconds;

    // Reset all players
    gameState.players.forEach(player => {
        player.progress = 0;
        player.completed = false;
        player.startTime = null;
        player.wpm = 0;
    });

    // Countdown
    const countdownInterval = setInterval(() => {
        broadcast({
            type: 'countdown',
            count: gameState.countdown
        });

        gameState.countdown--;

        if (gameState.countdown < 0) {
            clearInterval(countdownInterval);
            gameState.gameActive = true;

            broadcast({
                type: 'game_start',
                sentence: gameState.currentSentence,
                players: getPlayerStates()
            });
        }
    }, 1000);
}

wss.on('connection', (ws) => {
    const playerId = Math.random().toString(36).substr(2, 9);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.type === 'join') {
            gameState.players.set(playerId, {
                id: playerId,
                name: data.name,
                progress: 0,
                completed: false,
                ws: ws,
                startTime: null,
                wpm: 0
            });

            ws.send(JSON.stringify({
                type: 'joined',
                playerId: playerId,
                waitingForPlayers: gameState.players.size < config.minPlayers,
                playersNeeded: config.minPlayers - gameState.players.size
            }));

            broadcast({
                type: 'player_update',
                players: getPlayerStates()
            });

            if (gameState.players.size >= config.minPlayers && !gameState.gameActive && gameState.countdown === 0) {
                setTimeout(() => startGame(), 2000);
            }
        }

        if (data.type === 'progress' && gameState.gameActive) {
            const player = gameState.players.get(playerId);
            if (player && !player.completed) {
                if (!player.startTime) {
                    player.startTime = Date.now();
                }

                player.progress = data.progress;

                if (data.progress >= gameState.currentSentence.length) {
                    player.completed = true;
                    const timeInMinutes = (Date.now() - player.startTime) / 60000;
                    const words = gameState.currentSentence.split(' ').length;
                    player.wpm = Math.round(words / timeInMinutes);
                }

                broadcast({
                    type: 'player_update',
                    players: getPlayerStates()
                });

                // Check if all players completed
                const allCompleted = Array.from(gameState.players.values()).every(p => p.completed);
                if (allCompleted) {
                    gameState.gameActive = false;
                    gameState.countdown = 0;

                    broadcast({
                        type: 'game_over',
                        players: getPlayerStates()
                    });

                    // Start new game after delay
                    setTimeout(() => startGame(), config.nextGameDelay);
                }
            }
        }
    });

    ws.on('close', () => {
        gameState.players.delete(playerId);
        broadcast({
            type: 'player_update',
            players: getPlayerStates()
        });
    });
});

console.log(`🎮 Typing Race Server running on port ${config.port}`);
console.log(`⌨️  Waiting for players to connect...`);