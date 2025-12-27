# 🌟 Stylio API

**Stylio** is a modern Salon & Home Services booking platform backend built with Node.js, Express.js, and MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Deploy to Render](#-deploy-to-render)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)

---

## ✨ Features

### V1 - Search & Discovery
- 🏠 **To Home / To Salon** - Dual service modes
- 👨‍👩‍👧 **Audience Targeting** - Men, Women, Kids, Unisex
- 📍 **Geo-based Search** - Find services near you
- 🔍 **Text Search** - Search by name, tags, description
- ⭐ **Rating & Price Filters** - Refine your search
- 📄 **Pagination & Sorting** - Efficient data loading

### Core Features
- 🔐 JWT Authentication with refresh tokens
- 📱 OTP Verification
- 💇 Salon & Service Management
- 📅 Booking System
- ⭐ Reviews & Ratings
- ❤️ Favorites
- 🔔 Notifications
- 🎬 Shorts/Reels
- 🎟️ Promo Codes

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime |
| **Express.js** | Web Framework |
| **MongoDB** | Database |
| **Mongoose** | ODM |
| **JWT** | Authentication |
| **Zod** | Validation |
| **Helmet** | Security |
| **Morgan** | Logging |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values

# Seed the database (optional)
npm run seed

# Start development server
npm run dev
```

The API will be running at `http://localhost:5000`

### Health Check

```bash
curl http://localhost:5000/api/health
```

---

## 🌐 Deploy to Render

### Step 1: Set Up MongoDB Atlas (Free Tier)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account / Sign in
3. Create a new **Free Shared Cluster**
4. Click **"Connect"** → **"Connect your application"**
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/stylio?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your credentials

> ⚠️ **Important**: In Atlas, go to **Network Access** → Add IP `0.0.0.0/0` to allow all IPs (required for Render)

---

### Step 2: Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Create .gitignore
cat > .gitignore << EOF
node_modules/
.env
.DS_Store
uploads/
*.log
EOF

# Add and commit
git add .
git commit -m "Initial commit - Stylio API"

# Push to GitHub
git remote add origin https://github.com/<your-username>/stylio-api.git
git branch -M main
git push -u origin main
```

---

### Step 3: Deploy on Render

#### Option A: Manual Setup (Recommended for beginners)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your repository
4. Configure the service:

   | Setting | Value |
   |---------|-------|
   | **Name** | `stylio-api` |
   | **Region** | Oregon (US West) |
   | **Branch** | `main` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | Free |

5. Add **Environment Variables** (click "Advanced"):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGODB_URI` | `mongodb+srv://...` (your Atlas URI) |
   | `JWT_SECRET` | (generate: see below) |
   | `JWT_REFRESH_SECRET` | (generate: see below) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `JWT_REFRESH_EXPIRES_IN` | `30d` |
   | `FRONTEND_URL` | `*` |
   | `RATE_LIMIT_MAX` | `200` |

6. Click **"Create Web Service"**

#### Option B: Blueprint (Auto-configuration)

If you have `render.yaml` in your repo:

1. Go to Render Dashboard
2. Click **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will auto-detect `render.yaml`
5. Add the **MONGODB_URI** environment variable manually

---

### Step 4: Generate Secure Secrets

Run this in your terminal to generate JWT secrets:

```bash
# Generate JWT_SECRET
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate JWT_REFRESH_SECRET
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste into Render's environment variables.

---

### Step 5: Seed Production Database

After deployment, seed your database:

```bash
# Option 1: Use Render Shell
# Go to Render Dashboard → Your Service → Shell
npm run seed

# Option 2: Run locally with production database
MONGODB_URI="your-atlas-uri" npm run seed
```

---

### Step 6: Verify Deployment

Your API will be available at:
```
https://stylio-api.onrender.com
```

Test the endpoints:

```bash
# Health check
curl https://stylio-api.onrender.com/api/health

# Get salons
curl https://stylio-api.onrender.com/api/salons

# Search with geo
curl "https://stylio-api.onrender.com/api/salons?lat=19.0760&lng=72.8777&radius=10000"
```

---

## 📚 API Documentation

### Base URL
- **Local**: `http://localhost:5000/api`
- **Production**: `https://stylio-api.onrender.com/api`

### Authentication
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh-token
GET  /api/auth/me
```

### Salons (V1 Search)
```http
GET /api/salons
GET /api/salons/:id
GET /api/salons/:id/services
GET /api/salons/:id/providers
GET /api/salons/:id/reviews
GET /api/salons/nearby
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `lat` | number | Latitude for geo search |
| `lng` | number | Longitude for geo search |
| `radius` | number | Search radius in meters (default: 5000) |
| `cityId` | string | Filter by city |
| `areaId` | string | Filter by area |
| `q` | string | Text search query |
| `mode` | string | `toSalon`, `toHome`, or `both` |
| `audience` | string | `men`, `women`, `kids`, or `unisex` |
| `minRating` | number | Minimum rating (0-5) |
| `maxRating` | number | Maximum rating (0-5) |
| `minPriceLevel` | number | Minimum price level (1-4) |
| `maxPriceLevel` | number | Maximum price level (1-4) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20) |
| `sortBy` | string | `distance`, `rating`, `price`, `popular` |
| `sortOrder` | string | `asc` or `desc` |

### Services (V1 Search)
```http
GET /api/services
GET /api/services/:id
GET /api/services/categories
GET /api/services/types
GET /api/services/popular
GET /api/services/search
```

### Unified Search
```http
GET /api/search?q=haircut&type=all
GET /api/search/suggestions?q=hair
GET /api/search/trending
```

### Bookings
```http
GET  /api/bookings
GET  /api/bookings/:id
POST /api/bookings
POST /api/bookings/:id/cancel
GET  /api/bookings/upcoming
GET  /api/bookings/past
GET  /api/bookings/available-slots
```

### Other Endpoints
```http
# User Profile
GET   /api/users/profile
PATCH /api/users/profile
PATCH /api/users/password

# Favorites
GET  /api/favorites
POST /api/favorites
POST /api/favorites/toggle

# Notifications
GET  /api/notifications
POST /api/notifications/read-all

# Reviews
GET  /api/reviews/salon
POST /api/reviews/salon

# Promo Codes
POST /api/promo-codes/validate

# Health
GET /api/health
```

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `5000` | Server port |
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `JWT_SECRET` | **Yes** | - | JWT signing secret |
| `JWT_REFRESH_SECRET` | **Yes** | - | Refresh token secret |
| `JWT_EXPIRES_IN` | No | `7d` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiry |
| `FRONTEND_URL` | No | `*` | CORS allowed origin |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |

---

## 📁 Project Structure

```
server/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.js      # Environment config
│   │   └── database.js   # MongoDB connection
│   │
│   ├── controllers/      # Route handlers
│   │   ├── auth.controller.js
│   │   ├── salon.controller.js
│   │   ├── service.controller.js
│   │   ├── search.controller.js
│   │   └── ...
│   │
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # JWT verification
│   │   ├── validate.js   # Zod validation
│   │   └── errorHandler.js
│   │
│   ├── models/           # Mongoose schemas
│   │   ├── User.js
│   │   ├── Salon.js      # V1: mode, audience, geo
│   │   ├── Service.js    # V1: mode, audience
│   │   ├── Location.js   # City, Area with geo
│   │   └── ...
│   │
│   ├── routes/           # API routes
│   │   ├── auth.routes.js
│   │   ├── salon.routes.js
│   │   ├── search.routes.js
│   │   └── ...
│   │
│   ├── utils/            # Helper functions
│   │   └── searchHelpers.js
│   │
│   ├── validations/      # Zod schemas
│   │   └── search.validation.js
│   │
│   ├── scripts/          # Utility scripts
│   │   └── seed.js       # Database seeder
│   │
│   └── server.js         # App entry point
│
├── uploads/              # File uploads (gitignored)
├── package.json
├── render.yaml           # Render blueprint
└── README.md
```

---

## 🧪 Test Credentials

After running `npm run seed`:

| Role | Username | Password |
|------|----------|----------|
| Customer | `testuser` | `test1234` |
| Salon Owner | `salonowner` | `owner1234` |
| Home Provider | `homeprovider` | `home1234` |

---

## 📝 Example API Calls

### Geo Search (Mumbai)
```bash
curl "https://stylio-api.onrender.com/api/salons?lat=19.0760&lng=72.8777&radius=10000&mode=toHome&audience=women"
```

### Text Search
```bash
curl "https://stylio-api.onrender.com/api/search?q=haircut&mode=toSalon"
```

### Filter Services
```bash
curl "https://stylio-api.onrender.com/api/services?mode=toHome&audience=women&minPrice=500&maxPrice=2000"
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License.

---

## 🙋 Support

For issues and questions:
- Create a [GitHub Issue](https://github.com/your-username/stylio-api/issues)
- Email: support@stylio.app

---

**Made with ❤️ by the Stylio Team**



