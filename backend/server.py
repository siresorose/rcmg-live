from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
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
import jwt
import bcrypt
from livekit import api
import httpx
import time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'rcmg-live-secret')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'walker.elamen@gmail.com')
LIVEKIT_URL = os.environ.get('LIVEKIT_URL')
LIVEKIT_API_KEY = os.environ.get('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.environ.get('LIVEKIT_API_SECRET')
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============
class UserCreate(BaseModel):
    email: str
    password: str
    username: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    username: str
    diamond_balance: int = 0
    is_admin: bool = False
    subscription_status: str = "free"
    connected_platforms: List[str] = []
    avatar: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class GiftCreate(BaseModel):
    name: str
    diamond_cost: int
    image_url: str
    animation_type: str = "pulse"

class GiftResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    diamond_cost: int
    image_url: str
    animation_type: str

class SendGiftRequest(BaseModel):
    gift_id: str
    recipient_id: str
    stream_id: Optional[str] = None
    quantity: int = 1

class ComboGiftResponse(BaseModel):
    combo_count: int
    combo_multiplier: float
    bonus_diamonds: int
    combo_name: str
    animation_type: str

class TransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    type: str
    amount: int
    description: str
    created_at: str

class LiveKitTokenRequest(BaseModel):
    room_name: Optional[str] = None
    participant_identity: Optional[str] = None
    can_publish: bool = True
    can_subscribe: bool = True

class StreamCreate(BaseModel):
    title: str
    description: Optional[str] = ""

class StreamResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    streamer_id: str
    streamer_username: str
    title: str
    description: str
    room_name: str
    is_live: bool
    viewer_count: int
    created_at: str

class AdminDiamondGrant(BaseModel):
    user_id: str
    amount: int
    reason: Optional[str] = "Admin Grant"

class SubscriptionCreate(BaseModel):
    plan: str  # "monthly" or "yearly"

class WithdrawRequest(BaseModel):
    amount: int
    paypal_email: str

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, is_admin: bool = False) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user: dict = Depends(get_current_user)):
    if not user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============== AUTH ROUTES ==============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    is_admin = user_data.email.lower() == ADMIN_EMAIL.lower()
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email.lower(),
        "username": user_data.username,
        "password_hash": hash_password(user_data.password),
        "diamond_balance": 1000000000 if is_admin else 100,  # Admin gets unlimited, new users get 100 free
        "is_admin": is_admin,
        "subscription_status": "premium" if is_admin else "free",
        "subscription_expires": None,
        "connected_platforms": [],
        "avatar": None,
        "total_gifted": 0,
        "total_received": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    token = create_token(user["id"], user["email"], is_admin)
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        diamond_balance=user["diamond_balance"],
        is_admin=user["is_admin"],
        subscription_status=user["subscription_status"],
        connected_platforms=user["connected_platforms"],
        avatar=user["avatar"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email.lower()}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user.get("is_admin", False))
    
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        diamond_balance=user["diamond_balance"],
        is_admin=user.get("is_admin", False),
        subscription_status=user.get("subscription_status", "free"),
        connected_platforms=user.get("connected_platforms", []),
        avatar=user.get("avatar"),
        created_at=user["created_at"]
    )
    
    return TokenResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        username=user["username"],
        diamond_balance=user["diamond_balance"],
        is_admin=user.get("is_admin", False),
        subscription_status=user.get("subscription_status", "free"),
        connected_platforms=user.get("connected_platforms", []),
        avatar=user.get("avatar"),
        created_at=user["created_at"]
    )

# ============== DIAMOND & WALLET ROUTES ==============
@api_router.get("/wallet/balance")
async def get_balance(user: dict = Depends(get_current_user)):
    return {"balance": user["diamond_balance"]}

@api_router.get("/wallet/transactions", response_model=List[TransactionResponse])
async def get_transactions(user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    return transactions

# ============== GIFT ROUTES ==============
@api_router.get("/gifts", response_model=List[GiftResponse])
async def get_gifts():
    gifts = await db.gifts.find({}, {"_id": 0}).to_list(100)
    if not gifts:
        # Seed default gifts
        default_gifts = [
            {"id": str(uuid.uuid4()), "name": "Diamond", "diamond_cost": 10, "image_url": "https://images.unsplash.com/photo-1708777219976-9d140e69ce1d?w=200", "animation_type": "pulse"},
            {"id": str(uuid.uuid4()), "name": "Rose", "diamond_cost": 50, "image_url": "https://images.unsplash.com/photo-1518882605630-8eb259a99f04?w=200", "animation_type": "float"},
            {"id": str(uuid.uuid4()), "name": "Heart", "diamond_cost": 100, "image_url": "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=200", "animation_type": "bounce"},
            {"id": str(uuid.uuid4()), "name": "Crown", "diamond_cost": 500, "image_url": "https://images.unsplash.com/photo-1589656966895-2f33e7653819?w=200", "animation_type": "shine"},
            {"id": str(uuid.uuid4()), "name": "Rocket", "diamond_cost": 1000, "image_url": "https://images.unsplash.com/photo-1636819488537-a9b1ffb315ce?w=200", "animation_type": "launch"},
            {"id": str(uuid.uuid4()), "name": "Sports Car", "diamond_cost": 5000, "image_url": "https://images.unsplash.com/photo-1739613562425-c10d7bfc2352?w=200", "animation_type": "drive"},
            {"id": str(uuid.uuid4()), "name": "Yacht", "diamond_cost": 10000, "image_url": "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=200", "animation_type": "sail"},
            {"id": str(uuid.uuid4()), "name": "Private Jet", "diamond_cost": 50000, "image_url": "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=200", "animation_type": "fly"},
        ]
        await db.gifts.insert_many(default_gifts)
        gifts = default_gifts
    return gifts

@api_router.post("/gifts/send")
async def send_gift(request: SendGiftRequest, user: dict = Depends(get_current_user)):
    gift = await db.gifts.find_one({"id": request.gift_id}, {"_id": 0})
    if not gift:
        raise HTTPException(status_code=404, detail="Gift not found")
    
    total_cost = gift["diamond_cost"] * request.quantity
    
    if user["diamond_balance"] < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient diamonds")
    
    recipient = await db.users.find_one({"id": request.recipient_id}, {"_id": 0})
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Check for combo gifts
    combo_info = await check_and_update_combo(user["id"], request.recipient_id, request.gift_id, request.stream_id)
    
    # Calculate bonus from combo
    bonus_diamonds = combo_info.get("bonus_diamonds", 0)
    combo_multiplier = combo_info.get("combo_multiplier", 1.0)
    
    # Deduct from sender
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"diamond_balance": -total_cost, "total_gifted": total_cost}}
    )
    
    # Add 70% to recipient (30% platform fee) + combo bonus split
    base_recipient_amount = int(total_cost * 0.7)
    recipient_bonus = int(bonus_diamonds * 0.5)  # 50% of bonus to streamer
    sender_bonus = bonus_diamonds - recipient_bonus  # 50% to sender
    
    total_recipient_amount = base_recipient_amount + recipient_bonus
    
    await db.users.update_one(
        {"id": request.recipient_id},
        {"$inc": {"diamond_balance": total_recipient_amount, "total_received": total_recipient_amount}}
    )
    
    # Give sender their combo bonus
    if sender_bonus > 0:
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"diamond_balance": sender_bonus}}
        )
    
    # Record transactions
    sender_tx = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "gift_sent",
        "amount": -total_cost,
        "description": f"Sent {request.quantity}x {gift['name']} to {recipient['username']}" + (f" (COMBO x{combo_info['combo_count']}!)" if combo_info['combo_count'] > 1 else ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    recipient_tx = {
        "id": str(uuid.uuid4()),
        "user_id": request.recipient_id,
        "type": "gift_received",
        "amount": total_recipient_amount,
        "description": f"Received {request.quantity}x {gift['name']} from {user['username']}" + (f" (COMBO x{combo_info['combo_count']}! +{recipient_bonus} bonus)" if combo_info['combo_count'] > 1 else ""),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    txs_to_insert = [sender_tx, recipient_tx]
    
    if sender_bonus > 0:
        bonus_tx = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "combo_bonus",
            "amount": sender_bonus,
            "description": f"Combo bonus x{combo_info['combo_count']} - {combo_info.get('combo_name', 'COMBO')}!",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        txs_to_insert.append(bonus_tx)
    
    await db.transactions.insert_many(txs_to_insert)
    
    # Record gift event for stream
    if request.stream_id:
        gift_event = {
            "id": str(uuid.uuid4()),
            "stream_id": request.stream_id,
            "sender_id": user["id"],
            "sender_username": user["username"],
            "gift_name": gift["name"],
            "gift_image": gift["image_url"],
            "quantity": request.quantity,
            "animation_type": gift["animation_type"],
            "combo_count": combo_info.get("combo_count", 1),
            "combo_name": combo_info.get("combo_name", ""),
            "combo_animation": combo_info.get("animation_type", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.gift_events.insert_one(gift_event)
    
    # Get updated balance
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "success": True, 
        "new_balance": updated_user["diamond_balance"],
        "combo": combo_info if combo_info["combo_count"] > 1 else None
    }

async def check_and_update_combo(sender_id: str, recipient_id: str, gift_id: str, stream_id: str):
    """Check for combo gifts and calculate bonuses"""
    combo_key = f"{sender_id}_{recipient_id}_{gift_id}"
    now = datetime.now(timezone.utc)
    
    # Get existing combo tracker
    combo = await db.combos.find_one({"combo_key": combo_key}, {"_id": 0})
    
    # Combo window is 10 seconds
    combo_window = timedelta(seconds=10)
    
    if combo and combo.get("last_gift_at"):
        last_gift_time = datetime.fromisoformat(combo["last_gift_at"].replace("Z", "+00:00"))
        if now - last_gift_time <= combo_window:
            # Continue combo
            new_count = combo["count"] + 1
            await db.combos.update_one(
                {"combo_key": combo_key},
                {"$set": {"count": new_count, "last_gift_at": now.isoformat()}}
            )
        else:
            # Reset combo
            new_count = 1
            await db.combos.update_one(
                {"combo_key": combo_key},
                {"$set": {"count": 1, "last_gift_at": now.isoformat()}}
            )
    else:
        # New combo
        new_count = 1
        await db.combos.update_one(
            {"combo_key": combo_key},
            {"$set": {"combo_key": combo_key, "count": 1, "last_gift_at": now.isoformat()}},
            upsert=True
        )
    
    # Calculate combo bonuses
    combo_info = calculate_combo_bonus(new_count)
    combo_info["combo_count"] = new_count
    
    return combo_info

def calculate_combo_bonus(combo_count: int) -> dict:
    """Calculate bonus based on combo count"""
    if combo_count < 2:
        return {"combo_multiplier": 1.0, "bonus_diamonds": 0, "combo_name": "", "animation_type": ""}
    
    combo_tiers = {
        2: {"multiplier": 1.1, "bonus": 10, "name": "DOUBLE HIT!", "animation": "double"},
        3: {"multiplier": 1.25, "bonus": 30, "name": "TRIPLE LAUNCH!", "animation": "triple"},
        4: {"multiplier": 1.4, "bonus": 50, "name": "QUAD STRIKE!", "animation": "quad"},
        5: {"multiplier": 1.6, "bonus": 100, "name": "PENTA POWER!", "animation": "penta"},
        6: {"multiplier": 1.8, "bonus": 150, "name": "HEXA FURY!", "animation": "hexa"},
        7: {"multiplier": 2.0, "bonus": 250, "name": "LEGENDARY!", "animation": "legendary"},
        8: {"multiplier": 2.5, "bonus": 400, "name": "UNSTOPPABLE!", "animation": "unstoppable"},
        9: {"multiplier": 3.0, "bonus": 600, "name": "GODLIKE!", "animation": "godlike"},
        10: {"multiplier": 4.0, "bonus": 1000, "name": "RCMG SUPREME!", "animation": "supreme"},
    }
    
    # Cap at 10 for max tier
    tier = min(combo_count, 10)
    tier_data = combo_tiers.get(tier, combo_tiers[10])
    
    return {
        "combo_multiplier": tier_data["multiplier"],
        "bonus_diamonds": tier_data["bonus"],
        "combo_name": tier_data["name"],
        "animation_type": tier_data["animation"]
    }

# ============== LIVEKIT ROUTES ==============
@api_router.post("/livekit/token")
async def get_livekit_token(request: LiveKitTokenRequest, user: dict = Depends(get_current_user)):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit not configured")
    
    room_name = request.room_name or f"stream-{user['id']}-{int(time.time())}"
    participant_identity = request.participant_identity or user["id"]
    
    token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    token = token.with_identity(participant_identity)
    token = token.with_name(user["username"])
    token = token.with_grants(api.VideoGrants(
        room_join=True,
        room=room_name,
        can_publish=request.can_publish,
        can_subscribe=request.can_subscribe,
    ))
    
    jwt_token = token.to_jwt()
    
    return {
        "token": jwt_token,
        "server_url": LIVEKIT_URL,
        "room_name": room_name,
        "participant_identity": participant_identity
    }

# ============== STREAM ROUTES ==============
@api_router.post("/streams", response_model=StreamResponse)
async def create_stream(request: StreamCreate, user: dict = Depends(get_current_user)):
    # Check subscription for going live
    if user.get("subscription_status") == "free" and user["diamond_balance"] < 50:
        raise HTTPException(status_code=400, detail="Need subscription or 50 diamonds to go live")
    
    # Deduct diamonds if free user
    if user.get("subscription_status") == "free":
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"diamond_balance": -50}}
        )
        # Record transaction
        tx = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "stream_fee",
            "amount": -50,
            "description": "Live stream fee",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.transactions.insert_one(tx)
    
    room_name = f"stream-{user['id']}-{int(time.time())}"
    
    stream = {
        "id": str(uuid.uuid4()),
        "streamer_id": user["id"],
        "streamer_username": user["username"],
        "streamer_avatar": user.get("avatar"),
        "title": request.title,
        "description": request.description,
        "room_name": room_name,
        "is_live": True,
        "viewer_count": 0,
        "total_gifts": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.streams.insert_one(stream)
    
    return StreamResponse(
        id=stream["id"],
        streamer_id=stream["streamer_id"],
        streamer_username=stream["streamer_username"],
        title=stream["title"],
        description=stream["description"],
        room_name=stream["room_name"],
        is_live=stream["is_live"],
        viewer_count=stream["viewer_count"],
        created_at=stream["created_at"]
    )

@api_router.get("/streams", response_model=List[StreamResponse])
async def get_live_streams():
    streams = await db.streams.find({"is_live": True}, {"_id": 0}).sort("viewer_count", -1).to_list(50)
    return streams

@api_router.get("/streams/{stream_id}", response_model=StreamResponse)
async def get_stream(stream_id: str):
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return stream

@api_router.post("/streams/{stream_id}/end")
async def end_stream(stream_id: str, user: dict = Depends(get_current_user)):
    stream = await db.streams.find_one({"id": stream_id, "streamer_id": user["id"]}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found or not authorized")
    
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"is_live": False}}
    )
    
    return {"success": True}

@api_router.post("/streams/{stream_id}/join")
async def join_stream(stream_id: str, user: dict = Depends(get_current_user)):
    stream = await db.streams.find_one({"id": stream_id}, {"_id": 0})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Increment viewer count
    await db.streams.update_one(
        {"id": stream_id},
        {"$inc": {"viewer_count": 1}}
    )
    
    return {"success": True, "room_name": stream["room_name"]}

@api_router.post("/streams/{stream_id}/leave")
async def leave_stream(stream_id: str, user: dict = Depends(get_current_user)):
    await db.streams.update_one(
        {"id": stream_id, "viewer_count": {"$gt": 0}},
        {"$inc": {"viewer_count": -1}}
    )
    return {"success": True}

# ============== SUBSCRIPTION ROUTES ==============
@api_router.get("/subscription/plans")
async def get_subscription_plans():
    return {
        "plans": [
            {"id": "monthly", "name": "Monthly", "price": 9.99, "interval": "month", "features": ["Unlimited streams", "No diamond fee to go live", "Priority support", "Custom profile badge"]},
            {"id": "yearly", "name": "Yearly", "price": 74.99, "interval": "year", "features": ["Everything in Monthly", "Save 37%", "1000 bonus diamonds", "Exclusive gifts"]},
        ]
    }

@api_router.post("/subscription/create-order")
async def create_subscription_order(request: SubscriptionCreate, user: dict = Depends(get_current_user)):
    prices = {"monthly": "9.99", "yearly": "74.99"}
    if request.plan not in prices:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    order_id = str(uuid.uuid4())
    
    # Store pending order
    order = {
        "id": order_id,
        "user_id": user["id"],
        "plan": request.plan,
        "amount": prices[request.plan],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)
    
    return {
        "order_id": order_id,
        "amount": prices[request.plan],
        "plan": request.plan
    }

@api_router.post("/subscription/capture-order")
async def capture_subscription_order(request: dict, user: dict = Depends(get_current_user)):
    order_id = request.get("order_id")
    paypal_order_id = request.get("paypal_order_id")
    
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "completed", "paypal_order_id": paypal_order_id}}
    )
    
    # Calculate expiration
    days = 365 if order["plan"] == "yearly" else 30
    expires = datetime.now(timezone.utc) + timedelta(days=days)
    
    # Update user subscription
    update_data = {
        "subscription_status": "premium",
        "subscription_expires": expires.isoformat(),
        "subscription_plan": order["plan"]
    }
    
    # Bonus diamonds for yearly
    if order["plan"] == "yearly":
        update_data["diamond_balance"] = user["diamond_balance"] + 1000
        # Record bonus transaction
        tx = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "subscription_bonus",
            "amount": 1000,
            "description": "Yearly subscription bonus diamonds",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.transactions.insert_one(tx)
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {"success": True, "subscription_status": "premium", "expires": expires.isoformat()}

# ============== WITHDRAW/CASHOUT ROUTES ==============
@api_router.post("/wallet/withdraw")
async def withdraw_diamonds(request: WithdrawRequest, user: dict = Depends(get_current_user)):
    if request.amount < 1000:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is 1000 diamonds")
    
    if user["diamond_balance"] < request.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Calculate USD value (100 diamonds = $1)
    usd_amount = request.amount / 100
    
    # Deduct diamonds
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"diamond_balance": -request.amount}}
    )
    
    # Record withdrawal request
    withdrawal = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "diamond_amount": request.amount,
        "usd_amount": usd_amount,
        "paypal_email": request.paypal_email,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.withdrawals.insert_one(withdrawal)
    
    # Record transaction
    tx = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "withdrawal",
        "amount": -request.amount,
        "description": f"Withdrawal request: ${usd_amount:.2f} to {request.paypal_email}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(tx)
    
    return {
        "success": True,
        "withdrawal_id": withdrawal["id"],
        "diamond_amount": request.amount,
        "usd_amount": usd_amount,
        "status": "pending"
    }

@api_router.get("/wallet/withdrawals")
async def get_withdrawals(user: dict = Depends(get_current_user)):
    withdrawals = await db.withdrawals.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return withdrawals

# ============== ADMIN ROUTES ==============
@api_router.get("/admin/users")
async def admin_get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(100)
    return users

@api_router.post("/admin/diamonds/grant")
async def admin_grant_diamonds(request: AdminDiamondGrant, user: dict = Depends(require_admin)):
    target_user = await db.users.find_one({"id": request.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": request.user_id},
        {"$inc": {"diamond_balance": request.amount}}
    )
    
    # Record transaction
    tx = {
        "id": str(uuid.uuid4()),
        "user_id": request.user_id,
        "type": "admin_grant",
        "amount": request.amount,
        "description": f"Admin grant: {request.reason}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(tx)
    
    return {"success": True, "new_balance": target_user["diamond_balance"] + request.amount}

@api_router.get("/admin/withdrawals")
async def admin_get_withdrawals(user: dict = Depends(require_admin)):
    withdrawals = await db.withdrawals.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return withdrawals

@api_router.post("/admin/withdrawals/{withdrawal_id}/approve")
async def admin_approve_withdrawal(withdrawal_id: str, user: dict = Depends(require_admin)):
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

@api_router.get("/admin/stats")
async def admin_get_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_streams = await db.streams.count_documents({})
    live_streams = await db.streams.count_documents({"is_live": True})
    total_transactions = await db.transactions.count_documents({})
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_streams": total_streams,
        "live_streams": live_streams,
        "total_transactions": total_transactions,
        "pending_withdrawals": pending_withdrawals
    }

# ============== LEADERBOARD ROUTES ==============
@api_router.get("/leaderboard/gifters")
async def get_top_gifters():
    users = await db.users.find(
        {"total_gifted": {"$gt": 0}},
        {"_id": 0, "id": 1, "username": 1, "avatar": 1, "total_gifted": 1}
    ).sort("total_gifted", -1).limit(10).to_list(10)
    return users

@api_router.get("/leaderboard/streamers")
async def get_top_streamers():
    users = await db.users.find(
        {"total_received": {"$gt": 0}},
        {"_id": 0, "id": 1, "username": 1, "avatar": 1, "total_received": 1}
    ).sort("total_received", -1).limit(10).to_list(10)
    return users

# ============== HEALTH CHECK ==============
@api_router.get("/")
async def root():
    return {"message": "RCMG Live API", "status": "online"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
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
