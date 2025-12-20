import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Navigation, Clock, Route, Zap, Music2, Trophy } from 'lucide-react';

const Speedometer = ({ speed = 0, topSpeed = 0, avgSpeed = 0, distance = 0, tripStart, currentSong }) => {
  const [displaySpeed, setDisplaySpeed] = useState(0);
  const [tripDuration, setTripDuration] = useState('00:00:00');
  
  // Animate speed changes
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplaySpeed(prev => {
        const diff = speed - prev;
        if (Math.abs(diff) < 1) return speed;
        return prev + diff * 0.3;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [speed]);

  // Update trip duration
  useEffect(() => {
    if (!tripStart) return;
    
    const updateDuration = () => {
      const start = new Date(tripStart);
      const now = new Date();
      const diff = now - start;
      
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      
      setTripDuration(
        `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };
    
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [tripStart]);

  // Calculate needle rotation (0-180 degrees for 0-200 mph)
  const needleRotation = Math.min((displaySpeed / 200) * 180, 180) - 90;
  
  // Speed zone colors
  const getSpeedColor = (spd) => {
    if (spd < 30) return '#22c55e'; // Green - safe
    if (spd < 60) return '#06b6d4'; // Cyan - normal
    if (spd < 100) return '#f97316'; // Orange - fast
    return '#ef4444'; // Red - very fast
  };

  return (
    <div className="glass-panel p-4 w-full max-w-md" data-testid="speedometer">
      {/* Main Speedometer */}
      <div className="relative w-64 h-32 mx-auto mb-4">
        {/* Speedometer arc background */}
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#27272a"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Speed zone arcs */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 32"
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 56 32 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 100 20 A 80 80 0 0 1 144 32"
            fill="none"
            stroke="#f97316"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 144 32 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.3"
          />
          
          {/* Speed markers */}
          {[0, 50, 100, 150, 200].map((mark, i) => {
            const angle = (mark / 200) * 180 - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 100 + 65 * Math.cos(rad);
            const y = 100 + 65 * Math.sin(rad);
            return (
              <text
                key={mark}
                x={x}
                y={y}
                fill="#71717a"
                fontSize="10"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono"
              >
                {mark}
              </text>
            );
          })}
        </svg>
        
        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2 origin-bottom"
          style={{
            width: '4px',
            height: '70px',
            marginLeft: '-2px',
            background: `linear-gradient(to top, ${getSpeedColor(displaySpeed)}, transparent)`,
            borderRadius: '2px',
          }}
          animate={{ rotate: needleRotation }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        />
        
        {/* Center hub */}
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full"
          style={{ backgroundColor: getSpeedColor(displaySpeed), boxShadow: `0 0 20px ${getSpeedColor(displaySpeed)}` }}
        />
        
        {/* Digital speed display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <motion.span 
            className="font-unbounded font-black text-4xl"
            style={{ color: getSpeedColor(displaySpeed) }}
            animate={{ textShadow: `0 0 20px ${getSpeedColor(displaySpeed)}` }}
          >
            {Math.round(displaySpeed)}
          </motion.span>
          <span className="text-zinc-500 text-sm font-mono ml-1">MPH</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Top Speed */}
        <div className="bg-secondary/50 p-3 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-1">
            <Trophy className="w-3 h-3 text-yellow-500" />
            Top Speed
          </div>
          <p className="font-unbounded font-bold text-lg text-yellow-500">
            {Math.round(topSpeed)} <span className="text-xs text-zinc-500">MPH</span>
          </p>
        </div>
        
        {/* Avg Speed */}
        <div className="bg-secondary/50 p-3 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-1">
            <Gauge className="w-3 h-3 text-neon-cyan" />
            Avg Speed
          </div>
          <p className="font-unbounded font-bold text-lg text-neon-cyan">
            {avgSpeed.toFixed(1)} <span className="text-xs text-zinc-500">MPH</span>
          </p>
        </div>
        
        {/* Distance */}
        <div className="bg-secondary/50 p-3 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-1">
            <Route className="w-3 h-3 text-neon-green" />
            Distance
          </div>
          <p className="font-unbounded font-bold text-lg text-neon-green">
            {distance.toFixed(2)} <span className="text-xs text-zinc-500">MI</span>
          </p>
        </div>
        
        {/* Trip Time */}
        <div className="bg-secondary/50 p-3 border border-white/5">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-1">
            <Clock className="w-3 h-3 text-purple-400" />
            Trip Time
          </div>
          <p className="font-mono font-bold text-lg text-purple-400">
            {tripDuration}
          </p>
        </div>
      </div>

      {/* Current Song */}
      {currentSong && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500/10 to-transparent p-3 border border-green-500/20"
        >
          <div className="flex items-center gap-3">
            {currentSong.album_art ? (
              <img 
                src={currentSong.album_art} 
                alt="Album" 
                className="w-10 h-10 rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
                <Music2 className="w-5 h-5 text-green-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{currentSong.name}</p>
              <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
            </div>
            <div className="flex gap-1">
              {[1,2,3].map(i => (
                <motion.div
                  key={i}
                  className="w-1 bg-green-500 rounded-full"
                  animate={{ height: [8, 16, 8] }}
                  transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Speedometer;
