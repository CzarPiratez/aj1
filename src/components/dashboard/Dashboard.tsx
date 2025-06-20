import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/layout/ChatInterface';
import { AuthenticatedIndex } from '@/components/@authenticated';

export function Dashboard() {
  const [currentPage, setCurrentPage] = useState('workspace');
  const [mainContent, setMainContent] = useState<any>(null);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    
    // Update main content based on navigation
    switch (page) {
      case 'documents':
        setMainContent({
          type: 'documents',
          title: 'My Documents',
          content: 'Document management and organization'
        });
        break;
      case 'matches':
        setMainContent({
          type: 'matches',
          title: 'Smart Matches',
          content: 'AI-powered candidate matching system'
        });
        break;
      case 'jobs':
        setMainContent({
          type: 'jobs',
          title: 'My Jobs',
          content: 'Job management dashboard'
        });
        break;
      case 'notifications':
        setMainContent({
          type: 'notifications',
          title: 'Notifications',
          content: 'AI alerts and recruitment insights'
        });
        break;
      case 'subscriptions':
        setMainContent({
          type: 'subscriptions',
          title: 'Subscriptions',
          content: 'Manage your AidJobs subscription'
        });
        break;
      case 'settings':
        setMainContent({
          type: 'settings',
          title: 'Settings',
          content: 'Profile and preferences'
        });
        break;
      case 'admin':
        setMainContent({
          type: 'admin',
          title: 'Admin Panel',
          content: 'System administration'
        });
        break;
      default:
        setMainContent(null);
    }
  };

  const handleContentChange = (content: any) => {
    setMainContent(content);
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: '#F9F7F4' }}>
      {/* Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0">
        {/* Chat Interface */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full lg:w-96 flex-shrink-0"
        >
          <ChatInterface onContentChange={handleContentChange} />
        </motion.div>

        {/* Dynamic Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex-1 min-w-0"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          {mainContent ? (
            <MainContentRenderer content={mainContent} />
          ) : (
            <AuthenticatedIndex />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Component to render different content types
function MainContentRenderer({ content }: { content: any }) {
  return (
    <div className="p-8 h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-light mb-4"
            style={{ color: '#3A3936' }}
          >
            {content.title}
          </h1>
          <p 
            className="text-lg font-light"
            style={{ color: '#66615C' }}
          >
            {content.content}
          </p>
        </div>

        <div 
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: '#F1EFEC' }}
        >
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: '#FBE4D5' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              ⚙️
            </motion.div>
          </div>
          <h3 
            className="text-xl font-normal mb-4"
            style={{ color: '#3A3936' }}
          >
            Coming Soon
          </h3>
          <p 
            className="font-light mb-6"
            style={{ color: '#66615C' }}
          >
            This feature is currently in development. We're building something amazing for you!
          </p>
        </div>
      </motion.div>
    </div>
  );
}