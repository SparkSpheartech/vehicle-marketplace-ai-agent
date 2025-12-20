import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Bell, X, Check, Award, Users, Calendar, 
  UserPlus, Shield, AlertCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotificationPanel = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, { withCredentials: true });
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, { withCredentials: true });
      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.notification_id);
    
    switch (notification.type) {
      case 'achievement':
        navigate('/achievements');
        break;
      case 'squad_invite':
        navigate('/squad');
        break;
      case 'request':
        navigate('/requests');
        break;
      case 'meet_reminder':
      case 'meet_cancelled':
        navigate('/meets');
        break;
      default:
        break;
    }
    
    onClose();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'achievement': return <Award className="w-5 h-5 text-purple-400" />;
      case 'squad_invite': return <Shield className="w-5 h-5 text-neon-green" />;
      case 'request': return <UserPlus className="w-5 h-5 text-neon-cyan" />;
      case 'meet_reminder': return <Calendar className="w-5 h-5 text-yellow-500" />;
      case 'meet_cancelled': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'nearby_driver': return <Users className="w-5 h-5 text-neon-green" />;
      default: return <Bell className="w-5 h-5 text-zinc-400" />;
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-16 right-4 w-96 max-h-[70vh] glass-panel flex flex-col z-50"
        data-testid="notification-panel"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-neon-green" />
            <h3 className="font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-neon-cyan hover:underline"
                data-testid="mark-all-read-btn"
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="spinner"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {notifications.map((notification) => (
                <motion.button
                  key={notification.notification_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                    !notification.is_read ? 'bg-white/5' : ''
                  }`}
                  data-testid={`notification-${notification.notification_id}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {notification.data?.icon ? (
                        <span className="text-2xl">{notification.data.icon}</span>
                      ) : (
                        getNotificationIcon(notification.type)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${!notification.is_read ? 'text-white' : 'text-zinc-300'}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-zinc-400 truncate">{notification.message}</p>
                      <p className="text-xs text-zinc-600 mt-1">{formatTime(notification.created_at)}</p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-neon-green rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationPanel;
