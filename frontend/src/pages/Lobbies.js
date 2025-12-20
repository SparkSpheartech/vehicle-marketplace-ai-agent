import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Car, MapPin, Users, Settings, ArrowLeft, 
  Search, ChevronRight, Globe
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Popular US cities
const POPULAR_CITIES = [
  { city: 'Los Angeles', state: 'CA' },
  { city: 'Miami', state: 'FL' },
  { city: 'Houston', state: 'TX' },
  { city: 'New York', state: 'NY' },
  { city: 'Chicago', state: 'IL' },
  { city: 'Phoenix', state: 'AZ' },
  { city: 'Dallas', state: 'TX' },
  { city: 'San Diego', state: 'CA' },
  { city: 'Atlanta', state: 'GA' },
  { city: 'Las Vegas', state: 'NV' },
  { city: 'Denver', state: 'CO' },
  { city: 'Seattle', state: 'WA' },
];

const Lobbies = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [searchState, setSearchState] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchLobbies();
  }, []);

  const fetchLobbies = async () => {
    try {
      const response = await axios.get(`${API}/lobbies`, { withCredentials: true });
      setLobbies(response.data);
    } catch (error) {
      console.error('Failed to fetch lobbies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async (city, state) => {
    setJoining(true);
    try {
      const response = await axios.post(
        `${API}/lobbies/join`,
        { city, state },
        { withCredentials: true }
      );
      toast.success(`Joined ${city}, ${state}!`);
      updateUser({ ...user, current_lobby: response.data.lobby.lobby_id });
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to join lobby');
    } finally {
      setJoining(false);
    }
  };

  const handleCustomJoin = (e) => {
    e.preventDefault();
    if (!searchCity.trim() || !searchState.trim()) {
      toast.error('Please enter both city and state');
      return;
    }
    handleJoinLobby(searchCity.trim(), searchState.trim());
  };

  const navItems = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/dashboard' },
    { icon: <Users className="w-5 h-5" />, label: 'Lobbies', path: '/lobbies', active: true },
    { icon: <Car className="w-5 h-5" />, label: 'Garage', path: '/garage' },
    { icon: <Settings className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
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
                <Globe className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-unbounded font-bold text-xl">LOBBIES</h1>
            </div>
          </div>
          
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors ${
                  item.active 
                    ? 'text-neon-green' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Custom lobby join */}
        <section className="mb-12">
          <h2 className="font-unbounded font-bold text-2xl mb-6">
            JOIN A <span className="text-neon-green">CITY</span>
          </h2>
          
          <form onSubmit={handleCustomJoin} className="glass-panel p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  City Name
                </label>
                <Input
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  placeholder="e.g., Los Angeles"
                  className="bg-secondary/50 border-transparent focus:border-neon-green"
                  data-testid="city-input"
                />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                  State
                </label>
                <Input
                  value={searchState}
                  onChange={(e) => setSearchState(e.target.value.toUpperCase())}
                  placeholder="CA"
                  maxLength={2}
                  className="bg-secondary/50 border-transparent focus:border-neon-green uppercase"
                  data-testid="state-input"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={joining}
                  data-testid="join-custom-lobby-btn"
                  className="btn-skew bg-neon-green text-black font-bold uppercase tracking-wider hover:bg-neon-green/90 px-8 py-3 w-full md:w-auto"
                >
                  <span>{joining ? 'Joining...' : 'Join'}</span>
                </Button>
              </div>
            </div>
          </form>
        </section>

        {/* Popular cities */}
        <section className="mb-12">
          <h2 className="font-unbounded font-bold text-2xl mb-6">
            POPULAR <span className="text-neon-cyan">CITIES</span>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {POPULAR_CITIES.map((item) => {
              const existingLobby = lobbies.find(
                l => l.city.toLowerCase() === item.city.toLowerCase() && 
                     l.state.toLowerCase() === item.state.toLowerCase()
              );
              
              return (
                <motion.button
                  key={`${item.city}-${item.state}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleJoinLobby(item.city, item.state)}
                  disabled={joining}
                  data-testid={`lobby-${item.city.toLowerCase().replace(' ', '-')}`}
                  className="lobby-item glass-panel p-6 text-left border border-white/10 hover:border-neon-green/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-unbounded font-bold text-lg">
                        {item.city}
                      </h3>
                      <p className="text-zinc-400 text-sm">{item.state}</p>
                    </div>
                    <div className="text-right">
                      {existingLobby && (
                        <p className="text-neon-green font-mono text-sm">
                          {existingLobby.member_count} online
                        </p>
                      )}
                      <ChevronRight className="w-5 h-5 text-zinc-500 ml-auto mt-1" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Active lobbies */}
        <section>
          <h2 className="font-unbounded font-bold text-2xl mb-6">
            ACTIVE <span className="text-neon-green">LOBBIES</span>
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="spinner"></div>
            </div>
          ) : lobbies.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No active lobbies yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lobbies
                .sort((a, b) => b.member_count - a.member_count)
                .map((lobby) => (
                  <motion.button
                    key={lobby.lobby_id}
                    whileHover={{ x: 4 }}
                    onClick={() => handleJoinLobby(lobby.city, lobby.state)}
                    disabled={joining || user?.current_lobby === lobby.lobby_id}
                    data-testid={`active-lobby-${lobby.lobby_id}`}
                    className={`w-full lobby-item glass-panel p-4 text-left border border-white/10 flex items-center justify-between transition-all duration-300 ${
                      user?.current_lobby === lobby.lobby_id 
                        ? 'border-neon-green/50 bg-neon-green/5' 
                        : 'hover:border-neon-green/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-secondary flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-neon-cyan" />
                      </div>
                      <div>
                        <h3 className="font-bold">
                          {lobby.city}, {lobby.state}
                        </h3>
                        <p className="text-xs text-zinc-500 font-mono">
                          {lobby.country}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-neon-green font-mono font-bold">
                          {lobby.member_count}
                        </p>
                        <p className="text-xs text-zinc-500">drivers</p>
                      </div>
                      {user?.current_lobby === lobby.lobby_id ? (
                        <span className="text-xs font-mono uppercase tracking-wider text-neon-green px-3 py-1 border border-neon-green/30 bg-neon-green/10">
                          Current
                        </span>
                      ) : (
                        <ChevronRight className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                  </motion.button>
                ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Lobbies;
