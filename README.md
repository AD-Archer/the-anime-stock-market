# Anime stock trading app

_Automatically synced with your [v0.app](https://v0.app) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ad-archers-projects/v0-anime-stock-trading-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/qEVVIfOYcvT)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/ad-archers-projects/v0-anime-stock-trading-app](https://vercel.com/ad-archers-projects/v0-anime-stock-trading-app)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/qEVVIfOYcvT](https://v0.app/chat/qEVVIfOYcvT)**

## Local Development

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/the-anime-stock-market.git
   cd the-anime-stock-market
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker

### Build Locally

To build the Docker image locally:

```bash
docker build -t anime-stock-market .
```

### Run Locally

To run the application using Docker:

```bash
docker run -p 3000:3000 anime-stock-market
```

## Docker Compose

An example `docker-compose.yml` is provided to run the application using Docker Compose. It pulls the latest image from Docker Hub and supports environment variable configuration for future full-stack features.

1. Copy the environment example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to set any required environment variables (database URL, etc.).

3. Run the application:
   ```bash
   docker-compose up
   ```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Adding a Database

When you're ready to add a database, uncomment the database service in `docker-compose.yml` and update the `DATABASE_URL` in your `.env` file. The setup is modular and supports any database that can run in Docker.

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. The workflow automatically builds and pushes Docker images to Docker Hub on every push to the `main` branch.

### Setup

1. Create a Docker Hub account and repository.

2. Add the following secrets to your GitHub repository:

   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token (create one in Docker Hub settings)

3. The workflow will automatically trigger on pushes to `main` and pull requests.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
5. GitHub Actions builds and pushes Docker images to Docker Hub
6. Use Docker Compose to run the application locally or in production
