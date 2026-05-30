![CI](https://github.com/YashDhoke/booking-system/actions/workflows/ci.yml/badge.svg)

# Global Class Offering Booking System

A high-performance, modular Node.js backend for managing global class bookings with strict concurrency control and automated timezone synchronization.

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js |
| **Framework** | Express.js |
| **Database** | PostgreSQL |
| **Auth** | JWT (JSON Web Tokens) |
| **Validation** | Zod |
| **Timezone** | Luxon |
| **DB Driver** | node-postgres (pg) |

---

## 🏗 Architecture Overview

The project follows a **Modular Layered Architecture** (Repository-Service-Controller) to ensure separation of concerns and database safety.

```text
HTTP Request
    ↓
[ Middleware: Auth + Role Guard ]
    ↓
[ Controller ] — Validates HTTP request, extracts params, calls Service.
    ↓
[ Service ] — Business logic, timezone conversion, conflict detection.
    ↓
[ Repository ] — Raw SQL execution, talks only to PostgreSQL.
    ↓
[ PostgreSQL ]
```

---

## 📊 Database Schema

The system is built on a relational schema with 5 primary tables:

1.  **Users**: Stores profiles, roles (`teacher`, `parent`), and IANA timezone preferences.
2.  **Courses**: The academic curriculum defined by teachers.
3.  **Offerings**: Specific batches or instances of a course (e.g., "Saturday Batch").
4.  **Sessions**: Individual time slots within an offering (stored in UTC).
5.  **Bookings**: Links parents to offerings with status tracking (`confirmed`, `cancelled`).

---

## 🧠 Key Design Decisions

### 1. UTC as the Single Source of Truth
To handle a **Teacher in Kolkata** and a **Parent in New York**, we store all session times in UTC. 
- **Teacher Perspective**: Inputs time in `Asia/Kolkata`. Backend converts to UTC.
- **Parent Perspective**: Backend fetches UTC, projects it into `America/New_York`.
- **Result**: Perfect synchronization regardless of global location or Daylight Savings.

### 2. Concurrency via `SELECT FOR UPDATE`
To prevent race conditions where a parent might double-book overlapping classes via two different browser tabs:
- The system uses a **Database Transaction**.
- It executes `SELECT ... FOR UPDATE` on the parent's current schedule. 
- This "locks" the parent's schedule rows until the new booking conflict check is complete, ensuring sequential processing of concurrent requests.

### 3. Booking at Offering Level
Booking is handled at the **Offering level** (batch) rather than individual sessions. This ensures a consistent learning experience where a parent secures a seat for the entire "batch" or "course instance" in one atomic action.

---

## 🚀 Setup & Running (Local)

### Prerequisites
- Node.js (v16+)
- PostgreSQL (v12+)

### 1. Clone & Install
```bash
git clone <repo-url>
cd booking-system
npm install
```

### 2. Environment Setup
Create a `.env` file from the template:
```bash
cp .env.example .env
# Update DB_USER, DB_PASSWORD, etc.
```

### 3. Run Migrations
Initialize the database schema:
```bash
node src/db/migrate.js
```

### 4. Start Server
```bash
npm run dev
```

---

## 📍 API Reference

| Method | Endpoint | Auth | Role | Description |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | No | - | Register as teacher or parent |
| `POST` | `/api/auth/login` | No | - | Get JWT auth token |
| `POST` | `/api/courses` | Yes | Teacher | Create a new course |
| `GET` | `/api/courses/mine` | Yes | Teacher | View your taught courses |
| `POST` | `/api/offerings` | Yes | Teacher | Create an offering batch |
| `GET` | `/api/offerings/mine` | Yes | Teacher | View your offerings & stats |
| `POST` | `/api/offerings/:id/sessions` | Yes | Teacher | Bulk add sessions to batch |
| `GET` | `/api/offerings` | Yes | Parent | Browse localized offerings |
| `POST` | `/api/bookings` | Yes | Parent | Book a class batch |
| `PATCH` | `/api/bookings/:id/cancel` | Yes | Parent | Cancel a confirmed booking |
| `GET` | `/api/health` | No | - | System & DB health check |

---

## 🧪 Testing Concurrency

To verify the **Race Condition Protection**, run two simultaneous booking requests for the same parent targeting overlapping offerings:

```bash
# Run these in parallel terminals
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offering_id": "UUID_1"}' &

curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"offering_id": "UUID_2"}' &
```

**Expected Result**: One request will return `201 Created`, and the other will return `409 Conflict`. Both will never succeed simultaneously.

---

## 📂 Postman Collection
Import the `postman_collection.json` file from the root directory into Postman to access pre-configured requests and environment variables.

---

## 🐋 Running with Docker

The project includes full Docker support for a zero-configuration setup.

### 1. Start everything
This will build the app image, start a PostgreSQL container, and automatically run migrations:
```bash
docker-compose up --build
```

- **App**: Available at `http://localhost:3000`
- **Database**: Running internally in the `booking_db` container.

### 2. Common Docker Commands

- **Stop all services**:
  ```bash
  docker-compose down
  ```

- **Stop and reset database** (clears all volumes):
  ```bash
  docker-compose down -v
  ```

- **View logs**:
  ```bash
  docker-compose logs -f app
  ```


## 🌐 Live Deployment

The API is live and publicly accessible on Railway:

**Base URL**: `https://booking-system-production-e113.up.railway.app`

| Endpoint | URL |
| :--- | :--- |
| Health Check | https://booking-system-production-e113.up.railway.app/api/health |
| API Base | https://booking-system-production-e113.up.railway.app/api |

> No local setup required to test the API — use the Postman collection 
> with the live base URL above.