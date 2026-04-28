import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import Car3DViewer from '@/components/Car3DViewer';
import { 
  Car, MapPin, Users, Settings, ArrowLeft, 
  Plus, Gauge, Trash2, Star, Palette, Wrench, Shield,
  Eye, Weight, Cog, Speedometer, Zap
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Garage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cars, setCars] = useState([]);
  const [carMakes, setCarMakes] = useState([]);
  const [carModels, setCarModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '#CCFF00',
    secondary_color: '#000000',
    horsepower: 300,
    torque: 300,
    weight: 3000,
    drivetrain: 'RWD',
    mods: {
      body_kit: 'stock',
      spoiler: 'none',
      wheels: 'stock',
      exhaust: 'stock',
      wrap: 'none',
      neon: 'none',
      tint: 'none',
    },
    is_primary: false,
  });

  useEffect(() => {
    fetchGarage();
    fetchCarMakes();
  }, []);

  const fetchGarage = async () => {
    try {
      const response = await axios.get(`${API}/garage`, { withCredentials: true });
      setCars(response.data);
      if (response.data.length > 0 && !selectedCar) {
        setSelectedCar(response.data.find(c => c.is_primary) || response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch garage:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCarMakes = async () => {
    try {
      const response = await axios.get(`${API}/cars/makes`, { withCredentials: true });
      setCarMakes(response.data);
    } catch (error) {
      console.error('Failed to fetch car makes:', error);
    }
  };

  const fetchCarModels = async (make) => {
    try {
      const response = await axios.get(`${API}/cars/models/${make}`, { withCredentials: true });
      setCarModels(response.data);
    } catch (error) {
      console.error('Failed to fetch car models:', error);
      setCarModels([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCar) {
        await axios.put(`${API}/garage/cars/${editingCar.car_id}`, formData, { withCredentials: true });
        toast.success('Car updated!');
      } else {
        await axios.post(`${API}/garage/cars`, formData, { withCredentials: true });
        toast.success('Car added to garage!');
      }
      fetchGarage();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save car');
    }
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '#CCFF00',
      secondary_color: '#000000',
      horsepower: 300,
      torque: 300,
      weight: 3000,
      drivetrain: 'RWD',
      mods: {
        body_kit: 'stock',
        spoiler: 'none',
        wheels: 'stock',
        exhaust: 'stock',
        wrap: 'none',
        neon: 'none',
        tint: 'none',
      },
      is_primary: false,
    });
    setEditingCar(null);
  };

  return (
    <div className="min-h-screen bg-background text-on-background font-body-base pb-24 md:pb-0">
      <main className="max-w-7xl mx-auto md:px-6">
        {selectedCar ? (
          <>
            {/* Hero Section */}
            <section className="relative w-full h-[397px] md:h-[530px] md:rounded-xl overflow-hidden md:mt-6 milled-edge shadow-2xl group">
              <div className="absolute inset-0 bg-void">
                <Car3DViewer
                  make={selectedCar.make}
                  color={selectedCar.color}
                  secondaryColor={selectedCar.secondary_color}
                  mods={selectedCar.mods}
                  height="100%"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent pointer-events-none"></div>
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-none bg-primary-fixed text-black font-label-caps text-[10px] font-bold shadow-[0_0_15px_#CCFF00] tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-black mr-2 animate-pulse"></span>
                  {selectedCar.is_primary ? 'ACTIVE' : 'READY'}
                </span>
                <button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-black/50 text-white p-2 hover:bg-black transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
                <h2 className="font-display-lg text-white text-4xl md:text-6xl font-black italic uppercase drop-shadow-2xl tracking-tighter">
                  {selectedCar.year} {selectedCar.make} {selectedCar.model}
                </h2>
              </div>
            </section>

            {/* Stats Section */}
            <section className="px-6 md:px-0 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Drivetrain', value: selectedCar.drivetrain, sub: 'Layout', icon: Cog },
                { label: 'Power', value: selectedCar.horsepower, sub: 'HP', icon: Zap },
                { label: 'Torque', value: selectedCar.torque, sub: 'LB-FT', icon: Gauge },
                { label: 'Weight', value: selectedCar.weight, sub: 'LBS', icon: Weight },
              ].map((stat, i) => (
                <div key={i} className="bg-surface-container-high rounded-none p-6 milled-edge relative overflow-hidden group hover:shadow-[0_0_15px_rgba(195,244,0,0.2)] transition-all">
                  <div className="absolute inset-0 carbon-pattern opacity-10 pointer-events-none"></div>
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-3 h-3 text-on-surface-variant" />
                    <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest">{stat.label}</p>
                  </div>
                  <p className="font-stats-num text-3xl font-bold italic text-primary-fixed">{stat.value}</p>
                  <p className="font-body-base text-xs text-on-surface opacity-60 uppercase tracking-widest">{stat.sub}</p>
                </div>
              ))}
            </section>

            {/* Primary Action */}
            <section className="px-6 md:px-0 pb-8 flex gap-4">
              <Button 
                onClick={() => setDialogOpen(true)}
                className="w-full md:w-auto md:px-10 py-6 rounded-none border border-primary-fixed text-primary-fixed font-label-caps text-xs font-bold uppercase hover:bg-primary-fixed/10 hover:shadow-[0_0_15px_rgba(195,244,0,0.3)] transition-all flex justify-center items-center gap-3 tracking-widest"
              >
                <Settings className="w-4 h-4" />
                MANAGE SETUP
              </Button>
              {!selectedCar.is_primary && (
                <Button 
                  onClick={async () => {
                    await axios.put(`${API}/garage/cars/${selectedCar.car_id}`, { is_primary: true }, { withCredentials: true });
                    fetchGarage();
                    toast.success('Set as active vehicle');
                  }}
                  className="bg-primary-fixed text-black font-bold uppercase tracking-widest text-xs px-8 h-auto"
                >
                  SET ACTIVE
                </Button>
              )}
            </section>

            {/* Modifications Section */}
            <section className="px-6 md:px-0 pb-12">
              <h3 className="font-headline-md text-white text-xl font-bold uppercase italic mb-6 border-b border-white/10 pb-4 tracking-widest">
                MODIFICATIONS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(selectedCar.mods || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-4 bg-surface-container rounded-none p-5 milled-edge border border-transparent hover:border-primary-fixed/30 transition-all group">
                    <div className="w-12 h-12 rounded-none bg-surface-container-high flex items-center justify-center text-primary-fixed milled-edge group-hover:bg-primary-fixed group-hover:text-black transition-all">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">{key.replace('_', ' ')}</p>
                      <p className="font-body-base text-sm font-bold text-white uppercase italic tracking-wide">{value.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center">
             <Car className="w-16 h-16 text-zinc-600 mb-4" />
             <h3 className="font-unbounded font-bold text-2xl mb-4">Your Garage is Empty</h3>
             <Button onClick={() => setDialogOpen(true)} className="bg-primary-fixed text-black font-bold uppercase tracking-widest px-8">
               ADD YOUR FIRST RIDE
             </Button>
          </div>
        )}

        {/* Collection Section */}
        <section className="px-6 md:px-0 pb-12">
          <div className="flex justify-between items-baseline mb-6 border-b border-white/10 pb-4">
            <h3 className="font-headline-md text-white text-xl font-bold uppercase italic tracking-widest">YOUR COLLECTION</h3>
            <p className="font-label-caps text-xs text-primary-fixed uppercase tracking-widest">{cars.length} CARS</p>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory hide-scrollbar">
            {cars.map((car) => (
              <div 
                key={car.car_id}
                onClick={() => setSelectedCar(car)}
                className={`min-w-[280px] md:min-w-[320px] bg-surface-container rounded-none overflow-hidden milled-edge snap-start group cursor-pointer relative border transition-all ${selectedCar?.car_id === car.car_id ? 'border-primary-fixed shadow-[0_0_15px_rgba(195,244,0,0.2)]' : 'border-transparent'}`}
              >
                <div className="absolute inset-0 carbon-pattern opacity-5 pointer-events-none z-10 group-hover:opacity-10 transition-opacity"></div>
                <div className="h-40 overflow-hidden relative bg-black flex items-center justify-center">
                  <Car className="w-12 h-12 text-zinc-800" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container to-transparent opacity-60"></div>
                </div>
                <div className="p-5 relative z-20 bg-gradient-to-t from-surface-container to-surface-container/90">
                  <p className="font-label-caps text-[10px] text-on-surface-variant mb-1 uppercase tracking-widest">{car.year} • {car.drivetrain}</p>
                  <h4 className="font-headline-md text-white text-lg font-bold uppercase italic tracking-wider">{car.make} {car.model}</h4>
                </div>
                {car.is_primary && (
                  <div className="absolute top-4 right-4 z-30">
                    <Star className="w-4 h-4 text-primary-fixed fill-primary-fixed" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Garage;

