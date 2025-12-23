import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import SquadChat from '@/components/SquadChat';
import useWebSocket from '@/hooks/useWebSocket';
import { 
  Users, Shield, Crown, UserPlus, LogOut, 
  Check, X, ArrowLeft, DollarSign, Settings,
  MessageSquare
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// PayPal configuration - using sandbox for demo
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'sb'; // 'sb' for sandbox

const SquadPage = () => {
  const { user, updateUser, sessionToken } = useAuth();
  const navigate = useNavigate();
  
  const [squad, setSquad] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    tag: '',
    color: '#22c55e',
    description: ''
  });
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  // WebSocket connection for real-time chat
  const { isConnected, lastMessage, websocket } = useWebSocket(sessionToken);

  useEffect(() => {
    fetchSquadData();
  }, []);

  const fetchSquadData = async () => {
    try {
      const [squadRes, invitesRes] = await Promise.all([
        axios.get(`${API}/squads`, { withCredentials: true }),
        axios.get(`${API}/squads/invites`, { withCredentials: true })
      ]);
      setSquad(squadRes.data);
      setInvites(invitesRes.data);
    } catch (error) {
      console.error('Error fetching squad data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSquad = async () => {
    if (!paymentComplete || !paymentId) {
      toast.error('Please complete payment first');
      return;
    }

    if (!createForm.name || !createForm.tag) {
      toast.error('Name and tag are required');
      return;
    }

    if (createForm.tag.length < 2 || createForm.tag.length > 4) {
      toast.error('Tag must be 2-4 characters');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/squads/create?payment_id=${paymentId}`,
        createForm,
        { withCredentials: true }
      );
      toast.success('Squad created!');
      setSquad(response.data.squad);
      updateUser({ ...user, current_squad: response.data.squad.squad_id });
      setShowCreate(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create squad');
    }
  };

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      await axios.put(
        `${API}/squads/invites/${inviteId}?accept=${accept}`,
        {},
        { withCredentials: true }
      );
      toast.success(accept ? 'Joined squad!' : 'Invite declined');
      fetchSquadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to respond to invite');
    }
  };

  const handleLeaveSquad = async () => {
    if (!window.confirm('Are you sure you want to leave the squad?')) return;
    
    try {
      await axios.post(`${API}/squads/leave`, {}, { withCredentials: true });
      toast.success('Left squad');
      setSquad(null);
      updateUser({ ...user, current_squad: null });
    } catch (error) {
      toast.error('Failed to leave squad');
    }
  };

  const SQUAD_COLORS = [
    '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', 
    '#ec4899', '#ef4444', '#f97316', '#fbbf24'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

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
              <div className="w-8 h-8 bg-neon-green flex items-center justify-center">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-unbounded font-bold text-xl">SQUADS</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Current Squad */}
        {squad ? (
          <section className="mb-12">
            <div className="glass-panel p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-16 h-16 rounded flex items-center justify-center font-unbounded font-bold text-2xl text-black"
                    style={{ backgroundColor: squad.color }}
                  >
                    [{squad.tag}]
                  </div>
                  <div>
                    <h2 className="font-unbounded font-bold text-2xl">{squad.name}</h2>
                    <p className="text-zinc-400 text-sm">
                      {squad.members?.length || 0}/8 Members
                    </p>
                  </div>
                </div>
                
                {squad.owner_id === user.user_id && (
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <span className="text-xs font-mono uppercase text-yellow-500">Owner</span>
                  </div>
                )}
              </div>

              {squad.description && (
                <p className="text-zinc-400 mb-6">{squad.description}</p>
              )}

              {/* Members */}
              <div className="mb-6">
                <h3 className="text-sm font-mono uppercase text-zinc-500 mb-3">Squad Members</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {squad.member_details?.map((member) => (
                    <div 
                      key={member.user_id}
                      className="bg-secondary/50 p-3 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10">
                        <img 
                          src={member.picture || 'https://via.placeholder.com/40'} 
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{member.name}</p>
                        {member.user_id === squad.owner_id && (
                          <span className="text-xs text-yellow-500">Owner</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array(8 - (squad.member_details?.length || 0)).fill(null).map((_, i) => (
                    <div 
                      key={`empty-${i}`}
                      className="bg-secondary/20 p-3 flex items-center gap-3 border border-dashed border-zinc-700"
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-zinc-600" />
                      </div>
                      <p className="text-zinc-600 text-sm">Empty Slot</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleLeaveSquad}
                className="text-red-400 hover:text-red-300 hover:border-red-400"
                data-testid="leave-squad-btn"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Squad
              </Button>
              
              {/* Squad Chat Button */}
              <Button
                onClick={() => setShowChat(true)}
                className="ml-3 bg-neon-cyan text-black hover:bg-neon-cyan/80"
                data-testid="open-chat-btn"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Squad Chat
                {isConnected && (
                  <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </Button>
            </div>
            
            {/* Squad Chat Component */}
            <SquadChat
              squadId={squad.squad_id}
              squadName={squad.name}
              isOpen={showChat}
              onClose={() => setShowChat(false)}
              wsConnection={websocket}
            />
          </section>
        ) : (
          <>
            {/* Pending Invites */}
            {invites.length > 0 && (
              <section className="mb-12">
                <h2 className="font-unbounded font-bold text-xl mb-4">
                  PENDING <span className="text-neon-cyan">INVITES</span>
                </h2>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <motion.div
                      key={invite.invite_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass-panel p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-12 h-12 rounded flex items-center justify-center font-bold text-black"
                          style={{ backgroundColor: invite.squad?.color || '#22c55e' }}
                        >
                          [{invite.squad?.tag}]
                        </div>
                        <div>
                          <p className="font-bold">{invite.squad?.name}</p>
                          <p className="text-xs text-zinc-500">
                            {invite.squad?.members?.length || 0}/8 members
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleInviteResponse(invite.invite_id, false)}
                          className="text-red-400"
                          data-testid={`decline-invite-${invite.invite_id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleInviteResponse(invite.invite_id, true)}
                          className="bg-neon-green text-black"
                          data-testid={`accept-invite-${invite.invite_id}`}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {/* Create Squad */}
            <section>
              <h2 className="font-unbounded font-bold text-xl mb-4">
                CREATE A <span className="text-neon-green">SQUAD</span>
              </h2>
              
              {!showCreate ? (
                <div className="glass-panel p-8 text-center">
                  <Shield className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                  <h3 className="font-unbounded font-bold text-xl mb-2">Start Your Crew</h3>
                  <p className="text-zinc-400 mb-6">
                    Create a squad and invite up to 7 friends to join your crew.
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <DollarSign className="w-5 h-5 text-neon-green" />
                    <span className="font-unbounded font-bold text-2xl text-neon-green">$5.00</span>
                    <span className="text-zinc-500">one-time</span>
                  </div>
                  <Button
                    onClick={() => setShowCreate(true)}
                    className="btn-skew bg-neon-green text-black font-bold"
                    data-testid="create-squad-btn"
                  >
                    <span>Create Squad</span>
                  </Button>
                </div>
              ) : (
                <div className="glass-panel p-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Form */}
                    <div className="space-y-6">
                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                          Squad Name
                        </label>
                        <Input
                          value={createForm.name}
                          onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                          placeholder="e.g., Night Riders"
                          maxLength={24}
                          className="bg-secondary/50 border-transparent"
                          data-testid="squad-name-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                          Tag (2-4 chars)
                        </label>
                        <Input
                          value={createForm.tag}
                          onChange={(e) => setCreateForm({...createForm, tag: e.target.value.toUpperCase()})}
                          placeholder="e.g., NR"
                          maxLength={4}
                          className="bg-secondary/50 border-transparent uppercase font-bold"
                          data-testid="squad-tag-input"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                          Squad Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SQUAD_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setCreateForm({...createForm, color})}
                              className={`color-option ${createForm.color === color ? 'selected' : ''}`}
                              style={{ backgroundColor: color }}
                              data-testid={`squad-color-${color}`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">
                          Description (optional)
                        </label>
                        <Input
                          value={createForm.description}
                          onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                          placeholder="What's your squad about?"
                          maxLength={100}
                          className="bg-secondary/50 border-transparent"
                          data-testid="squad-desc-input"
                        />
                      </div>
                    </div>
                    
                    {/* Payment */}
                    <div>
                      <h3 className="font-unbounded font-bold mb-4">Payment</h3>
                      
                      {paymentComplete ? (
                        <div className="bg-green-500/10 border border-green-500/30 p-6 text-center mb-4">
                          <Check className="w-12 h-12 text-green-500 mx-auto mb-2" />
                          <p className="font-bold text-green-500">Payment Complete!</p>
                          <p className="text-sm text-zinc-400">Click below to create your squad</p>
                        </div>
                      ) : (
                        <div className="bg-secondary/30 p-4 rounded mb-4">
                          <p className="text-sm text-zinc-400 mb-4 text-center">
                            Pay $5.00 to create your squad
                          </p>
                          <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD' }}>
                            <PayPalButtons
                              style={{ layout: 'vertical', color: 'gold', shape: 'rect' }}
                              createOrder={(data, actions) => {
                                return actions.order.create({
                                  purchase_units: [{
                                    amount: { value: '5.00' },
                                    description: 'Kynetik Squad Creation'
                                  }]
                                });
                              }}
                              onApprove={(data, actions) => {
                                return actions.order.capture().then((details) => {
                                  setPaymentId(details.id);
                                  setPaymentComplete(true);
                                  toast.success('Payment successful!');
                                });
                              }}
                              onError={(err) => {
                                console.error('PayPal error:', err);
                                toast.error('Payment failed. Please try again.');
                              }}
                            />
                          </PayPalScriptProvider>
                        </div>
                      )}
                      
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowCreate(false);
                            setPaymentComplete(false);
                            setPaymentId(null);
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateSquad}
                          disabled={!paymentComplete}
                          className="flex-1 bg-neon-green text-black disabled:opacity-50"
                          data-testid="confirm-create-squad-btn"
                        >
                          Create Squad
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default SquadPage;
