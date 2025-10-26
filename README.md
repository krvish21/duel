# 🏁 Typing Race - Multiplayer CLI Game

A real-time multiplayer typing race game built with Node.js and WebSockets. Compete with other players to type sentences as fast and accurately as possible!

## ✨ Features

- **Real-time multiplayer racing** - compete with multiple players simultaneously
- **Color-coded feedback** - correct characters in green, mistakes in red
- **Live leaderboard** - see all players' progress in real-time
- **WPM calculation** - track typing speed in words per minute
- **Configurable settings** - customize sentences, countdown, and game parameters
- **Beautiful CLI UI** - responsive terminal interface with progress bars

## 🚀 Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm run server
   ```

3. **Start clients** (in separate terminals):
   ```bash
   npm run client
   ```

## ⚙️ Configuration

Edit `config.json` to customize the game:

- `port`: Server port (default: 8080)
- `minPlayers`: Minimum players needed to start (default: 2)
- `countdownSeconds`: Countdown before game starts (default: 3)
- `nextGameDelay`: Delay before next game starts (default: 5000ms)
- `sentences`: Array of sentences for typing challenges

## 🎮 How to Play

1. Start the server first
2. Launch multiple client instances (at least `minPlayers`)
3. Enter your name when prompted
4. Wait for other players to join
5. When the countdown finishes, start typing!
6. Type the sentence exactly as shown
7. Use backspace to correct mistakes
8. First to finish wins! 🏆

## 🎯 Game Controls

- **Type normally** - characters appear in real-time
- **Backspace** - delete the last character
- **Ctrl+C** - exit the game

## 📊 Scoring

- Progress is tracked in real-time
- WPM (Words Per Minute) is calculated when you finish
- Leaderboard shows live rankings with progress bars
- Winners get special trophy icons! 🏆🥈🥉

## 🔧 Technical Details

- Built with Node.js and WebSockets (ws library)
- Real-time bidirectional communication
- ANSI color codes for terminal styling
- Raw mode input handling for character-by-character typing

## 📝 Adding More Sentences

Simply add more sentences to the `sentences` array in `config.json`:

```json
{
  "sentences": [
    "Your new typing challenge here.",
    "Another sentence to practice with."
  ]
}
```

## 🎨 Color Coding

- **Green** - correctly typed characters
- **Red** - incorrect characters (showing what should be typed)
- **Gray/Dim** - characters yet to be typed
- **Yellow** - game status messages
- **Cyan** - UI elements and headers

Enjoy the race! 🏁⌨️