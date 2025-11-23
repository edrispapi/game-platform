# Crimson Grid: The Ultimate Gaming Nexus

Crimson Grid is a sophisticated, feature-rich digital platform designed to be the central hub for gamers. It combines a digital game storefront, a personal game library, and comprehensive social features into a single, visually stunning interface. The platform is built with a 'Crimson Void' aesthetic, featuring a dark, tech-noir theme with striking crimson accents, creating an immersive and modern gaming environment.

## Key Features

-   **Digital Storefront**: Discover, browse, and purchase games in a dynamic marketplace featuring carousels, search, and detailed game pages.
-   **Personal Game Library**: Manage your collection of owned games, track playtime, and get quick-launch access.
-   **Comprehensive Social Hub**: A complete social system with friends lists, real-time chat, and notifications to foster community interaction.
-   **Customizable User Profiles**: Showcase your achievements, game statistics, and friends with a personalized profile.
-   **Stunning 'Crimson Void' Aesthetic**: A modern, dark, tech-noir theme with glowing crimson accents for an immersive experience.
-   **Secure Authentication**: Visually engaging login and registration pages with particle effects.

## Technology Stack

-   **Frontend**: React, Vite, React Router, Tailwind CSS
-   **UI Components**: shadcn/ui, Lucide React
-   **State Management**: Zustand, TanStack React Query
-   **Animations**: Framer Motion
-   **Backend**: Cloudflare Workers, Hono
-   **Database**: Cloudflare D1 (via Durable Objects)
-   **Language**: TypeScript

## Getting Started

Follow these instructions to get a local copy of the project up and running for development and testing purposes.

### Prerequisites

-   [Bun](https://bun.sh/) installed on your machine.
-   [Git](https://git-scm.com/) for version control.
-   A Cloudflare account and the `wrangler` CLI installed and configured.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd crimson-grid
    ```

2.  **Install dependencies:**
    This project uses Bun as the package manager.
    ```bash
    bun install
    ```

3.  **Run the development server:**
    This command starts the Vite frontend development server and the Hono backend worker simultaneously.
    ```bash
    bun dev
    ```
    The application will be available at `http://localhost:3000`.

## Project Structure

The project is organized into three main directories:

-   `src/`: Contains the frontend React application, including pages, components, hooks, and utility functions.
-   `worker/`: Contains the Cloudflare Worker backend code, built with Hono. This is where API routes and business logic reside.
-   `shared/`: Contains shared types and data structures used by both the frontend and the backend to ensure type safety.

## Development

### Frontend

The frontend is a standard React (Vite) application. You can create new pages in `src/pages` and components in `src/components`. Communication with the backend is handled through the API client located at `src/lib/api-client.ts`.

### Backend

The backend is a Hono application running on Cloudflare Workers. API endpoints are defined in `worker/user-routes.ts`. Data persistence is managed through a single `GlobalDurableObject` which provides a KV-like storage interface for different data entities.

To add a new API endpoint:
1.  Define your entity logic in `worker/entities.ts`.
2.  Add the new route handler in `worker/user-routes.ts` using the Hono app instance.

## Deployment

This project is configured for seamless deployment to Cloudflare Pages.

1.  **Build the project:**
    This command bundles the frontend application and prepares the worker for deployment.
    ```bash
    bun build
    ```

2.  **Deploy to Cloudflare:**
    Run the deploy script, which uses Wrangler to publish your application.
    ```bash
    bun deploy
    ```

Alternatively, you can connect your GitHub repository to Cloudflare Pages for automatic deployments on every push.
