from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = ""
    avatar_url: Optional[str] = None  # Ready Player Me avatar URL
    avatar_style: Optional[dict] = Field(default_factory=lambda: {
        "skin_tone": "#FFD5C8",
        "hair_style": "short",
        "hair_color": "#2C1810",
        "outfit": "racing_jacket",
        "outfit_color": "#22c55e",
        "accessory": "none"
    })
    current_lobby: Optional[str] = None
    current_squad: Optional[str] = None
    location: Optional[dict] = None  # {lat, lng, speed, updated_at}
    spotify_connected: bool = False
    spotify_access_token: Optional[str] = None
    spotify_refresh_token: Optional[str] = None
    current_song: Optional[dict] = None  # {name, artist, album_art}
    trip_stats: Optional[dict] = Field(default_factory=lambda: {
        "top_speed": 0,
        "total_distance": 0,
        "avg_speed": 0,
        "trip_start": None
    })
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_style: Optional[dict] = None
    avatar_url: Optional[str] = None
    current_song: Optional[dict] = None

class Car(BaseModel):
    model_config = ConfigDict(extra="ignore")
    car_id: str = Field(default_factory=lambda: f"car_{uuid.uuid4().hex[:12]}")
    user_id: str
    make: str
    model: str
    year: int
    color: str = "#22c55e"
    secondary_color: Optional[str] = "#000000"
    model_3d: Optional[str] = None  # 3D model identifier
    mods: Optional[dict] = Field(default_factory=lambda: {
        "body_kit": "stock",
        "spoiler": "none",
        "wheels": "stock",
        "exhaust": "stock",
        "wrap": "none",
        "neon": "none",
        "tint": "none"
    })
    horsepower: Optional[int] = 300
    torque: Optional[int] = 300
    weight: Optional[int] = 3000
    drivetrain: Optional[str] = "RWD"
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CarCreate(BaseModel):
    make: str
    model: str
    year: int
    color: str = "#22c55e"
    secondary_color: Optional[str] = "#000000"
    model_3d: Optional[str] = None
    mods: Optional[dict] = None
    horsepower: Optional[int] = 300
    torque: Optional[int] = 300
    weight: Optional[int] = 3000
    drivetrain: Optional[str] = "RWD"
    is_primary: bool = False

class CarUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    secondary_color: Optional[str] = None
    model_3d: Optional[str] = None
    mods: Optional[dict] = None
    horsepower: Optional[int] = None
    torque: Optional[int] = None
    weight: Optional[int] = None
    drivetrain: Optional[str] = None
    is_primary: Optional[bool] = None

class Lobby(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lobby_id: str = Field(default_factory=lambda: f"lobby_{uuid.uuid4().hex[:12]}")
    city: str
    state: str
    country: str = "USA"
    member_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Squad Models
class Squad(BaseModel):
    model_config = ConfigDict(extra="ignore")
    squad_id: str = Field(default_factory=lambda: f"squad_{uuid.uuid4().hex[:12]}")
    name: str
    tag: str  # 3-4 character tag like [CREW]
    owner_id: str
    members: List[str] = []  # list of user_ids, max 8
    color: str = "#22c55e"
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    payment_id: Optional[str] = None  # PayPal payment ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SquadCreate(BaseModel):
    name: str
    tag: str
    color: str = "#22c55e"
    description: Optional[str] = None

class SquadInvite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invite_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    squad_id: str
    from_user_id: str
    to_user_id: str
    status: str = "pending"  # pending, accepted, declined
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JoinRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    request_id: str = Field(default_factory=lambda: f"req_{uuid.uuid4().hex[:12]}")
    from_user_id: str
    to_user_id: str
    status: str = "pending"  # pending, accepted, declined
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JoinRequestCreate(BaseModel):
    to_user_id: str
    message: Optional[str] = None

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = 0  # Speed in mph
    heading: Optional[float] = 0  # Direction in degrees

class LobbyJoin(BaseModel):
    city: str
    state: str

class SpotifySongUpdate(BaseModel):
    name: str
    artist: str
    album_art: Optional[str] = None

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> dict:
    """Get current user from session token in cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry with timezone awareness
    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id from Emergent Auth for session_token"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session_id")
            
            user_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    # Check if user exists, create if not
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "bio": "",
            "avatar_url": None,
            "avatar_style": {
                "skin_tone": "#FFD5C8",
                "hair_style": "short",
                "hair_color": "#2C1810",
                "outfit": "racing_jacket",
                "outfit_color": "#22c55e",
                "accessory": "none"
            },
            "current_lobby": None,
            "current_squad": None,
            "location": None,
            "spotify_connected": False,
            "current_song": None,
            "trip_stats": {
                "top_speed": 0,
                "total_distance": 0,
                "avg_speed": 0,
                "trip_start": None
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    # Get full user data
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current authenticated user"""
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============== USER ENDPOINTS ==============

@api_router.get("/users/me")
async def get_current_user_profile(user: dict = Depends(get_current_user)):
    """Get current user profile"""
    return user

@api_router.put("/users/me")
async def update_user_profile(update: UserUpdate, user: dict = Depends(get_current_user)):
    """Update current user profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific user's public profile"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============== LOCATION & SPEEDOMETER ENDPOINTS ==============

@api_router.post("/location/update")
async def update_location(location: LocationUpdate, user: dict = Depends(get_current_user)):
    """Update user's current location and speed"""
    now = datetime.now(timezone.utc)
    
    # Get previous location for distance calculation
    prev_location = user.get("location")
    trip_stats = user.get("trip_stats", {
        "top_speed": 0,
        "total_distance": 0,
        "avg_speed": 0,
        "trip_start": None,
        "speed_readings": []
    })
    
    # Update top speed
    if location.speed and location.speed > trip_stats.get("top_speed", 0):
        trip_stats["top_speed"] = location.speed
    
    # Calculate distance if we have previous location
    if prev_location and prev_location.get("lat") and prev_location.get("lng"):
        from math import radians, sin, cos, sqrt, atan2
        
        R = 3959  # Earth's radius in miles
        lat1, lon1 = radians(prev_location["lat"]), radians(prev_location["lng"])
        lat2, lon2 = radians(location.lat), radians(location.lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance = R * c
        
        trip_stats["total_distance"] = trip_stats.get("total_distance", 0) + distance
    
    # Start trip timer if not started
    if not trip_stats.get("trip_start"):
        trip_stats["trip_start"] = now.isoformat()
    
    # Calculate average speed
    if trip_stats.get("trip_start"):
        trip_start = datetime.fromisoformat(trip_stats["trip_start"].replace("Z", "+00:00"))
        if trip_start.tzinfo is None:
            trip_start = trip_start.replace(tzinfo=timezone.utc)
        duration_hours = (now - trip_start).total_seconds() / 3600
        if duration_hours > 0 and trip_stats.get("total_distance", 0) > 0:
            trip_stats["avg_speed"] = round(trip_stats["total_distance"] / duration_hours, 1)
    
    location_data = {
        "lat": location.lat,
        "lng": location.lng,
        "speed": location.speed or 0,
        "heading": location.heading or 0,
        "updated_at": now.isoformat()
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "location": location_data,
            "trip_stats": trip_stats
        }}
    )
    
    return {
        "message": "Location updated",
        "location": location_data,
        "trip_stats": trip_stats
    }

@api_router.post("/location/reset-trip")
async def reset_trip(user: dict = Depends(get_current_user)):
    """Reset trip statistics"""
    trip_stats = {
        "top_speed": 0,
        "total_distance": 0,
        "avg_speed": 0,
        "trip_start": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"trip_stats": trip_stats}}
    )
    
    return {"message": "Trip reset", "trip_stats": trip_stats}

# ============== MUSIC/SPOTIFY ENDPOINTS ==============

@api_router.post("/music/update")
async def update_current_song(song: SpotifySongUpdate, user: dict = Depends(get_current_user)):
    """Update user's currently playing song"""
    song_data = {
        "name": song.name,
        "artist": song.artist,
        "album_art": song.album_art,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_song": song_data}}
    )
    
    return {"message": "Song updated", "current_song": song_data}

@api_router.delete("/music/clear")
async def clear_current_song(user: dict = Depends(get_current_user)):
    """Clear user's currently playing song"""
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_song": None}}
    )
    
    return {"message": "Song cleared"}

# ============== LOBBY ENDPOINTS ==============

@api_router.get("/lobbies")
async def get_lobbies():
    """Get all active lobbies"""
    lobbies = await db.lobbies.find({}, {"_id": 0}).to_list(100)
    return lobbies

@api_router.post("/lobbies/join")
async def join_lobby(lobby_data: LobbyJoin, user: dict = Depends(get_current_user)):
    """Join a city lobby"""
    city = lobby_data.city.strip().title()
    state = lobby_data.state.strip().upper()
    
    # Find or create lobby
    lobby = await db.lobbies.find_one({"city": city, "state": state}, {"_id": 0})
    
    if not lobby:
        lobby = {
            "lobby_id": f"lobby_{uuid.uuid4().hex[:12]}",
            "city": city,
            "state": state,
            "country": "USA",
            "member_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.lobbies.insert_one(lobby)
    
    # Leave current lobby if any
    if user.get("current_lobby"):
        await db.lobbies.update_one(
            {"lobby_id": user["current_lobby"]},
            {"$inc": {"member_count": -1}}
        )
    
    # Join new lobby
    await db.lobbies.update_one(
        {"lobby_id": lobby["lobby_id"]},
        {"$inc": {"member_count": 1}}
    )
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_lobby": lobby["lobby_id"]}}
    )
    
    # Get updated lobby
    updated_lobby = await db.lobbies.find_one({"lobby_id": lobby["lobby_id"]}, {"_id": 0})
    
    return {"message": f"Joined {city}, {state}", "lobby": updated_lobby}

@api_router.post("/lobbies/leave")
async def leave_lobby(user: dict = Depends(get_current_user)):
    """Leave current lobby"""
    if user.get("current_lobby"):
        await db.lobbies.update_one(
            {"lobby_id": user["current_lobby"]},
            {"$inc": {"member_count": -1}}
        )
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"current_lobby": None}}
        )
    
    return {"message": "Left lobby"}

@api_router.get("/lobbies/{lobby_id}/users")
async def get_lobby_users(lobby_id: str, user: dict = Depends(get_current_user)):
    """Get all users in a lobby with their locations"""
    users = await db.users.find(
        {"current_lobby": lobby_id},
        {"_id": 0, "email": 0, "spotify_access_token": 0, "spotify_refresh_token": 0}
    ).to_list(1000)
    
    return users

# ============== SQUAD ENDPOINTS ==============

@api_router.get("/squads")
async def get_user_squad(user: dict = Depends(get_current_user)):
    """Get current user's squad"""
    if not user.get("current_squad"):
        return None
    
    squad = await db.squads.find_one({"squad_id": user["current_squad"]}, {"_id": 0})
    if squad:
        # Get member details
        members = await db.users.find(
            {"user_id": {"$in": squad["members"]}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "avatar_url": 1}
        ).to_list(8)
        squad["member_details"] = members
    
    return squad

@api_router.post("/squads/create")
async def create_squad(squad_data: SquadCreate, payment_id: str, user: dict = Depends(get_current_user)):
    """Create a new squad (requires $5 payment)"""
    # Validate tag
    if len(squad_data.tag) < 2 or len(squad_data.tag) > 4:
        raise HTTPException(status_code=400, detail="Tag must be 2-4 characters")
    
    # Check if user already owns a squad
    existing = await db.squads.find_one({"owner_id": user["user_id"], "is_active": True})
    if existing:
        raise HTTPException(status_code=400, detail="You already own a squad")
    
    # Check if user is in a squad
    if user.get("current_squad"):
        raise HTTPException(status_code=400, detail="Leave your current squad first")
    
    # Create squad
    squad = {
        "squad_id": f"squad_{uuid.uuid4().hex[:12]}",
        "name": squad_data.name,
        "tag": squad_data.tag.upper(),
        "owner_id": user["user_id"],
        "members": [user["user_id"]],
        "color": squad_data.color,
        "description": squad_data.description,
        "is_active": True,
        "payment_id": payment_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.squads.insert_one(squad)
    
    # Update user
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_squad": squad["squad_id"]}}
    )
    
    return {"message": "Squad created!", "squad": {k: v for k, v in squad.items() if k != "_id"}}

@api_router.post("/squads/{squad_id}/invite")
async def invite_to_squad(squad_id: str, to_user_id: str, user: dict = Depends(get_current_user)):
    """Invite a user to your squad"""
    squad = await db.squads.find_one({"squad_id": squad_id}, {"_id": 0})
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    
    if squad["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only squad owner can invite")
    
    if len(squad["members"]) >= 8:
        raise HTTPException(status_code=400, detail="Squad is full (max 8 members)")
    
    if to_user_id in squad["members"]:
        raise HTTPException(status_code=400, detail="User already in squad")
    
    # Check if invite already exists
    existing = await db.squad_invites.find_one({
        "squad_id": squad_id,
        "to_user_id": to_user_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="Invite already sent")
    
    invite = {
        "invite_id": f"inv_{uuid.uuid4().hex[:12]}",
        "squad_id": squad_id,
        "from_user_id": user["user_id"],
        "to_user_id": to_user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.squad_invites.insert_one(invite)
    
    return {"message": "Invite sent", "invite": {k: v for k, v in invite.items() if k != "_id"}}

@api_router.get("/squads/invites")
async def get_squad_invites(user: dict = Depends(get_current_user)):
    """Get pending squad invites for current user"""
    invites = await db.squad_invites.find(
        {"to_user_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    ).to_list(50)
    
    # Enrich with squad info
    for invite in invites:
        squad = await db.squads.find_one({"squad_id": invite["squad_id"]}, {"_id": 0})
        invite["squad"] = squad
    
    return invites

@api_router.put("/squads/invites/{invite_id}")
async def respond_to_squad_invite(invite_id: str, accept: bool, user: dict = Depends(get_current_user)):
    """Accept or decline a squad invite"""
    invite = await db.squad_invites.find_one(
        {"invite_id": invite_id, "to_user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if accept:
        squad = await db.squads.find_one({"squad_id": invite["squad_id"]}, {"_id": 0})
        if not squad:
            raise HTTPException(status_code=404, detail="Squad no longer exists")
        
        if len(squad["members"]) >= 8:
            raise HTTPException(status_code=400, detail="Squad is full")
        
        # Leave current squad if any
        if user.get("current_squad"):
            await db.squads.update_one(
                {"squad_id": user["current_squad"]},
                {"$pull": {"members": user["user_id"]}}
            )
        
        # Join new squad
        await db.squads.update_one(
            {"squad_id": invite["squad_id"]},
            {"$push": {"members": user["user_id"]}}
        )
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"current_squad": invite["squad_id"]}}
        )
    
    # Update invite status
    await db.squad_invites.update_one(
        {"invite_id": invite_id},
        {"$set": {"status": "accepted" if accept else "declined"}}
    )
    
    return {"message": f"Invite {'accepted' if accept else 'declined'}"}

@api_router.post("/squads/leave")
async def leave_squad(user: dict = Depends(get_current_user)):
    """Leave current squad"""
    if not user.get("current_squad"):
        raise HTTPException(status_code=400, detail="Not in a squad")
    
    squad = await db.squads.find_one({"squad_id": user["current_squad"]}, {"_id": 0})
    
    if squad and squad["owner_id"] == user["user_id"]:
        # Transfer ownership or disband
        remaining = [m for m in squad["members"] if m != user["user_id"]]
        if remaining:
            await db.squads.update_one(
                {"squad_id": squad["squad_id"]},
                {
                    "$set": {"owner_id": remaining[0]},
                    "$pull": {"members": user["user_id"]}
                }
            )
        else:
            await db.squads.update_one(
                {"squad_id": squad["squad_id"]},
                {"$set": {"is_active": False, "members": []}}
            )
    else:
        await db.squads.update_one(
            {"squad_id": user["current_squad"]},
            {"$pull": {"members": user["user_id"]}}
        )
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_squad": None}}
    )
    
    return {"message": "Left squad"}

# ============== CAR/GARAGE ENDPOINTS ==============

# Extended car data
CAR_DATABASE = {
    'Nissan': ['GT-R R35', 'GT-R R34', 'GT-R R33', 'GT-R R32', '370Z', '350Z', 'Silvia S15', 'Silvia S14', 'Silvia S13', '240SX', 'Skyline', 'Fairlady Z', '300ZX'],
    'Toyota': ['Supra MK5', 'Supra MK4', 'Supra MK3', 'GR86', 'AE86 Trueno', 'AE86 Levin', 'Celica', 'MR2', 'Chaser', 'Soarer', 'Crown'],
    'Honda': ['NSX', 'NSX Type R', 'Civic Type R', 'Civic Si', 'S2000', 'Integra Type R', 'Accord', 'Prelude', 'CRX', 'Beat'],
    'Mazda': ['RX-7 FD', 'RX-7 FC', 'RX-8', 'MX-5 Miata NA', 'MX-5 Miata NB', 'MX-5 Miata NC', 'MX-5 Miata ND', 'Mazda3', 'Mazda6', 'RX-3'],
    'Subaru': ['WRX STI', 'WRX', 'BRZ', 'Impreza 22B', 'Legacy GT', 'Forester STI', 'SVX'],
    'Mitsubishi': ['Lancer Evo X', 'Lancer Evo IX', 'Lancer Evo VIII', 'Lancer Evo VI', 'Eclipse GSX', '3000GT VR-4', 'GTO', 'Starion'],
    'Ford': ['Mustang GT', 'Mustang Shelby GT500', 'Mustang Shelby GT350', 'Mustang Mach 1', 'Focus RS', 'Focus ST', 'GT', 'F-150 Raptor'],
    'Chevrolet': ['Corvette C8', 'Corvette C7 Z06', 'Corvette C6 ZR1', 'Camaro SS', 'Camaro ZL1', 'Camaro Z28', 'Chevelle SS', 'Nova SS'],
    'Dodge': ['Challenger Hellcat', 'Challenger Demon', 'Charger Hellcat', 'Charger R/T', 'Viper ACR', 'Viper GTS', 'Challenger Scat Pack'],
    'BMW': ['M3 E30', 'M3 E36', 'M3 E46', 'M3 E92', 'M3 F80', 'M3 G80', 'M4', 'M5', 'M2', 'Z4 M', '2002 Turbo'],
    'Mercedes': ['AMG GT', 'AMG GT R', 'C63 AMG', 'E63 AMG', 'AMG One', 'SLS AMG', '190E Evo II', 'CLK GTR'],
    'Porsche': ['911 GT3 RS', '911 GT3', '911 Turbo S', '911 Carrera', 'Cayman GT4', 'Boxster Spyder', '918 Spyder', 'Carrera GT', '959', '356'],
    'Lamborghini': ['Huracán Performante', 'Huracán STO', 'Aventador SVJ', 'Aventador S', 'Urus', 'Gallardo', 'Murciélago', 'Diablo', 'Countach'],
    'Ferrari': ['488 Pista', '488 GTB', 'F8 Tributo', '812 Superfast', 'SF90 Stradale', '458 Italia', 'LaFerrari', 'Enzo', 'F40', 'F50', '296 GTB'],
    'McLaren': ['720S', '765LT', '600LT', '570S', 'P1', 'Senna', 'Speedtail', 'Elva', 'Artura'],
    'Audi': ['R8 V10', 'RS6 Avant', 'RS7', 'RS3', 'TT RS', 'S4', 'Quattro Sport'],
    'Volkswagen': ['Golf R', 'Golf GTI', 'Scirocco R', 'Corrado VR6', 'Beetle RSi'],
    'Lexus': ['LFA', 'RC F', 'LC 500', 'IS F', 'GS F', 'IS300'],
    'Infiniti': ['Q60 Red Sport', 'G35', 'G37', 'Q50'],
    'Acura': ['NSX', 'Integra Type R', 'RSX Type S', 'TL Type S'],
    'Jaguar': ['F-Type R', 'F-Type SVR', 'XE SV Project 8', 'XJ220'],
    'Aston Martin': ['Vantage', 'DBS Superleggera', 'DB11', 'Vanquish', 'Vulcan', 'Valkyrie'],
    'Bugatti': ['Chiron', 'Chiron Super Sport', 'Veyron', 'Divo', 'Centodieci'],
    'Koenigsegg': ['Jesko', 'Regera', 'Agera RS', 'One:1', 'CCX'],
    'Pagani': ['Huayra', 'Huayra BC', 'Zonda R', 'Zonda Cinque'],
    'Alfa Romeo': ['Giulia Quadrifoglio', '4C', '8C Competizione', 'Stelvio QV'],
    'Maserati': ['MC20', 'GranTurismo', 'Quattroporte', 'Levante Trofeo'],
    'Rolls-Royce': ['Wraith', 'Dawn', 'Ghost', 'Cullinan Black Badge'],
    'Bentley': ['Continental GT', 'Continental GT3-R', 'Flying Spur', 'Bentayga Speed'],
}

@api_router.get("/cars/makes")
async def get_car_makes():
    """Get all available car makes"""
    return list(CAR_DATABASE.keys())

@api_router.get("/cars/models/{make}")
async def get_car_models(make: str):
    """Get all models for a specific make"""
    if make not in CAR_DATABASE:
        raise HTTPException(status_code=404, detail="Make not found")
    return CAR_DATABASE[make]

@api_router.get("/garage")
async def get_my_garage(user: dict = Depends(get_current_user)):
    """Get current user's garage"""
    cars = await db.cars.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    return cars

@api_router.get("/garage/{user_id}")
async def get_user_garage(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a user's garage"""
    cars = await db.cars.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    return cars

@api_router.post("/garage/cars")
async def add_car(car: CarCreate, user: dict = Depends(get_current_user)):
    """Add a car to garage"""
    car_doc = {
        "car_id": f"car_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "make": car.make,
        "model": car.model,
        "year": car.year,
        "color": car.color,
        "secondary_color": car.secondary_color or "#000000",
        "model_3d": car.model_3d,
        "mods": car.mods or {
            "body_kit": "stock",
            "spoiler": "none",
            "wheels": "stock",
            "exhaust": "stock",
            "wrap": "none",
            "neon": "none",
            "tint": "none"
        },
        "horsepower": car.horsepower or 300,
        "torque": car.torque or 300,
        "weight": car.weight or 3000,
        "drivetrain": car.drivetrain or "RWD",
        "is_primary": car.is_primary,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If this is primary, unset other primaries
    if car.is_primary:
        await db.cars.update_many(
            {"user_id": user["user_id"]},
            {"$set": {"is_primary": False}}
        )
    
    await db.cars.insert_one(car_doc)
    
    return {k: v for k, v in car_doc.items() if k != "_id"}

@api_router.put("/garage/cars/{car_id}")
async def update_car(car_id: str, car_update: CarUpdate, user: dict = Depends(get_current_user)):
    """Update a car in garage"""
    car = await db.cars.find_one({"car_id": car_id, "user_id": user["user_id"]}, {"_id": 0})
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    
    update_data = {k: v for k, v in car_update.model_dump().items() if v is not None}
    
    if update_data.get("is_primary"):
        await db.cars.update_many(
            {"user_id": user["user_id"]},
            {"$set": {"is_primary": False}}
        )
    
    if update_data:
        await db.cars.update_one({"car_id": car_id}, {"$set": update_data})
    
    updated_car = await db.cars.find_one({"car_id": car_id}, {"_id": 0})
    return updated_car

@api_router.delete("/garage/cars/{car_id}")
async def delete_car(car_id: str, user: dict = Depends(get_current_user)):
    """Delete a car from garage"""
    result = await db.cars.delete_one({"car_id": car_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Car not found")
    return {"message": "Car deleted"}

# ============== JOIN REQUEST ENDPOINTS ==============

@api_router.post("/requests")
async def create_join_request(req: JoinRequestCreate, user: dict = Depends(get_current_user)):
    """Send a join request to another user"""
    if req.to_user_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
    
    target = await db.users.find_one({"user_id": req.to_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing = await db.join_requests.find_one({
        "from_user_id": user["user_id"],
        "to_user_id": req.to_user_id,
        "status": "pending"
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Request already pending")
    
    request_doc = {
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "from_user_id": user["user_id"],
        "to_user_id": req.to_user_id,
        "status": "pending",
        "message": req.message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.join_requests.insert_one(request_doc)
    
    return {k: v for k, v in request_doc.items() if k != "_id"}

@api_router.get("/requests/incoming")
async def get_incoming_requests(user: dict = Depends(get_current_user)):
    """Get incoming join requests"""
    requests = await db.join_requests.find(
        {"to_user_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    for req in requests:
        from_user = await db.users.find_one({"user_id": req["from_user_id"]}, {"_id": 0, "email": 0})
        req["from_user"] = from_user
    
    return requests

@api_router.get("/requests/outgoing")
async def get_outgoing_requests(user: dict = Depends(get_current_user)):
    """Get outgoing join requests"""
    requests = await db.join_requests.find(
        {"from_user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return requests

@api_router.put("/requests/{request_id}")
async def respond_to_request(request_id: str, response: dict, user: dict = Depends(get_current_user)):
    """Accept or decline a join request"""
    status = response.get("status")
    if status not in ["accepted", "declined"]:
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'declined'")
    
    req = await db.join_requests.find_one(
        {"request_id": request_id, "to_user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    await db.join_requests.update_one(
        {"request_id": request_id},
        {"$set": {"status": status}}
    )
    
    return {"message": f"Request {status}"}

# ============== DISCOVERY ==============

@api_router.get("/discover")
async def discover_users(user: dict = Depends(get_current_user)):
    """Discover nearby users in the same lobby"""
    if not user.get("current_lobby"):
        return []
    
    users = await db.users.find(
        {
            "current_lobby": user["current_lobby"],
            "user_id": {"$ne": user["user_id"]},
            "location": {"$ne": None}
        },
        {"_id": 0, "email": 0, "spotify_access_token": 0, "spotify_refresh_token": 0}
    ).to_list(100)
    
    for u in users:
        primary_car = await db.cars.find_one(
            {"user_id": u["user_id"], "is_primary": True},
            {"_id": 0}
        )
        if not primary_car:
            primary_car = await db.cars.find_one({"user_id": u["user_id"]}, {"_id": 0})
        u["primary_car"] = primary_car
    
    return users

# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "Forza Community API", "version": "2.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
