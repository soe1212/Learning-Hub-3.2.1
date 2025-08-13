# LearnHub - Next.js + NestJS Learning Platform

A comprehensive online learning platform built with Next.js, NestJS, TypeScript, and PostgreSQL.

## Features

- User authentication and authorization
- Course management and enrollment
- Video-based learning with progress tracking
- Shopping cart and checkout system
- User dashboard and profile management
- Instructor tools and course creation
- Mobile-responsive design

## Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd learnhub
```

### 2. Install all dependencies

```bash
npm run install:all
```

### 3. Set up the database

Start the PostgreSQL database using Docker Compose:

```bash
docker-compose up -d postgres
```

This will:
- Create a PostgreSQL container with the database
- Run initialization scripts to create tables and seed data
- Start Adminer (database admin tool) at http://localhost:8080

### 4. Environment setup

Copy the environment files and configure them:

```bash
cp frontend/.env.local.example frontend/.env.local
cp backend/.env.example backend/.env
```

Edit the environment files with your configuration if needed.

### 5. Start the development servers

```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Documentation: http://localhost:3001/api/docs

## Database Management

### Access the database

You can access the database using Adminer at http://localhost:8080

**Connection details:**
- System: PostgreSQL
- Server: postgres
- Username: learnhub_user
- Password: learnhub_password
- Database: learnhub

### Sample accounts

The database is seeded with sample accounts:

- **Admin**: admin@learnhub.com / admin123
- **Instructor**: instructor@learnhub.com / instructor123
- **Student**: student@learnhub.com / student123
- **Demo**: demo@learnhub.com / demo123

### Database commands

```bash
# Start database
docker-compose up -d postgres

# Stop database
docker-compose down

# View logs
docker-compose logs postgres

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d postgres
```

## Project Structure

```
frontend/
├── app/                # Next.js app directory
├── components/         # React components
├── lib/               # Utilities and contexts
├── types/             # TypeScript type definitions
└── public/            # Static assets

backend/
├── src/
│   ├── auth/          # Authentication module
│   ├── users/         # User management
│   ├── courses/       # Course management
│   ├── enrollment/    # Enrollment system
│   └── ...           # Other modules
└── dist/             # Compiled JavaScript

database/
├── init/              # Database initialization scripts
└── ...

docker-compose.yml     # Docker services configuration
```

## Development

### Available Scripts

- `npm run dev` - Start both frontend and backend development servers
- `npm run dev:frontend` - Start only frontend development server
- `npm run dev:backend` - Start only backend development server
- `npm run build` - Build both frontend and backend for production
- `npm run install:all` - Install dependencies for all projects
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data

### Database Schema

The database includes tables for:
- User authentication and profiles
- Course management
- Enrollment and progress tracking
- Shopping cart and orders
- Reviews and ratings

## Production Deployment

1. Set up a production PostgreSQL database
2. Update environment variables for production
3. Build the application: `npm run build`
4. Deploy the built files to your hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.