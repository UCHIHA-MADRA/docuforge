@echo off
echo 🚀 Setting up DocuForge development environment...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node -v') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node -v
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node -v

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Generate Prisma client
echo 🗄️  Generating Prisma client...
npx prisma generate

REM Create environment file if it doesn't exist
if not exist .env.local (
    echo 🔧 Creating .env.local file...
    (
        echo # Database
        echo DATABASE_URL="postgresql://username:password@localhost:5432/docuforge"
        echo.
        echo # NextAuth.js
        echo NEXTAUTH_SECRET="your-secret-key-here"
        echo NEXTAUTH_URL="http://localhost:3000"
        echo.
        echo # OAuth Providers ^(Google^)
        echo GOOGLE_CLIENT_ID="your-google-client-id"
        echo GOOGLE_CLIENT_SECRET="your-google-client-secret"
        echo.
        echo # File Storage ^(Supabase^)
        echo SUPABASE_URL="your-supabase-url"
        echo SUPABASE_ANON_KEY="your-supabase-anon-key"
        echo SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
        echo.
        echo # Real-time Collaboration
        echo REDIS_URL="redis://localhost:6379"
    ) > .env.local
    echo ⚠️  Please update .env.local with your actual credentials
)

echo.
echo 🎉 Setup complete! Next steps:
echo 1. Update .env.local with your credentials
echo 2. Set up your database ^(PostgreSQL or Supabase^)
echo 3. Configure Google OAuth credentials
echo 4. Run 'npm run dev' to start development server
echo.
echo 📚 For detailed setup instructions, see README.md
pause
