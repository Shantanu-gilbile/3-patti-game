import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, MessageSquare, X } from 'lucide-react';

const QUICK_EMOJIS = ['🔥', '😂', '😎', '😱', '💰', '👏', '💔', '🚀'];

export const ChatBox = ({
  chatMessages = [],
  onSendMessage,
  onSendReaction,
  isOpen,
  onClose
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h3 className="font-semibold text-sm text-slate-200">Table Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Reaction Bar */}
      <div className="p-2 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-around">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="text-lg hover:scale-125 transition transform active:scale-95"
            title={`Send ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {chatMessages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 mt-10">
            No messages yet. Say hello to table players!
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="text-xs space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-amber-400">{msg.sender.name}</span>
                <span className="text-[10px] text-slate-500">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="bg-slate-900/80 px-2.5 py-1.5 rounded-lg text-slate-200 border border-slate-800/60 break-words">
                {msg.message}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={150}
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2 rounded-xl transition active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
