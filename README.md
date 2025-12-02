# Crimson Grid - Gaming Platform

A full-stack gaming platform with React frontend and FastAPI microservices backend.

## 🎮 Features

- **Digital Storefront**: Browse, search, and purchase games
- **Personal Game Library**: Manage your game collection
- **Social Hub**: Friends, chat, and notifications
- **User Profiles**: Customizable profiles with achievements
- **Workshop**: Community mods and content
- **Forums**: Game-specific discussions
- **Reviews**: Rate and review games

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **Radix UI** for accessible components
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Framer Motion** for animations

### Backend (FastAPI Microservices)
- **FastAPI** for all microservices
- **PostgreSQL** for relational data
- **MongoDB** for chat/friends
- **Redis** for caching and sessions
- **MinIO** for file storage
- **Docker Compose** for orchestration

## 📁 Project Structure

```
game-platform/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and API client
│   └── stores/             # Zustand stores
├── backend/                # FastAPI microservices
│   └── services/
│       ├── api-gateway/        # API Gateway (port 13000)
│       ├── user-service/       # User management (port 13001)
│       ├── game-catalog-service/ # Game catalog (port 13002)
│       ├── review-service/     # Reviews (port 13003)
│       ├── shopping-service/   # Shopping cart (port 13004)
│       ├── purchase-service/   # Purchases (port 13005)
│       ├── payment-service/    # Payments (port 13006)
│       ├── online-service/     # Online status (port 13007)
│       ├── social-service/     # Social features (port 13008)
│       ├── notification-service/ # Notifications (port 13009)
│       ├── recommendation-service/ # Recommendations (port 13010)
│       ├── achievement-service/ # Achievements (port 13011)
│       ├── monitoring-service/ # Monitoring (port 13012)
│       ├── friends-chat-service/ # Friends & Chat (port 13013)
│       └── workshop-service/   # Workshop (port 13014)
├── public/                 # Static assets
├── shared/                 # Shared TypeScript types
└── docker-compose.yml      # Docker orchestration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** or **Bun**
- **Docker** and **Docker Compose**
- **Python 3.11+** (for local development)

### Quick Start (Docker)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd game-platform
   ```

2. **Start all services**
   ```bash
   docker compose up --build
   ```

3. **Start the frontend** (in a new terminal)
   ```bash
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:13000
   - API Docs: http://localhost:13000/docs

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | React application |
| API Gateway | 13000 | Main API entry point |
| User Service | 13001 | User management |
| Game Catalog | 13002 | Game listings |
| Review Service | 13003 | Reviews & comments |
| Shopping Service | 13004 | Shopping cart |
| Purchase Service | 13005 | Order processing |
| Payment Service | 13006 | Payment handling |
| Online Service | 13007 | Online status |
| Social Service | 13008 | Friend requests |
| Notification Service | 13009 | Notifications |
| Recommendation Service | 13010 | Game recommendations |
| Achievement Service | 13011 | Achievements |
| Monitoring Service | 13012 | Health monitoring |
| Friends Chat Service | 13013 | Chat & friends |
| Workshop Service | 13014 | Workshop items |
| PostgreSQL | 15432 | Database |
| MongoDB | 27017 | Chat database |
| Redis | 6379 | Cache |
| MinIO | 9000/9001 | File storage |

### Environment Variables

Create a `.env` file in the project root:

```env
# Frontend
VITE_API_BASE_URL=http://localhost:13000

# For production
# VITE_API_BASE_URL=https://api.yourdomain.com
```

## 📖 API Documentation

Each microservice has its own Swagger documentation:

- Gateway: http://localhost:13000/docs
- User Service: http://localhost:13001/docs
- Game Catalog: http://localhost:13002/docs
- And so on...

### API Endpoints

All requests go through the API Gateway at `/api/v1/`:

| Endpoint | Service | Description |
|----------|---------|-------------|
| `/api/v1/users/*` | User Service | Authentication, profiles |
| `/api/v1/catalog/*` | Game Catalog | Games, genres, tags |
| `/api/v1/reviews/*` | Review Service | Game reviews |
| `/api/v1/shopping/*` | Shopping Service | Cart, wishlist |
| `/api/v1/purchases/*` | Purchase Service | Orders |
| `/api/v1/payments/*` | Payment Service | Transactions |
| `/api/v1/online/*` | Online Service | Status, presence |
| `/api/v1/social/*` | Social Service | Friends, follows |
| `/api/v1/notifications/*` | Notification Service | Alerts |
| `/api/v1/recommendations/*` | Recommendation Service | Suggestions |
| `/api/v1/achievements/*` | Achievement Service | Badges, XP |
| `/api/v1/friends/*` | Friends Chat Service | Chat, DMs |
| `/api/v1/workshop/*` | Workshop Service | Mods, items |

## 🔧 Development

### Frontend Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Development

```bash
# Start infrastructure only
docker compose up postgres redis mongo minio -d

# Run a specific service locally
cd backend/services/user-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Database Migrations

Each service uses Alembic for migrations:

```bash
cd backend/services/user-service
alembic upgrade head
```

## 🎨 Design System

The UI uses the "Crimson Void" aesthetic:
- Dark theme with crimson (#DC2626) accents
- Glassmorphism effects
- Smooth animations
- Responsive design

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests (per service)
cd backend/services/user-service
pytest
```

## 📦 Deployment

### Docker Production Build

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build frontend: `npm run build`
2. Serve `dist/` with any static host
3. Deploy backend services to your infrastructure
4. Configure environment variables
5. Set up reverse proxy (nginx/traefik)

## 📝 License

Private project - All rights reserved.
