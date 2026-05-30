# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# CRM — Full Stack Application

A production-ready CRM system built with **Django REST Framework** (backend) and **React + Vite** (frontend), backed by **PostgreSQL**.

---

## Tech Stack

| Layer      | Technology                                         |
|------------|----------------------------------------------------|
| Frontend   | React 18, Vite, React Router v6, TanStack Query    |
| Backend    | Django 4.2, Django REST Framework, Simple JWT      |
| Database   | PostgreSQL                                         |
| Auth       | JWT (access + refresh tokens, token blacklisting)  |

---

## Project Structure

```
crm/
├── crm_backend/          # Django project
│   ├── apps/
│   │   ├── users/        # Custom user model, roles, JWT auth
│   │   ├── leads/        # Lead model, stages, CRUD, notes
│   │   ├── assignments/  # Lead assignment + history
│   │   └── activity/     # Activity log + Django signals
│   ├── crm_backend/      # Django settings, URLs
│   ├── scripts/
│   │   └── setup.sh      # One-command setup script
│   ├── requirements.txt
│   └── .env.example
│
└── crm_frontend/         # React + Vite project
    ├── src/
    │   ├── api/          # Axios instances per backend app
    │   ├── components/   # Reusable UI components
    │   ├── context/      # AuthContext (JWT state)
    │   ├── hooks/        # React Query hooks
    │   ├── pages/        # Route-level page components
    │   └── utils/        # Helpers: roles, formatters, token
    ├── package.json
    └── .env.example
```

---

## User Roles

| Role             | What they can do                                                    |
|------------------|---------------------------------------------------------------------|
| **Admin**        | Full access. Manage users, all leads, assign to anyone, view reports |
| **Manager**      | View team leads, assign leads to their own employees, team reports   |
| **Sales Employee** | Add leads, update their own leads, add notes                       |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

---

## Backend Setup

### 1. Create the PostgreSQL database

```sql
-- Connect to psql as superuser
CREATE DATABASE crm_db;
CREATE USER crm_user WITH PASSWORD 'crm_password';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
-- PostgreSQL 15+ also needs:
GRANT ALL ON SCHEMA public TO crm_user;
```

### 2. Clone and configure

```bash
cd crm_backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit .env — at minimum update DB_NAME, DB_USER, DB_PASSWORD, SECRET_KEY
```

### 3. Run migrations

```bash
python manage.py migrate
```

### 4. Seed initial data

```bash
# Creates admin user only
python manage.py seed

# Creates admin + 2 managers + 4 employees + 10 sample leads
python manage.py seed --with-sample-data

# Re-seed from scratch (deletes all users and leads first)
python manage.py seed --with-sample-data --reset
```

Default credentials created by seed:

| Role     | Email              | Password       |
|----------|--------------------|----------------|
| Admin    | admin@crm.io       | Admin@1234     |
| Manager  | anjali@crm.io      | Manager@1234   |
| Manager  | priya@crm.io       | Manager@1234   |
| Employee | rohan@crm.io       | Employee@1234  |
| Employee | meera@crm.io       | Employee@1234  |
| Employee | arjun@crm.io       | Employee@1234  |
| Employee | divya@crm.io       | Employee@1234  |

### 5. Start the backend server

```bash
python manage.py runserver
# API available at http://localhost:8000
# Django admin at http://localhost:8000/admin/
```

Or use the one-command setup script:

```bash
bash scripts/setup.sh
```

---

## Frontend Setup

### 1. Install dependencies

```bash
cd crm_frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Default .env points to http://localhost:8000 — no changes needed for local dev
```

### 3. Start the dev server

```bash
npm run dev
# App available at http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `http://localhost:8000` automatically — no CORS issues during development.

### 4. Build for production

```bash
npm run build
# Output in dist/ — serve with Nginx, Vercel, or any static host
```

---

## API Endpoints Reference

### Auth
```
POST   /api/auth/login/              Login — returns access + refresh tokens
POST   /api/auth/logout/             Blacklist refresh token
POST   /api/auth/token/refresh/      Get new access token
GET    /api/auth/me/                 Current user profile
PATCH  /api/auth/me/                 Update own profile
PUT    /api/auth/change-password/    Change password
```

### Users (Admin only)
```
GET    /api/auth/users/              List all users
POST   /api/auth/users/              Create user
GET    /api/auth/users/{id}/         Get user
PATCH  /api/auth/users/{id}/         Update user
GET    /api/auth/users/managers/     List managers (for dropdowns)
GET    /api/auth/users/team/         Current user's team members
```

### Leads
```
GET    /api/leads/                   List leads (role-filtered)
POST   /api/leads/                   Create lead
GET    /api/leads/{id}/              Lead detail
PATCH  /api/leads/{id}/              Update lead fields
DELETE /api/leads/{id}/              Delete lead (Admin/Manager)
PATCH  /api/leads/{id}/stage/        Change stage { "stage": "qualified" }
POST   /api/leads/{id}/assign/       Assign lead { "assigned_to": "<uuid>", "note": "" }
GET    /api/leads/{id}/notes/        List notes
POST   /api/leads/{id}/notes/        Add note { "content": "..." }
GET    /api/leads/{id}/activity/     Lead activity timeline
GET    /api/leads/{id}/assignment-history/  Assignment history
GET    /api/leads/pipeline/          Kanban grouped by stage
GET    /api/leads/my/                Current user's assigned leads
GET    /api/leads/stats/             Dashboard KPIs (Admin/Manager)
```

### Assignments
```
POST   /api/assignments/leads/{id}/assign/   Assign/reassign a lead
GET    /api/assignments/leads/{id}/history/  Assignment history
POST   /api/assignments/bulk-assign/         Assign multiple leads
GET    /api/assignments/unassigned/          Leads with no assignee
GET    /api/assignments/workload/            Team workload breakdown
GET    /api/assignments/mine/                My assignment history
```

### Activity
```
GET    /api/activity/                Org-wide log (paginated, Admin/Manager)
GET    /api/activity/lead/{id}/      Per-lead timeline
GET    /api/activity/my/             My own actions
GET    /api/activity/summary/        Dashboard stats
GET    /api/activity/recent/         Last N events feed
```

---

## Environment Variables

### Backend (`crm_backend/.env`)

| Variable                         | Default           | Description                        |
|----------------------------------|-------------------|------------------------------------|
| `SECRET_KEY`                     | —                 | Django secret key (**change this**)|
| `DEBUG`                          | `True`            | Set to `False` in production       |
| `ALLOWED_HOSTS`                  | `localhost`       | Comma-separated allowed hosts      |
| `DB_NAME`                        | `crm_db`          | PostgreSQL database name           |
| `DB_USER`                        | `crm_user`        | PostgreSQL username                |
| `DB_PASSWORD`                    | `crm_password`    | PostgreSQL password                |
| `DB_HOST`                        | `localhost`       | PostgreSQL host                    |
| `DB_PORT`                        | `5432`            | PostgreSQL port                    |
| `ACCESS_TOKEN_LIFETIME_MINUTES`  | `60`              | JWT access token expiry            |
| `REFRESH_TOKEN_LIFETIME_DAYS`    | `7`               | JWT refresh token expiry           |
| `CORS_ALLOWED_ORIGINS`           | `localhost:5173`  | Allowed frontend origins           |

### Frontend (`crm_frontend/.env`)

| Variable             | Default                    | Description              |
|----------------------|----------------------------|--------------------------|
| `VITE_API_BASE_URL`  | `http://localhost:8000`    | Backend URL              |

---

## Database Tables

| Table               | Description                                          |
|---------------------|------------------------------------------------------|
| `users`             | Custom user model with role hierarchy                |
| `leads`             | Lead records with stage, value, contact info         |
| `lead_notes`        | Immutable notes attached to leads                    |
| `lead_assignments`  | Immutable history of every assignment event          |
| `activity_log`      | Append-only audit trail — auto-logged via signals    |

---

## Activity Logging

Every meaningful action is automatically logged to `activity_log`:

| Action              | Triggered by                            |
|---------------------|-----------------------------------------|
| `lead_created`      | `POST /api/leads/`                      |
| `lead_updated`      | `PATCH /api/leads/{id}/`                |
| `lead_deleted`      | `DELETE /api/leads/{id}/`               |
| `stage_changed`     | `PATCH /api/leads/{id}/stage/`          |
| `lead_assigned`     | `POST /api/leads/{id}/assign/`          |
| `lead_reassigned`   | Assignment when lead already has owner  |
| `note_added`        | `POST /api/leads/{id}/notes/`           |

Actions from Django admin / shell are also captured via **Django signals** (`apps/activity/signals.py`).

---

## Running Both Servers Together

Open two terminal windows:

```bash
# Terminal 1 — Backend
cd crm_backend
source venv/bin/activate
python manage.py runserver

# Terminal 2 — Frontend
cd crm_frontend
npm run dev
```

Then open **http://localhost:5173** in your browser and log in with `admin@crm.io / Admin@1234`.

---

## Common Issues

**`relation "users" does not exist`**
→ Run `python manage.py migrate`

**`CORS error` in browser**
→ Make sure `CORS_ALLOWED_ORIGINS` in `.env` includes `http://localhost:5173`

**`401 Unauthorized` on all API calls**
→ JWT token expired. Log out and log back in, or check `ACCESS_TOKEN_LIFETIME_MINUTES`

**`allUsers.filter is not a function`**
→ This was a pagination shape bug — fixed in hooks via `toArray()` normalisation

**Activity log is empty**
→ Make sure you've run `python manage.py migrate` to create the `activity_log` table, and that `apps.activity` is in `INSTALLED_APPS`

---

## Production Checklist

- [ ] Set `DEBUG=False` in `.env`
- [ ] Generate a strong `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` to your domain
- [ ] Configure PostgreSQL with a strong password
- [ ] Set up HTTPS (Nginx + Let's Encrypt)
- [ ] Set `CORS_ALLOWED_ORIGINS` to your production frontend URL
- [ ] Run `python manage.py collectstatic`
- [ ] Use Gunicorn: `gunicorn crm_backend.wsgi:application`
- [ ] Set up a process manager (systemd / supervisor)