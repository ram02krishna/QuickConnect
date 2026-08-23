# QuickConnect - Connect Beyond Boundaries

QuickConnect is a full-stack real-time chat application designed to provide seamless and instant communication. Built with a modern tech stack and a beautifully crafted UI using a cohesive **blue color theme**, QuickConnect delivers a premium user experience featuring secure authentication, rich media sharing, peer-to-peer calling, and real-time messaging.

---

## Key Features

### Core Messaging
- **Real-Time Communication:** Instant message delivery using WebSockets (`Socket.io`) with active typing indicators.
- **Direct & Group Chats:** Support for one-on-one conversations and fully-featured group chats managed by the group creator.
- **Rich Media Sharing:** Share images, videos, audio clips, and files seamlessly via Cloudinary integration.

### Advanced Communication
- **Voice & Video Calls:** Crystal-clear, peer-to-peer audio and video calling powered by `WebRTC`.
- **User Presence:** Real-time online/offline status tracking, showing exactly when contacts are active.
- **Unified Blue Theme**: Consistent layout matching bluish brand logos, with instant and fluid transitions without layout spinners.

### Privacy & Security
- **Secure Authentication**: Robust JWT-based authentication using generic security tokens.
- **Email Verification**: Ensure account authenticity via custom verification codes (powered by `Resend` & `Redis`).
- **Data Protection**: Deterministic encryption for user emails, keeping identity searchable but secure in PostgreSQL.

---

## Tech Stack

### Frontend (Client)
- **Framework:** Next.js (v15) & React (v19)
- **Styling:** Tailwind CSS (v4)
- **State Management:** Zustand (Global Store) & React Query (Data Fetching/Caching)
- **UI Components:** Radix UI & Lucide React
- **Real-Time & Calls:** Socket.io-client, WebRTC

### Backend (Server)
- **Framework:** Node.js, Express.js (TypeScript)
- **Real-Time Engine:** Socket.io
- **ORM & Database:** Prisma ORM with PostgreSQL
- **Caching & Pub/Sub:** Redis (@upstash/redis)
- **Authentication:** JWT, Argon2 password hashing
- **Security:** Helmet, express-rate-limit

---

## Project Structure

```text
QuickConnect/
├── client/                 # Next.js frontend application
│   ├── app/                # Next.js App Router layout and pages
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── package.json        # Frontend dependencies
│
├── server/                 # Express.js backend application
│   ├── src/                # Backend source code (Controllers, Routes, Middlewares, Sockets, Services)
│   ├── prisma/             # Database schema and seed data
│   └── package.json        # Backend dependencies
│
└── README.md               # Project documentation
```

## Getting Started

Follow these instructions to set up the project locally.

### Prerequisites
- Node.js (v20.0.0 or higher)
- npm, yarn, or pnpm
- PostgreSQL Database
- Redis Instance (or Upstash account)
- Cloudinary Account (for media uploads)

### 1. Clone the repository
```bash
git clone https://github.com/ram02krishna/Orbix---Connect-Beyond-Boundaries.git
cd QuickConnect
```

### 2. Backend Setup
1. Navigate to the server directory and install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your credentials:
   - `DATABASE_URL` (PostgreSQL connection string)
   - `JWT_SECRET` (JWT signing key)
   - `COOKIE_SECRET` (Cookie signing secret)
   - Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
   - Redis credentials (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)
   - Email credentials (`RESEND_API_KEY`, `EMAIL_FROM`)
   - Rate limiting options (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`)
4. Initialize the database schema:
   ```bash
   npm run db:generate
   npm run db:push
   ```
5. Start the backend dev server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the client directory:
   ```bash
   cd ../client
   npm install
   ```
2. Configure environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
3. Edit `.env.local` to point to your backend API URL and WebSocket URL:
   - `NEXT_PUBLIC_API_URL` (e.g., `http://localhost:5000/api`)
   - `NEXT_PUBLIC_WS_URL` (e.g., `http://localhost:5000`)
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

The client will be running on `http://localhost:3000` and the server on `http://localhost:5000`.

---
