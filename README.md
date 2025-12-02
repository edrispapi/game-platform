# Crimson Grid - Gaming Platform Frontend

A modern React frontend for the Crimson Grid gaming platform, designed to work with the FastAPI microservices backend.

## 🎮 Features

- **Digital Storefront**: Browse, search, and purchase games
- **Personal Game Library**: Manage your game collection
- **Social Hub**: Friends, chat, and notifications
- **User Profiles**: Customizable profiles with achievements
- **Workshop**: Community mods and content
- **Forums**: Game-specific discussions
- **Reviews**: Rate and review games

## 🛠 Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Radix UI** for accessible components
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Framer Motion** for animations

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- The FastAPI backend running (see `/home/user5/Game_platform`)

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Development

```bash
# Start the development server
npm run dev
# or
bun dev
```

The frontend will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env` file in the project root:

```env
# FastAPI Gateway URL
VITE_API_BASE_URL=http://localhost:13000
```

For local development without Docker:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### Build for Production

```bash
npm run build
# or
bun run build
```

The built files will be in the `dist/` directory.

## 🔗 Backend Integration

This frontend connects to the FastAPI microservices backend located at `/home/user5/Game_platform`.

### Starting the Backend

```bash
cd /home/user5/Game_platform
docker compose up --build
```

This starts:
- **API Gateway**: http://localhost:13000
- **PostgreSQL**: localhost:15432
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379
- **MinIO**: http://localhost:9000 (console: http://localhost:9001)

### API Endpoints

All API calls go through the gateway at `/api/v1/`:

| Service | Endpoint Prefix |
|---------|-----------------|
| Users | `/api/v1/users` |
| Games | `/api/v1/catalog` |
| Reviews | `/api/v1/reviews` |
| Shopping | `/api/v1/shopping` |
| Friends | `/api/v1/friends` |
| Social | `/api/v1/social` |
| Notifications | `/api/v1/notifications` |
| Achievements | `/api/v1/achievements` |
| Workshop | `/api/v1/workshop` |
| Online Status | `/api/v1/online` |
| Recommendations | `/api/v1/recommendations` |

## 📁 Project Structure

```
game-platform/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utilities and API client
│   └── stores/         # Zustand stores
├── public/             # Static assets
├── shared/             # Shared TypeScript types
└── database/           # Database schema (reference only)
```

## 🎨 Design System

The UI uses the "Crimson Void" aesthetic:
- Dark theme with crimson (#DC2626) accents
- Glassmorphism effects
- Smooth animations
- Responsive design

## 📝 License

Private project - All rights reserved.
