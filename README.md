# 🌟 Stylio API

**Stylio** is a Salon & Home Services booking backend built with Node.js, Express.js, and MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey)
![MongoDB](https://img.shields.io/badge/MongoDB-8.x-green)
![License](https://img.shields.io/badge/License-ISC-blue)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture Overview](#-architecture-overview)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Deploy to Render](#-deploy-to-render)
- [Project Structure](#-project-structure)
- [Security & Scalability Notes](#-security--scalability-notes)

---

## ✨ Features

### V1 - Search & Discovery
- 🏠 **To Home / To Salon** - Dual service modes
- 👨‍👩‍👧 **Audience Targeting** - Men, Women, Kids, Unisex
- 📍 **Geo-based Search** - Nearby salons/providers with radius filters
- 🔍 **Text Search** - Search by name, tags, description
- ⭐ **Rating & Price Filters** - Refine discovery
- 📄 **Pagination & Sorting** - Consistent list responses

### Core Features
- 🔐 JWT authentication (access + refresh tokens)
- 📱 OTP flows for account verification and password reset
- 💇 Salon, service, and provider discovery
- 📅 Booking lifecycle (pending to completed/no-show/cancelled)
- ⭐ Reviews & ratings (salon and provider)
- ❤️ Favorites
- 🔔 In-app notifications + optional email/SMS/push notifications
- 🎬 Shorts/Reels module (likes, comments, bookmarks, follows)
- 🎟️ Promo code validation

---

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js 18+** | Runtime |
| **Express.js** | Web Framework |
| **MongoDB + Mongoose** | Database + ODM |
| **JWT** | Auth tokens |
| **Zod** | Query validation (search APIs) |
| **Helmet** | Security headers |
| **express-rate-limit** | Rate limiting |
| **Multer** | Avatar upload handling |
| **Nodemailer / Brevo API** | Email delivery |

---

## 🧱 Architecture Overview

- **Entry point:** `src/server.js`
- **Layering:** `routes -> controllers -> models/services`
- **Config:** central env parsing in `src/config/index.js`
- **Database:** MongoDB connection via `src/config/database.js`
- **Middleware:** JWT auth, optional auth, Zod validation, global error handler
- **Search:** reusable query builders in `src/utils/searchHelpers.js`
- **Integrations:** SMTP/Brevo email, TextBelt/custom SMS, Expo push notifications

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

```bash
git clone <your-repo-url>
cd Stylio-be
npm install
```

Create `.env` in project root (there is no `.env.example` in this repo):

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/salon_booking
JWT_SECRET=replace-with-strong-secret
JWT_REFRESH_SECRET=replace-with-strong-refresh-secret
```

Run the app:

```bash
npm run dev
```

Optional sample data:

```bash
npm run seed
```

Health check:

```bash
curl http://localhost:5000/api/health
```

---

## 📚 API Documentation

### Base URL
- **Local:** `http://localhost:5000/api`

### Authentication
```http
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh-token
POST   /api/auth/forgot-password
POST   /api/auth/verify-reset-otp
POST   /api/auth/reset-password
POST   /api/auth/logout              (auth)
GET    /api/auth/me                  (auth)
POST   /api/auth/verify-otp          (auth)
POST   /api/auth/resend-otp          (auth)
POST   /api/auth/push-token          (auth)
DELETE /api/auth/push-token          (auth)
```

### Users
```http
GET    /api/users/profile                     (auth)
PATCH  /api/users/profile                     (auth)
PATCH  /api/users/password                    (auth)
POST   /api/users/avatar                      (auth)
GET    /api/users/addresses                   (auth)
POST   /api/users/addresses                   (auth)
PATCH  /api/users/addresses/:addressId        (auth)
DELETE /api/users/addresses/:addressId        (auth)
DELETE /api/users/account                     (auth)
```

### Location
```http
GET /api/cities
GET /api/cities/:id
GET /api/areas
GET /api/areas/:id
```

### Salons
```http
GET /api/salons
GET /api/salons/nearby
GET /api/salons/:id
GET /api/salons/:id/services
GET /api/salons/:id/providers
GET /api/salons/:id/reviews
GET /api/salons/:id/gallery
```

### Services
```http
GET /api/services
GET /api/services/:id
GET /api/services/categories
GET /api/services/types
GET /api/services/popular
GET /api/services/search
```

### Providers
```http
GET /api/providers
GET /api/providers/:id
GET /api/providers/:id/reviews
GET /api/providers/:id/availability
```

### Search
```http
GET /api/search
GET /api/search/suggestions
GET /api/search/trending
```

### Bookings
```http
GET   /api/bookings/available-slots
GET   /api/bookings                      (auth)
GET   /api/bookings/upcoming             (auth)
GET   /api/bookings/past                 (auth)
GET   /api/bookings/:id                  (auth)
POST  /api/bookings                      (auth)
POST  /api/bookings/:id/cancel           (auth)
POST  /api/bookings/:id/confirm          (auth)
POST  /api/bookings/:id/complete         (auth)
POST  /api/bookings/:id/no-show          (auth)
PATCH /api/bookings/:id/status           (auth)
```

### Reviews
```http
GET    /api/reviews/salon
POST   /api/reviews/salon              (auth)
GET    /api/reviews/provider
POST   /api/reviews/provider           (auth)
DELETE /api/reviews/:type/:id          (auth)
```

### Favorites
```http
GET    /api/favorites                    (auth)
GET    /api/favorites/check/:salonId     (auth)
POST   /api/favorites                    (auth)
POST   /api/favorites/toggle             (auth)
DELETE /api/favorites/salon/:salonId     (auth)
DELETE /api/favorites/:id                (auth)
```

### Notifications
```http
GET    /api/notifications            (auth)
GET    /api/notifications/unread     (auth)
POST   /api/notifications/read-all   (auth)
POST   /api/notifications/:id/read   (auth)
DELETE /api/notifications/:id        (auth)
```

### Promo Codes
```http
GET  /api/promo-codes
GET  /api/promo-codes/active
GET  /api/promo-codes/:code
POST /api/promo-codes/validate
```

### Shorts
```http
GET  /api/shorts
GET  /api/shorts/trending
GET  /api/shorts/bookmarks                    (auth)
GET  /api/shorts/:id
GET  /api/shorts/:id/view
POST /api/shorts/:id/view
POST /api/shorts/:id/share
GET  /api/shorts/:id/comments
POST /api/shorts/:id/comments                 (auth)
POST /api/shorts/:id/like                     (auth)
POST /api/shorts/:id/bookmark                 (auth)
POST /api/shorts/comments/:commentId/like     (auth)
GET  /api/shorts/comments/:commentId/replies
POST /api/shorts/creators/:creatorUsername/follow (auth)
```

### System
```http
GET  /
GET  /api/health
POST /api/test/email         (development only)
```

---

## 🔐 Environment Variables

### Core Settings

| Variable | Required in Production | Default | Description |
|----------|------------------------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `5000` | Server port |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/salon_booking` | MongoDB connection string |
| `JWT_SECRET` | Yes | - | Access token signing secret |
| `JWT_REFRESH_SECRET` | Yes | - | Refresh token signing secret |
| `JWT_EXPIRES_IN` | No | `7d` | Access token expiry |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiry |
| `FRONTEND_URL` | No | `*` | CORS allowed origin |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (ms) |
| `OTP_EXPIRES_MINUTES` | No | `15` | OTP validity period |
| `OTP_CHANNEL` | No | `email` | OTP channel: `email`, `sms`, `both` |

### Email

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_PROVIDER` | No | auto-detect | `brevo-api`, `smtp`, or `console` |
| `BREVO_API_KEY` | No | - | Brevo API key (HTTP email provider) |
| `SMTP_HOST` | No | - | SMTP host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASS` | No | - | SMTP password |
| `SMTP_FROM` | No | `SMTP_USER`/fallback | Sender email |
| `SMTP_FROM_NAME` | No | `Stylio` | Sender name |
| `EMAIL_ENABLED` | No | inferred | Email toggle flag |

### SMS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMS_PROVIDER` | No | `console` | `console`, `textbelt`, `custom` |
| `SMS_API_KEY` | No | - | SMS provider API key |
| `SMS_API_URL` | No | - | Custom SMS API endpoint |
| `SMS_ENABLED` | No | `false` | Enable SMS sending |

### Uploads

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FILE_SIZE` | No | `5242880` | Avatar/file size limit in bytes |
| `UPLOAD_DIR` | No | `uploads` | Upload directory |

---

## 🌐 Deploy to Render

This repo includes `render.yaml` for Blueprint deploys.

### Option A: Blueprint (recommended)
1. Push repository to GitHub.
2. In Render, create a new **Blueprint** and connect the repo.
3. Render reads `render.yaml` and configures:
   - runtime: Node
   - build command: `npm install`
   - start command: `npm start`
   - health check: `/api/health`
4. Set required secrets in Render:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `JWT_REFRESH_SECRET`
   - `FRONTEND_URL` (if restricting CORS)

### Option B: Manual Web Service
Use the same commands/settings defined above and add the same environment variables.

Generate secure JWT secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 📁 Project Structure

```
Stylio-be/
├── src/
│   ├── config/          # Env + DB config
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Auth, validation, error handlers
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Route definitions
│   ├── services/        # Email/SMS/push orchestration
│   ├── utils/           # Search and response helpers
│   ├── validations/     # Zod schemas
│   ├── scripts/         # Data scripts (seed/import)
│   └── server.js        # App bootstrap
├── finalsalons_scrap.csv
├── render.yaml
├── package.json
└── README.md
```

---

## 🛡️ Security & Scalability Notes

- `helmet` is enabled for secure HTTP headers.
- CORS is configurable via `FRONTEND_URL`; wildcard allowed for mobile/dev scenarios.
- API-wide rate limiting is applied on `/api/*`.
- Query validation is applied to search endpoints using Zod schemas.
- Global error middleware normalizes validation/JWT/Mongoose errors.
- Geospatial (`2dsphere`), text, and compound indexes are used across core models for scalable search and filtering.

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






