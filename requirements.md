# Forza Community App - Requirements & Architecture

## Original Problem Statement
Build a Forza Horizon-style map application for car community with:
- Real-time GPS tracking showing users on a map
- Customizable avatars (like Snapchat Bitmoji)
- Car garage with NFS Unbound-style customization
- City-based lobbies
- Request to connect with other drivers
- Squad system (max 8 members, $5 to create)
- Speedometer with trip stats
- Music display showing current song

## User Choices
1. Map: OpenStreetMap with dark tiles (upgradeable to Google Maps)
2. Payment: PayPal for squad creation ($5)
3. Avatars: Ready Player Me style (implemented with preset customization)
4. Cars: Three.js (implemented with CSS-based stylized viewer)
5. Speedometer: Full stats (speed, top speed, avg speed, distance, trip time)
6. Music: Any provider (implemented with demo songs, Spotify-ready)

## Architecture

### Backend (FastAPI + MongoDB)
- `/api/auth/*` - Emergent Google OAuth authentication
- `/api/users/*` - User profile management
- `/api/garage/*` - Car garage CRUD
- `/api/cars/*` - Car makes/models database (31 brands, 200+ models)
- `/api/lobbies/*` - City-based lobby system
- `/api/squads/*` - Squad management with PayPal payment
- `/api/location/*` - Real-time GPS tracking with trip stats
- `/api/music/*` - Current song display
- `/api/requests/*` - Connect/join requests
- `/api/discover` - Find nearby users

### Frontend (React + Tailwind)
- Landing page with NFS Unbound aesthetic
- Dashboard with map, speedometer, music selector
- Garage with stylized car visualization
- Profile with avatar customization
- Squad page with PayPal payment
- Lobbies browser
- Requests management

## Database Collections
- `users` - User profiles with avatar, location, music
- `cars` - User's garage cars with mods
- `lobbies` - City-based lobbies
- `squads` - Squad groups (max 8 members)
- `squad_invites` - Squad invitation system
- `join_requests` - Connection requests
- `user_sessions` - Auth sessions

## Features Implemented
- [x] Real-time GPS tracking with speed
- [x] Speedometer with trip stats (speed, top speed, avg speed, distance, time)
- [x] 31 car brands with 200+ models
- [x] Car customization (body kit, spoiler, wheels, exhaust, wrap, neon, tint)
- [x] Stylized car visualization
- [x] City-based lobbies
- [x] Squad system (max 8, $5 PayPal)
- [x] Music display
- [x] Avatar customization
- [x] Connect/join requests
- [x] Dark NFS Unbound aesthetic

## Next Tasks
1. Integrate Ready Player Me SDK for 3D avatars
2. Connect Spotify API for real music
3. Add real-time WebSocket for live location updates
4. Implement squad chat feature
5. Add car meet event scheduling
6. Push notifications for requests/invites
