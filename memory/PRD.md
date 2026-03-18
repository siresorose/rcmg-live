# RCMG Live - Product Requirements Document

## Project Overview
**Name:** RCMG Live  
**Type:** Multi-Platform Live Streaming Platform  
**Domain:** rcmglive.com  
**Created:** January 2026

## Original Problem Statement
Build RCMG Live - a platform where users connect all their social media apps and using that connection go live to all of them at the same time. Features include:
- Virtual gifting system like Bigo Live
- Diamonds currency for going live and gifting
- Admin panel for walker.elamen@gmail.com with unlimited diamonds
- Subscription plans: $9.99/month or $74.99/year
- Streamers can cash out or trade gifts for diamonds

## User Personas
1. **Content Creator/Streamer** - Wants to multi-stream to grow audience across platforms
2. **Viewer** - Wants to watch streams and support favorite streamers with gifts
3. **Admin (walker.elamen@gmail.com)** - Manages platform, grants diamonds, approves withdrawals

## Tech Stack
- **Frontend:** React 19, TailwindCSS, Framer Motion
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Video Streaming:** LiveKit
- **Payments:** PayPal
- **Authentication:** JWT

## Core Requirements (Static)
1. User authentication (register/login)
2. Diamond-based virtual currency system
3. Virtual gift system with animations
4. Live streaming capability
5. Subscription management
6. Admin dashboard with diamond management
7. Cash out/withdrawal system

## What's Been Implemented (January 2026)

### Authentication System
- [x] User registration with email/password
- [x] User login with JWT tokens
- [x] Admin auto-detection for walker.elamen@gmail.com
- [x] Protected routes

### Diamond Economy
- [x] New users receive 100 free diamonds
- [x] Admin receives 1 billion diamonds (unlimited)
- [x] Diamond balance display in navigation
- [x] Transaction history tracking
- [x] Gift sending with 70/30 split (streamer/platform)

### Gift System
- [x] 8 virtual gifts (Diamond, Rose, Heart, Crown, Rocket, Sports Car, Yacht, Private Jet)
- [x] Prices range from 10 to 50,000 diamonds
- [x] Gift Shop page with visual display

### Streaming
- [x] LiveKit integration for video streaming
- [x] Go Live page with title/description
- [x] Stream listing page
- [x] Viewer count tracking
- [x] 50 diamond fee for free users to go live

### Subscription Plans
- [x] Monthly plan: $9.99/month
- [x] Yearly plan: $74.99/year (37% savings)
- [x] PayPal integration ready
- [x] Premium benefits: unlimited streams, no diamond fee

### Admin Panel
- [x] Overview stats (Users, Streams, Transactions)
- [x] User management table
- [x] Diamond granting feature
- [x] Withdrawal approval system

### Wallet/Cash Out
- [x] Balance display
- [x] Withdrawal request (min 1000 diamonds)
- [x] PayPal email input
- [x] Transaction history
- [x] USD conversion (100 diamonds = $1)

### UI/UX
- [x] Dark neon cyberpunk theme
- [x] RCMG Live logo integration
- [x] Glassmorphism cards
- [x] Responsive navigation
- [x] Orbitron font for headings

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Streams
- POST /api/streams (create)
- GET /api/streams (list live)
- GET /api/streams/{id}
- POST /api/streams/{id}/end
- POST /api/streams/{id}/join
- POST /api/streams/{id}/leave

### Gifts
- GET /api/gifts
- POST /api/gifts/send

### Wallet
- GET /api/wallet/balance
- GET /api/wallet/transactions
- POST /api/wallet/withdraw

### Subscription
- GET /api/subscription/plans
- POST /api/subscription/create-order
- POST /api/subscription/capture-order

### Admin
- GET /api/admin/users
- GET /api/admin/stats
- POST /api/admin/diamonds/grant
- GET /api/admin/withdrawals
- POST /api/admin/withdrawals/{id}/approve

### LiveKit
- POST /api/livekit/token

### Leaderboard
- GET /api/leaderboard/gifters
- GET /api/leaderboard/streamers

## Prioritized Backlog

### P0 (Critical - Next Sprint)
- [ ] Social media OAuth connections (TikTok, Twitch, YouTube)
- [ ] Multi-platform stream relay (RTMP egress)
- [ ] Real-time gift animations on stream

### P1 (High Priority)
- [ ] Chat system for streams
- [ ] Follow/subscribe to streamers
- [ ] Push notifications
- [ ] Email verification

### P2 (Medium Priority)
- [ ] Stream recording/replay
- [ ] Custom profile avatars
- [ ] Streamer analytics dashboard
- [ ] Gift combos with multipliers

### P3 (Future)
- [ ] Mobile app (React Native)
- [ ] Creator tiers/levels
- [ ] Custom gift creation for top streamers
- [ ] Referral program

## Environment Variables
```
# Backend (.env)
MONGO_URL
DB_NAME
JWT_SECRET
LIVEKIT_URL
LIVEKIT_API_KEY
LIVEKIT_API_SECRET
PAYPAL_CLIENT_ID
PAYPAL_SECRET
ADMIN_EMAIL

# Frontend (.env)
REACT_APP_BACKEND_URL
```

## Test Accounts
- **Admin:** walker.elamen@gmail.com / Admin123!
- **Test User:** testuser@example.com / Test123!
