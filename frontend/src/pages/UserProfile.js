import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Car, ArrowLeft, UserPlus, Gauge, Star, MessageSquare
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [garage, setGarage] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const [profileRes, garageRes] = await Promise.all([
        axios.get(`${API}/users/${userId}`, { withCredentials: true }),
        axios.get(`${API}/garage/${userId}`, { withCredentials: true }),
      ]);
      setProfile(profileRes.data);
      setGarage(garageRes.data);
    } catch (error) {
      toast.error('Failed to load user profile');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    try {
      await axios.post(
        `${API}/requests`,
        { to_user_id: userId, message: "Hey! Nice ride, let's connect!" },
        { withCredentials: true }
      );
      toast.success('Request sent!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send request');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <p className="text-zinc-400">User not found</p>
      </div>
    );
  }

  const primaryCar = garage.find(c => c.is_primary) || garage[0];

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-mono text-sm uppercase tracking-wider">Back</span>
          </button>
          
          {currentUser?.user_id !== userId && (
            <Button
              onClick={handleSendRequest}
              data-testid="send-request-btn"
              className="btn-skew bg-neon-green text-black font-bold uppercase tracking-wider hover:bg-neon-green/90"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Connect
              </span>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Avatar */}
            <div 
              className="w-32 h-32 rounded-full border-4 border-neon-green shadow-neon overflow-hidden flex-shrink-0"
              style={{ backgroundColor: profile.avatar_style?.skin_tone || '#FFD5C8' }}
            >
              <img
                src={profile.picture || 'https://via.placeholder.com/128'}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-unbounded font-black text-3xl mb-2">{profile.name}</h1>
              <p className="text-zinc-400 mb-4">{profile.bio || 'Car enthusiast'}</p>
              
              {/* Stats */}
              <div className="flex flex-wrap justify-center md:justify-start gap-6">
                <div className="text-center">
                  <p className="font-unbounded font-bold text-2xl text-neon-green">{garage.length}</p>
                  <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Cars</p>
                </div>
                {primaryCar && (
                  <div className="text-center">
                    <p className="font-unbounded font-bold text-2xl text-neon-cyan">{primaryCar.horsepower}</p>
                    <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">HP (Primary)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Primary Ride */}
        {primaryCar && (
          <section className="mb-8">
            <h2 className="font-unbounded font-bold text-xl mb-4">
              PRIMARY <span className="text-neon-green">RIDE</span>
            </h2>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-panel overflow-hidden"
            >
              <div 
                className="h-2"
                style={{ backgroundColor: primaryCar.color }}
              />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <h3 className="font-unbounded font-bold text-2xl">{primaryCar.make}</h3>
                    </div>
                    <p className="text-xl text-zinc-400">{primaryCar.model}</p>
                  </div>
                  <span className="text-lg font-mono text-zinc-500">{primaryCar.year}</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-secondary/30 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">Power</p>
                    <p className="font-bold text-neon-green flex items-center gap-1">
                      <Gauge className="w-4 h-4" />
                      {primaryCar.horsepower} HP
                    </p>
                  </div>
                  {primaryCar.mods && Object.entries(primaryCar.mods)
                    .filter(([_, v]) => v !== 'stock' && v !== 'none')
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="bg-secondary/30 p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                          {key.replace('_', ' ')}
                        </p>
                        <p className="font-bold">{value.replace('_', ' ')}</p>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Full Garage */}
        <section>
          <h2 className="font-unbounded font-bold text-xl mb-4">
            FULL <span className="text-neon-cyan">GARAGE</span>
          </h2>
          
          {garage.length === 0 ? (
            <div className="glass-panel p-8 text-center">
              <Car className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No cars in garage yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {garage.map((car, index) => (
                <motion.div
                  key={car.car_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="car-card glass-panel overflow-hidden"
                >
                  <div 
                    className="h-1"
                    style={{ backgroundColor: car.color }}
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {car.is_primary && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                          <h3 className="font-bold">{car.make} {car.model}</h3>
                        </div>
                        <p className="text-xs text-zinc-500">{car.year}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono text-neon-green">{car.horsepower} HP</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default UserProfile;
