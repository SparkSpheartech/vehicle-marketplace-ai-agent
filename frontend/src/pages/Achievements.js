import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Award, ArrowLeft, Lock, Check
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Achievements = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [achievements, setAchievements] = useState({ earned: [], available: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await axios.get(`${API}/achievements/me`, { withCredentials: true });
      setAchievements(response.data);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
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
            <div className="w-8 h-8 bg-purple-500 flex items-center justify-center">
              <Award className="w-5 h-5 text-black" />
            </div>
            <h1 className="font-unbounded font-bold text-xl">ACHIEVEMENTS</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-unbounded font-bold text-lg">Progress</h2>
            <span className="text-neon-green font-mono">
              {achievements.earned.length} / {achievements.earned.length + achievements.available.length}
            </span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ 
                width: `${(achievements.earned.length / (achievements.earned.length + achievements.available.length)) * 100}%` 
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-neon-green to-neon-cyan"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Earned */}
            <section className="mb-12">
              <h2 className="font-unbounded font-bold text-xl mb-4">
                EARNED <span className="text-neon-green">({achievements.earned.length})</span>
              </h2>
              
              {achievements.earned.length === 0 ? (
                <p className="text-zinc-400">No achievements earned yet. Keep driving!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.earned.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-panel p-4 border border-neon-green/30 bg-neon-green/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-lg bg-neon-green/20 flex items-center justify-center text-3xl">
                          {achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-neon-green">{achievement.name}</h3>
                            <Check className="w-4 h-4 text-neon-green" />
                          </div>
                          <p className="text-sm text-zinc-400">{achievement.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {/* Available */}
            <section>
              <h2 className="font-unbounded font-bold text-xl mb-4">
                AVAILABLE <span className="text-zinc-500">({achievements.available.length})</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.available.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="glass-panel p-4 border border-white/10 opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center text-3xl grayscale">
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-400">{achievement.name}</h3>
                          <Lock className="w-4 h-4 text-zinc-500" />
                        </div>
                        <p className="text-sm text-zinc-500">{achievement.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Achievements;
