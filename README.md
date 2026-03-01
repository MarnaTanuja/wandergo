# WanderGo — Travel Event Discovery Platform

A full-stack travel platform I built to learn backend development, REST APIs, and database design. It lets travelers discover and book local events hosted by people around the world.

Live demo: *(add your Render URL here after deploying)*

---

## What it does

**For Travelers**
- Browse and search travel events by city, category, price, and date
- Book events with attendee count, phone number, and special requests
- Like and bookmark events
- Message hosts directly before booking
- View upcoming bookings on the homepage dashboard
- Save destinations to a personal wishlist

**For Hosts**
- Post, edit, and delete travel events with images
- See analytics — total views, likes, bookings, revenue
- View full details of every traveler who booked (name, email, phone, requests)
- Message travelers directly from the bookings panel

**General**
- Location explorer — search any city and see hotels, attractions, and events there
- Traveler reviews per destination with star ratings
- Trending events ranked by a weighted algorithm (likes, views, recency)

---

## Tech stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcryptjs |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Image uploads | Cloudinary + Multer |
| Security | Helmet.js, express-rate-limit |
| External APIs | Wikipedia REST API, Unsplash |

---

## Project structure

```
wandergo/
├── models/
│   ├── User.js          # user schema with wishlist, liked/bookmarked events
│   ├── Event.js         # event schema with geospatial index, trending score
│   └── index.js         # Booking, Review, Message schemas
├── routes/
│   ├── authRoutes.js    # register, login, profile, wishlist
│   ├── eventRoutes.js   # CRUD, search, trending, like, bookmark
│   ├── bookingRoutes.js # book event, view bookings, host management
│   ├── messageRoutes.js # two-way messaging between traveler and host
│   ├── reviewRoutes.js  # location reviews with ratings
│   └── locationRoutes.js# destination info with hotels and attractions
├── middleware/
│   ├── authMiddleware.js # JWT verification, role checks
│   └── errorHandler.js   # global error handling
├── public/
│   ├── pages/           # multi-page frontend (HTML)
│   ├── css/shared.css   # design system — fonts, colors, components
│   └── js/shared.js     # shared utilities — API calls, auth, toast, cards
└── server.js
```

---

## Getting started locally

**1. Clone the repo**
```bash
git clone https://github.com/tanuja/wandergo.git
cd wandergo
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create a `.env` file:
```
MONGO_URI=mongodb+srv://your_user:your_pass@cluster0.xxxxx.mongodb.net/wandergo
JWT_SECRET=your_secret_key
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

**4. Run the server**
```bash
npm start
```

Open `http://localhost:5000`

---

## Features I'm proud of

**Trending algorithm** — events are ranked using a weighted formula rather than just sorting by date:
```js
trendingScore = (likes × 3) + views + (recencyBonus × 0.4)
```
Events that are both popular and recent rank higher than old popular ones.

**Per-user wishlist** — stored in MongoDB per user, not in localStorage, so it works across devices and doesn't leak between accounts.

**Two-way messaging** — hosts and travelers can message each other tied to a specific event. The thread endpoint filters by both sender and recipient so conversations don't mix between multiple travelers on the same event.

**Role-based access** — three roles (traveler, host, admin) with middleware protecting every route. Hosts cannot book events, travelers cannot post events.

---

## Pages

| Page | URL |
|---|---|
| Home | `/` |
| Browse Events | `/events` |
| Event Detail | `/event-detail?id=...` |
| Book Event | `/book?id=...` |
| Explore Places | `/explore` |
| Traveler Dashboard | `/dashboard` |
| Host Dashboard | `/host-dashboard` |
| Messages | `/messages` |
| Login / Register | `/login` `/register` |

---

## What I learned building this

- How JWT authentication actually works under the hood — signing tokens, verifying middleware, handling expiry
- Why bcrypt pre-save hooks need to be async and what double-hashing does to passwords
- MongoDB aggregation pipelines for analytics (total views, bookings, revenue per host)
- Geospatial indexing with 2dsphere for nearby event queries
- Why route order matters in Express — specific routes must come before parameterized ones like `/:id`
- How to debug a full-stack app when the browser says 500 but the terminal says nothing

---

## Known limitations / future improvements

- No real payment gateway yet (just price display)
- Email notifications not fully wired up (Nodemailer is installed)
- Admin dashboard page is built but needs more features
- Could add WebSockets for real-time messaging instead of polling

---

*Built by Tanuja — 2025*
