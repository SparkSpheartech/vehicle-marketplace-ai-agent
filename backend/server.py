from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import httpx
import json
import asyncio

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

# ============== WEBSOCKET CONNECTION MANAGER ==============

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # user_id -> websocket
        self.lobby_connections: Dict[str, set] = {}  # lobby_id -> set of user_ids

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected via WebSocket")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        # Remove from all lobbies
        for lobby_id in self.lobby_connections:
            self.lobby_connections[lobby_id].discard(user_id)
        logger.info(f"User {user_id} disconnected")

    def join_lobby(self, user_id: str, lobby_id: str):
        if lobby_id not in self.lobby_connections:
            self.lobby_connections[lobby_id] = set()
        self.lobby_connections[lobby_id].add(user_id)

    def leave_lobby(self, user_id: str, lobby_id: str):
        if lobby_id in self.lobby_connections:
            self.lobby_connections[lobby_id].discard(user_id)

    async def send_personal(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {user_id}: {e}")

    async def broadcast_to_lobby(self, lobby_id: str, message: dict, exclude_user: str = None):
        if lobby_id in self.lobby_connections:
            for user_id in self.lobby_connections[lobby_id]:
                if user_id != exclude_user and user_id in self.active_connections:
                    try:
                        await self.active_connections[user_id].send_json(message)
                    except Exception as e:
                        logger.error(f"Error broadcasting to {user_id}: {e}")

    async def broadcast_to_squad(self, squad_members: List[str], message: dict, exclude_user: str = None):
        for user_id in squad_members:
            if user_id != exclude_user and user_id in self.active_connections:
                try:
                    await self.active_connections[user_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending to squad member {user_id}: {e}")

manager = ConnectionManager()

# ============== MODELS ==============

class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = ""
    avatar_url: Optional[str] = None
    avatar_config: Optional[dict] = Field(default_factory=lambda: {
        "body_type": "average",
        "skin_tone": "#FFD5C8",
        "hair_style": "short",
        "hair_color": "#2C1810",
        "eye_color": "#4A3728",
        "outfit": "racing_jacket",
        "outfit_color": "#22c55e",
        "pants": "jeans",
        "pants_color": "#1f2937",
        "shoes": "sneakers",
        "shoes_color": "#ffffff",
        "accessory": "none",
        "facial_hair": "none",
        "glasses": "none"
    })
    current_lobby: Optional[str] = None
    current_squad: Optional[str] = None
    location: Optional[dict] = None
    spotify_connected: bool = False
    current_song: Optional[dict] = None
    trip_stats: Optional[dict] = Field(default_factory=lambda: {
        "top_speed": 0,
        "total_distance": 0,
        "avg_speed": 0,
        "trip_start": None,
        "all_time_distance": 0,
        "all_time_top_speed": 0
    })
    achievements: List[str] = []
    notifications_enabled: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_config: Optional[dict] = None
    avatar_url: Optional[str] = None
    current_song: Optional[dict] = None
    notifications_enabled: Optional[bool] = None

# Car Models
class Car(BaseModel):
    model_config = ConfigDict(extra="ignore")
    car_id: str = Field(default_factory=lambda: f"car_{uuid.uuid4().hex[:12]}")
    user_id: str
    make: str
    model: str
    year: int
    color: str = "#22c55e"
    secondary_color: Optional[str] = "#000000"
    model_3d: Optional[str] = None
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
    ratings: List[dict] = []
    avg_rating: float = 0
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

class CarRating(BaseModel):
    rating: int  # 1-5 stars
    comment: Optional[str] = None

# Lobby Models
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
    tag: str
    owner_id: str
    members: List[str] = []
    color: str = "#22c55e"
    logo_url: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SquadCreate(BaseModel):
    name: str
    tag: str
    color: str = "#22c55e"
    description: Optional[str] = None

# Chat Models
class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    squad_id: str
    user_id: str
    content: str
    message_type: str = "text"  # text, image, location
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatMessageCreate(BaseModel):
    content: str
    message_type: str = "text"

# Car Meet/Event Models
class CarMeet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    meet_id: str = Field(default_factory=lambda: f"meet_{uuid.uuid4().hex[:12]}")
    title: str
    description: str
    host_id: str
    lobby_id: str
    location: dict  # {lat, lng, address}
    start_time: datetime
    end_time: Optional[datetime] = None
    max_attendees: Optional[int] = None
    attendees: List[str] = []
    interested: List[str] = []
    tags: List[str] = []  # e.g., ["JDM", "Euro", "American", "Show", "Cruise"]
    is_public: bool = True
    is_cancelled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CarMeetCreate(BaseModel):
    title: str
    description: str
    location: dict
    start_time: datetime
    end_time: Optional[datetime] = None
    max_attendees: Optional[int] = None
    tags: List[str] = []
    is_public: bool = True

# Route Models
class Route(BaseModel):
    model_config = ConfigDict(extra="ignore")
    route_id: str = Field(default_factory=lambda: f"route_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    description: Optional[str] = None
    waypoints: List[dict] = []  # [{lat, lng, timestamp}]
    distance: float = 0
    duration: int = 0  # seconds
    top_speed: float = 0
    avg_speed: float = 0
    start_location: Optional[dict] = None
    end_location: Optional[dict] = None
    is_public: bool = True
    likes: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RouteCreate(BaseModel):
    name: str
    description: Optional[str] = None
    waypoints: List[dict]
    distance: float
    duration: int
    top_speed: float
    avg_speed: float
    is_public: bool = True

# Notification Models
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: str  # request, squad_invite, meet_reminder, achievement, nearby_driver
    title: str
    message: str
    data: Optional[dict] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Achievement definitions
ACHIEVEMENTS = {
    "first_car": {"name": "First Ride", "description": "Added your first car to the garage", "icon": "🚗"},
    "garage_5": {"name": "Car Collector", "description": "Own 5 cars in your garage", "icon": "🏎️"},
    "garage_10": {"name": "Enthusiast", "description": "Own 10 cars in your garage", "icon": "🏆"},
    "squad_leader": {"name": "Squad Leader", "description": "Created a squad", "icon": "👑"},
    "squad_full": {"name": "Full Crew", "description": "Fill your squad with 8 members", "icon": "👥"},
    "speed_demon": {"name": "Speed Demon", "description": "Reach 100+ mph", "icon": "⚡"},
    "road_warrior": {"name": "Road Warrior", "description": "Drive 100+ miles total", "icon": "🛣️"},
    "marathon": {"name": "Marathon Driver", "description": "Drive 500+ miles total", "icon": "🏁"},
    "social_butterfly": {"name": "Social Butterfly", "description": "Connect with 10 drivers", "icon": "🦋"},
    "event_host": {"name": "Event Host", "description": "Host your first car meet", "icon": "📍"},
    "popular_host": {"name": "Popular Host", "description": "Host a meet with 10+ attendees", "icon": "🌟"},
    "route_mapper": {"name": "Route Mapper", "description": "Save your first route", "icon": "🗺️"},
    "rated_ride": {"name": "Rated Ride", "description": "Get your car rated by others", "icon": "⭐"},
    "top_rated": {"name": "Top Rated", "description": "Get a 5-star rating on your car", "icon": "🌟"},
    "early_adopter": {"name": "Early Adopter", "description": "Join during beta", "icon": "🚀"},
}

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = 0
    heading: Optional[float] = 0

class LobbyJoin(BaseModel):
    city: str
    state: str

class SpotifySongUpdate(BaseModel):
    name: str
    artist: str
    album_art: Optional[str] = None

class JoinRequestCreate(BaseModel):
    to_user_id: str
    message: Optional[str] = None

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> dict:
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

async def get_user_from_token(token: str) -> dict:
    """Get user from session token for WebSocket auth"""
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user

# ============== ACHIEVEMENT HELPERS ==============

async def grant_achievement(user_id: str, achievement_id: str):
    """Grant an achievement to a user if they don't have it"""
    if achievement_id not in ACHIEVEMENTS:
        return
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return
    
    current_achievements = user.get("achievements", [])
    if achievement_id in current_achievements:
        return
    
    # Grant achievement
    await db.users.update_one(
        {"user_id": user_id},
        {"$push": {"achievements": achievement_id}}
    )
    
    # Create notification
    achievement = ACHIEVEMENTS[achievement_id]
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "achievement",
        "title": f"Achievement Unlocked: {achievement['name']}",
        "message": achievement['description'],
        "data": {"achievement_id": achievement_id, "icon": achievement['icon']},
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send real-time notification
    await manager.send_personal(user_id, {
        "type": "achievement",
        "achievement": achievement,
        "achievement_id": achievement_id
    })

async def check_achievements(user_id: str, context: str = None):
    """Check and grant achievements based on context"""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        return
    
    # Car-related achievements
    car_count = await db.cars.count_documents({"user_id": user_id})
    if car_count >= 1:
        await grant_achievement(user_id, "first_car")
    if car_count >= 5:
        await grant_achievement(user_id, "garage_5")
    if car_count >= 10:
        await grant_achievement(user_id, "garage_10")
    
    # Distance achievements
    trip_stats = user.get("trip_stats", {})
    total_distance = trip_stats.get("all_time_distance", 0)
    if total_distance >= 100:
        await grant_achievement(user_id, "road_warrior")
    if total_distance >= 500:
        await grant_achievement(user_id, "marathon")
    
    # Speed achievements
    top_speed = trip_stats.get("all_time_top_speed", 0)
    if top_speed >= 100:
        await grant_achievement(user_id, "speed_demon")

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
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
    
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "bio": "",
            "avatar_url": None,
            "avatar_config": {
                "body_type": "average",
                "skin_tone": "#FFD5C8",
                "hair_style": "short",
                "hair_color": "#2C1810",
                "eye_color": "#4A3728",
                "outfit": "racing_jacket",
                "outfit_color": "#22c55e",
                "pants": "jeans",
                "pants_color": "#1f2937",
                "shoes": "sneakers",
                "shoes_color": "#ffffff",
                "accessory": "none",
                "facial_hair": "none",
                "glasses": "none"
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
                "trip_start": None,
                "all_time_distance": 0,
                "all_time_top_speed": 0
            },
            "achievements": ["early_adopter"],
            "notifications_enabled": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

# ============== WEBSOCKET ENDPOINT ==============

@app.websocket("/ws/{token}")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001)
        return
    
    user_id = user["user_id"]
    await manager.connect(websocket, user_id)
    
    # Join user's lobby if they have one
    if user.get("current_lobby"):
        manager.join_lobby(user_id, user["current_lobby"])
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "location_update":
                # Broadcast location to lobby members
                if user.get("current_lobby"):
                    await manager.broadcast_to_lobby(
                        user["current_lobby"],
                        {
                            "type": "user_location",
                            "user_id": user_id,
                            "location": data.get("location"),
                            "speed": data.get("speed", 0)
                        },
                        exclude_user=user_id
                    )
            
            elif msg_type == "chat_message":
                # Handle squad chat
                squad_id = data.get("squad_id")
                if squad_id:
                    squad = await db.squads.find_one({"squad_id": squad_id}, {"_id": 0})
                    if squad and user_id in squad.get("members", []):
                        msg = {
                            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                            "squad_id": squad_id,
                            "user_id": user_id,
                            "user_name": user.get("name"),
                            "user_picture": user.get("picture"),
                            "content": data.get("content"),
                            "message_type": data.get("message_type", "text"),
                            "created_at": datetime.now(timezone.utc).isoformat()
                        }
                        await db.chat_messages.insert_one(msg)
                        await manager.broadcast_to_squad(
                            squad["members"],
                            {"type": "chat_message", "message": {k: v for k, v in msg.items() if k != "_id"}}
                        )
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        if user.get("current_lobby"):
            manager.leave_lobby(user_id, user["current_lobby"])

# ============== USER ENDPOINTS ==============

@api_router.get("/users/me")
async def get_current_user_profile(user: dict = Depends(get_current_user)):
    return user

@api_router.put("/users/me")
async def update_user_profile(update: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "email": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============== NOTIFICATION ENDPOINTS ==============

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["user_id"]},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "user_id": user["user_id"],
        "is_read": False
    })
    return {"count": count}

# ============== ACHIEVEMENT ENDPOINTS ==============

@api_router.get("/achievements")
async def get_all_achievements():
    return ACHIEVEMENTS

@api_router.get("/achievements/me")
async def get_my_achievements(user: dict = Depends(get_current_user)):
    user_achievements = user.get("achievements", [])
    return {
        "earned": [{"id": a, **ACHIEVEMENTS[a]} for a in user_achievements if a in ACHIEVEMENTS],
        "available": [{"id": k, **v} for k, v in ACHIEVEMENTS.items() if k not in user_achievements]
    }

# ============== LOCATION & SPEEDOMETER ENDPOINTS ==============

@api_router.post("/location/update")
async def update_location(location: LocationUpdate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    
    prev_location = user.get("location")
    trip_stats = user.get("trip_stats", {
        "top_speed": 0,
        "total_distance": 0,
        "avg_speed": 0,
        "trip_start": None,
        "all_time_distance": 0,
        "all_time_top_speed": 0
    })
    
    # Update top speed
    if location.speed and location.speed > trip_stats.get("top_speed", 0):
        trip_stats["top_speed"] = location.speed
    
    # Update all-time top speed
    if location.speed and location.speed > trip_stats.get("all_time_top_speed", 0):
        trip_stats["all_time_top_speed"] = location.speed
    
    # Calculate distance
    if prev_location and prev_location.get("lat") and prev_location.get("lng"):
        from math import radians, sin, cos, sqrt, atan2
        
        R = 3959
        lat1, lon1 = radians(prev_location["lat"]), radians(prev_location["lng"])
        lat2, lon2 = radians(location.lat), radians(location.lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance = R * c
        
        trip_stats["total_distance"] = trip_stats.get("total_distance", 0) + distance
        trip_stats["all_time_distance"] = trip_stats.get("all_time_distance", 0) + distance
    
    if not trip_stats.get("trip_start"):
        trip_stats["trip_start"] = now.isoformat()
    
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
    
    # Check achievements
    await check_achievements(user["user_id"])
    
    # Broadcast to lobby via WebSocket
    if user.get("current_lobby"):
        await manager.broadcast_to_lobby(
            user["current_lobby"],
            {
                "type": "user_location",
                "user_id": user["user_id"],
                "location": location_data,
                "speed": location.speed or 0
            },
            exclude_user=user["user_id"]
        )
    
    return {
        "message": "Location updated",
        "location": location_data,
        "trip_stats": trip_stats
    }

@api_router.post("/location/reset-trip")
async def reset_trip(user: dict = Depends(get_current_user)):
    current_stats = user.get("trip_stats", {})
    trip_stats = {
        "top_speed": 0,
        "total_distance": 0,
        "avg_speed": 0,
        "trip_start": datetime.now(timezone.utc).isoformat(),
        "all_time_distance": current_stats.get("all_time_distance", 0),
        "all_time_top_speed": current_stats.get("all_time_top_speed", 0)
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"trip_stats": trip_stats}}
    )
    
    return {"message": "Trip reset", "trip_stats": trip_stats}

# ============== LEADERBOARD ENDPOINTS ==============

@api_router.get("/leaderboards/speed")
async def get_speed_leaderboard(user: dict = Depends(get_current_user)):
    """Get top speed leaderboard"""
    users = await db.users.find(
        {"trip_stats.all_time_top_speed": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "trip_stats.all_time_top_speed": 1}
    ).sort("trip_stats.all_time_top_speed", -1).limit(50).to_list(50)
    
    leaderboard = []
    for i, u in enumerate(users):
        leaderboard.append({
            "rank": i + 1,
            "user_id": u["user_id"],
            "name": u["name"],
            "picture": u.get("picture"),
            "top_speed": u.get("trip_stats", {}).get("all_time_top_speed", 0)
        })
    
    return leaderboard

@api_router.get("/leaderboards/distance")
async def get_distance_leaderboard(user: dict = Depends(get_current_user)):
    """Get total distance leaderboard"""
    users = await db.users.find(
        {"trip_stats.all_time_distance": {"$gt": 0}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "trip_stats.all_time_distance": 1}
    ).sort("trip_stats.all_time_distance", -1).limit(50).to_list(50)
    
    leaderboard = []
    for i, u in enumerate(users):
        leaderboard.append({
            "rank": i + 1,
            "user_id": u["user_id"],
            "name": u["name"],
            "picture": u.get("picture"),
            "distance": u.get("trip_stats", {}).get("all_time_distance", 0)
        })
    
    return leaderboard

@api_router.get("/leaderboards/garage")
async def get_garage_leaderboard(user: dict = Depends(get_current_user)):
    """Get biggest garage leaderboard"""
    pipeline = [
        {"$group": {"_id": "$user_id", "car_count": {"$sum": 1}}},
        {"$sort": {"car_count": -1}},
        {"$limit": 50}
    ]
    results = await db.cars.aggregate(pipeline).to_list(50)
    
    leaderboard = []
    for i, r in enumerate(results):
        user_data = await db.users.find_one({"user_id": r["_id"]}, {"_id": 0, "name": 1, "picture": 1})
        if user_data:
            leaderboard.append({
                "rank": i + 1,
                "user_id": r["_id"],
                "name": user_data.get("name", "Unknown"),
                "picture": user_data.get("picture"),
                "car_count": r["car_count"]
            })
    
    return leaderboard

# ============== MUSIC ENDPOINTS ==============

@api_router.post("/music/update")
async def update_current_song(song: SpotifySongUpdate, user: dict = Depends(get_current_user)):
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
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_song": None}}
    )
    
    return {"message": "Song cleared"}

# ============== LOBBY ENDPOINTS ==============

@api_router.get("/lobbies")
async def get_lobbies():
    lobbies = await db.lobbies.find({}, {"_id": 0}).to_list(100)
    return lobbies

@api_router.post("/lobbies/join")
async def join_lobby(lobby_data: LobbyJoin, user: dict = Depends(get_current_user)):
    city = lobby_data.city.strip().title()
    state = lobby_data.state.strip().upper()
    
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
    
    # Leave current lobby
    if user.get("current_lobby"):
        await db.lobbies.update_one(
            {"lobby_id": user["current_lobby"]},
            {"$inc": {"member_count": -1}}
        )
        manager.leave_lobby(user["user_id"], user["current_lobby"])
    
    # Join new lobby
    await db.lobbies.update_one(
        {"lobby_id": lobby["lobby_id"]},
        {"$inc": {"member_count": 1}}
    )
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_lobby": lobby["lobby_id"]}}
    )
    
    manager.join_lobby(user["user_id"], lobby["lobby_id"])
    
    updated_lobby = await db.lobbies.find_one({"lobby_id": lobby["lobby_id"]}, {"_id": 0})
    
    return {"message": f"Joined {city}, {state}", "lobby": updated_lobby}

@api_router.post("/lobbies/leave")
async def leave_lobby(user: dict = Depends(get_current_user)):
    if user.get("current_lobby"):
        await db.lobbies.update_one(
            {"lobby_id": user["current_lobby"]},
            {"$inc": {"member_count": -1}}
        )
        manager.leave_lobby(user["user_id"], user["current_lobby"])
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"current_lobby": None}}
        )
    
    return {"message": "Left lobby"}

@api_router.get("/lobbies/{lobby_id}/users")
async def get_lobby_users(lobby_id: str, user: dict = Depends(get_current_user)):
    users = await db.users.find(
        {"current_lobby": lobby_id},
        {"_id": 0, "email": 0, "spotify_access_token": 0, "spotify_refresh_token": 0}
    ).to_list(1000)
    
    return users

# ============== SQUAD ENDPOINTS ==============

@api_router.get("/squads")
async def get_user_squad(user: dict = Depends(get_current_user)):
    if not user.get("current_squad"):
        return None
    
    squad = await db.squads.find_one({"squad_id": user["current_squad"]}, {"_id": 0})
    if squad:
        members = await db.users.find(
            {"user_id": {"$in": squad["members"]}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "avatar_url": 1, "location": 1}
        ).to_list(8)
        squad["member_details"] = members
    
    return squad

@api_router.post("/squads/create")
async def create_squad(squad_data: SquadCreate, payment_id: str, user: dict = Depends(get_current_user)):
    if len(squad_data.tag) < 2 or len(squad_data.tag) > 4:
        raise HTTPException(status_code=400, detail="Tag must be 2-4 characters")
    
    existing = await db.squads.find_one({"owner_id": user["user_id"], "is_active": True})
    if existing:
        raise HTTPException(status_code=400, detail="You already own a squad")
    
    if user.get("current_squad"):
        raise HTTPException(status_code=400, detail="Leave your current squad first")
    
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
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"current_squad": squad["squad_id"]}}
    )
    
    # Grant achievement
    await grant_achievement(user["user_id"], "squad_leader")
    
    return {"message": "Squad created!", "squad": {k: v for k, v in squad.items() if k != "_id"}}

@api_router.post("/squads/{squad_id}/invite")
async def invite_to_squad(squad_id: str, to_user_id: str, user: dict = Depends(get_current_user)):
    squad = await db.squads.find_one({"squad_id": squad_id}, {"_id": 0})
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    
    if squad["owner_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only squad owner can invite")
    
    if len(squad["members"]) >= 8:
        raise HTTPException(status_code=400, detail="Squad is full (max 8 members)")
    
    if to_user_id in squad["members"]:
        raise HTTPException(status_code=400, detail="User already in squad")
    
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
    
    # Create notification
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": to_user_id,
        "type": "squad_invite",
        "title": "Squad Invite",
        "message": f"{user['name']} invited you to join [{squad['tag']}] {squad['name']}",
        "data": {"invite_id": invite["invite_id"], "squad_id": squad_id},
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send real-time notification
    await manager.send_personal(to_user_id, {
        "type": "notification",
        "notification": {k: v for k, v in notification.items() if k != "_id"}
    })
    
    return {"message": "Invite sent", "invite": {k: v for k, v in invite.items() if k != "_id"}}

@api_router.get("/squads/invites")
async def get_squad_invites(user: dict = Depends(get_current_user)):
    invites = await db.squad_invites.find(
        {"to_user_id": user["user_id"], "status": "pending"},
        {"_id": 0}
    ).to_list(50)
    
    for invite in invites:
        squad = await db.squads.find_one({"squad_id": invite["squad_id"]}, {"_id": 0})
        invite["squad"] = squad
    
    return invites

@api_router.put("/squads/invites/{invite_id}")
async def respond_to_squad_invite(invite_id: str, accept: bool, user: dict = Depends(get_current_user)):
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
        
        if user.get("current_squad"):
            await db.squads.update_one(
                {"squad_id": user["current_squad"]},
                {"$pull": {"members": user["user_id"]}}
            )
        
        await db.squads.update_one(
            {"squad_id": invite["squad_id"]},
            {"$push": {"members": user["user_id"]}}
        )
        
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"current_squad": invite["squad_id"]}}
        )
        
        # Check if squad is full
        updated_squad = await db.squads.find_one({"squad_id": invite["squad_id"]}, {"_id": 0})
        if len(updated_squad.get("members", [])) >= 8:
            await grant_achievement(updated_squad["owner_id"], "squad_full")
    
    await db.squad_invites.update_one(
        {"invite_id": invite_id},
        {"$set": {"status": "accepted" if accept else "declined"}}
    )
    
    return {"message": f"Invite {'accepted' if accept else 'declined'}"}

@api_router.post("/squads/leave")
async def leave_squad(user: dict = Depends(get_current_user)):
    if not user.get("current_squad"):
        raise HTTPException(status_code=400, detail="Not in a squad")
    
    squad = await db.squads.find_one({"squad_id": user["current_squad"]}, {"_id": 0})
    
    if squad and squad["owner_id"] == user["user_id"]:
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

# ============== SQUAD CHAT ENDPOINTS ==============

@api_router.get("/squads/{squad_id}/messages")
async def get_squad_messages(squad_id: str, limit: int = 50, user: dict = Depends(get_current_user)):
    """Get chat messages for a squad"""
    squad = await db.squads.find_one({"squad_id": squad_id}, {"_id": 0})
    if not squad or user["user_id"] not in squad.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this squad")
    
    messages = await db.chat_messages.find(
        {"squad_id": squad_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Reverse to get chronological order
    messages.reverse()
    
    # Enrich with user info
    for msg in messages:
        msg_user = await db.users.find_one({"user_id": msg["user_id"]}, {"_id": 0, "name": 1, "picture": 1})
        if msg_user:
            msg["user_name"] = msg_user.get("name")
            msg["user_picture"] = msg_user.get("picture")
    
    return messages

@api_router.post("/squads/{squad_id}/messages")
async def send_squad_message(squad_id: str, message: ChatMessageCreate, user: dict = Depends(get_current_user)):
    """Send a message to squad chat"""
    squad = await db.squads.find_one({"squad_id": squad_id}, {"_id": 0})
    if not squad or user["user_id"] not in squad.get("members", []):
        raise HTTPException(status_code=403, detail="Not a member of this squad")
    
    msg = {
        "message_id": f"msg_{uuid.uuid4().hex[:12]}",
        "squad_id": squad_id,
        "user_id": user["user_id"],
        "content": message.content,
        "message_type": message.message_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.chat_messages.insert_one(msg)
    
    # Broadcast to squad members via WebSocket
    await manager.broadcast_to_squad(
        squad["members"],
        {
            "type": "chat_message",
            "message": {
                **{k: v for k, v in msg.items() if k != "_id"},
                "user_name": user.get("name"),
                "user_picture": user.get("picture")
            }
        }
    )
    
    return {k: v for k, v in msg.items() if k != "_id"}

# ============== CAR MEET/EVENT ENDPOINTS ==============

@api_router.get("/meets")
async def get_car_meets(lobby_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Get upcoming car meets"""
    query = {
        "is_cancelled": False,
        "start_time": {"$gte": datetime.now(timezone.utc).isoformat()}
    }
    
    if lobby_id:
        query["lobby_id"] = lobby_id
    
    meets = await db.car_meets.find(query, {"_id": 0}).sort("start_time", 1).limit(50).to_list(50)
    
    # Enrich with host info
    for meet in meets:
        host = await db.users.find_one({"user_id": meet["host_id"]}, {"_id": 0, "name": 1, "picture": 1})
        meet["host"] = host
        meet["attendee_count"] = len(meet.get("attendees", []))
        meet["interested_count"] = len(meet.get("interested", []))
        meet["is_attending"] = user["user_id"] in meet.get("attendees", [])
        meet["is_interested"] = user["user_id"] in meet.get("interested", [])
    
    return meets

@api_router.post("/meets")
async def create_car_meet(meet: CarMeetCreate, user: dict = Depends(get_current_user)):
    """Create a new car meet"""
    if not user.get("current_lobby"):
        raise HTTPException(status_code=400, detail="Join a lobby first")
    
    meet_doc = {
        "meet_id": f"meet_{uuid.uuid4().hex[:12]}",
        "title": meet.title,
        "description": meet.description,
        "host_id": user["user_id"],
        "lobby_id": user["current_lobby"],
        "location": meet.location,
        "start_time": meet.start_time.isoformat() if isinstance(meet.start_time, datetime) else meet.start_time,
        "end_time": meet.end_time.isoformat() if meet.end_time and isinstance(meet.end_time, datetime) else meet.end_time,
        "max_attendees": meet.max_attendees,
        "attendees": [user["user_id"]],
        "interested": [],
        "tags": meet.tags,
        "is_public": meet.is_public,
        "is_cancelled": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.car_meets.insert_one(meet_doc)
    
    # Grant achievement
    await grant_achievement(user["user_id"], "event_host")
    
    return {k: v for k, v in meet_doc.items() if k != "_id"}

@api_router.get("/meets/{meet_id}")
async def get_car_meet(meet_id: str, user: dict = Depends(get_current_user)):
    """Get details of a specific car meet"""
    meet = await db.car_meets.find_one({"meet_id": meet_id}, {"_id": 0})
    if not meet:
        raise HTTPException(status_code=404, detail="Meet not found")
    
    # Get host info
    host = await db.users.find_one({"user_id": meet["host_id"]}, {"_id": 0, "name": 1, "picture": 1})
    meet["host"] = host
    
    # Get attendee details
    attendees = await db.users.find(
        {"user_id": {"$in": meet.get("attendees", [])}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
    ).to_list(100)
    meet["attendee_details"] = attendees
    
    meet["is_attending"] = user["user_id"] in meet.get("attendees", [])
    meet["is_interested"] = user["user_id"] in meet.get("interested", [])
    
    return meet

@api_router.post("/meets/{meet_id}/attend")
async def attend_car_meet(meet_id: str, user: dict = Depends(get_current_user)):
    """RSVP to attend a car meet"""
    meet = await db.car_meets.find_one({"meet_id": meet_id}, {"_id": 0})
    if not meet:
        raise HTTPException(status_code=404, detail="Meet not found")
    
    if user["user_id"] in meet.get("attendees", []):
        raise HTTPException(status_code=400, detail="Already attending")
    
    if meet.get("max_attendees") and len(meet.get("attendees", [])) >= meet["max_attendees"]:
        raise HTTPException(status_code=400, detail="Meet is full")
    
    await db.car_meets.update_one(
        {"meet_id": meet_id},
        {
            "$push": {"attendees": user["user_id"]},
            "$pull": {"interested": user["user_id"]}
        }
    )
    
    # Check if host gets achievement for 10+ attendees
    updated_meet = await db.car_meets.find_one({"meet_id": meet_id}, {"_id": 0})
    if len(updated_meet.get("attendees", [])) >= 10:
        await grant_achievement(updated_meet["host_id"], "popular_host")
    
    return {"message": "You're attending!"}

@api_router.post("/meets/{meet_id}/interested")
async def interested_car_meet(meet_id: str, user: dict = Depends(get_current_user)):
    """Mark interest in a car meet"""
    meet = await db.car_meets.find_one({"meet_id": meet_id}, {"_id": 0})
    if not meet:
        raise HTTPException(status_code=404, detail="Meet not found")
    
    if user["user_id"] in meet.get("attendees", []):
        raise HTTPException(status_code=400, detail="Already attending")
    
    if user["user_id"] in meet.get("interested", []):
        # Remove interest
        await db.car_meets.update_one(
            {"meet_id": meet_id},
            {"$pull": {"interested": user["user_id"]}}
        )
        return {"message": "Removed interest"}
    else:
        await db.car_meets.update_one(
            {"meet_id": meet_id},
            {"$push": {"interested": user["user_id"]}}
        )
        return {"message": "Marked as interested"}

@api_router.post("/meets/{meet_id}/leave")
async def leave_car_meet(meet_id: str, user: dict = Depends(get_current_user)):
    """Cancel attendance at a car meet"""
    await db.car_meets.update_one(
        {"meet_id": meet_id},
        {"$pull": {"attendees": user["user_id"], "interested": user["user_id"]}}
    )
    return {"message": "Left meet"}

@api_router.delete("/meets/{meet_id}")
async def cancel_car_meet(meet_id: str, user: dict = Depends(get_current_user)):
    """Cancel a car meet (host only)"""
    meet = await db.car_meets.find_one({"meet_id": meet_id}, {"_id": 0})
    if not meet:
        raise HTTPException(status_code=404, detail="Meet not found")
    
    if meet["host_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Only host can cancel")
    
    await db.car_meets.update_one(
        {"meet_id": meet_id},
        {"$set": {"is_cancelled": True}}
    )
    
    # Notify attendees
    for attendee_id in meet.get("attendees", []):
        if attendee_id != user["user_id"]:
            notification = {
                "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
                "user_id": attendee_id,
                "type": "meet_cancelled",
                "title": "Meet Cancelled",
                "message": f"'{meet['title']}' has been cancelled by the host",
                "data": {"meet_id": meet_id},
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notification)
            await manager.send_personal(attendee_id, {
                "type": "notification",
                "notification": {k: v for k, v in notification.items() if k != "_id"}
            })
    
    return {"message": "Meet cancelled"}

# ============== ROUTE TRACKING ENDPOINTS ==============

@api_router.get("/routes")
async def get_routes(user_id: Optional[str] = None, public_only: bool = True, user: dict = Depends(get_current_user)):
    """Get saved routes"""
    query = {}
    
    if user_id:
        query["user_id"] = user_id
        if user_id != user["user_id"] and public_only:
            query["is_public"] = True
    elif public_only:
        query["is_public"] = True
    
    routes = await db.routes.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    
    # Enrich with user info
    for route in routes:
        route_user = await db.users.find_one({"user_id": route["user_id"]}, {"_id": 0, "name": 1, "picture": 1})
        route["user"] = route_user
        route["like_count"] = len(route.get("likes", []))
        route["is_liked"] = user["user_id"] in route.get("likes", [])
    
    return routes

@api_router.get("/routes/me")
async def get_my_routes(user: dict = Depends(get_current_user)):
    """Get current user's routes"""
    routes = await db.routes.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return routes

@api_router.post("/routes")
async def save_route(route: RouteCreate, user: dict = Depends(get_current_user)):
    """Save a new route"""
    route_doc = {
        "route_id": f"route_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "name": route.name,
        "description": route.description,
        "waypoints": route.waypoints,
        "distance": route.distance,
        "duration": route.duration,
        "top_speed": route.top_speed,
        "avg_speed": route.avg_speed,
        "start_location": route.waypoints[0] if route.waypoints else None,
        "end_location": route.waypoints[-1] if route.waypoints else None,
        "is_public": route.is_public,
        "likes": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.routes.insert_one(route_doc)
    
    # Grant achievement
    await grant_achievement(user["user_id"], "route_mapper")
    
    return {k: v for k, v in route_doc.items() if k != "_id"}

@api_router.get("/routes/{route_id}")
async def get_route(route_id: str, user: dict = Depends(get_current_user)):
    """Get a specific route"""
    route = await db.routes.find_one({"route_id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if not route.get("is_public") and route["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Route is private")
    
    route_user = await db.users.find_one({"user_id": route["user_id"]}, {"_id": 0, "name": 1, "picture": 1})
    route["user"] = route_user
    route["like_count"] = len(route.get("likes", []))
    route["is_liked"] = user["user_id"] in route.get("likes", [])
    
    return route

@api_router.post("/routes/{route_id}/like")
async def like_route(route_id: str, user: dict = Depends(get_current_user)):
    """Like or unlike a route"""
    route = await db.routes.find_one({"route_id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    if user["user_id"] in route.get("likes", []):
        await db.routes.update_one(
            {"route_id": route_id},
            {"$pull": {"likes": user["user_id"]}}
        )
        return {"message": "Unliked", "liked": False}
    else:
        await db.routes.update_one(
            {"route_id": route_id},
            {"$push": {"likes": user["user_id"]}}
        )
        return {"message": "Liked", "liked": True}

@api_router.delete("/routes/{route_id}")
async def delete_route(route_id: str, user: dict = Depends(get_current_user)):
    """Delete a route"""
    result = await db.routes.delete_one({"route_id": route_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route not found")
    return {"message": "Route deleted"}

# ============== CAR/GARAGE ENDPOINTS ==============

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
    'Lotus': ['Elise', 'Exige', 'Evora GT', 'Emira', 'Evija'],
    'Tesla': ['Model S Plaid', 'Model 3 Performance', 'Roadster', 'Cybertruck'],
}

@api_router.get("/cars/makes")
async def get_car_makes():
    return list(CAR_DATABASE.keys())

@api_router.get("/cars/models/{make}")
async def get_car_models(make: str):
    if make not in CAR_DATABASE:
        raise HTTPException(status_code=404, detail="Make not found")
    return CAR_DATABASE[make]

@api_router.get("/garage")
async def get_my_garage(user: dict = Depends(get_current_user)):
    cars = await db.cars.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(50)
    return cars

@api_router.get("/garage/{user_id}")
async def get_user_garage(user_id: str, current_user: dict = Depends(get_current_user)):
    cars = await db.cars.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    return cars

@api_router.post("/garage/cars")
async def add_car(car: CarCreate, user: dict = Depends(get_current_user)):
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
        "ratings": [],
        "avg_rating": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if car.is_primary:
        await db.cars.update_many(
            {"user_id": user["user_id"]},
            {"$set": {"is_primary": False}}
        )
    
    await db.cars.insert_one(car_doc)
    
    # Check achievements
    await check_achievements(user["user_id"])
    
    return {k: v for k, v in car_doc.items() if k != "_id"}

@api_router.put("/garage/cars/{car_id}")
async def update_car(car_id: str, car_update: CarUpdate, user: dict = Depends(get_current_user)):
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
    result = await db.cars.delete_one({"car_id": car_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Car not found")
    return {"message": "Car deleted"}

# ============== CAR RATING ENDPOINTS ==============

@api_router.post("/garage/cars/{car_id}/rate")
async def rate_car(car_id: str, rating: CarRating, user: dict = Depends(get_current_user)):
    """Rate someone's car (1-5 stars)"""
    car = await db.cars.find_one({"car_id": car_id}, {"_id": 0})
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    
    if car["user_id"] == user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot rate your own car")
    
    if rating.rating < 1 or rating.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be 1-5")
    
    # Check if user already rated this car
    existing_ratings = car.get("ratings", [])
    existing_rating = next((r for r in existing_ratings if r["user_id"] == user["user_id"]), None)
    
    new_rating = {
        "user_id": user["user_id"],
        "rating": rating.rating,
        "comment": rating.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing_rating:
        # Update existing rating
        await db.cars.update_one(
            {"car_id": car_id, "ratings.user_id": user["user_id"]},
            {"$set": {"ratings.$": new_rating}}
        )
    else:
        # Add new rating
        await db.cars.update_one(
            {"car_id": car_id},
            {"$push": {"ratings": new_rating}}
        )
    
    # Recalculate average
    updated_car = await db.cars.find_one({"car_id": car_id}, {"_id": 0})
    ratings = updated_car.get("ratings", [])
    if ratings:
        avg = sum(r["rating"] for r in ratings) / len(ratings)
        await db.cars.update_one(
            {"car_id": car_id},
            {"$set": {"avg_rating": round(avg, 1)}}
        )
        
        # Grant achievements
        await grant_achievement(car["user_id"], "rated_ride")
        if avg >= 5:
            await grant_achievement(car["user_id"], "top_rated")
    
    return {"message": "Rating submitted", "avg_rating": round(avg, 1) if ratings else 0}

@api_router.get("/garage/cars/{car_id}/ratings")
async def get_car_ratings(car_id: str, user: dict = Depends(get_current_user)):
    """Get all ratings for a car"""
    car = await db.cars.find_one({"car_id": car_id}, {"_id": 0})
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    
    ratings = car.get("ratings", [])
    
    # Enrich with user info
    for rating in ratings:
        rating_user = await db.users.find_one({"user_id": rating["user_id"]}, {"_id": 0, "name": 1, "picture": 1})
        rating["user"] = rating_user
    
    return {
        "ratings": ratings,
        "avg_rating": car.get("avg_rating", 0),
        "total_ratings": len(ratings)
    }

# ============== JOIN REQUEST ENDPOINTS ==============

@api_router.post("/requests")
async def create_join_request(req: JoinRequestCreate, user: dict = Depends(get_current_user)):
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
    
    # Create notification
    notification = {
        "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
        "user_id": req.to_user_id,
        "type": "request",
        "title": "New Connection Request",
        "message": f"{user['name']} wants to connect with you",
        "data": {"request_id": request_doc["request_id"], "from_user_id": user["user_id"]},
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # Send real-time notification
    await manager.send_personal(req.to_user_id, {
        "type": "notification",
        "notification": {k: v for k, v in notification.items() if k != "_id"}
    })
    
    return {k: v for k, v in request_doc.items() if k != "_id"}

@api_router.get("/requests/incoming")
async def get_incoming_requests(user: dict = Depends(get_current_user)):
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
    requests = await db.join_requests.find(
        {"from_user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    
    return requests

@api_router.put("/requests/{request_id}")
async def respond_to_request(request_id: str, response: dict, user: dict = Depends(get_current_user)):
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
    
    # Check social achievement
    if status == "accepted":
        accepted_count = await db.join_requests.count_documents({
            "$or": [
                {"from_user_id": user["user_id"], "status": "accepted"},
                {"to_user_id": user["user_id"], "status": "accepted"}
            ]
        })
        if accepted_count >= 10:
            await grant_achievement(user["user_id"], "social_butterfly")
    
    return {"message": f"Request {status}"}

# ============== DISCOVERY ==============

@api_router.get("/discover")
async def discover_users(user: dict = Depends(get_current_user)):
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
    return {"message": "Forza Community API", "version": "3.0.0"}

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
