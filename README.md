# Enterprise Work Management System

JavaScript-only enterprise work management monorepo built with **pure ES Modules (ESM)**, **no Babel**, and **no CommonJS**.

## Overview

This project is a polished, modular, enterprise-style demo app that showcases:

- role-based JWT authentication
- localStorage-driven business data architecture
- realtime UI synchronization over Socket.IO
- modular feature-based React architecture
- premium animated UX with Framer Motion

## Architecture (Honest by Design)

This is an intentionally hybrid academic/demo architecture:

- **Backend (`apps/api`)**: Node.js + Express handles auth, JWT, role-aware middleware, CRUD APIs, health endpoint, and Socket.IO relay. **Data is persisted in MongoDB** using Mongoose.
- **Frontend (`apps/web`)**: React + Redux Toolkit fetches data via Axios Async Thunks. `localStorage` is exclusively used for UI state (theme, sidebar).
- **Realtime model**: Socket.IO broadcasts domain events after MongoDB writes; clients update Redux stores.

## ESM and Tooling Guarantees

- JavaScript only
- ESM only (`import` / `export`)
- no `require()`
- no `module.exports`
- no `.cjs` configs
- no Babel config or Babel transform pipeline
- frontend tests run on **Vitest** + React Testing Library

## Monorepo Structure

```text
root/
  apps/
    api/
      src/
        config/
        controllers/
        data/
        middleware/
        routes/
        services/
        sockets/
        utils/
    web/
      src/
        app/
        components/
        constants/
        features/
        hooks/
        lib/
        routes/
        services/
        store/
        test-utils/
        __tests__/
  package.json
  README.md
```

## Core Frontend Stack

- React + Vite
- Redux Toolkit
- React Router
- React Hook Form + Yup
- Tailwind CSS
- Axios
- Recharts
- `@dnd-kit`
- `react-toastify`
- `framer-motion`
- Vitest + React Testing Library

## Core Backend Stack

- Node.js + Express
- jsonwebtoken
- bcryptjs
- cors
- dotenv
- socket.io
- multer (mock attachment metadata endpoint)

## Realtime Domain Events

- `project:created`
- `project:updated`
- `task:created`
- `task:updated`
- `task:moved`
- `comment:added`
- `notification:created`

## API Endpoints

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `POST /api/users` (Admin)
- `PATCH /api/users/:userId` (Admin)
- `GET /api/health`
- `POST /api/upload` (mock metadata)

## Demo Credentials

- `admin@demo.com / Admin@123`
- `manager@demo.com / Manager@123`
- `employee@demo.com / Employee@123`

## Setup

Ensure you have [MongoDB](https://www.mongodb.com/) installed and running locally, or use a MongoDB Atlas URI.

**1. Install Dependencies:**
From the root directory, install dependencies for the entire workspace:
```bash
npm install
```

**2. Setup Environment Variables:**
Set up the `.env` files for both the backend and frontend apps.

Backend (`apps/api`):
```bash
cp apps/api/.env.example apps/api/.env
```

Frontend (`apps/web`):
```bash
cp apps/web/.env.example apps/web/.env
```

**3. Seed the Database (Required for first run):**
```bash
node apps/api/src/seed/seed.js
```

## Running the Development Servers

The frontend and backend are designed to run independently. You will need **two separate terminals**.

### Terminal 1: Backend (API)
Start the Node.js Express server:
```bash
cd apps/api
npm run dev
```
- API will be running at [http://localhost:5000](http://localhost:5000)

### Terminal 2: Frontend (Web)
Start the React Vite app:
```bash
cd apps/web
npm run dev
```
- Web App will be running at [http://localhost:5173](http://localhost:5173)

---

## Environment Variables

### Backend (`apps/api/.env`)
- `PORT=5000`
- `CLIENT_URL=http://localhost:5173`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `MONGODB_URI`

### Frontend (`apps/web/.env`)
- `VITE_API_URL=http://localhost:5000/api`

---

## Workspace Scripts

While you can run the apps individually from their directories, you can also use these workspace scripts from the root directory:

- `npm run dev:web` - run frontend only
- `npm run dev:api` - run backend only
- `npm run build` - build frontend
- `npm run test` - run frontend Vitest suite
- `npm run lint` - lint web + api
- `npm run format` - format repository

## Testing

```bash
npm run test -w apps/web
```

Includes unit tests and integration-style UI coverage in JavaScript.

## Mock Attachment Note

Attachments are demo-oriented and stored as local metadata in frontend persistence. Backend upload endpoint returns temporary metadata only and does not provide centralized file storage.
