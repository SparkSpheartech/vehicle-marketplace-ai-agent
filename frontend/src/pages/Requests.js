import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Car, MapPin, Users, Settings, ArrowLeft, 
  Bell, Check, X, Clock, ChevronRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Requests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('incoming');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        axios.get(`${API}/requests/incoming`, { withCredentials: true }),
        axios.get(`${API}/requests/outgoing`, { withCredentials: true }),
      ]);
      setIncomingRequests(incomingRes.data);
      setOutgoingRequests(outgoingRes.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, status) => {
    try {
      await axios.put(
        `${API}/requests/${requestId}`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Request ${status}!`);
      fetchRequests();
    } catch (error) {
      toast.error('Failed to respond to request');
    }
  };

  const navItems = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/dashboard' },
    { icon: <Users className="w-5 h-5" />, label: 'Lobbies', path: '/lobbies' },
    { icon: <Car className="w-5 h-5" />, label: 'Garage', path: '/garage' },
    { icon: <Settings className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  const pendingIncoming = incomingRequests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-neon-green flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-black" />
                {pendingIncoming.length > 0 && (
                  <span className="notification-badge">{pendingIncoming.length}</span>
                )}
              </div>
              <h1 className="font-unbounded font-bold text-xl">REQUESTS</h1>
            </div>
          </div>
          
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('incoming')}
            data-testid="incoming-tab"
            className={`flex-1 py-3 font-mono text-sm uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'incoming'
                ? 'border-neon-green text-neon-green'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Incoming ({pendingIncoming.length})
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            data-testid="outgoing-tab"
            className={`flex-1 py-3 font-mono text-sm uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'outgoing'
                ? 'border-neon-green text-neon-green'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Outgoing ({outgoingRequests.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Incoming Requests */}
            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {pendingIncoming.length === 0 ? (
                  <div className="glass-panel p-12 text-center">
                    <Bell className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No pending requests</p>
                  </div>
                ) : (
                  pendingIncoming.map((request, index) => (
                    <motion.div
                      key={request.request_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="request-card glass-panel p-6"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full border-2 border-neon-cyan overflow-hidden flex-shrink-0">
                          <img
                            src={request.from_user?.picture || 'https://via.placeholder.com/56'}
                            alt={request.from_user?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg">{request.from_user?.name}</h3>
                          <p className="text-sm text-zinc-400 truncate">
                            {request.message || 'Wants to connect with you'}
                          </p>
                          <p className="text-xs text-zinc-500 font-mono mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/user/${request.from_user_id}`)}
                            data-testid={`view-${request.request_id}`}
                            className="text-xs"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResponse(request.request_id, 'declined')}
                            data-testid={`decline-${request.request_id}`}
                            className="text-xs text-red-400 hover:text-red-300 hover:border-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResponse(request.request_id, 'accepted')}
                            data-testid={`accept-${request.request_id}`}
                            className="text-xs bg-neon-green text-black hover:bg-neon-green/90"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Outgoing Requests */}
            {activeTab === 'outgoing' && (
              <div className="space-y-4">
                {outgoingRequests.length === 0 ? (
                  <div className="glass-panel p-12 text-center">
                    <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400">No outgoing requests</p>
                    <p className="text-sm text-zinc-500 mt-2">
                      Find drivers on the map to connect with them
                    </p>
                  </div>
                ) : (
                  outgoingRequests.map((request, index) => (
                    <motion.div
                      key={request.request_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-panel p-4 flex items-center gap-4"
                    >
                      <div className="flex-1">
                        <p className="text-sm text-zinc-400">
                          Request to <span className="text-white font-bold">{request.to_user_id}</span>
                        </p>
                        <p className="text-xs text-zinc-500 font-mono mt-1">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <span className={`text-xs font-mono uppercase tracking-wider px-3 py-1 ${
                        request.status === 'pending' 
                          ? 'bg-yellow-500/20 text-yellow-500' 
                          : request.status === 'accepted'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-red-500/20 text-red-500'
                      }`}>
                        {request.status}
                      </span>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Requests;
