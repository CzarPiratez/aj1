import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare,
  FileText,
  Sparkles,
  Briefcase,
  Bell,
  BadgeCheck,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bug,
  ChevronDown,
  Archive,
  Edit3,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AuthDebugModal } from '@/components/auth/AuthDebugModal';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  profile?: any;
  defaultCollapsed?: boolean;
}

const menuItems = [
  { 
    id: 'workspace', 
    label: 'Workspace', 
    icon: MessageSquare,
    tooltip: 'AI-powered workspace for CVs, jobs, and prompts'
  },
  { 
    id: 'documents', 
    label: 'My Documents', 
    icon: FileText,
    tooltip: 'Your CVs, cover letters, org profiles & JDs'
  },
  { 
    id: 'matches', 
    label: 'My Matches', 
    icon: Sparkles,
    tooltip: 'Job matches for you, or candidate matches for your jobs'
  },
  { 
    id: 'jobs', 
    label: 'My Jobs', 
    icon: Briefcase,
    tooltip: 'Jobs you\'ve posted or applied to',
    subItems: [
      { id: 'jobs-active', label: 'Active Jobs', icon: Send },
      { id: 'jobs-archived', label: 'Archived Jobs', icon: Archive },
      { id: 'jobs-drafts', label: 'Job Drafts', icon: Edit3 }
    ]
  },
  { 
    id: 'notifications', 
    label: 'Notifications', 
    icon: Bell,
    tooltip: 'AI alerts: matches, follow-ups, insights'
  },
  { 
    id: 'subscriptions', 
    label: 'Subscriptions', 
    icon: BadgeCheck,
    tooltip: 'Manage your AidJobs subscription'
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: Settings,
    tooltip: 'Profile, preferences, notification settings'
  },
];

export function Sidebar({ currentPage, onNavigate, profile, defaultCollapsed = false }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showAuthDebug, setShowAuthDebug] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({
    jobs: currentPage.startsWith('jobs-')
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Check if user should see debug option
  const showDebugOption = profile?.email === 'mir.m@outlook.com' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname.includes('127.0.0.1');

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <TooltipProvider delayDuration={300}>
      <div 
        className="flex flex-col h-full transition-all duration-300 ease-in-out"
        style={{ backgroundColor: '#F1EFEC' }}
      >
        {/* Header - Optimized for reduced width */}
        <div className="p-2.5 border-b" style={{ borderColor: '#D8D5D2' }}>
          <div className="flex items-center justify-between">
            <AnimatePresence>
              {(!isCollapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center space-x-2.5"
                >
                  <div 
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#D5765B' }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span 
                    className="text-base font-light tracking-wide"
                    style={{ 
                      color: '#3A3936',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    AidJobs
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Desktop Toggle Button - optimized size */}
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="h-5 w-5 p-1 rounded-full transition-all duration-200 hover:shadow-sm"
                    style={{ 
                      color: '#3A3936',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F1EFEC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronLeft className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  align="center"
                  className="text-left max-w-xs"
                  style={{
                    backgroundColor: '#3A3936',
                    color: '#F9F7F4',
                    border: 'none',
                    padding: '8px 12px'
                  }}
                >
                  <div className="text-xs font-medium">
                    {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
                className="h-6 w-6 hover:bg-white/50 transition-colors duration-200 rounded-lg"
                style={{ color: '#66615C' }}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* User Profile - Optimized for reduced width */}
        <div className="p-2.5">
          <div className="flex items-center space-x-2">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback 
                className="text-xs font-normal"
                style={{ 
                  backgroundColor: '#FBE4D5',
                  color: '#D5765B'
                }}
              >
                {profile?.name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {(!isCollapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0 text-left"
                >
                  <p 
                    className="text-xs font-normal truncate"
                    style={{ 
                      color: '#3A3936',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                  >
                    {profile?.name || 'User'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <Separator style={{ backgroundColor: '#D8D5D2' }} />

        {/* Navigation - Optimized spacing for reduced width */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id || 
                            (item.subItems && item.subItems.some(subItem => currentPage === subItem.id));
            const isExpanded = expandedItems[item.id];
            
            // Render menu item with potential sub-items
            return (
              <div key={item.id}>
                {item.subItems ? (
                  // Collapsible menu item with sub-items
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(item.id)}
                    className={cn(
                      "w-full rounded-lg transition-all duration-200 relative",
                      isActive ? "shadow-sm" : ""
                    )}
                    style={{
                      backgroundColor: isActive ? '#FBE4D5' : 'transparent',
                    }}
                  >
                    <CollapsibleTrigger asChild>
                      <motion.button
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all duration-200 relative group",
                          isActive ? "font-medium" : "font-light hover:shadow-sm"
                        )}
                        style={{
                          color: isActive ? '#3A3936' : '#66615C',
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        whileHover={{ 
                          backgroundColor: isActive ? '#FBE4D5' : '#FFFFFF',
                          transition: { duration: 0.15 }
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute left-0 top-0 w-1 h-full rounded-r-full"
                            style={{ backgroundColor: '#D5765B' }}
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <Icon 
                            className="w-3.5 h-3.5 flex-shrink-0" 
                            style={{ 
                              color: isActive ? '#D5765B' : '#66615C'
                            }}
                          />
                          <AnimatePresence>
                            {(!isCollapsed || isMobile) && (
                              <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="truncate text-xs"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        <AnimatePresence>
                          {(!isCollapsed || isMobile) && (
                            <motion.div
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown 
                                className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                style={{ color: '#66615C' }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <AnimatePresence>
                        {(!isCollapsed || isMobile) && item.subItems && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-5 mt-1 space-y-1"
                          >
                            {item.subItems.map(subItem => {
                              const SubIcon = subItem.icon;
                              const isSubActive = currentPage === subItem.id;
                              
                              return (
                                <motion.button
                                  key={subItem.id}
                                  onClick={() => {
                                    onNavigate(subItem.id);
                                    if (isMobile) setIsMobileOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-left transition-all duration-200 relative group",
                                    isSubActive ? "font-medium shadow-sm" : "font-light hover:shadow-sm"
                                  )}
                                  style={{
                                    backgroundColor: isSubActive ? '#FFFFFF' : 'transparent',
                                    color: isSubActive ? '#3A3936' : '#66615C',
                                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                  }}
                                  whileHover={{ 
                                    backgroundColor: '#FFFFFF',
                                    transition: { duration: 0.15 }
                                  }}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  <SubIcon 
                                    className="w-3 h-3 flex-shrink-0" 
                                    style={{ 
                                      color: isSubActive ? '#D5765B' : '#66615C'
                                    }}
                                  />
                                  <span className="truncate text-xs">
                                    {subItem.label}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  // Regular menu item without sub-items
                  (() => {
                    const buttonContent = (
                      <motion.button
                        onClick={() => {
                          onNavigate(item.id);
                          if (isMobile) setIsMobileOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-left transition-all duration-200 relative group',
                          isActive
                            ? 'font-medium shadow-sm'
                            : 'font-light hover:shadow-sm'
                        )}
                        style={{
                          backgroundColor: isActive ? '#FBE4D5' : 'transparent',
                          color: isActive ? '#3A3936' : '#66615C',
                          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                        }}
                        whileHover={{ 
                          backgroundColor: isActive ? '#FBE4D5' : '#FFFFFF',
                          transition: { duration: 0.15 }
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute left-0 top-0 w-1 h-full rounded-r-full"
                            style={{ backgroundColor: '#D5765B' }}
                            initial={false}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                        
                        <Icon 
                          className="w-3.5 h-3.5 flex-shrink-0" 
                          style={{ 
                            color: isActive ? '#D5765B' : '#66615C'
                          }}
                        />
                        <AnimatePresence>
                          {(!isCollapsed || isMobile) && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: 'auto' }}
                              exit={{ opacity: 0, width: 0 }}
                              transition={{ duration: 0.2 }}
                              className="truncate text-xs"
                            >
                              {item.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    );

                    if (isCollapsed && !isMobile) {
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            {buttonContent}
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            align="start"
                            className="text-left max-w-xs"
                            style={{
                              backgroundColor: '#3A3936',
                              color: '#F9F7F4',
                              border: 'none',
                              padding: '8px 12px'
                            }}
                          >
                            <div className="text-xs font-medium mb-1">{item.label}</div>
                            <div className="text-xs opacity-90 leading-relaxed">{item.tooltip}</div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.id}>{buttonContent}</div>;
                  })()
                )}
              </div>
            );
          })}

          {/* Auth Debug Button - only visible to authorized users */}
          {showDebugOption && (
            <>
              <div className="pt-1.5">
                <Separator style={{ backgroundColor: '#D8D5D2' }} />
              </div>
              
              {(() => {
                const buttonContent = (
                  <motion.button
                    onClick={() => setShowAuthDebug(true)}
                    className={cn(
                      'w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-left transition-all duration-200 relative group mt-1.5',
                      'font-light hover:shadow-sm'
                    )}
                    style={{
                      backgroundColor: 'transparent',
                      color: '#66615C',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                    whileHover={{ 
                      backgroundColor: '#FFFFFF',
                      transition: { duration: 0.15 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Bug 
                      className="w-3.5 h-3.5 flex-shrink-0" 
                      style={{ color: '#D5765B' }}
                    />
                    <AnimatePresence>
                      {(!isCollapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="truncate text-xs"
                        >
                          🔐 Auth Debug
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );

                if (isCollapsed && !isMobile) {
                  return (
                    <Tooltip key="auth-debug">
                      <TooltipTrigger asChild>
                        {buttonContent}
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        align="start"
                        className="text-left max-w-xs"
                        style={{
                          backgroundColor: '#3A3936',
                          color: '#F9F7F4',
                          border: 'none',
                          padding: '8px 12px'
                        }}
                      >
                        <div className="text-xs font-medium mb-1">🔐 Auth Debug</div>
                        <div className="text-xs opacity-90 leading-relaxed">Debug Supabase authentication and reset sessions</div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return buttonContent;
              })()}
            </>
          )}

          {/* Admin Panel - only visible to superadmin */}
          {profile?.is_admin && (
            <>
              <div className="pt-1.5">
                <Separator style={{ backgroundColor: '#D8D5D2' }} />
              </div>
              
              {(() => {
                const isActive = currentPage === 'admin';
                const buttonContent = (
                  <motion.button
                    onClick={() => {
                      onNavigate('admin');
                      if (isMobile) setIsMobileOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-left transition-all duration-200 relative group mt-1.5',
                      isActive
                        ? 'font-medium shadow-sm'
                        : 'font-light hover:shadow-sm'
                    )}
                    style={{
                      backgroundColor: isActive ? '#FBE4D5' : 'transparent',
                      color: isActive ? '#3A3936' : '#66615C',
                      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                    }}
                    whileHover={{ 
                      backgroundColor: isActive ? '#FBE4D5' : '#FFFFFF',
                      transition: { duration: 0.15 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute left-0 top-0 w-1 h-full rounded-r-full"
                        style={{ backgroundColor: '#D5765B' }}
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    
                    <Shield 
                      className="w-3.5 h-3.5 flex-shrink-0" 
                      style={{ 
                        color: isActive ? '#D5765B' : '#66615C'
                      }}
                    />
                    <AnimatePresence>
                      {(!isCollapsed || isMobile) && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="truncate text-xs"
                        >
                          Admin Panel
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );

                if (isCollapsed && !isMobile) {
                  return (
                    <Tooltip key="admin">
                      <TooltipTrigger asChild>
                        {buttonContent}
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        align="start"
                        className="text-left max-w-xs"
                        style={{
                          backgroundColor: '#3A3936',
                          color: '#F9F7F4',
                          border: 'none',
                          padding: '8px 12px'
                        }}
                      >
                        <div className="text-xs font-medium mb-1">Admin Panel</div>
                        <div className="text-xs opacity-90 leading-relaxed">Configure AI models, prompts, feeds, subscriptions</div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return buttonContent;
              })()}
            </>
          )}
        </nav>

        {/* Footer - Sign Out pinned at bottom */}
        <div className="mt-auto">
          <Separator style={{ backgroundColor: '#D8D5D2' }} />
          <div className="p-2.5">
            {(() => {
              const buttonContent = (
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start font-light hover:bg-white/50 transition-colors duration-200 h-7 px-2.5 text-xs"
                  style={{ 
                    color: '#66615C',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                  }}
                >
                  <LogOut className="w-3 h-3 mr-2 flex-shrink-0" />
                  <AnimatePresence>
                    {(!isCollapsed || isMobile) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        Sign Out
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              );

              if (isCollapsed && !isMobile) {
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {buttonContent}
                    </TooltipTrigger>
                    <TooltipContent 
                      side="right"
                      align="start"
                      className="text-left max-w-xs"
                      style={{
                        backgroundColor: '#3A3936',
                        color: '#F9F7F4',
                        border: 'none',
                        padding: '8px 12px'
                      }}
                    >
                      <div className="text-xs font-medium mb-1">Sign Out</div>
                      <div className="text-xs opacity-90 leading-relaxed">Securely sign out of your AidJobs account</div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return buttonContent;
            })()}
          </div>
        </div>
      </div>

      {/* Auth Debug Modal */}
      <AuthDebugModal 
        isOpen={showAuthDebug} 
        onClose={() => setShowAuthDebug(false)} 
      />
    </TooltipProvider>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 shadow-lg hover:shadow-xl transition-all duration-200 h-10 w-10 rounded-xl border"
        style={{ 
          backgroundColor: '#FFFFFF', 
          color: '#3A3936',
          borderColor: '#D8D5D2'
        }}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="lg:hidden fixed left-0 top-0 z-50 w-72 h-full"
          >
            <SidebarContent isMobile={true} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Reduced widths */}
      <motion.div
        animate={{ width: isCollapsed ? 55 : 225 }} // Reduced from 58/233 to 55/225 (3px/8px reduction)
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:block h-full flex-shrink-0"
      >
        <SidebarContent />
      </motion.div>
    </>
  );
}