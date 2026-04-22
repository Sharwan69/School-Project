# 🎓 EduEvents – School Event Management System

A full-stack web application for managing school events with CRUD operations.
Built with **HTML/CSS/JS** (frontend) + **Node.js + Express + MongoDB** (backend).

---

## 📁 Project Structure

```
school-events/
│
├── public/               ← Frontend files (copy index.html here)
│   └── index.html        ← Main frontend (standalone, works without backend)
│
├── uploads/              ← Auto-created for banner image uploads
│
├── server.js             ← Express backend (all API routes)
├── package.json          ← Dependencies
└── README.md             ← This file
```

---

## 🚀 Quick Start

### Option A – Frontend Only (No Backend Needed)
Just open `index.html` in any browser.
- All data is stored in **localStorage** (simulates MongoDB)
- Fully functional CRUD, login, search, filters, registration
- **Login:** username `admin` / password `admin123`

---

### Option B – Full Stack (with MongoDB)

#### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (local or Atlas)

#### 1. Install Dependencies
```bash
cd school-events
npm install
```

#### 2. Configure MongoDB
Default connection: `mongodb://localhost:27017/eduevents`

To use MongoDB Atlas, set environment variable:
```bash
export MONGO_URI="mongodb+srv://user:pass@cluster.mongodb.net/eduevents"
```

#### 3. Copy Frontend
```bash
mkdir -p public
cp index.html public/
```

#### 4. Start the Server
```bash
npm start          # production
npm run dev        # development (auto-restart with nodemon)
```

#### 5. Seed Sample Data (optional)
```bash
curl -X POST http://localhost:5000/api/seed
```

#### 6. Open in Browser
```
http://localhost:5000
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint      | Description   |
|--------|--------------|---------------|
| POST   | /api/login   | Admin login   |

### Events
| Method | Endpoint          | Description              |
|--------|------------------|--------------------------|
| GET    | /api/events       | Get all events (filters) |
| GET    | /api/events/:id   | Get single event         |
| POST   | /api/events       | Create event (+ banner)  |
| PUT    | /api/events/:id   | Update event             |
| DELETE | /api/events/:id   | Delete event + cascade   |

**Query params for GET /api/events:**
- `type` – filter by event type
- `status` – Upcoming / Ongoing / Completed
- `from` / `to` – date range (YYYY-MM-DD)
- `search` – search by name

### Participants
| Method | Endpoint               | Description              |
|--------|------------------------|--------------------------|
| GET    | /api/participants      | All participants          |
| GET    | /api/participants/:id  | Single participant        |
| POST   | /api/participants      | Register student          |
| PUT    | /api/participants/:id  | Update registration       |
| DELETE | /api/participants/:id  | Remove registration       |

### Stats
| Method | Endpoint    | Description        |
|--------|------------|---------------------|
| GET    | /api/stats  | Dashboard statistics|

---

## ✨ Features

### Event Management
- ✅ Create, Read, Update, Delete events
- ✅ Event types: Sports Day, Hackathon, Science Exhibition, etc.
- ✅ Status tracking: Upcoming / Ongoing / Completed
- ✅ Banner image upload
- ✅ Registration deadline tracking
- ✅ Participant capacity with progress bar

### Participant Management
- ✅ Register students for events
- ✅ Duplicate registration prevention
- ✅ Capacity enforcement
- ✅ Edit & delete registrations
- ✅ View all participants per event

### Dashboard
- ✅ Total / Upcoming / Completed / Student counts
- ✅ Upcoming events timeline
- ✅ Event type breakdown chart

### UX Features
- ✅ Admin login page
- ✅ Search events by name
- ✅ Filter by type, status, date range
- ✅ Success/error toast notifications
- ✅ Delete confirmation dialog
- ✅ Mobile responsive design
- ✅ Sidebar navigation
- ✅ Smooth animations

---

## 🎨 Tech Stack

| Layer     | Technology              |
|-----------|------------------------|
| Frontend  | HTML5, CSS3, JavaScript |
| Backend   | Node.js, Express.js     |
| Database  | MongoDB + Mongoose      |
| File Upload | Multer               |
| Fonts     | Google Fonts (Syne, DM Sans) |
| Icons     | Font Awesome 6         |

---

## 👨‍💻 Demo Credentials
- **Username:** `admin`
- **Password:** `admin123`

---

*Built as a School Project – EduEvents v1.0*
