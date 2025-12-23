import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Users, Car, Zap } from 'lucide-react';

const Landing = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "REAL-TIME MAP",
      description: "See every car enthusiast in your city on an interactive map"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "CONNECT",
      description: "Request to join other drivers, build your crew"
    },
    {
      icon: <Car className="w-8 h-8" />,
      title: "YOUR GARAGE",
      description: "Showcase your rides with full customization options"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "CITY LOBBIES",
      description: "Join your city's lobby and meet local enthusiasts"
    }
  ];

  return (
    <div className="min-h-screen bg-void overflow-hidden">
      {/* Hero Section */}
      <div className="relative h-screen">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1629935635086-1855c8d125cc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHwxfHxuZW9uJTIwc3BvcnRzJTIwY2FyJTIwbmlnaHR8ZW58MHx8fHwxNzY2MTkyMDI2fDA&ixlib=rb-4.1.0&q=85')`
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-void/40 to-void"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <header className="flex items-center justify-between px-6 md:px-12 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neon-green flex items-center justify-center">
                <Car className="w-6 h-6 text-black" />
              </div>
              <span className="font-unbounded font-bold text-xl tracking-tight">KYNET<span className="text-neon-green">IK</span></span>
            </div>
            <Button
              onClick={login}
              data-testid="header-login-btn"
              className="btn-skew bg-neon-green text-black font-bold uppercase tracking-wider hover:bg-neon-green/90 px-6 py-2"
            >
              <span>Sign In</span>
            </Button>
          </header>

          {/* Hero Content */}
          <div className="flex-1 flex items-center px-6 md:px-12">
            <div className="max-w-3xl">
              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="font-unbounded font-black text-5xl md:text-7xl lg:text-8xl uppercase tracking-tighter leading-none mb-6"
              >
                FIND YOUR
                <br />
                <span className="text-neon-green neon-text">CREW</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-zinc-400 text-lg md:text-xl max-w-xl mb-8 leading-relaxed"
              >
                The ultimate platform for car enthusiasts. See who's around, 
                check out their builds, and connect with your local car community.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Button
                  onClick={login}
                  data-testid="hero-get-started-btn"
                  className="btn-skew bg-neon-green text-black font-bold uppercase tracking-wider text-lg px-10 py-6 hover:bg-neon-green/90 shadow-neon"
                >
                  <span>Get Started</span>
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 border-2 border-zinc-600 rounded-full flex items-start justify-center p-2"
            >
              <div className="w-1.5 h-1.5 bg-neon-green rounded-full"></div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-unbounded font-bold text-3xl md:text-4xl uppercase tracking-tight mb-16 text-center">
            HOW IT <span className="text-neon-green">WORKS</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-panel p-8 hover:border-neon-green/30 transition-colors duration-300"
              >
                <div className="text-neon-green mb-4">{feature.icon}</div>
                <h3 className="font-unbounded font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 md:px-12 relative">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1626684458962-c38a637af935?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxuZW9uJTIwc3BvcnRzJTIwY2FyJTIwbmlnaHR8ZW58MHx8fHwxNzY2MTkyMDI2fDA&ixlib=rb-4.1.0&q=85')`
          }}
        ></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-unbounded font-black text-4xl md:text-6xl uppercase tracking-tighter mb-6">
            READY TO <span className="text-neon-green neon-text">ROLL?</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
            Join thousands of car enthusiasts already connecting through ForzaCommunity.
          </p>
          <Button
            onClick={login}
            data-testid="cta-join-btn"
            className="btn-skew bg-neon-green text-black font-bold uppercase tracking-wider text-lg px-12 py-6 hover:bg-neon-green/90 shadow-neon"
          >
            <span>Join Now</span>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Car className="w-5 h-5 text-neon-green" />
            <span className="font-unbounded font-bold text-sm">KYNETIK</span>
          </div>
          <p className="text-zinc-500 text-sm">© 2025 Kynetik. Built for the car community.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
