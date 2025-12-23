import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import useWebSocket from '@/hooks/useWebSocket';
import NotificationPanel from '@/components/NotificationPanel';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Bell, Menu, X, Home, Car, Users, Trophy, 
  MapPin, Shield, User, LogOut, Award, Route
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Navbar = () => {
  const { user, logout, sessionToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // WebSocket for real-time notifications
  const { isConnected, lastMessage } = useWebSocket(sessionToken);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get(`${API}/notifications/unread-count`, { withCredentials: true });
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    // Refresh count every minute
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Handle real-time notifications
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'notification') {
        // Increment unread count
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        const notif = lastMessage.notification;
        toast(notif.title, {
          description: notif.message,
          icon: getNotificationEmoji(notif.type),
          action: {
            label: 'View',
            onClick: () => setShowNotifications(true)
          }
        });
      } else if (lastMessage.type === 'achievement') {
        // Achievement notification
        setUnreadCount(prev => prev + 1);
        
        const achievement = lastMessage.achievement;
        toast.success(`Achievement Unlocked!`, {
          description: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
          duration: 5000
        });
      } else if (lastMessage.type === 'chat_message') {
        // Only show toast if not on squad page
        if (!location.pathname.includes('/squad')) {
          toast(`New message in squad`, {
            description: lastMessage.message.content?.substring(0, 50) + '...',
            action: {
              label: 'Open',
              onClick: () => navigate('/squad')
            }
          });
        }
      }
    }
  }, [lastMessage, location.pathname, navigate]);

  const getNotificationEmoji = (type) => {
    switch (type) {
      case 'achievement': return '🏆';
      case 'squad_invite': return '🛡️';
      case 'request': return '👋';
      case 'meet_reminder': return '📅';
      case 'meet_cancelled': return '❌';
      case 'nearby_driver': return '🚗';
      default: return '🔔';
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Map', icon: Home },
    { path: '/garage', label: 'Garage', icon: Car },
    { path: '/squad', label: 'Squad', icon: Shield },
    { path: '/meets', label: 'Meets', icon: MapPin },
    { path: '/leaderboards', label: 'Ranks', icon: Trophy },
    { path: '/achievements', label: 'Badges', icon: Award },
    { path: '/routes', label: 'Routes', icon: Route },
  ];

  const isActive = (path) => location.pathname === path;

  if (!user) return null;

  return (
    <>
      {/* Desktop/Mobile Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-neon-green flex items-center justify-center">
                <span className="font-unbounded font-bold text-black text-sm">K</span>
              </div>
              <span className="font-unbounded font-bold text-lg hidden sm:block">KYNETIK</span>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded ${
                    isActive(item.path)
                      ? 'bg-neon-green/20 text-neon-green'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              {isConnected && (
                <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live</span>
                </div>
              )}

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-zinc-400 hover:text-white transition-colors"
                data-testid="notifications-btn"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Profile */}
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-neon-green/30">
                  <img 
                    src={user.picture || 'https://via.placeholder.com/32'} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-zinc-400 hover:text-white"
              >
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <nav className="lg:hidden border-t border-white/10 py-2">
            <div className="max-w-7xl mx-auto px-4 grid grid-cols-4 gap-2">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setShowMobileMenu(false);
                  }}
                  className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors rounded ${
                    isActive(item.path)
                      ? 'bg-neon-green/20 text-neon-green'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowMobileMenu(false);
                }}
                className={`flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors rounded ${
                  isActive('/profile')
                    ? 'bg-neon-green/20 text-neon-green'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Profile</span>
              </button>
              <button
                onClick={logout}
                className="flex flex-col items-center gap-1 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Notification Panel */}
      <NotificationPanel 
        isOpen={showNotifications} 
        onClose={() => {
          setShowNotifications(false);
          // Refresh unread count when panel closes
          fetchUnreadCount();
        }} 
      />
    </>
  );
};

export default Navbar;
