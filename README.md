# LinkGator

LinkGator is a SolidJS project built with SolidStart, providing a modern web application with Supabase integration.

## Features

- SolidJS for reactive UI components
- Supabase backend integration for authentication and database
- TailwindCSS for styling
- Federated authentication

## Prerequisites

- Node.js v22 or higher
- pnpm package manager
- Supabase account and project setup

## Getting Started

### Installation

1. Clone the repository

```bash
git clone <your-repo-url>
cd LinkGator
```

2. Install dependencies using pnpm

```bash
pnpm install
```

### Environment Configuration

1. Copy the example environment file to create your local environment configuration:

```bash
cp .env.example .env
```

2. Edit the `.env` file and add your Supabase credentials and other configuration:

```
# Supabase Configuration
SUPABASE_URL=https://your-project-url.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
SUPABASE_CONNECTION_STRING=postgresql://postgres:password@localhost:5432/database

# Application Domain
DOMAIN=localhost:3000
```

**Important**: Never commit your `.env` file to version control. The `.env.example` file is provided as a template.

### Running the Development Server

Start the development server:

```bash
pnpm dev
```

Or start the server and open the app in a new browser tab:

```bash
pnpm dev -- --open
```

### Building for Production

Build the application for production:

```bash
pnpm build
```

This will generate a production-ready build optimized for deployment.

### Running the Production Build

Start the production server after building:

```bash
pnpm start
```

## Project Structure

- `src/` - Source code directory
  - `components/` - Reusable UI components
  - `middleware/` - API middleware functions
  - `models/` - Data models and schemas
  - `routes/` - Application routes and pages
  - `utils/` - Utility functions including Supabase configuration

## Technologies Used

- [SolidJS](https://www.solidjs.com/)
- [SolidStart](https://start.solidjs.com/)
- [Supabase](https://supabase.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vinxi](https://github.com/solidjs-community/vinxi)

## License

[MIT](LICENSE)
