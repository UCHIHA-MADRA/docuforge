#!/bin/bash

echo "🚀 Setting up DocuForge development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "🔧 Creating .env.local file..."
    cat > .env.local << EOL
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/docuforge"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (Google)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# File Storage (Supabase)
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Real-time Collaboration
REDIS_URL="redis://localhost:6379"
EOL
    echo "⚠️  Please update .env.local with your actual credentials"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Update .env.local with your credentials"
echo "2. Set up your database (PostgreSQL or Supabase)"
echo "3. Configure Google OAuth credentials"
echo "4. Run 'npm run dev' to start development server"
echo ""
echo "📚 For detailed setup instructions, see README.md"
