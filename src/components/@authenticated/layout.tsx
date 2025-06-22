import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatInterface } from '@/components/layout/ChatInterface';
import { AuthenticatedIndex } from './index';
import { JobDescriptionOutput } from '@/components/jd/JobDescriptionOutput';
import { AIFallbackNotification } from '@/components/jd/AIFallbackNotification';
import { supabase } from '@/lib/supabase';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { retryAIGeneration } from '@/lib/jobDescriptionService';

interface AuthenticatedLayoutProps {
  user: any;
}

export function AuthenticatedLayout({ user }: AuthenticatedLayoutProps) {
  const [currentPage, setCurrentPage] = useState('workspace');
  const [mainContent, setMainContent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isRetryingAI, setIsRetryingAI] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Try to get existing profile
        const { data: existingProfile, error: profileError } = await supabase
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
          content: 'Job management dashboard'
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

  const handleJobSave = async (jobData: any) => {
    console.log('Saving job data:', jobData);
    // TODO: Implement job saving logic
  };

  const handleJobPublish = async (jobData: any) => {
    console.log('Publishing job data:', jobData);
    // TODO: Implement job publishing logic
  };

  // Handle AI fallback retry
  const handleRetryAI = async () => {
    if (!mainContent?.data?.draftId) {
      toast.error('No draft available to retry');
      return;
    }
    
    setIsRetryingAI(true);
    
    try {
      console.log('🔄 Retrying AI generation for draft:', mainContent.data.draftId);
      
      // Attempt to retry AI generation
      const generatedJD = await retryAIGeneration(mainContent.data.draftId);
      
      // Parse the generated JD into structured data
      const { parseJobDescription } = await import('@/lib/jobDescriptionParser');
      const parsedJobData = parseJobDescription(generatedJD);
      
      // Update content to show successful generation
      setMainContent({
        type: 'job-description',
        title: 'Generated Job Description',
        content: 'AI-generated job description ready for review',
        data: parsedJobData,
        draftId: mainContent.data.draftId
      });
      
      toast.success('Job description generated successfully!');
      
    } catch (error) {
      console.error('Retry failed:', error);
      
      // Check if it's still a rate limit error
      if (error instanceof Error && error.message === 'RATE_LIMIT_FALLBACK') {
        toast.error('AI is still busy. Please try again in a few minutes.');
      } else {
        toast.error('AI generation failed. Please try again later.');
      }
    } finally {
      setIsRetryingAI(false);
    }
  };

  // Handle continue manually
  const handleContinueManually = () => {
    // Switch to manual editing mode
    setMainContent({
      type: 'job-description-manual',
      title: 'Manual Job Description Editor',
      content: 'Continue drafting your job description manually',
      data: {
        ...mainContent.data,
        manualMode: true,
        title: 'Manual Job Description',
        summary: 'Start drafting your job description manually...',
        sections: [
          {
            id: 'overview',
            title: 'Role Overview',
            content: 'Describe the role and its mission alignment...',
            isLocked: false,
            isEditing: true
          },
          {
            id: 'responsibilities',
            title: 'Key Responsibilities',
            content: 'List the main duties and responsibilities...',
            isLocked: false,
            isEditing: false
          },
          {
            id: 'qualifications',
            title: 'Qualifications & Experience',
            content: 'Specify required and preferred qualifications...',
            isLocked: false,
            isEditing: false
          }
        ],
        organization: 'Your Organization',
        location: 'Location',
        contractType: 'Full-Time',
        clarityScore: 75,
        readingLevel: 'College',
        deiScore: 80,
        jargonWarnings: [],
        sector: ['Development'],
        sdgs: ['SDG 8']
      }
    });
    
    toast.info('Switched to manual editing mode');
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
              <ChatInterface onContentChange={handleContentChange} profile={profile} />
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
                <div className="h-full flex flex-col">
                  {/* AI Fallback Notification */}
                  {mainContent.type === 'ai-fallback' && (
                    <div className="p-6 pb-0">
                      <AIFallbackNotification
                        onRetry={handleRetryAI}
                        onContinueManually={handleContinueManually}
                        isRetrying={isRetryingAI}
                        message={mainContent.data?.message}
                      />
                    </div>
                  )}
                  
                  {/* Main Content */}
                  <div className="flex-1 overflow-hidden">
                    {mainContent.type === 'job-description' || mainContent.type === 'job-description-manual' ? (
                      <JobDescriptionOutput
                        jobData={mainContent.data}
                        onSave={handleJobSave}
                        onPublish={handleJobPublish}
                      />
                    ) : mainContent.type === 'ai-fallback' ? (
                      <div className="h-full flex items-center justify-center p-6">
                        <div className="text-center max-w-md">
                          <h2 
                            className="text-xl font-medium mb-4"
                            style={{ color: '#3A3936' }}
                          >
                            Ready to Continue
                          </h2>
                          <p 
                            className="text-sm font-light leading-relaxed"
                            style={{ color: '#66615C' }}
                          >
                            Your job brief is safely saved. You can retry AI generation when it's back online, or start drafting manually right away.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <MainContentRenderer content={mainContent} />
                    )}
                  </div>
                </div>
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