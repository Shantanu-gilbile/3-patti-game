import React, { useEffect } from 'react';
import { useGame } from './context/GameContext';
import { Lobby } from './components/Lobby';
import { Table } from './components/Table';

function App() {
  const { socket, user, gameState, connected } = useGame();

  // Check URL parameters for direct room join (e.g. ?room=ABCD12)
  useEffect(() => {
    if (socket && connected && !gameState) {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        socket.emit('room:join', {
          roomId: roomParam.toUpperCase(),
          player: user
        });
      }
    }
  }, [socket, connected]);

  const handleCreateRoom = ({ name, isPrivate, config }) => {
    socket.emit('room:create', {
      name,
      isPrivate,
      config,
      player: user
    });
  };

  const handleJoinRoom = (roomId) => {
    socket.emit('room:join', {
      roomId: roomId.toUpperCase(),
      player: user
    });
  };

  const handleLeaveRoom = () => {
    if (socket && gameState) {
      socket.emit('room:leave', { playerId: user.id });
      // clear URL parameter if present
      if (window.history.pushState) {
        window.history.pushState({}, document.title, window.location.pathname);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans selection:bg-amber-500 selection:text-black">
      {gameState ? (
        <Table onLeaveRoom={handleLeaveRoom} />
      ) : (
        <Lobby onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} />
      )}
    </div>
  );
}

export default App;
