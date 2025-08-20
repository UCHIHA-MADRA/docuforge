# DocuForge - Professional Document Management Platform

A comprehensive SaaS platform for document management, PDF processing, and real-time collaboration built with Next.js, TypeScript, and modern web technologies.

## 🚀 Features

### Core Features

- **Document Management**: Create, edit, and organize documents with version control
- **PDF Processing**: Advanced PDF tools including merge, split, compress, and edit
- **Real-time Collaboration**: Live editing with sub-100ms latency using WebSockets
- **File Management**: Secure file upload, storage, and organization
- **Team Workspaces**: Multi-user collaboration with role-based permissions
- **Rich Text Editor**: Professional document creation with collaborative editing

### Advanced Features

- **Authentication**: Secure OAuth integration with Google
- **File Security**: Malware scanning, type validation, and access controls
- **Performance**: Optimized for speed with CDN and intelligent caching
- **Mobile Responsive**: Full functionality on all devices
- **API Access**: RESTful API for integrations and automation

## 🛠 Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Radix UI** - Accessible component primitives

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Reliable relational database
- **NextAuth.js** - Authentication framework

### Real-time & Processing

- **Y.js** - Conflict-free replicated data types
- **WebSockets** - Real-time communication
- **PDF-lib** - PDF manipulation library
- **Sharp** - High-performance image processing

### Infrastructure

- **Vercel** - Frontend deployment
- **Supabase** - Database and file storage
- **Redis** - Caching and session storage

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **PostgreSQL** database (or Supabase account)
- **Google OAuth** credentials
- **Git** for version control

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd docuforge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/docuforge"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# File Storage
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Real-time Collaboration
REDIS_URL="redis://localhost:6379"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database with sample data
npx prisma db seed
```

### 5. Start Collaboration Server (Required for Real-time Features)

```bash
# Option 1: Using npm script
npm run collaboration:dev

# Option 2: Using the provided scripts
# Windows: scripts/start-collaboration.bat
# Unix/Mac: scripts/start-collaboration.sh

# Option 3: Manual start
npx tsx src/lib/collaboration-server.ts
```

**Important**: The collaboration server must be running on port 3001 for real-time features to work.

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗 Project Structure

```
docuforge/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── users/         # User management
│   │   │   ├── documents/     # Document CRUD
│   │   │   └── files/         # File management
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main dashboard
│   │   └── globals.css        # Global styles
│   ├── components/            # Reusable components
│   │   └── ui/               # UI component library
│   └── lib/                  # Utility functions
│       ├── prisma.ts         # Database client
│       ├── auth-context.tsx  # Authentication context
│       └── utils.ts          # Helper functions
├── prisma/                   # Database schema and migrations
├── public/                   # Static assets
└── package.json             # Dependencies and scripts
```

## 🔄 Real-time Collaboration

DocuForge includes a powerful real-time collaboration system built with Y.js and WebSockets.

### Features

- **Live Editing**: Multiple users can edit documents simultaneously
- **User Presence**: See who's currently editing with real-time cursors
- **Conflict Resolution**: Automatic conflict resolution using CRDTs
- **Low Latency**: Sub-100ms synchronization for seamless collaboration
- **Offline Support**: Continue editing offline, sync when reconnected
- **Version Control**: Track changes and maintain document history

### Architecture

- **Y.js**: Conflict-free replicated data types for document synchronization
- **WebSocket Server**: Custom WebSocket server for real-time communication
- **Tiptap Editor**: Rich text editor with collaboration extensions
- **User Awareness**: Real-time user presence and cursor tracking

### Getting Started with Collaboration

1. **Start the collaboration server** (see Quick Start section)
2. **Navigate to `/collaborate`** in your browser
3. **Create a new document** or open an existing one
4. **Share the document** with team members
5. **Start collaborating** in real-time!

### Technical Details

- **WebSocket Port**: 3001 (configurable via `COLLABORATION_PORT`)
- **Protocol**: Custom WebSocket protocol with Y.js integration
- **Scalability**: Supports multiple concurrent sessions and users
- **Security**: User authentication and session management

## 🔐 Authentication Setup

### Google OAuth Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Environment Variables

```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## 🗄 Database Schema

The application uses a comprehensive database schema with the following main entities:

- **Users**: Authentication and profile information
- **Documents**: Document content and metadata
- **Files**: File storage and management
- **Organizations**: Team and workspace management
- **Comments**: Collaborative feedback system
- **Shares**: Access control and permissions

## 📱 Key Components

### Authentication System

- OAuth integration with Google
- JWT-based sessions
- Role-based access control
- Secure password handling

### Document Editor

- Rich text editing with Tiptap
- Real-time collaboration
- Version control and history
- Export to multiple formats

### File Management

- Drag-and-drop uploads
- File type validation
- Secure storage with Supabase
- Thumbnail generation

### PDF Processing

- Merge multiple PDFs
- Split PDFs by pages
- Compress large files
- Add watermarks and annotations

## 🚀 Deployment

### Frontend (Vercel)

```bash
npm install -g vercel
vercel --prod
```

### Backend (Railway/Render)

- Connect your GitHub repository
- Set environment variables
- Deploy automatically on push

### Database (Supabase)

- Create new project
- Get connection string
- Update environment variables

## 🧪 Testing

### Run Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test Coverage

```bash
npm run test:coverage
```

## 📊 Performance Monitoring

### Core Web Vitals

- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

### API Performance

- **Response Time**: < 500ms
- **Uptime**: 99.9%
- **Error Rate**: < 0.1%

## 🔒 Security Features

- **Input Validation**: Zod schema validation
- **File Security**: Malware scanning and type validation
- **Authentication**: Secure OAuth flow
- **Authorization**: Role-based access control
- **Data Encryption**: End-to-end encryption
- **HTTPS**: SSL/TLS encryption

## 📈 Scaling Considerations

### Database

- Connection pooling
- Read replicas
- Proper indexing
- Query optimization

### File Storage

- CDN distribution
- Multiple regions
- Backup strategies
- Compression

### Real-time Features

- WebSocket clustering
- Redis pub/sub
- Load balancing
- Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests
- Use conventional commits
- Maintain code quality standards

## 📚 Learning Resources

### Essential Skills

- **JavaScript/TypeScript**: Modern ES6+ features
- **React/Next.js**: Component patterns and hooks
- **Database Design**: Normalization and relationships
- **WebSockets**: Real-time communication
- **PDF Processing**: File manipulation libraries

### Recommended Courses

- [Next.js Learn](https://nextjs.org/learn)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Y.js Tutorials](https://docs.yjs.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🎯 Roadmap

### Phase 1 (Months 1-3)

- [x] Basic authentication
- [x] Document management
- [x] File upload system
- [x] PDF processing tools

### Phase 2 (Months 4-6)

- [ ] Real-time collaboration
- [ ] Advanced PDF features
- [ ] Team workspaces
- [ ] API development

### Phase 3 (Months 7-9)

- [ ] Mobile application
- [ ] AI-powered features
- [ ] Enterprise security
- [ ] Advanced analytics

### Phase 4 (Months 10-12)

- [ ] Multi-region deployment
- [ ] Advanced integrations
- [ ] Compliance certifications
- [ ] Enterprise features

## 📞 Support

- **Documentation**: [docs.docuforge.com](https://docs.docuforge.com)
- **Community**: [community.docuforge.com](https://community.docuforge.com)
- **Email**: support@docuforge.com
- **GitHub Issues**: [Report bugs](https://github.com/your-org/docuforge/issues)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Y.js team for collaborative editing
- Tailwind CSS for the utility-first approach
- All contributors and community members

---

**Built with ❤️ by the DocuForge Team**

_Transform how your team works with documents._
