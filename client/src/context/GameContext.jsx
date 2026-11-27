import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { getStoredUser, saveUser } from '../utils/userStorage';
import { sounds } from '../utils/audio';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [publicRooms, setPublicRooms] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [muted, setMuted] = useState(false);

  const prevTurnRef = useRef(null);
  const prevRoundRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    // Connect to current origin so WebSocket goes through Vite proxy / same tunnel domain
    const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;

    const s = io(serverUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('lobby:get_rooms');
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('lobby:room_list', (rooms) => {
      setPublicRooms(rooms);
    });

    s.on('game:state', (state) => {
      setGameState(state);

      // Check turn chime
      if (state.currentTurnPlayerId === user.id && prevTurnRef.current !== user.id) {
        sounds.playTurnAlert();
      }
      prevTurnRef.current = state.currentTurnPlayerId;

      // Check win sound
      if (state.roundState === 'SHOWDOWN' && prevRoundRef.current !== 'SHOWDOWN') {
        const selfWon = state.players.some(p => p.id === user.id && p.isWinner);
        if (selfWon) {
          sounds.playWin();
        }
      }
      prevRoundRef.current = state.roundState;

      // Update local chips if player present
      const self = state.players.find(p => p.id === user.id);
      if (self) {
        setUser(u => {
          const updated = { ...u, chips: self.chips };
          saveUser(updated);
          return updated;
        });
      }
    });

    s.on('chat:message', (msg) => {
      setChatMessages(prev => [...prev.slice(-40), msg]);
    });

    s.on('chat:reaction', (reaction) => {
      setReactions(prev => [...prev, reaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.timestamp !== reaction.timestamp));
      }, 3000);
    });

    s.on('game:error', (err) => {
      setErrorMessage(err.message);
      setTimeout(() => setErrorMessage(null), 4000);
    });

    s.on('room:kicked', (data) => {
      alert(data.message || 'You were kicked from the room.');
      setGameState(null);
      s.emit('lobby:get_rooms');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const toggleSound = () => {
    const isMuted = sounds.toggleMute();
    setMuted(isMuted);
  };

  const updateProfile = (name, avatar) => {
    const updated = { ...user, name, avatar };
    setUser(updated);
    saveUser(updated);
  };

  const claimDailyTopup = () => {
    const today = new Date().toDateString();
    if (user.lastTopupDate !== today || user.chips < 2000) {
      const updated = {
        ...user,
        chips: user.chips + 5000,
        lastTopupDate: today
      };
      setUser(updated);
      saveUser(updated);
      sounds.playWin();
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      user,
      setUser,
      updateProfile,
      claimDailyTopup,
      gameState,
      publicRooms,
      chatMessages,
      reactions,
      errorMessage,
      muted,
      toggleSound
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useGame = () => useContext(SocketContext);
