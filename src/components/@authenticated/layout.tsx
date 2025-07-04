import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/layout/ChatInterface';
import { AuthenticatedIndex } from './index';
import { JobDescriptionEditor } from './JobDescriptionEditor';
import { MyJobsDashboard } from './jobs/MyJobsDashboard';
import { supabase } from '@/lib/supabase';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface AuthenticatedLayoutProps {
  user: any;
}

export function AuthenticatedLayout({ user }: AuthenticatedLayoutProps) {
  const [currentPage, setCurrentPage] = useState('workspace');
  const [mainContent, setMainContent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Try to get existing profile
        const { data: existingProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (existingProfile) {
          // Map database fields to expected format
          setProfile({
            ...existingProfile,
            name: existingProfile.full_name || existingProfile.email?.split('@')[0] || 'User'
          });
          return;
        }

        // Create profile if it doesn't exist
        const newUserData = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || 
                    user.user_metadata?.name || 
                    user.email?.split('@')[0] || 
                    'User',
          avatar_url: user.user_metadata?.avatar_url || null
        };

        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .upsert(newUserData, { onConflict: 'id' })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          // Use fallback profile
          setProfile({
            ...newUserData,
            name: newUserData.full_name
          });
        } else {
          setProfile({
            ...newProfile,
            name: newProfile.full_name || newProfile.email?.split('@')[0] || 'User'
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        // Use fallback profile
        setProfile({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User'
        });
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    
    // Update main content based on navigation
    switch (page) {
      case 'workspace':
        setMainContent(null); // Show default welcome page
        break;
      case 'documents':
        setMainContent({
          type: 'documents',
          title: 'My Documents',
          content: 'Document management system'
        });
        break;
      case 'matches':
        setMainContent({
          type: 'matches',
          title: 'My Matches',
          content: 'AI-powered matching system'
        });
        break;
      case 'jobs':
        setMainContent({
          type: 'jobs',
          title: 'My Jobs',
          content: 'Job management dashboard',
          subType: 'all'
        });
        break;
      case 'jobs-active':
        setMainContent({
          type: 'jobs',
          title: 'Active Jobs',
          content: 'Manage your published job postings',
          subType: 'active'
        });
        break;
      case 'jobs-archived':
        setMainContent({
          type: 'jobs',
          title: 'Archived Jobs',
          content: 'View your archived job postings',
          subType: 'archived'
        });
        break;
      case 'jobs-drafts':
        setMainContent({
          type: 'jobs',
          title: 'Job Drafts',
          content: 'Continue working on your draft job postings',
          subType: 'drafts'
        });
        break;
      case 'notifications':
        setMainContent({
          type: 'notifications',
          title: 'Notifications',
          content: 'AI alerts and insights'
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
    <div className="h-screen w-screen flex overflow-hidden" style={{ backgroundColor: '#F9F7F4' }}>
      {/* Sidebar - Start closed by default */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={handleNavigate}
        profile={profile}
        defaultCollapsed={true} // Start with sidebar closed
      />

      {/* Resizable Main Content Area */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Chat Interface Panel - Increased width by 15% (from ~320px to ~368px) */}
          <ResizablePanel 
            defaultSize={35} // Increased from ~30% to 35% (15% increase)
            minSize={25}
            maxSize={50}
            className="min-w-0"
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ChatInterface 
                onContentChange={handleContentChange} 
                profile={profile} 
              />
            </motion.div>
          </ResizablePanel>

          {/* Custom Resize Handle with Terracotta Icon */}
          <ResizableHandle className="relative group">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 flex items-center">
              <div 
                className="p-1 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                style={{ backgroundColor: '#FBE4D5' }}
              >
                <GripVertical 
                  className="w-3 h-3"
                  style={{ color: '#D5765B' }}
                />
              </div>
            </div>
          </ResizableHandle>

          {/* Main Content Panel */}
          <ResizablePanel 
            defaultSize={65} // Adjusted to complement chat panel
            minSize={50}
            className="min-w-0"
          >
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="h-full overflow-hidden"
              style={{ backgroundColor: '#FFFFFF' }}
            >
              {mainContent ? (
                mainContent.type === 'job-description-editor' ? (
                  <JobDescriptionEditor 
                    draftId={mainContent.draftId}
                    profile={profile}
                    onClose={() => setMainContent(null)}
                  />
                ) : mainContent.type === 'jobs' ? (
                  <MyJobsDashboard 
                    profile={profile}
                    subType={mainContent.subType}
                  />
                ) : (
                  <MainContentRenderer content={mainContent} />
                )
              ) : (
                <AuthenticatedIndex profile={profile} />
              )}
            </motion.div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

// Component to render different content types
function MainContentRenderer({ content }: { content: any }) {
  return (
    <div className="h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto p-6"
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