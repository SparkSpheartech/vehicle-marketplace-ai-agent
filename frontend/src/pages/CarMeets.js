import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  MapPin, Calendar, Clock, Users, Plus, ArrowLeft,
  Check, Heart, X, Tag, Navigation
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MEET_TAGS = ['JDM', 'Euro', 'American', 'Classic', 'Exotic', 'Tuner', 'Show', 'Cruise', 'Race', 'Drift'];

const CarMeets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: { lat: 0, lng: 0, address: '' },
    start_time: '',
    end_time: '',
    max_attendees: '',
    tags: [],
    is_public: true
  });

  useEffect(() => {
    fetchMeets();
  }, []);

  const fetchMeets = async () => {
    try {
      const response = await axios.get(`${API}/meets`, { withCredentials: true });
      setMeets(response.data);
    } catch (error) {
      console.error('Failed to fetch meets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeet = async (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.start_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await axios.post(`${API}/meets`, {
        ...formData,
        max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
        location: formData.location.address ? formData.location : { lat: 34.0522, lng: -118.2437, address: 'TBD' }
      }, { withCredentials: true });
      
      toast.success('Car meet created!');
      setDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        location: { lat: 0, lng: 0, address: '' },
        start_time: '',
        end_time: '',
        max_attendees: '',
        tags: [],
        is_public: true
      });
      fetchMeets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create meet');
    }
  };

  const handleAttend = async (meetId) => {
    try {
      await axios.post(`${API}/meets/${meetId}/attend`, {}, { withCredentials: true });
      toast.success("You're attending!");
      fetchMeets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to RSVP');
    }
  };

  const handleInterested = async (meetId) => {
    try {
      await axios.post(`${API}/meets/${meetId}/interested`, {}, { withCredentials: true });
      fetchMeets();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update interest');
    }
  };

  const handleLeaveMeet = async (meetId) => {
    try {
      await axios.post(`${API}/meets/${meetId}/leave`, {}, { withCredentials: true });
      toast.success('Left meet');
      fetchMeets();
    } catch (error) {
      toast.error('Failed to leave meet');
    }
  };

  const toggleTag = (tag) => {
    if (formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

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
                <Calendar className="w-5 h-5 text-black" />
              </div>
              <h1 className="font-unbounded font-bold text-xl">CAR MEETS</h1>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="create-meet-btn"
                className="btn-skew bg-neon-green text-black font-bold"
              >
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create Meet
                </span>
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-unbounded text-xl">CREATE CAR MEET</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleCreateMeet} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Saturday Night Cruise"
                    className="bg-secondary/50 border-transparent"
                    data-testid="meet-title-input"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What's the meet about?"
                    rows={3}
                    className="bg-secondary/50 border-transparent resize-none"
                    data-testid="meet-desc-input"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Location</label>
                  <Input
                    value={formData.location.address}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      location: { ...formData.location, address: e.target.value } 
                    })}
                    placeholder="123 Main St, Los Angeles, CA"
                    className="bg-secondary/50 border-transparent"
                    data-testid="meet-location-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Start Time *</label>
                    <Input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="bg-secondary/50 border-transparent"
                      data-testid="meet-start-input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">End Time</label>
                    <Input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="bg-secondary/50 border-transparent"
                      data-testid="meet-end-input"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Max Attendees</label>
                  <Input
                    type="number"
                    value={formData.max_attendees}
                    onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value })}
                    placeholder="Leave empty for unlimited"
                    min="2"
                    className="bg-secondary/50 border-transparent"
                    data-testid="meet-max-input"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {MEET_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 text-xs font-mono uppercase border transition-colors ${
                          formData.tags.includes(tag)
                            ? 'border-neon-green text-neon-green bg-neon-green/10'
                            : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-neon-green text-black" data-testid="submit-meet-btn">
                    Create Meet
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="font-unbounded font-bold text-2xl mb-6">
          UPCOMING <span className="text-neon-green">MEETS</span>
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="spinner"></div>
          </div>
        ) : meets.length === 0 ? (
          <div className="glass-panel p-12 text-center">
            <Calendar className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
            <h3 className="font-unbounded font-bold text-xl mb-2">No Upcoming Meets</h3>
            <p className="text-zinc-400 mb-6">Be the first to create a car meet in your area!</p>
            <Button onClick={() => setDialogOpen(true)} className="btn-skew bg-neon-green text-black font-bold">
              <span>Create Meet</span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {meets.map((meet, index) => (
              <motion.div
                key={meet.meet_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-panel overflow-hidden"
              >
                <div className="h-1 bg-gradient-to-r from-neon-green to-neon-cyan" />
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-unbounded font-bold text-xl">{meet.title}</h3>
                        {meet.host_id === user.user_id && (
                          <span className="text-xs font-mono uppercase px-2 py-0.5 bg-yellow-500/20 text-yellow-500">
                            Your Meet
                          </span>
                        )}
                      </div>
                      
                      <p className="text-zinc-400 mb-4">{meet.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-neon-cyan" />
                          {formatDate(meet.start_time)}
                        </div>
                        {meet.location?.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-neon-green" />
                            {meet.location.address}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-purple-400" />
                          {meet.attendee_count} attending
                          {meet.max_attendees && ` / ${meet.max_attendees} max`}
                        </div>
                      </div>
                      
                      {meet.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {meet.tags.map(tag => (
                            <span key={tag} className="text-xs font-mono px-2 py-0.5 bg-secondary text-zinc-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {meet.is_attending ? (
                        <Button
                          variant="outline"
                          onClick={() => handleLeaveMeet(meet.meet_id)}
                          className="text-red-400 hover:text-red-300"
                          data-testid={`leave-meet-${meet.meet_id}`}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Leave
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={() => handleInterested(meet.meet_id)}
                            className={meet.is_interested ? 'text-pink-400' : ''}
                            data-testid={`interested-meet-${meet.meet_id}`}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${meet.is_interested ? 'fill-pink-400' : ''}`} />
                            {meet.interested_count}
                          </Button>
                          <Button
                            onClick={() => handleAttend(meet.meet_id)}
                            className="bg-neon-green text-black"
                            data-testid={`attend-meet-${meet.meet_id}`}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Attend
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Host info */}
                  <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                      <img 
                        src={meet.host?.picture || 'https://via.placeholder.com/32'} 
                        alt={meet.host?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-sm text-zinc-400">
                      Hosted by <span className="text-white font-bold">{meet.host?.name}</span>
                    </span>
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

export default CarMeets;
