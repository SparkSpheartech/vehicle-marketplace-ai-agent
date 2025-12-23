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
  Eye, Weight, Cog
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  { name: 'Gold', value: '#eab308' },
  { name: 'Silver', value: '#a1a1aa' },
];

const MODS = {
  body_kit: ['stock', 'widebody', 'rocket_bunny', 'liberty_walk', 'custom'],
  spoiler: ['none', 'ducktail', 'gt_wing', 'track', 'drift'],
  wheels: ['stock', 'te37', 'rpf1', 'work_meister', 'bbs', 'forged'],
  exhaust: ['stock', 'catback', 'straight_pipe', 'titanium', 'quad_tip'],
  wrap: ['none', 'matte', 'glossy', 'camo', 'racing_livery', 'carbon'],
  neon: ['none', 'green', 'cyan', 'red', 'purple', 'pink', 'blue'],
  tint: ['none', 'light', 'medium', 'dark', 'limo'],
};

const DRIVETRAINS = ['RWD', 'FWD', 'AWD'];

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
  const [show3DView, setShow3DView] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '#22c55e',
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
      if (selectedCar?.car_id === carId) {
        setSelectedCar(null);
      }
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
    setCarModels([]);
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
      torque: car.torque || 300,
      weight: car.weight || 3000,
      drivetrain: car.drivetrain || 'RWD',
      mods: car.mods || {
        body_kit: 'stock',
        spoiler: 'none',
        wheels: 'stock',
        exhaust: 'stock',
        wrap: 'none',
        neon: 'none',
        tint: 'none',
      },
      is_primary: car.is_primary,
    });
    fetchCarModels(car.make);
    setDialogOpen(true);
  };

  const navItems = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/dashboard' },
    { icon: <Users className="w-5 h-5" />, label: 'Lobbies', path: '/lobbies' },
    { icon: <Shield className="w-5 h-5" />, label: 'Squad', path: '/squad' },
    { icon: <Car className="w-5 h-5" />, label: 'Garage', path: '/garage', active: true },
    { icon: <Settings className="w-5 h-5" />, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Car List */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-unbounded font-bold text-xl">
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
                      Add
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
                            fetchCarModels(value);
                          }}
                        >
                          <SelectTrigger data-testid="make-select" className="bg-secondary/50 border-transparent">
                            <SelectValue placeholder="Select make" />
                          </SelectTrigger>
                          <SelectContent>
                            {carMakes.map((make) => (
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
                            {carModels.map((model) => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Year, HP, Torque, Weight */}
                    <div className="grid grid-cols-4 gap-4">
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
                          HP
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
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                          Torque
                        </label>
                        <Input
                          type="number"
                          value={formData.torque}
                          onChange={(e) => setFormData({ ...formData, torque: parseInt(e.target.value) })}
                          min={50}
                          max={2000}
                          data-testid="torque-input"
                          className="bg-secondary/50 border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                          Weight (lbs)
                        </label>
                        <Input
                          type="number"
                          value={formData.weight}
                          onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                          min={1000}
                          max={10000}
                          data-testid="weight-input"
                          className="bg-secondary/50 border-transparent"
                        />
                      </div>
                    </div>

                    {/* Drivetrain */}
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                        Drivetrain
                      </label>
                      <div className="flex gap-2">
                        {DRIVETRAINS.map((dt) => (
                          <button
                            key={dt}
                            type="button"
                            onClick={() => setFormData({ ...formData, drivetrain: dt })}
                            className={`px-4 py-2 text-sm font-mono uppercase border transition-colors ${
                              formData.drivetrain === dt
                                ? 'border-neon-green text-neon-green bg-neon-green/10'
                                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                            data-testid={`drivetrain-${dt.toLowerCase()}`}
                          >
                            {dt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
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
                      <div>
                        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                          Secondary Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {CAR_COLORS.slice(0, 6).map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, secondary_color: color.value })}
                              className={`color-option ${formData.secondary_color === color.value ? 'selected' : ''}`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
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

            {/* Cars list */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="spinner"></div>
              </div>
            ) : cars.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <Car className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="font-unbounded font-bold text-lg mb-2">Empty Garage</h3>
                <p className="text-zinc-400 text-sm">Add your first car</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cars.map((car) => (
                  <motion.button
                    key={car.car_id}
                    whileHover={{ x: 4 }}
                    onClick={() => setSelectedCar(car)}
                    className={`w-full text-left glass-panel p-4 border transition-all duration-200 ${
                      selectedCar?.car_id === car.car_id
                        ? 'border-neon-green/50 bg-neon-green/5'
                        : 'border-white/10 hover:border-neon-green/30'
                    }`}
                    data-testid={`car-item-${car.car_id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded flex items-center justify-center"
                        style={{ backgroundColor: car.color + '20', borderLeft: `4px solid ${car.color}` }}
                      >
                        <Car className="w-6 h-6" style={{ color: car.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {car.is_primary && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                          <h3 className="font-bold truncate">{car.make} {car.model}</h3>
                        </div>
                        <p className="text-xs text-zinc-500">{car.year} • {car.horsepower} HP • {car.drivetrain}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* 3D Preview & Details */}
          <div className="lg:col-span-2">
            {selectedCar ? (
              <div className="glass-panel overflow-hidden">
                {/* Car color stripe */}
                <div 
                  className="h-2"
                  style={{ backgroundColor: selectedCar.color }}
                />
                
                {/* 3D Viewer */}
                <div className="relative">
                  <Car3DViewer
                    make={selectedCar.make}
                    color={selectedCar.color}
                    secondaryColor={selectedCar.secondary_color}
                    mods={selectedCar.mods}
                    height="350px"
                  />
                  <button
                    onClick={() => setShow3DView(!show3DView)}
                    className="absolute top-4 right-4 glass-panel p-2"
                    data-testid="toggle-3d-view"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Car Details */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {selectedCar.is_primary && (
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        )}
                        <h2 className="font-unbounded font-bold text-2xl">{selectedCar.make}</h2>
                      </div>
                      <p className="text-xl text-zinc-400">{selectedCar.model}</p>
                      <p className="text-sm text-zinc-500 font-mono">{selectedCar.year}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(selectedCar)}
                        data-testid="edit-selected-car"
                      >
                        Edit
                      </Button>
                      {!selectedCar.is_primary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(selectedCar.car_id)}
                          data-testid="set-primary-btn"
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(selectedCar.car_id)}
                        className="text-red-400 hover:text-red-300"
                        data-testid="delete-selected-car"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-2">
                        <Gauge className="w-4 h-4 text-neon-green" />
                        Power
                      </div>
                      <p className="font-unbounded font-bold text-xl text-neon-green">
                        {selectedCar.horsepower} <span className="text-sm">HP</span>
                      </p>
                      <div className="stat-bar mt-2">
                        <div 
                          className="stat-bar-fill" 
                          style={{ width: `${Math.min((selectedCar.horsepower / 1500) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-2">
                        <Cog className="w-4 h-4 text-neon-cyan" />
                        Torque
                      </div>
                      <p className="font-unbounded font-bold text-xl text-neon-cyan">
                        {selectedCar.torque} <span className="text-sm">lb-ft</span>
                      </p>
                      <div className="stat-bar mt-2">
                        <div 
                          className="stat-bar-fill" 
                          style={{ width: `${Math.min((selectedCar.torque / 1500) * 100, 100)}%`, background: 'linear-gradient(90deg, #06b6d4, #22c55e)' }}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-2">
                        <Weight className="w-4 h-4 text-purple-400" />
                        Weight
                      </div>
                      <p className="font-unbounded font-bold text-xl text-purple-400">
                        {selectedCar.weight} <span className="text-sm">lbs</span>
                      </p>
                    </div>
                    
                    <div className="bg-secondary/30 p-4">
                      <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono uppercase mb-2">
                        <Car className="w-4 h-4 text-orange-400" />
                        Drivetrain
                      </div>
                      <p className="font-unbounded font-bold text-xl text-orange-400">
                        {selectedCar.drivetrain}
                      </p>
                    </div>
                  </div>

                  {/* Mods */}
                  {selectedCar.mods && (
                    <div>
                      <h3 className="text-sm font-mono uppercase text-zinc-500 mb-3">Modifications</h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(selectedCar.mods)
                          .filter(([_, v]) => v !== 'stock' && v !== 'none')
                          .map(([key, value]) => (
                            <span 
                              key={key}
                              className="text-xs font-mono px-3 py-1 bg-neon-green/10 text-neon-green border border-neon-green/30"
                            >
                              {key.replace('_', ' ')}: {value.replace('_', ' ')}
                            </span>
                          ))}
                        {Object.entries(selectedCar.mods).filter(([_, v]) => v !== 'stock' && v !== 'none').length === 0 && (
                          <span className="text-xs text-zinc-500">Stock configuration</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 text-center h-full flex flex-col items-center justify-center">
                <Car className="w-16 h-16 text-zinc-600 mb-4" />
                <h3 className="font-unbounded font-bold text-xl mb-2">Select a Car</h3>
                <p className="text-zinc-400">Choose a car from your garage to view details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Garage;
