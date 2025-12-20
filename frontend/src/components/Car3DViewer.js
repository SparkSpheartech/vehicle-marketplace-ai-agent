import React from 'react';
import { motion } from 'framer-motion';

// Stylized 2.5D car visualization using CSS
const Car3DViewer = ({ 
  color = '#22c55e', 
  secondaryColor = '#000000', 
  mods = {},
  height = '300px'
}) => {
  // Get neon color based on mod
  const getNeonColor = () => {
    switch(mods?.neon) {
      case 'green': return '#22c55e';
      case 'cyan': return '#06b6d4';
      case 'red': return '#ef4444';
      case 'purple': return '#a855f7';
      case 'pink': return '#ec4899';
      case 'blue': return '#3b82f6';
      default: return null;
    }
  };
  
  const neonColor = getNeonColor();

  return (
    <div 
      style={{ height, width: '100%' }} 
      className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden"
      data-testid="car-3d-viewer"
    >
      {/* Floor grid */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: `linear-gradient(to bottom, transparent 0%, rgba(34, 197, 94, 0.05) 100%)`,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'bottom'
        }}
      />
      
      {/* Car container */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative" style={{ transform: 'perspective(1000px) rotateY(-20deg) rotateX(5deg)' }}>
          {/* Car shadow */}
          <div 
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-64 h-8 rounded-full blur-xl opacity-50"
            style={{ backgroundColor: neonColor || color }}
          />
          
          {/* Car body - Main structure */}
          <div className="relative">
            {/* Lower body */}
            <div 
              className="w-72 h-20 rounded-lg relative"
              style={{ 
                backgroundColor: color,
                boxShadow: `0 10px 30px -10px ${color}60, inset 0 -5px 20px rgba(0,0,0,0.3), inset 0 5px 20px rgba(255,255,255,0.1)`
              }}
            >
              {/* Front end */}
              <div 
                className="absolute left-0 top-0 w-20 h-full rounded-l-lg"
                style={{ 
                  background: `linear-gradient(to right, ${color}dd, ${color})`,
                  borderRadius: '12px 0 0 12px'
                }}
              />
              
              {/* Headlights */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                <div className="w-8 h-3 bg-white rounded-sm" style={{ boxShadow: '0 0 15px #ffffff' }} />
                <div className="w-8 h-3 bg-white rounded-sm" style={{ boxShadow: '0 0 15px #ffffff' }} />
              </div>
              
              {/* Taillights */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                <div className="w-4 h-3 bg-red-500 rounded-sm" style={{ boxShadow: '0 0 10px #ef4444' }} />
                <div className="w-4 h-3 bg-red-500 rounded-sm" style={{ boxShadow: '0 0 10px #ef4444' }} />
              </div>
              
              {/* Side stripe */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 left-20 right-12 h-2"
                style={{ backgroundColor: secondaryColor }}
              />
            </div>
            
            {/* Cabin */}
            <div 
              className="absolute -top-12 left-12 w-48 h-14 rounded-t-xl"
              style={{ 
                backgroundColor: color,
                boxShadow: `inset 0 5px 20px rgba(255,255,255,0.1), inset 0 -5px 15px rgba(0,0,0,0.2)`
              }}
            >
              {/* Windows */}
              <div className="absolute inset-2 rounded-t-lg bg-zinc-900/80 overflow-hidden">
                {/* Window reflection */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
                />
              </div>
            </div>
            
            {/* Wheels */}
            {[{ left: '15%' }, { left: '70%' }].map((pos, i) => (
              <motion.div 
                key={i}
                className="absolute -bottom-4 w-14 h-14"
                style={{ left: pos.left }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                {/* Tire */}
                <div className="w-full h-full rounded-full bg-zinc-800 border-4 border-zinc-700">
                  {/* Rim */}
                  <div className="absolute inset-2 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex items-center justify-center">
                    {/* Rim spokes */}
                    <div className="w-1 h-full absolute bg-zinc-500" />
                    <div className="w-full h-1 absolute bg-zinc-500" />
                    <div className="w-1 h-full absolute bg-zinc-500 rotate-45" />
                    <div className="w-full h-1 absolute bg-zinc-500 rotate-45" />
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Spoiler (if equipped) */}
            {mods?.spoiler && mods.spoiler !== 'none' && (
              <div className="absolute -top-16 right-4 flex flex-col items-center">
                <div 
                  className="w-40 h-2 rounded-sm"
                  style={{ backgroundColor: secondaryColor }}
                />
                <div className="flex gap-24 -mt-0.5">
                  <div className="w-1 h-4" style={{ backgroundColor: secondaryColor }} />
                  <div className="w-1 h-4" style={{ backgroundColor: secondaryColor }} />
                </div>
              </div>
            )}
            
            {/* Neon underglow */}
            {neonColor && (
              <>
                <motion.div 
                  className="absolute -bottom-2 left-4 right-4 h-1 rounded-full"
                  style={{ 
                    backgroundColor: neonColor,
                    boxShadow: `0 0 20px ${neonColor}, 0 0 40px ${neonColor}`
                  }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <div 
                  className="absolute -bottom-6 left-0 right-0 h-20 blur-xl opacity-30"
                  style={{ backgroundColor: neonColor }}
                />
              </>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Ambient particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-neon-green/30" />
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-neon-green/30" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-neon-green/30" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-neon-green/30" />
    </div>
  );
};

export default Car3DViewer;
