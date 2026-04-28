import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  MapPin, Users, Search, ChevronRight, Globe,
  Radar, Clock, Radio, ElectricCar, Settings2, Speedometer
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LOBBY_IMAGES = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542362567-b05503f3f7f4?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1583121274602-3e2820c69888?q=80&w=2070&auto=format&fit=crop"
];

const Lobbies = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [lobbies, setLobbies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joining, setJoining] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

  useEffect(() => {
    fetchLobbies();
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    }, 60000);
    return () => clearInterval(timer);
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

  const filteredLobbies = lobbies.filter(l => 
    l.city.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredLobbies = lobbies.slice(0, 3);
  const secondaryLobbies = lobbies.slice(3);

  return (
    <div className="min-h-screen bg-background text-on-background font-body-base antialiased pb-24">
      {/* Sub-Header / Status Bar */}
      <div className="hidden md:flex justify-between items-center px-6 h-14 bg-surface-container-lowest border-b border-white/5">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-zinc-500 uppercase tracking-widest">Current Sector</span>
            <div className="flex items-center gap-2">
              <MapPin className="text-primary-fixed w-3 h-3" />
              <span className="font-headline-md text-[11px] text-white uppercase tracking-wider">
                {user?.current_lobby ? lobbies.find(l => l.lobby_id === user.current_lobby)?.city || 'Global' : 'Sector Unknown'}
              </span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-zinc-500 uppercase tracking-widest">Local Time</span>
            <div className="flex items-center gap-2">
              <Clock className="text-primary-fixed w-3 h-3" />
              <span className="font-stats-num text-[11px] text-white">{currentTime}</span>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <div className="flex flex-col">
            <span className="font-label-caps text-[10px] text-zinc-500 uppercase tracking-widest">Area Status</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-pulse"></span>
              <span className="font-label-caps text-[10px] text-primary-fixed font-bold tracking-widest">
                {lobbies.reduce((acc, curr) => acc + curr.member_count, 0)} DRIVERS ACTIVE
              </span>
            </div>
          </div>
        </div>
      </div>

      <main className="pt-12 px-margin max-w-container-max mx-auto">
        {/* Header Section */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="font-label-caps text-xs text-primary-fixed mb-2 block tracking-[0.2em] uppercase font-bold">DISCOVERY ENGINE</span>
              <h2 className="font-display-lg text-5xl md:text-6xl text-white uppercase leading-none font-black italic tracking-tighter">Lobbies</h2>
            </div>
            <div className="w-full md:w-96">
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-zinc-500 w-5 h-5" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-high border-none text-white font-label-caps py-4 pl-12 pr-4 rounded-none focus:ring-1 focus:ring-primary-fixed transition-all placeholder:text-zinc-600 tracking-widest text-xs" 
                  placeholder="SEARCH CITY OR SECTOR..."
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-12 h-12 border-2 border-primary-fixed border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Featured Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-16">
              {featuredLobbies.map((lobby, i) => (
                <div key={lobby.lobby_id} className="group relative overflow-hidden rounded-none bg-surface-container border border-white/10 milled-edge hover:border-primary-fixed/50 transition-all cursor-pointer">
                  <div className="h-52 overflow-hidden relative">
                    <img 
                      src={LOBBY_IMAGES[i % LOBBY_IMAGES.length]} 
                      alt={lobby.city}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent"></div>
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-none border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse"></span>
                      <span className="font-label-caps text-[10px] text-white tracking-widest uppercase">LIVE NOW</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-headline-md text-xl text-white mb-2 uppercase font-bold italic tracking-wider group-hover:text-primary-fixed transition-colors">
                      {lobby.city} Sector
                    </h3>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="flex items-center gap-2">
                        <Users className="text-primary-fixed w-4 h-4" />
                        <span className="font-stats-num text-lg text-primary-fixed font-bold italic">{lobby.member_count}</span>
                        <span className="font-label-caps text-[10px] text-zinc-500 uppercase tracking-widest">Members</span>
                      </div>
                      <div className="h-4 w-[1px] bg-white/10"></div>
                      <div className="flex items-center gap-2">
                        <MapPin className="text-zinc-500 w-3 h-3" />
                        <span className="font-label-caps text-[10px] text-zinc-500 uppercase tracking-widest">{lobby.state}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleJoinLobby(lobby.city, lobby.state)}
                      disabled={joining || user?.current_lobby === lobby.lobby_id}
                      className={`w-full py-6 rounded-none font-label-caps tracking-widest uppercase text-xs font-bold transition-all ${
                        user?.current_lobby === lobby.lobby_id
                          ? 'bg-primary-fixed/10 text-primary-fixed border border-primary-fixed/30 cursor-default'
                          : 'bg-primary-fixed text-black hover:brightness-110 active:scale-95'
                      }`}
                    >
                      {user?.current_lobby === lobby.lobby_id ? 'CURRENT SECTOR' : 'JOIN LOBBY'}
                    </Button>
                  </div>
                </div>
              ))}
            </section>

            {/* Secondary List / Nearby */}
            <section>
              <div className="flex items-center gap-4 mb-8">
                <Radio className="text-primary-fixed w-5 h-5 animate-pulse" />
                <h4 className="font-label-caps text-sm text-white tracking-[0.2em] uppercase font-bold">NEARBY SECTORS</h4>
              </div>
              <div className="space-y-2">
                {secondaryLobbies.map((lobby) => (
                  <div 
                    key={lobby.lobby_id}
                    onClick={() => handleJoinLobby(lobby.city, lobby.state)}
                    className="flex items-center justify-between p-6 bg-surface-container-low border border-white/5 hover:bg-surface-container-high hover:border-primary-fixed/30 transition-all rounded-none group cursor-pointer"
                  >
                    <div className="flex items-center gap-8">
                      <div className="h-14 w-14 bg-surface-container-highest border border-white/10 flex items-center justify-center rounded-none group-hover:bg-primary-fixed group-hover:text-black transition-all">
                        <Radar className="text-primary-fixed group-hover:text-black w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-headline-md text-lg text-white uppercase font-bold italic tracking-wider group-hover:text-primary-fixed transition-colors">
                          {lobby.city} SECTOR
                        </p>
                        <p className="font-label-caps text-[10px] text-zinc-500 tracking-widest uppercase">
                          {lobby.state} • {lobby.member_count} ACTIVE DRIVERS
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-12">
                      <div className="hidden md:flex flex-col items-end">
                        <span className="font-stats-num text-lg text-white font-bold italic">{(lobby.member_count * 12.5).toFixed(0)}</span>
                        <span className="font-label-caps text-[10px] text-zinc-600 tracking-widest uppercase">AREA RANK</span>
                      </div>
                      <div className={`p-3 border transition-all ${
                        user?.current_lobby === lobby.lobby_id 
                          ? 'bg-primary-fixed text-black border-primary-fixed' 
                          : 'border-white/10 group-hover:border-primary-fixed group-hover:text-primary-fixed'
                      }`}>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ))}
                {secondaryLobbies.length === 0 && lobbies.length <= 3 && searchQuery === '' && (
                  <div className="p-12 text-center text-zinc-600 border border-dashed border-white/10">
                    <p className="font-label-caps text-xs tracking-widest uppercase">Expand search radius to discover more sectors</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Lobbies;

