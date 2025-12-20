import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { 
  Trophy, Gauge, Route, Car, ArrowLeft, Medal,
  Crown, Award
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Leaderboards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('speed');
  const [speedBoard, setSpeedBoard] = useState([]);
  const [distanceBoard, setDistanceBoard] = useState([]);
  const [garageBoard, setGarageBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      const [speed, distance, garage] = await Promise.all([
        axios.get(`${API}/leaderboards/speed`, { withCredentials: true }),
        axios.get(`${API}/leaderboards/distance`, { withCredentials: true }),
        axios.get(`${API}/leaderboards/garage`, { withCredentials: true })
      ]);
      setSpeedBoard(speed.data);
      setDistanceBoard(distance.data);
      setGarageBoard(garage.data);
    } catch (error) {
      console.error('Failed to fetch leaderboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-zinc-300" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return <span className="w-5 text-center font-mono text-zinc-500">#{rank}</span>;
    }
  };

  const getRankStyle = (rank) => {
    switch(rank) {
      case 1: return 'border-yellow-500/50 bg-yellow-500/5';
      case 2: return 'border-zinc-400/50 bg-zinc-400/5';
      case 3: return 'border-amber-600/50 bg-amber-600/5';
      default: return 'border-white/10';
    }
  };

  const tabs = [
    { id: 'speed', label: 'Top Speed', icon: <Gauge className="w-4 h-4" />, color: 'text-neon-green' },
    { id: 'distance', label: 'Distance', icon: <Route className="w-4 h-4" />, color: 'text-neon-cyan' },
    { id: 'garage', label: 'Garage', icon: <Car className="w-4 h-4" />, color: 'text-purple-400' },
  ];

  const getActiveData = () => {
    switch(activeTab) {
      case 'speed': return speedBoard;
      case 'distance': return distanceBoard;
      case 'garage': return garageBoard;
      default: return [];
    }
  };

  const formatValue = (item) => {
    switch(activeTab) {
      case 'speed': return `${Math.round(item.top_speed)} MPH`;
      case 'distance': return `${item.distance.toFixed(1)} mi`;
      case 'garage': return `${item.car_count} cars`;
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-zinc-400 hover:text-white transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-unbounded font-bold text-xl">LEADERBOARDS</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex-1 flex items-center justify-center gap-2 py-4 font-mono text-sm uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab.id
                  ? `border-current ${tab.color} bg-white/5`
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : getActiveData().length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Trophy className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="font-unbounded font-bold text-xl mb-2">No Data Yet</h3>
            <p className="text-zinc-400">Start driving to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {getActiveData().map((item, index) => (
              <motion.div
                key={item.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-panel p-4 flex items-center gap-4 border ${getRankStyle(item.rank)} ${
                  item.user_id === user.user_id ? 'ring-1 ring-neon-green/50' : ''
                }`}
                data-testid={`leaderboard-item-${item.rank}`}
              >
                {/* Rank */}
                <div className="w-10 flex justify-center">
                  {getRankIcon(item.rank)}
                </div>
                
                {/* User */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/10">
                    <img 
                      src={item.picture || 'https://via.placeholder.com/40'} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      {item.name}
                      {item.user_id === user.user_id && (
                        <span className="text-xs font-mono text-neon-green">(YOU)</span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Value */}
                <div className={`font-unbounded font-bold text-xl ${tabs.find(t => t.id === activeTab)?.color}`}>
                  {formatValue(item)}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Your Stats */}
        <div className="mt-12">
          <h2 className="font-unbounded font-bold text-xl mb-4">
            YOUR <span className="text-neon-cyan">STATS</span>
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-panel p-6 text-center">
              <Gauge className="w-8 h-8 text-neon-green mx-auto mb-2" />
              <p className="font-unbounded font-bold text-2xl text-neon-green">
                {Math.round(user.trip_stats?.all_time_top_speed || 0)}
              </p>
              <p className="text-xs font-mono uppercase text-zinc-500">Top Speed (MPH)</p>
            </div>
            <div className="glass-panel p-6 text-center">
              <Route className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
              <p className="font-unbounded font-bold text-2xl text-neon-cyan">
                {(user.trip_stats?.all_time_distance || 0).toFixed(1)}
              </p>
              <p className="text-xs font-mono uppercase text-zinc-500">Total Miles</p>
            </div>
            <div className="glass-panel p-6 text-center">
              <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <p className="font-unbounded font-bold text-2xl text-purple-400">
                {user.achievements?.length || 0}
              </p>
              <p className="text-xs font-mono uppercase text-zinc-500">Achievements</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboards;
