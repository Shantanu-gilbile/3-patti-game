import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { AVATARS } from '../utils/userStorage';
import { Plus, Users, Lock, Unlock, Play, RefreshCw, Volume2, VolumeX, Gift } from 'lucide-react';

export const Lobby = ({ onJoinRoom, onCreateRoom }) => {
  const { user, updateProfile, claimDailyTopup, publicRooms, socket, muted, toggleSound } = useGame();

  const [name, setName] = useState(user.name);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New room settings
  const [tableName, setTableName] = useState(`${user.name}'s Table`);
  const [isPrivate, setIsPrivate] = useState(false);
  const [bootAmount, setBootAmount] = useState(100);
  const [potLimit, setPotLimit] = useState(50000);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile(name, selectedAvatar);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onCreateRoom({
      name: tableName,
      isPrivate,
      config: {
        bootAmount: Number(bootAmount),
        potLimit: Number(potLimit)
      }
    });
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-felt-board to-slate-950 p-4 sm:p-8 flex flex-col items-center">
      {/* Top Banner Disclaimer */}
      <div className="w-full max-w-4xl bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2 mb-6 text-center text-xs text-amber-300 font-medium flex items-center justify-between">
        <span>🎮 FOR ENTERTAINMENT ONLY — No real money or real gambling involved. Virtual chips only.</span>
        <button
          onClick={toggleSound}
          className="p-1 rounded hover:bg-amber-500/20 text-amber-300 ml-2"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Player Profile Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-cinzel text-amber-400">Player Card</h2>
              <button
                onClick={claimDailyTopup}
                className="flex items-center gap-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/40 transition active:scale-95"
              >
                <Gift className="w-3.5 h-3.5" /> Free Top-Up
              </button>
            </div>

            {/* Profile Avatar & Name */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-lg mb-3">
                {selectedAvatar}
              </div>
              <div className="flex items-center gap-1.5 text-xl font-bold text-amber-400">
                <span>🪙</span>
                <span>{user.chips.toLocaleString()}</span>
              </div>
              <span className="text-xs text-slate-400">Virtual Chips</span>
            </div>

            {/* Avatar Selector */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-2">Choose Avatar:</label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    onClick={() => setSelectedAvatar(av)}
                    className={`text-xl p-1.5 rounded-xl border transition ${
                      selectedAvatar === av
                        ? 'bg-amber-500/20 border-amber-400 scale-110'
                        : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            {/* Nickname input */}
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nickname:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={15}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 py-2 rounded-xl border border-slate-700 transition"
              >
                Save Profile
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
            Standard 52 Cards Deck • 3 Cards • Pure Realtime Action
          </div>
        </div>

        {/* Right Column: Public Lobby Tables & Join via Code */}
        <div className="md:col-span-2 space-y-6">
          {/* Quick Actions Bar */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Join by Code */}
            <div className="flex gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="6-Letter Room Code"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 w-full sm:w-44 uppercase tracking-widest text-center font-bold focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => roomCodeInput && onJoinRoom(roomCodeInput)}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 whitespace-nowrap"
              >
                Join
              </button>
            </div>

            {/* Create Table Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-950 flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create Table
            </button>
          </div>

          {/* Public Tables List */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Public Tables</h3>
              </div>
              <button
                onClick={() => socket?.emit('lobby:get_rooms')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-sm">No public tables open right now.</p>
                <p className="text-xs mt-1 text-slate-600">Create your own table and invite friends!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {publicRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-800/60 border border-slate-700/60 hover:border-amber-400/50 rounded-2xl p-4 flex flex-col justify-between transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-200 group-hover:text-amber-400 transition truncate max-w-[150px]">
                          {room.name}
                        </span>
                        <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                          #{room.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                        <span>Players: {room.playerCount}/{room.maxPlayers}</span>
                        <span>Boot: 🪙{room.bootAmount}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onJoinRoom(room.id)}
                      className="mt-4 w-full bg-slate-700 hover:bg-amber-500 hover:text-slate-950 text-amber-300 font-semibold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" /> Join Table
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400 mb-4 font-cinzel">Create New Table</h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Table Name:</label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  maxLength={25}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Boot Amount (🪙):</label>
                  <select
                    value={bootAmount}
                    onChange={(e) => setBootAmount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Pot Limit (🪙):</label>
                  <select
                    value={potLimit}
                    onChange={(e) => setPotLimit(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-400"
                  >
                    <option value={20000}>20,000</option>
                    <option value={50000}>50,000</option>
                    <option value={100000}>100,000</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="privateCheckbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="privateCheckbox" className="text-slate-300 text-xs cursor-pointer flex items-center gap-1.5">
                  {isPrivate ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                  Private Room (Only joinable via 6-letter code or link)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition active:scale-95"
                >
                  Create & Sit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
