import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Avatar3DViewer from '@/components/Avatar3DViewer';
import { 
  Car, MapPin, Users, Settings, ArrowLeft, 
  Save, User
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Avatar customization options
const AVATAR_OPTIONS = {
  skin_tones: [
    { name: 'Light', value: '#FFD5C8' },
    { name: 'Fair', value: '#F5C4A1' },
    { name: 'Medium', value: '#D4A574' },
    { name: 'Tan', value: '#B68A5B' },
    { name: 'Brown', value: '#8D5524' },
    { name: 'Dark', value: '#5C3317' },
  ],
  hair_styles: ['short', 'long', 'buzz', 'mohawk', 'curly', 'bald'],
  hair_colors: [
    { name: 'Black', value: '#2C1810' },
    { name: 'Brown', value: '#654321' },
    { name: 'Blonde', value: '#D4A76A' },
    { name: 'Red', value: '#8B4513' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Purple', value: '#a855f7' },
  ],
  outfits: ['racing_jacket', 'hoodie', 'tshirt', 'suit', 'streetwear'],
  outfit_colors: [
    { name: 'Neon Green', value: '#22c55e' },
    { name: 'Cyber Cyan', value: '#06b6d4' },
    { name: 'Racing Red', value: '#ef4444' },
    { name: 'Black', value: '#18181b' },
    { name: 'White', value: '#fafafa' },
    { name: 'Purple', value: '#a855f7' },
  ],
  accessories: ['none', 'glasses', 'sunglasses', 'cap', 'headphones', 'bandana'],
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    avatar_style: user?.avatar_style || {
      skin_tone: '#FFD5C8',
      hair_style: 'short',
      hair_color: '#2C1810',
      outfit: 'racing_jacket',
      outfit_color: '#22c55e',
      accessory: 'none',
    },
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put(
        `${API}/users/me`,
        formData,
        { withCredentials: true }
      );
      updateUser(response.data);
      toast.success('Profile updated!');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const updateAvatarStyle = (key, value) => {
    setFormData({
      ...formData,
      avatar_style: { ...formData.avatar_style, [key]: value },
    });
  };

  const navItems = [
    { icon: <MapPin className="w-5 h-5" />, label: 'Map', path: '/dashboard' },
    { icon: <Users className="w-5 h-5" />, label: 'Lobbies', path: '/lobbies' },
    { icon: <Car className="w-5 h-5" />, label: 'Garage', path: '/garage' },
    { icon: <Settings className="w-5 h-5" />, label: 'Profile', path: '/profile', active: true },
  ];

  return (
    <div className="min-h-screen bg-void">
      {/* Header */}
      <header className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
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
                <User className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-unbounded font-bold text-xl">PROFILE</h1>
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

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Avatar Preview & Customization */}
          <div className="glass-panel p-6">
            <h2 className="font-unbounded font-bold text-xl mb-6">
              AVATAR <span className="text-neon-green">STYLE</span>
            </h2>

            {/* Avatar Preview */}
            <div className="relative w-48 h-48 mx-auto mb-8">
              <div 
                className="w-full h-full rounded-full border-4 border-neon-green shadow-neon overflow-hidden"
                style={{ backgroundColor: formData.avatar_style.skin_tone }}
              >
                {/* Simple avatar representation */}
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    {/* Hair */}
                    <div 
                      className="w-20 h-8 rounded-t-full mx-auto -mb-2"
                      style={{ backgroundColor: formData.avatar_style.hair_color }}
                    />
                    {/* Face */}
                    <div 
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                      style={{ backgroundColor: formData.avatar_style.skin_tone }}
                    >
                      {/* Eyes */}
                      <div className="flex gap-4 -mt-2">
                        <div className="w-2 h-2 bg-zinc-900 rounded-full" />
                        <div className="w-2 h-2 bg-zinc-900 rounded-full" />
                      </div>
                    </div>
                    {/* Outfit */}
                    <div 
                      className="w-24 h-12 rounded-t-lg mx-auto -mt-2"
                      style={{ backgroundColor: formData.avatar_style.outfit_color }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Skin Tone */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Skin Tone
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.skin_tones.map((tone) => (
                  <button
                    key={tone.value}
                    type="button"
                    onClick={() => updateAvatarStyle('skin_tone', tone.value)}
                    className={`color-option ${formData.avatar_style.skin_tone === tone.value ? 'selected' : ''}`}
                    style={{ backgroundColor: tone.value }}
                    title={tone.name}
                    data-testid={`skin-${tone.name.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Hair Style
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.hair_styles.map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateAvatarStyle('hair_style', style)}
                    className={`px-3 py-1 text-xs font-mono uppercase border transition-colors ${
                      formData.avatar_style.hair_style === style
                        ? 'border-neon-green text-neon-green bg-neon-green/10'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                    data-testid={`hair-${style}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Hair Color
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.hair_colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => updateAvatarStyle('hair_color', color.value)}
                    className={`color-option ${formData.avatar_style.hair_color === color.value ? 'selected' : ''}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    data-testid={`hair-color-${color.name.toLowerCase()}`}
                  />
                ))}
              </div>
            </div>

            {/* Outfit Color */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Outfit Color
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.outfit_colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => updateAvatarStyle('outfit_color', color.value)}
                    className={`color-option ${formData.avatar_style.outfit_color === color.value ? 'selected' : ''}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    data-testid={`outfit-color-${color.name.toLowerCase().replace(' ', '-')}`}
                  />
                ))}
              </div>
            </div>

            {/* Accessory */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Accessory
              </label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.accessories.map((acc) => (
                  <button
                    key={acc}
                    type="button"
                    onClick={() => updateAvatarStyle('accessory', acc)}
                    className={`px-3 py-1 text-xs font-mono uppercase border transition-colors ${
                      formData.avatar_style.accessory === acc
                        ? 'border-neon-green text-neon-green bg-neon-green/10'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                    }`}
                    data-testid={`accessory-${acc}`}
                  >
                    {acc}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="glass-panel p-6">
            <h2 className="font-unbounded font-bold text-xl mb-6">
              PROFILE <span className="text-neon-cyan">INFO</span>
            </h2>

            {/* Profile Picture */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-secondary/30 border border-white/5">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neon-cyan">
                <img
                  src={user?.picture || 'https://via.placeholder.com/64'}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Google Profile Picture</p>
                <p className="text-xs text-zinc-500 mt-1">Synced from your Google account</p>
              </div>
            </div>

            {/* Name */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Display Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                data-testid="name-input"
                className="bg-secondary/50 border-transparent focus:border-neon-green"
              />
            </div>

            {/* Bio */}
            <div className="mb-6">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Bio
              </label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell others about yourself and your cars..."
                rows={4}
                data-testid="bio-input"
                className="bg-secondary/50 border-transparent focus:border-neon-green resize-none"
              />
            </div>

            {/* Email (read-only) */}
            <div className="mb-8">
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                Email
              </label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-secondary/30 border-transparent text-zinc-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Connected via Google</p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              data-testid="save-profile-btn"
              className="w-full btn-skew bg-neon-green text-black font-bold uppercase tracking-wider hover:bg-neon-green/90"
            >
              <span className="flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
