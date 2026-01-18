# Docker Setup for UofTHacks 2026

This project includes Docker configuration for both development and production environments.

## Quick Start

### Development (Database Only)

Run only PostgreSQL in Docker while developing locally:

```bash
# Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# Run the app locally
pnpm install
pnpm dev
```

### Production (Full Stack)

Run the entire application in Docker:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop services
docker-compose down
```

## Configuration

### Environment Variables

**IMPORTANT:** Before running docker-compose, you must set up your environment variables:

1. Copy the environment template:
   ```bash
   cp env.template .env
   ```

2. Edit `.env` and fill in all required values:
   - `BETTER_AUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `BETTER_AUTH_GOOGLE_CLIENT_ID` & `BETTER_AUTH_GOOGLE_CLIENT_SECRET`: From Google Cloud Console
   - `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `NEXT_PUBLIC_S3_HOST`: Your AWS S3 credentials
   - `GOOGLE_GENERATIVE_AI_API_KEY`: From Google AI Studio
   - Microservice URLs: Update if needed (defaults should work if all services are in docker-compose)

3. The `.env` file is automatically loaded by docker-compose

### Database Connection

- **Local development**: `postgresql://postgres:postgres@localhost:5432/uofthacks`
- **Docker containers**: `postgresql://postgres:postgres@postgres:5432/uofthacks`

## Docker Commands

### Build the Image

```bash
docker build -t uofthacks-web .
```

### Run Production Container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e AUTH_SECRET="your_secret" \
  uofthacks-web
```

### Database Migrations

Run database migrations against the Dockerized database:

```bash
# Make sure postgres is running
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
pnpm db:push
# or
pnpm db:migrate
```

## Docker Compose Services

### docker-compose.yml (Production)
- `postgres`: PostgreSQL 16 database
- `web`: Next.js application

### docker-compose.dev.yml (Development)
- `postgres`: PostgreSQL 16 database only

## Troubleshooting

### Container won't start
- Check logs: `docker-compose logs web`
- Verify environment variables are set
- Ensure database is healthy: `docker-compose ps`

### Environment variables not registered
If you get errors about missing environment variables:
1. Make sure you created the `.env` file: `cp env.template .env`
2. Fill in ALL required variables in the `.env` file
3. Restart the containers: `docker-compose down && docker-compose up -d`
4. Verify the .env file is in the same directory as docker-compose.yml
5. Check that variables are loaded: `docker-compose config` (shows resolved config)

### Database connection failed
- Wait for database health check to pass
- Verify DATABASE_URL is correct
- Check if postgres container is running: `docker-compose ps postgres`

### Build errors
- Clear Docker cache: `docker system prune -a`
- Rebuild without cache: `docker-compose build --no-cache`

### Port already in use
- Change port mapping in `docker-compose.yml`
- Kill process using the port: `lsof -ti:3000 | xargs kill` (macOS/Linux)

## Production Deployment

For production deployment:

1. Set proper environment variables (never commit secrets!)
2. Use a managed PostgreSQL service instead of containerized database
3. Configure proper networking and security groups
4. Set up SSL/TLS certificates
5. Configure health checks and monitoring
6. Use container orchestration (Kubernetes, ECS, etc.) for scaling

## Architecture

This setup uses Next.js standalone output mode, which:
- Reduces Docker image size significantly
- Only includes necessary files for production
- Eliminates need for full `node_modules` in production
- Provides faster container startup times

The Dockerfile uses multi-stage builds:
1. **deps**: Install dependencies
2. **builder**: Build the application
3. **runner**: Run the minimal standalone server

## Notes

- The `SKIP_ENV_VALIDATION=1` flag is set during Docker build to skip env validation
- Static files (`public/` and `.next/static/`) are copied separately for CDN-like serving
- The application runs as a non-root user (`nextjs`) for security
- pnpm is used as the package manager (matching your project configuration)
