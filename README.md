# AidJobs Platform

AI-powered nonprofit recruitment platform connecting talent with purpose.

![AidJobs Platform](https://via.placeholder.com/800x400/D5765B/FFFFFF?text=AidJobs+Platform)

## 🌟 Features

- **AI-Powered Matching**: Connect candidates with nonprofit opportunities using advanced AI
- **Smart Document Analysis**: Parse and analyze CVs and job descriptions intelligently
- **Intelligent Workspace**: Chat-based interface for recruitment tasks
- **Secure Authentication**: Email/password authentication with Supabase
- **Responsive Design**: Beautiful, production-ready interface
- **Real-time Updates**: Live notifications and insights

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 8+
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/aidjobs-platform.git
   cd aidjobs-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Database setup**
   - Create a new Supabase project
   - Run the migrations in `supabase/migrations/` in order
   - Enable authentication in your Supabase dashboard

5. **Start development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:5173` to see the application.

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + ShadCN UI
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **State Management**: React Hooks + Context

## 📁 Project Structure

```
src/
├── components/
│   ├── @authenticated/     # Authenticated user components
│   ├── landing/           # Landing page components
│   ├── layout/            # Layout components (Sidebar, Chat, etc.)
│   └── ui/               # Reusable UI components (ShadCN)
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
└── main.tsx             # Application entry point

supabase/
└── migrations/          # Database schema migrations
```

## 🎨 Design System

The application uses a carefully crafted design system:

- **Primary Color**: `#D5765B` (Terracotta)
- **Background**: `#F9F7F4` (Warm White)
- **Text Primary**: `#3A3936` (Dark Gray)
- **Text Secondary**: `#66615C` (Medium Gray)
- **Borders**: `#D8D5D2` (Light Gray)

## 🚀 Deployment

### Netlify (Recommended)
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard

### Vercel
1. Connect your GitHub repository to Vercel
2. Framework preset: Vite
3. Add environment variables in Vercel dashboard

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@aidjobs.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/aidjobs-platform/issues)
- 📖 Documentation: [Wiki](https://github.com/your-username/aidjobs-platform/wiki)

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- UI components from [ShadCN UI](https://ui.shadcn.com/)
- Backend powered by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)

---

Made with ❤️ for the nonprofit sector