# LearnHub - Online Learning Platform

A comprehensive online learning platform built with React, TypeScript, and PostgreSQL.

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

### 2. Install dependencies

```bash
npm install
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

Copy the environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration if needed.

### 5. Start the development server

```bash
npm run dev
```

The application will be available at http://localhost:5173

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
src/
├── components/          # React components
├── contexts/           # React contexts (Auth, Cart)
├── pages/              # Page components
├── types/              # TypeScript type definitions
├── data/               # Mock data and constants
└── main.tsx           # Application entry point

database/
├── init/              # Database initialization scripts
└── ...

docker-compose.yml     # Docker services configuration
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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