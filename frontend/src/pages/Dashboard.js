import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Car, MapPin, Users, Bell, Settings, LogOut, 
  Menu, X, ChevronRight, UserPlus, Gauge
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom user marker
const createUserIcon = (picture, isCurrentUser = false) => {
  const borderColor = isCurrentUser ? '#22c55e' : '#06b6d4';
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 50%;
        border: 3px solid ${borderColor};
        box-shadow: 0 0 15px ${borderColor}80;
        overflow: hidden;
        background: #18181b;
      ">
        <img src="${picture || 'https://via.placeholder.com/44'}" 
             style="width: 100%; height: 100%; object-fit: cover;" 
             onerror="this.src='https://via.placeholder.com/44'" />
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Component to recenter map
const RecenterMap = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

const Dashboard = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [currentLobby, setCurrentLobby] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          
          // Update location on server
          try {
            await axios.post(
              `${API}/location/update`,
              { lat: latitude, lng: longitude },
              { withCredentials: true }
            );
          } catch (error) {
            console.error('Failed to update location:', error);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Default to Los Angeles if location denied
          setUserLocation([34.0522, -118.2437]);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Fetch lobby info and nearby users
  const fetchNearbyUsers = useCallback(async () => {
    if (!user?.current_lobby) return;
    
    try {
      const response = await axios.get(
        `${API}/lobbies/${user.current_lobby}/users`,
        { withCredentials: true }
      );
      setNearbyUsers(response.data.filter(u => u.user_id !== user.user_id));
    } catch (error) {
      console.error('Failed to fetch nearby users:', error);
    }
  }, [user?.current_lobby, user?.user_id]);

  // Fetch incoming requests
  const fetchRequests = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/requests/incoming`, { withCredentials: true });
      setIncomingRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    }
  }, []);

  // Fetch lobby details
  const fetchLobbyDetails = useCallback(async () => {
    if (!user?.current_lobby) {
      setCurrentLobby(null);
      return;
    }
    
    try {
      const response = await axios.get(`${API}/lobbies`, { withCredentials: true });
      const lobby = response.data.find(l => l.lobby_id === user.current_lobby);
      setCurrentLobby(lobby);
    } catch (error) {
      console.error('Failed to fetch lobby:', error);
    }
  }, [user?.current_lobby]);

  useEffect(() => {
    fetchNearbyUsers();
    fetchRequests();
    fetchLobbyDetails();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchNearbyUsers();
      fetchRequests();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNearbyUsers, fetchRequests, fetchLobbyDetails]);

  const handleSendRequest = async (toUserId) => {
    try {
      await axios.post(
        `${API}/requests`,
        { to_user_id: toUserId, message: "Hey! Nice ride, let's connect!" },
        { withCredentials: true }
      );
      toast.success('Request sent!');
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send request');
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await axios.post(`${API}/lobbies/leave`, {}, { withCredentials: true });
      updateUser({ ...user, current_lobby: null });
      setCurrentLobby(null);
      setNearbyUsers([]);
      toast.success('Left lobby');
    } catch (error) {
      toast.error('Failed to leave lobby');
    }
  };

  const navItems = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/dashboard', active: true },
    { icon: <Users className="w-5 h-5" />, label: 'Lobbies', path: '/lobbies' },
    { icon: <Car className="w-5 h-5" />, label: 'Garage', path: '/garage' },
    { icon: <Settings className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="h-screen bg-void flex overflow-hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-[1001] glass-panel p-3"
        data-testid="mobile-menu-btn"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || window.innerWidth >= 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="fixed lg:relative z-[1000] w-[280px] h-full glass-panel border-r border-white/10 flex flex-col"
          >
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neon-green flex items-center justify-center">
                  <Car className="w-6 h-6 text-black" />
                </div>
                <span className="font-unbounded font-bold text-lg tracking-tight">
                  FORZA<span className="text-neon-green">COMM</span>
                </span>
              </div>
            </div>

            {/* User info */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-neon-green overflow-hidden">
                  <img
                    src={user?.picture || 'https://via.placeholder.com/48'}
                    alt={user?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{user?.name}</p>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
                    {currentLobby ? `${currentLobby.city}, ${currentLobby.state}` : 'No Lobby'}
                  </p>
                </div>
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`w-full flex items-center gap-3 px-4 py-3 font-mono text-sm uppercase tracking-wider transition-colors duration-200 ${
                    item.active 
                      ? 'bg-neon-green/10 text-neon-green border-l-2 border-neon-green' 
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Requests notification */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => navigate('/requests')}
                data-testid="requests-btn"
                className="w-full flex items-center justify-between px-4 py-3 glass-panel hover:border-neon-green/30 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-neon-green" />
                  <span className="font-mono text-sm uppercase tracking-wider">Requests</span>
                </div>
                {incomingRequests.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Logout */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={logout}
                data-testid="logout-btn"
                className="w-full flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-red-400 transition-colors duration-200"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-mono text-sm uppercase tracking-wider">Logout</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content - Map */}
      <main className="flex-1 relative">
        {/* Map */}
        {userLocation && (
          <MapContainer
            center={userLocation}
            zoom={13}
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <RecenterMap position={userLocation} />
            
            {/* Current user marker */}
            <Marker
              position={userLocation}
              icon={createUserIcon(user?.picture, true)}
            >
              <Popup className="custom-popup">
                <div className="bg-card p-3 rounded-none min-w-[200px]">
                  <p className="font-unbounded font-bold text-sm">{user?.name}</p>
                  <p className="text-xs text-neon-green font-mono">YOU</p>
                </div>
              </Popup>
            </Marker>

            {/* Other users markers */}
            {nearbyUsers.map((u) => (
              u.location && (
                <Marker
                  key={u.user_id}
                  position={[u.location.lat, u.location.lng]}
                  icon={createUserIcon(u.picture)}
                  eventHandlers={{
                    click: () => setSelectedUser(u)
                  }}
                >
                  <Popup>
                    <div className="bg-card p-3 rounded-none min-w-[200px]">
                      <p className="font-unbounded font-bold text-sm">{u.name}</p>
                      {u.primary_car && (
                        <p className="text-xs text-zinc-400">
                          {u.primary_car.year} {u.primary_car.make} {u.primary_car.model}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        )}

        {/* Lobby info panel */}
        <div className="map-panel top-4 right-4 glass-panel p-4 max-w-xs">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-neon-green" />
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              Current Lobby
            </span>
          </div>
          
          {currentLobby ? (
            <>
              <h3 className="font-unbounded font-bold text-lg">
                {currentLobby.city}, {currentLobby.state}
              </h3>
              <p className="text-sm text-zinc-400 mb-3">
                {currentLobby.member_count} driver{currentLobby.member_count !== 1 ? 's' : ''} online
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveLobby}
                  data-testid="leave-lobby-btn"
                  className="flex-1 text-xs"
                >
                  Leave
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/lobbies')}
                  data-testid="switch-lobby-btn"
                  className="flex-1 text-xs bg-neon-green text-black hover:bg-neon-green/90"
                >
                  Switch
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400 mb-3">
                Join a lobby to see other drivers
              </p>
              <Button
                onClick={() => navigate('/lobbies')}
                data-testid="join-lobby-btn"
                className="w-full btn-skew bg-neon-green text-black font-bold hover:bg-neon-green/90"
              >
                <span>Join Lobby</span>
              </Button>
            </>
          )}
        </div>

        {/* Selected user panel */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="map-panel bottom-4 right-4 glass-panel p-6 w-80"
            >
              <button
                onClick={() => setSelectedUser(null)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full border-2 border-neon-cyan overflow-hidden">
                  <img
                    src={selectedUser.picture || 'https://via.placeholder.com/64'}
                    alt={selectedUser.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-unbounded font-bold">{selectedUser.name}</h3>
                  <p className="text-xs text-zinc-400">{selectedUser.bio || 'Car enthusiast'}</p>
                </div>
              </div>

              {selectedUser.primary_car && (
                <div className="glass-panel p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-neon-green" />
                    <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                      Primary Ride
                    </span>
                  </div>
                  <p className="font-bold">
                    {selectedUser.primary_car.year} {selectedUser.primary_car.make} {selectedUser.primary_car.model}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Gauge className="w-4 h-4 text-zinc-400" />
                    <span className="text-sm text-zinc-400">{selectedUser.primary_car.horsepower} HP</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/user/${selectedUser.user_id}`)}
                  data-testid="view-profile-btn"
                  className="flex-1"
                >
                  View Profile
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  onClick={() => handleSendRequest(selectedUser.user_id)}
                  data-testid="send-request-btn"
                  className="flex-1 bg-neon-green text-black hover:bg-neon-green/90"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Connect
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {!userLocation && (
          <div className="absolute inset-0 flex items-center justify-center bg-void">
            <div className="text-center">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-zinc-400 font-mono text-sm uppercase tracking-wider">
                Getting your location...
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
