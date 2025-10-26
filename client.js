const WebSocket = require('ws');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let ws;
let gameState = {
    sentence: '',
    typedText: '',
    players: [],
    gameActive: false
};

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

function clearScreen() {
    console.clear();
}

function displayUI() {
    clearScreen();

    console.log(`${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}║                    🏁 TYPING RACE 🏁                          ║${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    if (gameState.gameActive && gameState.sentence) {
        console.log(`${colors.bold}${colors.yellow}Target Sentence:${colors.reset}`);

        let displayText = '';
        for (let i = 0; i < gameState.sentence.length; i++) {
            if (i < gameState.typedText.length) {
                if (gameState.typedText[i] === gameState.sentence[i]) {
                    displayText += `${colors.green}${gameState.sentence[i]}${colors.reset}`;
                } else {
                    displayText += `${colors.red}${gameState.sentence[i]}${colors.reset}`;
                }
            } else {
                displayText += `${colors.dim}${gameState.sentence[i]}${colors.reset}`;
            }
        }

        console.log(displayText);
        console.log(`\n${colors.bold}Your Input:${colors.reset} ${gameState.typedText}`);
        console.log(`${colors.dim}Progress: ${gameState.typedText.length}/${gameState.sentence.length}${colors.reset}\n`);
    }

    // Display leaderboard
    if (gameState.players.length > 0) {
        console.log(`${colors.bold}${colors.cyan}━━━━━━━━━━━━━━━━ LEADERBOARD ━━━━━━━━━━━━━━━━${colors.reset}`);

        const sorted = [...gameState.players].sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            if (a.completed && b.completed) return b.wpm - a.wpm;
            return b.progress - a.progress;
        });

        sorted.forEach((player, index) => {
            const position = index + 1;
            const progressBar = '█'.repeat(Math.floor(player.progress / gameState.sentence.length * 20));
            const emptyBar = '░'.repeat(20 - progressBar.length);
            const percentage = Math.floor((player.progress / gameState.sentence.length) * 100);

            let statusIcon = '⌨️ ';
            if (player.completed) {
                statusIcon = position === 1 ? '🏆 ' : position === 2 ? '🥈 ' : position === 3 ? '🥉 ' : '✅ ';
            }

            const wpmText = player.wpm > 0 ? ` ${player.wpm} WPM` : '';

            console.log(`${statusIcon}${player.name}: ${colors.green}${progressBar}${colors.dim}${emptyBar}${colors.reset} ${percentage}%${wpmText}`);
        });

        console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    }
}

function connectToServer(playerName) {
    ws = new WebSocket(`ws://localhost:${config.port}`);

    ws.on('open', () => {
        ws.send(JSON.stringify({
            type: 'join',
            name: playerName
        }));
    });

    ws.on('message', (data) => {
        const message = JSON.parse(data);

        if (message.type === 'joined') {
            clearScreen();
            if (message.waitingForPlayers) {
                console.log(`${colors.yellow}✓ Connected! Waiting for ${message.playersNeeded} more player(s)...${colors.reset}`);
            } else {
                console.log(`${colors.green}✓ Connected! Game starting soon...${colors.reset}`);
            }
        }

        if (message.type === 'countdown') {
            clearScreen();
            console.log(`${colors.bold}${colors.yellow}\n\n           Game starting in ${message.count}...\n\n${colors.reset}`);
        }

        if (message.type === 'game_start') {
            gameState.sentence = message.sentence;
            gameState.typedText = '';
            gameState.players = message.players;
            gameState.gameActive = true;
            displayUI();
            startTyping();
        }

        if (message.type === 'player_update') {
            gameState.players = message.players;
            if (gameState.gameActive) {
                displayUI();
            }
        }

        if (message.type === 'game_over') {
            gameState.gameActive = false;
            gameState.players = message.players;
            displayUI();
            console.log(`${colors.bold}${colors.green}🎉 Race Complete! Next race starting soon...${colors.reset}\n`);
        }
    });

    ws.on('error', (error) => {
        console.error(`${colors.red}Connection error: ${error.message}${colors.reset}`);
        process.exit(1);
    });

    ws.on('close', () => {
        console.log(`${colors.yellow}Disconnected from server${colors.reset}`);
        process.exit(0);
    });
}

function startTyping() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const handleKeypress = (key) => {
        if (!gameState.gameActive) return;

        // Ctrl+C to exit
        if (key === '\u0003') {
            process.exit();
        }

        // Backspace - handle multiple codes
        if (key === '\u007F' || key === '\b' || key === '\u0008') {
            if (gameState.typedText.length > 0) {
                gameState.typedText = gameState.typedText.slice(0, -1);
                ws.send(JSON.stringify({
                    type: 'progress',
                    progress: gameState.typedText.length
                }));
                displayUI();
            }
            return;
        }

        // Ignore control characters except space and enter
        if (key.charCodeAt(0) < 32 && key !== ' ' && key !== '\r' && key !== '\n') {
            return;
        }

        // Convert enter to space if needed
        const char = (key === '\r' || key === '\n') ? ' ' : key;

        // Add character
        if (gameState.typedText.length < gameState.sentence.length) {
            gameState.typedText += char;

            ws.send(JSON.stringify({
                type: 'progress',
                progress: gameState.typedText.length
            }));

            displayUI();
        }
    };

    process.stdin.on('data', handleKeypress);
}

// Get player name and connect
rl.question(`${colors.cyan}Enter your name: ${colors.reset}`, (name) => {
    rl.close();
    connectToServer(name || 'Anonymous');
});