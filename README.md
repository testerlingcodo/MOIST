# SIS Portal — Student Information System

Full-stack school portal with Flutter mobile app, React web admin, Node.js REST API, and PayMongo payment integration.

---

## Project Structure

```
MOIST/
├── backend/        Node.js + Express REST API
├── web-admin/      React + Vite admin dashboard
└── mobile/         Flutter student mobile app
```

---

## Quick Start

### 1. Database Setup

Create a PostgreSQL database:
```sql
CREATE DATABASE sis_portal;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials and secrets

npm install
npm run migrate     # Run all SQL migrations
npm run seed        # Create default admin user
npm run dev         # Start dev server on :5000
```

Default admin: `admin@sis.edu.ph` / `Admin@123`
**Change this immediately in production.**

### 3. Web Admin

```bash
cd web-admin
npm install
npm run dev         # Start on :3000
```

### 4. Flutter Mobile

```bash
cd mobile
flutter pub get
flutter run
```

---

## Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `DB_*` | PostgreSQL connection |
| `JWT_ACCESS_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `PAYMONGO_SECRET_KEY` | PayMongo secret key (`sk_...`) |
| `PAYMONGO_WEBHOOK_SECRET` | PayMongo webhook signing secret |
| `APP_URL` | Frontend URL (for CORS) |

---

## API Reference

Base URL: `http://localhost:5000/api/v1`

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Students | `GET/POST /students`, `GET/PATCH/DELETE /students/:id` |
| Grades | `GET/POST /grades`, `GET/PATCH /grades/:id` |
| Enrollments | `GET/POST /enrollments`, `GET/PATCH/DELETE /enrollments/:id` |
| Subjects | `GET/POST /subjects`, `GET/PATCH/DELETE /subjects/:id` |
| Tuition | `GET/POST /tuition`, `GET/PATCH /tuition/:id` |
| Payments | `GET /payments`, `POST /payments/create-link`, `POST /payments/webhook` |
| Users | `GET/POST /users`, `GET/PATCH/DELETE /users/:id` |

---

## Roles

| Role | Access |
|---|---|
| `admin` | Full access to all modules |
| `staff` | Manage students, encode grades, process enrollments |
| `student` | View own grades, payments, profile |

---

## Payment Flow (PayMongo)

1. Admin/student hits `POST /payments/create-link`
2. Backend creates a PayMongo Payment Link
3. Student is redirected to the hosted checkout page
4. Student pays via GCash / Card / Maya
5. PayMongo fires a webhook to `POST /payments/webhook`
6. Backend verifies signature, updates payment status to `paid`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Flutter 3, Provider, Dio, GoRouter |
| Web Admin | React 18, Vite, Tailwind CSS, Redux Toolkit |
| Backend | Node.js, Express 4, JWT, bcryptjs |
| Database | PostgreSQL (raw `pg` Pool — no ORM) |
| Payments | PayMongo Payment Links API |
| Deployment | Vercel (frontend), Render/Railway (backend), Supabase (DB) |
