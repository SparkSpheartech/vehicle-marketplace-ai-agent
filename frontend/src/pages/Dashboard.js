import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Car, MapPin, Users, Bell, Settings, LogOut, 
  Menu, X, ChevronRight, UserPlus, Gauge, Shield, Music2,
  Radar, Route, MilitaryTech
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [currentLobby, setCurrentLobby] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [tripStats, setTripStats] = useState({
    top_speed: user?.top_speed || 0,
    total_distance: user?.total_miles || 0,
    avg_speed: 0,
    trip_start: null
  });
  const [lobbies, setLobbies] = useState([]);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [lobbiesRes, reqRes] = await Promise.all([
        axios.get(`${API}/lobbies`, { withCredentials: true }),
        axios.get(`${API}/requests/incoming`, { withCredentials: true })
      ]);
      setLobbies(lobbiesRes.data);
      setIncomingRequests(reqRes.data);
      
      if (user?.current_lobby) {
        const lobby = lobbiesRes.data.find(l => l.lobby_id === user.current_lobby);
        setCurrentLobby(lobby);
        
        const usersRes = await axios.get(`${API}/lobbies/${user.current_lobby}/users`, { withCredentials: true });
        setNearbyUsers(usersRes.data.filter(u => u.user_id !== user.user_id));
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  }, [user?.current_lobby, user?.user_id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-background text-on-background font-body-base pb-[100px] md:pb-0">
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Hero: Session Entry */}
        <section className="relative w-full aspect-[21/9] md:aspect-[16/5] rounded-lg overflow-hidden group shadow-2xl">
          <img 
            alt="Session Background" 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105" 
            src="https://images.unsplash.com/photo-1542362567-b05503f3f7f4?q=80&w=2070&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
          <div className="absolute inset-0 flex flex-col justify-end p-8">
            <p className="font-label-caps text-on-surface-variant uppercase mb-2 tracking-widest text-xs">STATUS: {currentLobby ? 'ACTIVE' : 'STANDBY'}</p>
            <h2 className="font-display-lg text-white text-4xl md:text-6xl uppercase drop-shadow-lg mb-6 tracking-tighter italic">ENTER WORLD</h2>
            <Button 
              onClick={() => navigate('/lobbies')}
              className="bg-primary-fixed text-on-primary font-label-caps px-8 py-6 h-auto rounded-none hover:bg-surface-tint hover:shadow-[0_0_20px_rgba(204,255,0,0.5)] transition-all uppercase w-max tracking-widest flex items-center gap-3"
            >
              START SESSION
              <Radar className="w-5 h-5" />
            </Button>
          </div>
        </section>

        {/* Bento Grid: Telemetry & Garage */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Quick Stats (Telemetry) */}
          <section className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-surface-container-low border border-white/10 rounded-none p-6 carbon-texture relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-fixed/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="text-on-surface-variant w-4 h-4" />
                <h3 className="font-label-caps text-on-surface-variant uppercase text-xs tracking-widest">TOP SPEED</h3>
              </div>
              <p className="font-stats-num text-white text-4xl font-bold italic">
                {tripStats.top_speed}<span className="text-on-surface-variant text-sm ml-1 font-normal not-italic">MPH</span>
              </p>
              <div className="mt-6 h-1 bg-surface-variant rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-fixed shadow-[0_0_10px_#CCFF00]" 
                  style={{ width: `${Math.min((tripStats.top_speed / 200) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-white/10 rounded-none p-6 carbon-texture relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-tertiary-fixed/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-2 mb-4">
                <Route className="text-on-surface-variant w-4 h-4" />
                <h3 className="font-label-caps text-on-surface-variant uppercase text-xs tracking-widest">TOTAL MILES</h3>
              </div>
              <p className="font-stats-num text-white text-4xl font-bold italic">{tripStats.total_distance.toLocaleString()}</p>
              <p className="font-label-caps text-tertiary-fixed mt-4 text-xs tracking-widest uppercase">LIFETIME STATS</p>
            </div>

            <div className="bg-surface-container-low border border-white/10 rounded-none p-6 carbon-texture relative overflow-hidden group col-span-1 sm:col-span-1">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary-container/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center gap-2 mb-4">
                <MilitaryTech className="text-on-surface-variant w-4 h-4" />
                <h3 className="font-label-caps text-on-surface-variant uppercase text-xs tracking-widest">CURRENT RANK</h3>
              </div>
              <p className="font-stats-num text-secondary-fixed text-2xl font-bold uppercase italic">
                {user?.rank || 'ROOKIE'}
              </p>
              <p className="font-label-caps text-on-surface-variant mt-4 text-xs tracking-widest uppercase text-right">TOP 10%</p>
            </div>
          </section>

          {/* Garage Preview */}
          <section className="md:col-span-4 bg-surface-container-low border border-white/10 rounded-none p-6 flex flex-col justify-between group relative overflow-hidden min-h-[200px]">
            {user?.primary_car ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
                <div className="relative z-20 flex justify-between items-start mb-12">
                  <h3 className="font-label-caps text-on-surface-variant uppercase tracking-widest bg-black/50 px-2 py-1 rounded text-[10px]">ACTIVE Vehicle</h3>
                  <span className="w-2 h-2 rounded-full bg-primary-fixed shadow-[0_0_8px_#CCFF00]"></span>
                </div>
                <div className="relative z-20 mt-auto">
                  <h4 className="font-headline-md text-white text-2xl uppercase font-bold italic mb-1">
                    {user.primary_car.make} {user.primary_car.model}
                  </h4>
                  <p className="font-label-caps text-on-surface-variant uppercase text-xs mb-6 tracking-widest">
                    SPEC: {user.primary_car.drivetrain} • {user.primary_car.horsepower} HP
                  </p>
                  <Button 
                    onClick={() => navigate('/garage')}
                    className="w-full bg-transparent border border-white/20 text-white font-label-caps py-2 rounded-none hover:border-primary-fixed hover:text-primary-fixed transition-colors uppercase text-xs tracking-widest"
                  >
                    CHANGE CAR
                  </Button>
                </div>
              </>
            ) : (
              <div className="relative z-20 h-full flex flex-col items-center justify-center text-center">
                <Car className="w-12 h-12 text-zinc-600 mb-4" />
                <p className="text-zinc-400 text-sm mb-4">No active vehicle set</p>
                <Button 
                  onClick={() => navigate('/garage')}
                  className="bg-primary-fixed text-black font-bold uppercase tracking-widest text-xs px-6"
                >
                  ADD CAR
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Active Lobbies */}
        <section className="bg-surface-container-low border border-white/10 rounded-none overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container-lowest">
            <div className="flex items-center gap-3">
              <Radar className="text-primary-fixed w-5 h-5" />
              <h3 className="font-label-caps text-primary-fixed font-bold uppercase tracking-widest text-sm">ACTIVE ZONES (LOCAL)</h3>
            </div>
            <Button 
              variant="ghost"
              onClick={() => navigate('/lobbies')}
              className="font-label-caps text-on-surface-variant hover:text-white transition-colors text-xs tracking-widest"
            >
              VIEW ALL
            </Button>
          </div>
          <div className="divide-y divide-white/5">
            {lobbies.slice(0, 3).map((lobby) => (
              <div 
                key={lobby.lobby_id}
                onClick={() => navigate('/lobbies')}
                className="p-6 hover:bg-white/5 transition-colors flex justify-between items-center cursor-pointer group"
              >
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-none bg-surface-container flex items-center justify-center border border-white/10 group-hover:border-primary-fixed transition-colors">
                    <MapPin className="text-on-surface-variant group-hover:text-primary-fixed transition-colors w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-label-caps text-white uppercase text-sm font-bold tracking-widest mb-1">{lobby.city}, {lobby.state}</h4>
                    <p className="font-body-base text-xs text-on-surface-variant uppercase tracking-wider">
                      {lobby.member_count} DRIVERS ONLINE • {lobby.is_private ? 'PRIVATE' : 'PUBLIC'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-stats-num text-2xl font-bold italic text-white">{lobby.member_count}</p>
                  <p className="font-label-caps text-tertiary-fixed text-[10px] tracking-widest uppercase font-bold">ACTIVE</p>
                </div>
              </div>
            ))}
            {lobbies.length === 0 && (
              <div className="p-12 text-center text-zinc-500">
                <Radar className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Scanning for active zones...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="bg-black/95 fixed bottom-0 w-full z-50 border-t border-white/5 shadow-[0_-4px_30px_rgba(0,0,0,0.8)] md:hidden">
        <div className="flex justify-around items-stretch h-20 pb-safe w-full">
          {[
            { icon: <Music2 />, label: 'MUSIC', path: '/dashboard' },
            { icon: <Gauge />, label: 'STATS', path: '/dashboard', active: true },
            { icon: <MapPin />, label: 'MAP', path: '/dashboard' },
            { icon: <Users />, label: 'SQUAD', path: '/squad' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 transition-all duration-300 ${
                item.active 
                  ? 'text-primary-fixed bg-white/5 relative after:absolute after:top-0 after:w-12 after:h-1 after:bg-primary-fixed after:shadow-[0_0_10px_#CCFF00]' 
                  : 'text-white/40 hover:bg-white/10'
              }`}
            >
              {React.cloneElement(item.icon, { className: 'w-5 h-5 mb-1' })}
              <span className="font-space-grotesk text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;

