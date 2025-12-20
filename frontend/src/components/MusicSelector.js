import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Music2, Search, X, Play, Pause } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Simulated music data for demo (in production, integrate with Spotify API)
const DEMO_SONGS = [
  { name: 'Blinding Lights', artist: 'The Weeknd', album_art: 'https://via.placeholder.com/60/22c55e/000000?text=BL' },
  { name: 'Midnight City', artist: 'M83', album_art: 'https://via.placeholder.com/60/06b6d4/000000?text=MC' },
  { name: 'Nightcall', artist: 'Kavinsky', album_art: 'https://via.placeholder.com/60/a855f7/000000?text=NC' },
  { name: 'Running in the 90s', artist: 'Max Coveri', album_art: 'https://via.placeholder.com/60/ef4444/000000?text=R90' },
  { name: 'Gas Gas Gas', artist: 'Manuel', album_art: 'https://via.placeholder.com/60/f97316/000000?text=GGG' },
  { name: 'Deja Vu', artist: 'Dave Rodgers', album_art: 'https://via.placeholder.com/60/3b82f6/000000?text=DV' },
  { name: 'Tokyo Drift', artist: 'Teriyaki Boyz', album_art: 'https://via.placeholder.com/60/ec4899/000000?text=TD' },
  { name: 'Rap God', artist: 'Eminem', album_art: 'https://via.placeholder.com/60/27272a/ffffff?text=RG' },
];

const MusicSelector = ({ currentSong, onSongUpdate, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSongs, setFilteredSongs] = useState(DEMO_SONGS);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (searchQuery) {
      const filtered = DEMO_SONGS.filter(song => 
        song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        song.artist.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSongs(filtered);
    } else {
      setFilteredSongs(DEMO_SONGS);
    }
  }, [searchQuery]);

  const handleSelectSong = async (song) => {
    try {
      await axios.post(`${API}/music/update`, song, { withCredentials: true });
      onSongUpdate(song);
      setIsPlaying(true);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update song:', error);
    }
  };

  const handleClearSong = async () => {
    try {
      await axios.delete(`${API}/music/clear`, { withCredentials: true });
      onClear();
      setIsPlaying(false);
    } catch (error) {
      console.error('Failed to clear song:', error);
    }
  };

  return (
    <div className="relative">
      {/* Current Song Display / Trigger Button */}
      {currentSong ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-3 flex items-center gap-3 cursor-pointer hover:border-green-500/30 transition-colors"
          onClick={() => setIsOpen(true)}
          data-testid="music-display"
        >
          <div className="relative">
            {currentSong.album_art ? (
              <img 
                src={currentSong.album_art} 
                alt="Album" 
                className="w-12 h-12 rounded"
              />
            ) : (
              <div className="w-12 h-12 bg-green-500/20 rounded flex items-center justify-center">
                <Music2 className="w-6 h-6 text-green-500" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                <Play className="w-2 h-2 text-black fill-black" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{currentSong.name}</p>
            <p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClearSong();
            }}
            className="p-1 hover:bg-white/10 rounded"
            data-testid="clear-song-btn"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </motion.div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full justify-start gap-2"
          data-testid="select-music-btn"
        >
          <Music2 className="w-4 h-4 text-green-500" />
          <span>Select Music</span>
        </Button>
      )}

      {/* Song Selector Modal */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-panel w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-unbounded font-bold text-lg">Select Song</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search songs..."
                  className="pl-10 bg-secondary/50 border-transparent"
                  data-testid="music-search-input"
                />
              </div>
            </div>

            {/* Song List */}
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {filteredSongs.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No songs found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredSongs.map((song, index) => (
                    <motion.button
                      key={`${song.name}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectSong(song)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded transition-colors text-left"
                      data-testid={`song-${index}`}
                    >
                      {song.album_art ? (
                        <img 
                          src={song.album_art} 
                          alt={song.name} 
                          className="w-10 h-10 rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-green-500/20 rounded flex items-center justify-center">
                          <Music2 className="w-5 h-5 text-green-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{song.name}</p>
                        <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                      </div>
                      <Play className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-secondary/30">
              <p className="text-xs text-zinc-500 text-center">
                Connect Spotify for more songs (coming soon)
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default MusicSelector;
