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
import { 
  Car, MapPin, Users, Settings, ArrowLeft, 
  Plus, Gauge, Trash2, Star, Palette, Wrench
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Car makes and models
const CAR_DATA = {
  'Nissan': ['GT-R', '370Z', 'Skyline', 'Silvia S15', '240SX'],
  'Toyota': ['Supra', 'AE86', 'GR86', 'Celica', 'MR2'],
  'Honda': ['NSX', 'Civic Type R', 'S2000', 'Integra Type R'],
  'Mazda': ['RX-7', 'RX-8', 'MX-5 Miata', 'Mazda3'],
  'Subaru': ['WRX STI', 'BRZ', 'Impreza', 'Legacy'],
  'Mitsubishi': ['Lancer Evo', 'Eclipse', '3000GT'],
  'Ford': ['Mustang GT', 'Focus RS', 'GT', 'Shelby GT500'],
  'Chevrolet': ['Corvette', 'Camaro SS', 'Camaro ZL1'],
  'Dodge': ['Challenger Hellcat', 'Charger Hellcat', 'Viper'],
  'BMW': ['M3', 'M4', 'M5', 'Z4'],
  'Mercedes': ['AMG GT', 'C63 AMG', 'E63 AMG'],
  'Porsche': ['911 GT3', '911 Turbo', 'Cayman', 'Boxster'],
  'Lamborghini': ['Huracán', 'Aventador', 'Urus'],
  'Ferrari': ['488 GTB', 'F8 Tributo', '812 Superfast'],
  'McLaren': ['720S', '570S', 'P1'],
};

const CAR_COLORS = [
  { name: 'Neon Green', value: '#22c55e' },
  { name: 'Cyber Cyan', value: '#06b6d4' },
  { name: 'Racing Red', value: '#ef4444' },
  { name: 'Purple Haze', value: '#a855f7' },
  { name: 'Orange Fury', value: '#f97316' },
  { name: 'Electric Blue', value: '#3b82f6' },
  { name: 'Hot Pink', value: '#ec4899' },
  { name: 'Midnight Black', value: '#18181b' },
  { name: 'Pearl White', value: '#fafafa' },
  { name: 'Gunmetal Grey', value: '#52525b' },
];

const MODS = {
  body_kit: ['stock', 'widebody', 'rocket_bunny', 'liberty_walk', 'custom'],
  spoiler: ['none', 'ducktail', 'gt_wing', 'track', 'drift'],
  wheels: ['stock', 'te37', 'rpf1', 'work_meister', 'bbs', 'forged'],
  exhaust: ['stock', 'catback', 'straight_pipe', 'titanium', 'quad_tip'],
  wrap: ['none', 'matte', 'glossy', 'camo', 'racing_livery', 'carbon'],
};

const Garage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '#22c55e',
    secondary_color: '#000000',
    horsepower: 300,
    mods: {
      body_kit: 'stock',
      spoiler: 'none',
      wheels: 'stock',
      exhaust: 'stock',
      wrap: 'none',
    },
    is_primary: false,
  });

  useEffect(() => {
    fetchGarage();
  }, []);

  const fetchGarage = async () => {
    try {
      const response = await axios.get(`${API}/garage`, { withCredentials: true });
      setCars(response.data);
    } catch (error) {
      console.error('Failed to fetch garage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.make || !formData.model) {
      toast.error('Please select make and model');
      return;
    }

    try {
      if (editingCar) {
        await axios.put(
          `${API}/garage/cars/${editingCar.car_id}`,
          formData,
          { withCredentials: true }
        );
        toast.success('Car updated!');
      } else {
        await axios.post(
          `${API}/garage/cars`,
          formData,
          { withCredentials: true }
        );
        toast.success('Car added to garage!');
      }
      
      fetchGarage();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save car');
    }
  };

  const handleDelete = async (carId) => {
    if (!window.confirm('Are you sure you want to delete this car?')) return;
    
    try {
      await axios.delete(`${API}/garage/cars/${carId}`, { withCredentials: true });
      toast.success('Car deleted');
      fetchGarage();
    } catch (error) {
      toast.error('Failed to delete car');
    }
  };

  const handleSetPrimary = async (carId) => {
    try {
      await axios.put(
        `${API}/garage/cars/${carId}`,
        { is_primary: true },
        { withCredentials: true }
      );
      toast.success('Primary car updated!');
      fetchGarage();
    } catch (error) {
      toast.error('Failed to update primary car');
    }
  };

  const resetForm = () => {
    setFormData({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      color: '#22c55e',
      secondary_color: '#000000',
      horsepower: 300,
      mods: {
        body_kit: 'stock',
        spoiler: 'none',
        wheels: 'stock',
        exhaust: 'stock',
        wrap: 'none',
      },
      is_primary: false,
    });
    setEditingCar(null);
  };

  const openEditDialog = (car) => {
    setEditingCar(car);
    setFormData({
      make: car.make,
      model: car.model,
      year: car.year,
      color: car.color,
      secondary_color: car.secondary_color || '#000000',
      horsepower: car.horsepower || 300,
      mods: car.mods || {
        body_kit: 'stock',
        spoiler: 'none',
        wheels: 'stock',
        exhaust: 'stock',
        wrap: 'none',
      },
      is_primary: car.is_primary,
    });
    setDialogOpen(true);
  };

  const navItems = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/dashboard' },
    { icon: <Users className="w-5 h-5" />, label: 'Lobbies', path: '/lobbies' },
    { icon: <Car className="w-5 h-5" />, label: 'Garage', path: '/garage', active: true },
    { icon: <Settings className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white transition-colors"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-neon-green flex items-center justify-center">
                <Car className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-unbounded font-bold text-xl">MY GARAGE</h1>
            </div>
          </div>
          
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider transition-colors ${
                  item.active 
                    ? 'text-neon-green' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header with add button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-unbounded font-bold text-2xl">
              YOUR <span className="text-neon-green">RIDES</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-1">
              {cars.length} car{cars.length !== 1 ? 's' : ''} in garage
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-car-btn"
                className="btn-skew bg-neon-green text-black font-bold uppercase tracking-wider hover:bg-neon-green/90"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Car
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-unbounded text-xl">
                  {editingCar ? 'EDIT CAR' : 'ADD NEW CAR'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                {/* Make & Model */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Make
                    </label>
                    <Select
                      value={formData.make}
                      onValueChange={(value) => {
                        setFormData({ ...formData, make: value, model: '' });
                      }}
                    >
                      <SelectTrigger data-testid="make-select" className="bg-secondary/50 border-transparent">
                        <SelectValue placeholder="Select make" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(CAR_DATA).map((make) => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Model
                    </label>
                    <Select
                      value={formData.model}
                      onValueChange={(value) => setFormData({ ...formData, model: value })}
                      disabled={!formData.make}
                    >
                      <SelectTrigger data-testid="model-select" className="bg-secondary/50 border-transparent">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.make && CAR_DATA[formData.make]?.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Year & HP */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Year
                    </label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      min={1980}
                      max={new Date().getFullYear() + 1}
                      data-testid="year-input"
                      className="bg-secondary/50 border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                      Horsepower
                    </label>
                    <Input
                      type="number"
                      value={formData.horsepower}
                      onChange={(e) => setFormData({ ...formData, horsepower: parseInt(e.target.value) })}
                      min={50}
                      max={2000}
                      data-testid="hp-input"
                      className="bg-secondary/50 border-transparent"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    <Palette className="w-3 h-3 inline mr-1" />
                    Primary Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CAR_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`color-option ${formData.color === color.value ? 'selected' : ''}`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        data-testid={`color-${color.name.toLowerCase().replace(' ', '-')}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Mods */}
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
                    <Wrench className="w-3 h-3 inline mr-1" />
                    Modifications
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(MODS).map(([modType, options]) => (
                      <Select
                        key={modType}
                        value={formData.mods[modType]}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          mods: { ...formData.mods, [modType]: value }
                        })}
                      >
                        <SelectTrigger className="bg-secondary/50 border-transparent text-sm">
                          <SelectValue placeholder={modType.replace('_', ' ')} />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.replace('_', ' ').toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-testid="save-car-btn"
                    className="flex-1 bg-neon-green text-black hover:bg-neon-green/90"
                  >
                    {editingCar ? 'Save Changes' : 'Add to Garage'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cars grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : cars.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Car className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="font-unbounded font-bold text-xl mb-2">Empty Garage</h3>
            <p className="text-zinc-400 mb-6">Add your first car to get started</p>
            <Button
              onClick={() => setDialogOpen(true)}
              data-testid="add-first-car-btn"
              className="btn-skew bg-neon-green text-black font-bold"
            >
              <span>Add Your First Car</span>
            </Button>
          </div>
        ) : (
          <div className="garage-grid">
            {cars.map((car, index) => (
              <motion.div
                key={car.car_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="car-card glass-panel overflow-hidden"
              >
                {/* Car color stripe */}
                <div 
                  className="h-2"
                  style={{ backgroundColor: car.color }}
                />
                
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {car.is_primary && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <h3 className="font-unbounded font-bold text-lg">
                          {car.make}
                        </h3>
                      </div>
                      <p className="text-zinc-400">{car.model}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">{car.year}</span>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Gauge className="w-3 h-3" /> Power
                        </span>
                        <span className="font-mono text-neon-green">{car.horsepower} HP</span>
                      </div>
                      <div className="stat-bar">
                        <div 
                          className="stat-bar-fill" 
                          style={{ width: `${Math.min((car.horsepower / 1000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mods tags */}
                  {car.mods && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {Object.entries(car.mods)
                        .filter(([_, v]) => v !== 'stock' && v !== 'none')
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <span 
                            key={key}
                            className="text-xs font-mono px-2 py-0.5 bg-secondary text-zinc-400"
                          >
                            {value.replace('_', ' ')}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(car)}
                      data-testid={`edit-car-${car.car_id}`}
                      className="flex-1 text-xs"
                    >
                      Edit
                    </Button>
                    {!car.is_primary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(car.car_id)}
                        data-testid={`primary-car-${car.car_id}`}
                        className="text-xs"
                      >
                        <Star className="w-3 h-3" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(car.car_id)}
                      data-testid={`delete-car-${car.car_id}`}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Garage;
