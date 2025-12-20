import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, X, MessageSquare } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SquadChat = ({ squadId, squadName, isOpen, onClose, wsConnection }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && squadId) {
      fetchMessages();
    }
  }, [isOpen, squadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for WebSocket messages
  useEffect(() => {
    if (wsConnection) {
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chat_message' && data.message.squad_id === squadId) {
            setMessages(prev => [...prev, data.message]);
          }
        } catch (e) {
          console.error('Failed to parse WS message:', e);
        }
      };
      
      wsConnection.addEventListener('message', handleMessage);
      return () => wsConnection.removeEventListener('message', handleMessage);
    }
  }, [wsConnection, squadId]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/squads/${squadId}/messages`, { withCredentials: true });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Send via API (which will broadcast via WebSocket)
      await axios.post(`${API}/squads/${squadId}/messages`, {
        content: newMessage.trim(),
        message_type: 'text'
      }, { withCredentials: true });
      
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 right-4 w-96 h-[500px] glass-panel flex flex-col z-50"
        data-testid="squad-chat"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-neon-green" />
            <h3 className="font-bold">{squadName || 'Squad Chat'}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
            data-testid="close-chat-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="spinner"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.message_id}
                className={`flex gap-2 ${msg.user_id === user.user_id ? 'flex-row-reverse' : ''}`}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  <img 
                    src={msg.user_picture || 'https://via.placeholder.com/32'} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`max-w-[70%] ${msg.user_id === user.user_id ? 'text-right' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-zinc-400">
                      {msg.user_id === user.user_id ? 'You' : msg.user_name}
                    </span>
                    <span className="text-xs text-zinc-600">{formatTime(msg.created_at)}</span>
                  </div>
                  <div 
                    className={`px-3 py-2 rounded-lg text-sm ${
                      msg.user_id === user.user_id 
                        ? 'bg-neon-green text-black' 
                        : 'bg-secondary text-white'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-secondary/50 border-transparent"
              data-testid="chat-input"
            />
            <Button 
              type="submit" 
              className="bg-neon-green text-black px-3"
              disabled={!newMessage.trim()}
              data-testid="send-message-btn"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </motion.div>
    </AnimatePresence>
  );
};

export default SquadChat;
