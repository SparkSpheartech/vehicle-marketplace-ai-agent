import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Route, ArrowLeft, Play, Square, Save, Heart, 
  Clock, Gauge, MapPin, Trash2, Globe, Lock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Routes = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [routes, setRoutes] = useState([]);
  const [myRoutes, setMyRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('discover');
  const [isRecording, setIsRecording] = useState(false);
  const [currentRoute, setCurrentRoute] = useState({
    waypoints: [],
    distance: 0,
    duration: 0,
    top_speed: 0,
    speeds: []
  });
  const [routeName, setRouteName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  const recordingInterval = useRef(null);
  const startTime = useRef(null);

  useEffect(() => {
    fetchRoutes();
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const fetchRoutes = async () => {
    try {
      const [publicRoutes, userRoutes] = await Promise.all([
        axios.get(`${API}/routes`, { withCredentials: true }),
        axios.get(`${API}/routes/me`, { withCredentials: true })
      ]);
      setRoutes(publicRoutes.data);
      setMyRoutes(userRoutes.data);
    } catch (error) {
      console.error('Failed to fetch routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    startTime.current = Date.now();
    setCurrentRoute({
      waypoints: [],
      distance: 0,
      duration: 0,
      top_speed: 0,
      speeds: []
    });

    // Record position every 5 seconds
    recordingInterval.current = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, speed } = position.coords;
            const speedMph = speed ? speed * 2.237 : 0;
            
            setCurrentRoute(prev => {
              const newWaypoints = [...prev.waypoints, {
                lat: latitude,
                lng: longitude,
                timestamp: Date.now()
              }];
              
              // Calculate distance
              let newDistance = prev.distance;
              if (prev.waypoints.length > 0) {
                const lastPoint = prev.waypoints[prev.waypoints.length - 1];
                const R = 3959; // Earth radius in miles
                const dLat = (latitude - lastPoint.lat) * Math.PI / 180;
                const dLon = (longitude - lastPoint.lng) * Math.PI / 180;
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lastPoint.lat * Math.PI / 180) * Math.cos(latitude * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                newDistance += R * c;
              }
              
              return {
                waypoints: newWaypoints,
                distance: newDistance,
                duration: Math.floor((Date.now() - startTime.current) / 1000),
                top_speed: Math.max(prev.top_speed, speedMph),
                speeds: [...prev.speeds, speedMph]
              };
            });
          },
          (error) => console.error('Geolocation error:', error),
          { enableHighAccuracy: true }
        );
      }
    }, 5000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
    }
    
    if (currentRoute.waypoints.length >= 2) {
      setShowSaveDialog(true);
    } else {
      toast.error('Route too short. Drive more to record a route.');
    }
  };

  const saveRoute = async () => {
    if (!routeName.trim()) {
      toast.error('Please enter a route name');
      return;
    }

    try {
      const avgSpeed = currentRoute.speeds.length > 0
        ? currentRoute.speeds.reduce((a, b) => a + b, 0) / currentRoute.speeds.length
        : 0;

      await axios.post(`${API}/routes`, {
        name: routeName,
        waypoints: currentRoute.waypoints,
        distance: currentRoute.distance,
        duration: currentRoute.duration,
        top_speed: currentRoute.top_speed,
        avg_speed: avgSpeed,
        is_public: true
      }, { withCredentials: true });

      toast.success('Route saved!');
      setShowSaveDialog(false);
      setRouteName('');
      setCurrentRoute({ waypoints: [], distance: 0, duration: 0, top_speed: 0, speeds: [] });
      fetchRoutes();
    } catch (error) {
      toast.error('Failed to save route');
    }
  };

  const handleLike = async (routeId) => {
    try {
      await axios.post(`${API}/routes/${routeId}/like`, {}, { withCredentials: true });
      fetchRoutes();
    } catch (error) {
      toast.error('Failed to like route');
    }
  };

  const handleDelete = async (routeId) => {
    if (!window.confirm('Delete this route?')) return;
    
    try {
      await axios.delete(`${API}/routes/${routeId}`, { withCredentials: true });
      toast.success('Route deleted');
      fetchRoutes();
    } catch (error) {
      toast.error('Failed to delete route');
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const displayRoutes = activeTab === 'discover' ? routes : myRoutes;

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
              <div className="w-8 h-8 bg-neon-cyan flex items-center justify-center">
                <Route className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-unbounded font-bold text-xl">ROUTES</h1>
            </div>
          </div>
          
          {/* Record Button */}
          {isRecording ? (
            <Button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="stop-recording-btn"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop ({formatDuration(currentRoute.duration)})
            </Button>
          ) : (
            <Button
              onClick={startRecording}
              className="btn-skew bg-neon-green text-black font-bold"
              data-testid="start-recording-btn"
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Record Route
              </span>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Recording Stats */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-4 mb-8 border border-red-500/50 bg-red-500/5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-400 font-mono uppercase">Recording</span>
              </div>
              <div className="flex gap-6 text-sm">
                <span><MapPin className="w-4 h-4 inline mr-1" />{currentRoute.waypoints.length} points</span>
                <span><Route className="w-4 h-4 inline mr-1" />{currentRoute.distance.toFixed(2)} mi</span>
                <span><Gauge className="w-4 h-4 inline mr-1" />{Math.round(currentRoute.top_speed)} mph top</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 font-mono text-sm uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'discover'
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
            data-testid="discover-tab"
          >
            <Globe className="w-4 h-4 inline mr-2" />
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 font-mono text-sm uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'my'
                ? 'border-neon-cyan text-neon-cyan'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
            data-testid="my-routes-tab"
          >
            My Routes ({myRoutes.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : displayRoutes.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Route className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="font-unbounded font-bold text-xl mb-2">No Routes Yet</h3>
            <p className="text-zinc-400">Start recording your drives to save routes!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayRoutes.map((route, index) => (
              <motion.div
                key={route.route_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-panel p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">{route.name}</h3>
                      {!route.is_public && <Lock className="w-4 h-4 text-zinc-500" />}
                    </div>
                    
                    {route.user && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full overflow-hidden">
                          <img src={route.user.picture || 'https://via.placeholder.com/24'} alt="" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-sm text-zinc-400">{route.user.name}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                      <span><Route className="w-4 h-4 inline mr-1 text-neon-cyan" />{route.distance.toFixed(1)} mi</span>
                      <span><Clock className="w-4 h-4 inline mr-1 text-purple-400" />{formatDuration(route.duration)}</span>
                      <span><Gauge className="w-4 h-4 inline mr-1 text-neon-green" />{Math.round(route.top_speed)} mph top</span>
                      <span className="text-zinc-500">Avg: {route.avg_speed.toFixed(1)} mph</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLike(route.route_id)}
                      className={route.is_liked ? 'text-pink-400' : ''}
                      data-testid={`like-route-${route.route_id}`}
                    >
                      <Heart className={`w-4 h-4 mr-1 ${route.is_liked ? 'fill-pink-400' : ''}`} />
                      {route.like_count || 0}
                    </Button>
                    
                    {route.user_id === user.user_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(route.route_id)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`delete-route-${route.route_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-panel p-6 w-full max-w-md"
          >
            <h3 className="font-unbounded font-bold text-xl mb-4">Save Route</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="font-unbounded font-bold text-xl text-neon-cyan">{currentRoute.distance.toFixed(2)}</p>
                <p className="text-xs text-zinc-500">Miles</p>
              </div>
              <div className="text-center">
                <p className="font-unbounded font-bold text-xl text-purple-400">{formatDuration(currentRoute.duration)}</p>
                <p className="text-xs text-zinc-500">Duration</p>
              </div>
              <div className="text-center">
                <p className="font-unbounded font-bold text-xl text-neon-green">{Math.round(currentRoute.top_speed)}</p>
                <p className="text-xs text-zinc-500">Top Speed</p>
              </div>
            </div>
            
            <Input
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Route name..."
              className="bg-secondary/50 border-transparent mb-4"
              data-testid="route-name-input"
            />
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSaveDialog(false)}
                className="flex-1"
              >
                Discard
              </Button>
              <Button
                onClick={saveRoute}
                className="flex-1 bg-neon-green text-black"
                data-testid="save-route-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Routes;
