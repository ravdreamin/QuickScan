# QuickScan

A secure, QR-based attendance system for classrooms. Teachers generate rotating QR codes; students scan them on their own devices. Anti-proxy measures (GPS location, hardware device binding, HMAC-signed tokens) prevent attendance fraud.

---

## Features

**For Teachers**
- Create sessions with optional geo-fencing (lat/lon + radius)
- Generate live, rotating QR codes with a countdown timer
- Project QR fullscreen for the class
- Enroll students by email (bulk supported)
- View attendance register as a date × student matrix
- Manage student details (roll number, email, device ID)
- Audit ledger of all system actions

**For Students**
- Join sessions via enrollment code
- Scan QR code from a dedicated scan page (requires GPS)
- View attendance stats per course and overall
- Hardware device binding — one account per device

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Framer Motion |
| Backend | FastAPI (Python 3.12), SQLAlchemy 2.0, Pydantic v2, Alembic |
| Database | PostgreSQL 16 |
| Cache / Rate Limit | Redis 7 |
| Auth | PASETO tokens (stateless, secure) |
| QR Security | HMAC-signed payloads with rotating timestamps |
| Package Manager | `uv` (backend), `npm` (frontend) |

---

## Project Structure

```
QuickScan/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (auth, sessions, attendance, qr, audit)
│   │   ├── core/         # Config, security utilities
│   │   ├── db/           # Database session
│   │   ├── models/       # SQLModel ORM models
│   │   └── schemas/      # Pydantic request/response schemas
│   ├── migrations/       # Alembic migration files
│   ├── docker-compose.yaml
│   ├── pyproject.toml
│   └── .env.example
└── frontend/
    └── src/
        ├── pages/        # Landing, Login, Register, Dashboard, Scan
        ├── lib/          # API client, auth helpers
        └── index.css     # Global design system
```

---

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/) (for PostgreSQL + Redis)
- [uv](https://github.com/astral-sh/uv) — Python package manager
- Node.js 18+ and npm

---

### 1. Start Infrastructure

```bash
cd backend
docker-compose up -d
```

This starts PostgreSQL on `:5432`, Redis on `:6379`, and Adminer (DB UI) on `:8080`.

---

### 2. Backend Setup

```bash
cd backend

# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your DB credentials and PASETO secret

# Run database migrations
uv run alembic upgrade head

# Start the API server
uv run uvicorn app.main:app --reload
```

API available at: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App available at: `http://localhost:5173`

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=quickscan_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Must be exactly 32 characters
PASETO_SECRET_KEY=CHANGE_ME_32_CHAR_SECRET_KEY_HERE
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive a PASETO token |
| GET | `/auth/me` | Get current user profile |
| GET | `/sessions` | List teacher's sessions |
| POST | `/sessions` | Create a new session |
| POST | `/sessions/join` | Student joins session via code |
| GET | `/sessions/{id}/qr` | Get current signed QR payload |
| POST | `/attendance/scan` | Student submits QR scan |
| GET | `/sessions/{id}/attendance/matrix` | Attendance register matrix |
| GET | `/audit/ledger` | Audit log of all actions |

---

## Security Model

- **PASETO tokens** — More secure alternative to JWT; used for all authenticated requests.
- **Hardware binding** — A device fingerprint is recorded on registration; subsequent logins are validated against it.
- **HMAC-signed QR codes** — Each QR payload includes a server-generated HMAC signature and a short expiry window (~30s) to prevent replay attacks.
- **Geo-fencing** — Sessions can be configured with a GPS coordinate and radius; student location is validated server-side at scan time.
- **Audit ledger** — All sensitive actions (scan, enroll, edit) are logged with actor, target, timestamp, and IP.
