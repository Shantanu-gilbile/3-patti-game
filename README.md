# ♠️ ♥️ ♦️ ♣️ Teen Patti (3 Patti) Multiplayer Web Game

A complete, production-ready, real-time multiplayer Teen Patti (3 Patti) web game built with **React**, **Vite**, **Tailwind CSS**, **Node.js**, **Express**, and **Socket.IO**.

> ⚠️ **DISCLAIMER:** This game is **FOR ENTERTAINMENT ONLY**. It uses virtual chips only and contains no real-money gambling, cash prizes, or in-app purchases.

---

## 🌟 Key Features

- **Authoritative Server Logic**:
  - Cryptographically secure deck shuffling using `crypto.randomInt` and Fisher-Yates algorithm.
  - Cards of opponents are never transmitted to clients until showdown.
  - Server validates turn order, bet amounts, balances, and rate-limits incoming events to prevent tampering.
- **Accurate Hand Rankings & Tie-breaking**:
  - Trail / Trio / Set (three of a kind)
  - Pure Sequence (Straight Flush) with **A-2-3 as the second-highest sequence** after A-K-Q
  - Sequence (Normal straight)
  - Color (Flush)
  - Pair (Double)
  - High Card
- **Real-Time Multiplayer**:
  - 2 to 6 players per table with an authentic oval poker felt table.
  - Blind vs. Seen player betting dynamics (Seen players bet 2x).
  - Chaal, Raise with interactive slider, Pack (fold), See Cards, and Showdown (when 2 players remain).
  - Optional Side Show request and response between consecutive seen players.
  - 30-second turn timer with smooth countdown ring and automatic pack on timeout.
  - 60-second seat-hold on disconnect for smooth reconnection.
  - Central pot accumulation, chip counts, and automatic new round start after 5 seconds.
  - Daily top-up (+5,000 chips) when low on chips.
  - In-game table chat and quick emoji reactions.
  - Synthesized Web Audio API sound effects (no external audio assets required; cards, chips, folds, and wins have audio).

---

## 📁 Project Structure

```text
3 Patti Game/
├── package.json               # Root scripts
├── shared/                    # Isomorphic game logic
│   ├── handEvaluator.js       # Hand ranking, 52-card deck, tie-breaks
│   ├── bettingRules.js        # Blind/Seen stakes, pot limits, validations
│   └── test.js                # Unit tests for evaluator & betting rules
├── server/                    # Node.js + Express + Socket.IO Backend
│   ├── package.json
│   └── src/
│       ├── server.js          # Express app, Socket.IO server & health endpoints
│       ├── gameRoom.js        # Core Teen Patti room engine, timers, cards & rounds
│       ├── roomManager.js     # Room lifecycle, code generation, disconnect handling
│       ├── socketHandlers.js  # Realtime Socket.IO events, anti-cheat & rate limiting
│       └── store.js           # In-memory store (Redis-ready abstraction)
└── client/                    # React + Vite + Tailwind CSS Frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx            # Main app router (Lobby vs Table)
        ├── context/
        │   └── GameContext.jsx # Socket.io and user state provider
        ├── components/
        │   ├── Table.jsx      # Oval felt table, dealer button, pot & turn ring
        │   ├── Seat.jsx       # Player seat, avatar, cards, countdown ring
        │   ├── Card.jsx       # Crisp SVG/CSS card faces and card backs
        │   ├── ActionBar.jsx  # Chaal, Raise slider, Pack, See, Show, Side Show
        │   ├── ChatBox.jsx    # Table text chat & floating emoji reactions
        │   └── Lobby.jsx      # Public tables, create table, join via 6-letter code
        └── utils/
            ├── audio.js       # Procedural Web Audio API sound generator
            └── userStorage.js # Guest nickname, avatar & chip persistence in localStorage
```

---

## ⚡ How to Run Locally

### 1. Run Unit Tests First
Verify all hand rankings, second-highest sequence rule (A-2-3), and betting rules:
```bash
npm test
# or: node shared/test.js
```

### 2. Start the Backend Server
In your first terminal:
```bash
cd server
npm start
# Server listens on http://localhost:4000
```

### 3. Start the Frontend Client
In a second terminal:
```bash
cd client
npm run dev
# Frontend is served at http://localhost:3000
```

---

## 🧪 Testing Multiplayer with Multiple Tabs

1. Open `http://localhost:3000` in **Browser Tab 1**.
2. Click **Create Table** (or choose a table name and boot amount). You will sit at the table as the host.
3. Note the **6-character Room Code** (e.g. `ABC123`) or click the **Share** button at the top right to copy the link.
4. Open an **Incognito / Private Window** (or a separate browser like Chrome / Edge / Firefox) and go to `http://localhost:3000`.
   - *Note: Using an incognito window gives the second player their own independent localStorage nickname and chip balance!*
5. Either paste the copied link or enter the 6-character room code in the lobby and click **Join**.
6. Both players will now appear seated around the green felt table.
7. Click **Ready Up** on both tabs, and the host can click **Start Round (Host)**.
8. Watch cards deal, chips deduct for the Boot, and play Chaal / See Cards / Raise / Pack in turns!

---

## 📡 Socket.IO Events API

### Client -> Server Events

| Event | Payload | Description |
|---|---|---|
| `lobby:get_rooms` | None | Fetch open public tables |
| `room:create` | `{ name, isPrivate, config, player }` | Create a new table room |
| `room:join` | `{ roomId, player }` | Join room via 6-character code |
| `room:leave` | `{ playerId }` | Leave current room |
| `game:ready` | `{ roomId, playerId }` | Toggle ready status |
| `game:start` | `{ roomId, playerId }` | Host starts the game round |
| `action:see_cards`| `{ roomId, playerId }` | Turn blind player into seen player |
| `action:bet` | `{ roomId, playerId, amount }` | Perform Chaal or Raise |
| `action:pack` | `{ roomId, playerId }` | Fold / Pack current hand |
| `action:show` | `{ roomId, playerId }` | Request showdown (2 players remaining) |
| `action:side_show_request` | `{ roomId, playerId }` | Request side show from previous player |
| `action:side_show_response`| `{ roomId, playerId, accepted }` | Accept or decline side show |
| `chat:send` | `{ roomId, sender, message }` | Send table chat message |
| `chat:reaction`| `{ roomId, playerId, emoji }` | Send floating emoji reaction |

### Server -> Client Events

| Event | Payload | Description |
|---|---|---|
| `lobby:room_list` | `Array<RoomSummary>` | List of public tables |
| `room:created` | `{ roomId }` | Emitted when room is created |
| `room:joined` | `{ roomId, isReconnect }` | Emitted on successful join |
| `game:state` | `GameState` (sanitized) | Full table state (opponents' cards masked as `?`) |
| `game:error` | `{ message }` | Error notifications (insufficient chips, out of turn) |
| `chat:message` | `{ id, sender, message, timestamp }` | Broadcasted chat message |
| `chat:reaction`| `{ playerId, emoji, timestamp }` | Broadcasted reaction bubble |
| `room:kicked` | `{ message }` | Sent if host kicks a player |

---

## 🚀 Deployment Guide

### Deploy Backend (Render / Railway / Fly.io)
1. **Render**:
   - Create a new **Web Service**.
   - Root directory: `server`.
   - Build Command: `npm install`.
   - Start Command: `npm start`.
   - Add Environment Variable:
     - `PORT`: `4000` (or leave default assigned by host).
     - `CLIENT_URL`: `https://your-frontend-app.vercel.app` (or `*`).
2. **Railway / Fly.io**:
   - Push repository to GitHub and connect repository.
   - Set build pack to Node.js and start `npm start` inside `server/`.

### Deploy Frontend (Vercel / Netlify)
1. Import repository on **Vercel** or **Netlify**.
2. Root Directory: `client`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Environment Variable:
   - `VITE_SERVER_URL`: `https://your-backend-app.onrender.com`
