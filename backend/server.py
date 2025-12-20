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
    avatar_style: Optional[dict] = Field(default_factory=lambda: {
        "skin_tone": "#FFD5C8",
        "hair_style": "short",
        "hair_color": "#2C1810",
        "outfit": "racing_jacket",
        "outfit_color": "#22c55e",
        "accessory": "none"
    })
    current_lobby: Optional[str] = None
    location: Optional[dict] = None  # {lat, lng, updated_at}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar_style: Optional[dict] = None

class Car(BaseModel):
    model_config = ConfigDict(extra="ignore")
    car_id: str = Field(default_factory=lambda: f"car_{uuid.uuid4().hex[:12]}")
    user_id: str
    make: str
    model: str
    year: int
    color: str = "#22c55e"
    secondary_color: Optional[str] = "#000000"
    mods: Optional[dict] = Field(default_factory=lambda: {
        "body_kit": "stock",
        "spoiler": "none",
        "wheels": "stock",
        "exhaust": "stock",
        "wrap": "none"
    })
    horsepower: Optional[int] = 300
    is_primary: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CarCreate(BaseModel):
    make: str
    model: str
    year: int
    color: str = "#22c55e"
    secondary_color: Optional[str] = "#000000"
    mods: Optional[dict] = None
    horsepower: Optional[int] = 300
    is_primary: bool = False

class CarUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    secondary_color: Optional[str] = None
    mods: Optional[dict] = None
    horsepower: Optional[int] = None
    is_primary: Optional[bool] = None

class Lobby(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lobby_id: str = Field(default_factory=lambda: f"lobby_{uuid.uuid4().hex[:12]}")
    city: str
    state: str
    country: str = "USA"
    member_count: int = 0
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

class LobbyJoin(BaseModel):
    city: str
    state: str

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
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
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
            "avatar_style": {
                "skin_tone": "#FFD5C8",
                "hair_style": "short",
                "hair_color": "#2C1810",
                "outfit": "racing_jacket",
                "outfit_color": "#22c55e",
                "accessory": "none"
            },
            "current_lobby": None,
            "location": None,
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

# ============== LOCATION ENDPOINTS ==============

@api_router.post("/location/update")
async def update_location(location: LocationUpdate, user: dict = Depends(get_current_user)):
    """Update user's current location"""
    location_data = {
        "lat": location.lat,
        "lng": location.lng,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"location": location_data}}
    )
    
    return {"message": "Location updated", "location": location_data}

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
        {"_id": 0, "email": 0}
    ).to_list(1000)
    
    return users

# ============== CAR/GARAGE ENDPOINTS ==============

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
        "mods": car.mods or {
            "body_kit": "stock",
            "spoiler": "none",
            "wheels": "stock",
            "exhaust": "stock",
            "wrap": "none"
        },
        "horsepower": car.horsepower or 300,
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
    
    # Return without _id
    return {k: v for k, v in car_doc.items() if k != "_id"}

@api_router.put("/garage/cars/{car_id}")
async def update_car(car_id: str, car_update: CarUpdate, user: dict = Depends(get_current_user)):
    """Update a car in garage"""
    # Verify ownership
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
    
    # Check if target user exists
    target = await db.users.find_one({"user_id": req.to_user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for existing pending request
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
    
    # Enrich with user info
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
        {"_id": 0, "email": 0}
    ).to_list(100)
    
    # Get primary car for each user
    for u in users:
        primary_car = await db.cars.find_one(
            {"user_id": u["user_id"], "is_primary": True},
            {"_id": 0}
        )
        if not primary_car:
            # Get any car
            primary_car = await db.cars.find_one({"user_id": u["user_id"]}, {"_id": 0})
        u["primary_car"] = primary_car
    
    return users

# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "Forza Community API", "version": "1.0.0"}

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
