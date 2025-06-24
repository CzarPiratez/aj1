import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Search, 
  Plus, 
  Filter, 
  ArrowUpDown, 
  Calendar, 
  MapPin, 
  Users, 
  Eye, 
  Edit3, 
  Archive, 
  Trash2, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface MyJobsDashboardProps {
  profile?: any;
  subType?: 'all' | 'active' | 'archived' | 'drafts';
}

interface Job {
  id: string;
  title: string;
  organization_name?: string;
  location?: string;
  contract_type?: string;
  status: 'published' | 'archived' | 'closed';
  published_at: string;
  application_end_date?: string;
  created_at: string;
  updated_at: string;
  applications_count?: number;
}

interface JobDraft {
  id: string;
  title?: string;
  organization_name?: string;
  draft_status: 'draft' | 'review' | 'ready' | 'archived';
  last_edited_at: string;
  created_at: string;
  updated_at: string;
}

export function MyJobsDashboard({ profile, subType = 'all' }: MyJobsDashboardProps) {
  const [activeTab, setActiveTab] = useState<string>(
    subType === 'drafts' ? 'drafts' : 
    subType === 'archived' ? 'archived' : 
    'active'
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drafts, setDrafts] = useState<JobDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (profile?.id) {
      fetchJobs();
      fetchDrafts();
    }
  }, [profile?.id, activeTab, sortBy, filterStatus]);

  // Update active tab when subType changes
  useEffect(() => {
    if (subType === 'drafts') {
      setActiveTab('drafts');
    } else if (subType === 'archived') {
      setActiveTab('archived');
    } else if (subType === 'active') {
      setActiveTab('active');
    }
  }, [subType]);

  const fetchJobs = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    
    try {
      // Build query based on active tab and filters
      let query = supabase
        .from('jobs')
        .select('*, applications:applications(count)')
        .eq('user_id', profile.id);
      
      // Apply status filter
      if (activeTab === 'active') {
        query = query.eq('status', 'published');
      } else if (activeTab === 'archived') {
        query = query.in('status', ['archived', 'closed']);
      }
      
      // Apply sorting
      if (sortBy === 'newest') {
        query = query.order('published_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('published_at', { ascending: true });
      } else if (sortBy === 'title_asc') {
        query = query.order('title', { ascending: true });
      } else if (sortBy === 'title_desc') {
        query = query.order('title', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Process data to include application counts
      const processedJobs = data.map(job => ({
        ...job,
        applications_count: job.applications?.length || 0
      }));
      
      setJobs(processedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrafts = async () => {
    if (!profile?.id) return;
    
    setLoading(true);
    
    try {
      // Build query for drafts
      let query = supabase
        .from('job_drafts')
        .select('*')
        .eq('user_id', profile.id);
      
      // Apply status filter for drafts
      if (filterStatus !== 'all') {
        query = query.eq('draft_status', filterStatus);
      }
      
      // Apply sorting for drafts
      if (sortBy === 'newest') {
        query = query.order('last_edited_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('last_edited_at', { ascending: true });
      } else if (sortBy === 'title_asc') {
        query = query.order('title', { ascending: true });
      } else if (sortBy === 'title_desc') {
        query = query.order('title', { ascending: false });
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      setDrafts(data);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishJob = async (draftId: string) => {
    // This would be implemented to publish a draft to a live job
    toast.info('Publishing job from draft...');
  };

  const handleEditJob = (jobId: string, isDraft: boolean) => {
    // This would navigate to the job editor with the selected job loaded
    toast.info(`Editing ${isDraft ? 'draft' : 'job'} ${jobId}`);
  };

  const handleArchiveJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'archived' })
        .eq('id', jobId)
        .eq('user_id', profile.id);
      
      if (error) throw error;
      
      toast.success('Job archived successfully');
      fetchJobs();
    } catch (error) {
      console.error('Error archiving job:', error);
      toast.error('Failed to archive job');
    }
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const { error } = await supabase
        .from('job_drafts')
        .delete()
        .eq('id', draftId)
        .eq('user_id', profile.id);
      
      if (error) throw error;
      
      toast.success('Draft deleted successfully');
      fetchDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('Failed to delete draft');
    }
  };

  const handleCreateNewJob = () => {
    // This would trigger the job creation flow
    toast.info('Starting new job creation...');
  };

  // Filter jobs/drafts based on search query
  const filteredJobs = jobs.filter(job => 
    job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDrafts = drafts.filter(draft => 
    draft.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    draft.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <div className="border-b p-4" style={{ borderColor: '#D8D5D2' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-lg font-medium"
              style={{ color: '#3A3936' }}
            >
              {activeTab === 'drafts' ? 'Job Drafts' : 
               activeTab === 'archived' ? 'Archived Jobs' : 
               'Active Jobs'}
            </h1>
            <p 
              className="text-sm font-light"
              style={{ color: '#66615C' }}
            >
              {activeTab === 'drafts' ? 'Continue working on your draft job postings' : 
               activeTab === 'archived' ? 'View your archived job postings' : 
               'Manage your published job postings'}
            </p>
          </div>
          
          <Button
            onClick={handleCreateNewJob}
            className="h-9 text-white"
            style={{ backgroundColor: '#D5765B' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Job
          </Button>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="border-b" style={{ borderColor: '#D8D5D2' }}>
        <div className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
              <TabsList className="grid w-full md:w-auto grid-cols-3">
                <TabsTrigger value="active" className="text-xs">
                  Active Jobs
                </TabsTrigger>
                <TabsTrigger value="archived" className="text-xs">
                  Archived
                </TabsTrigger>
                <TabsTrigger value="drafts" className="text-xs">
                  Drafts
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center space-x-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#66615C' }} />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] h-9 text-xs">
                  <div className="flex items-center">
                    <ArrowUpDown className="w-3 h-3 mr-2" />
                    <span>Sort By</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                  <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
                  <SelectItem value="title_asc" className="text-xs">Title (A-Z)</SelectItem>
                  <SelectItem value="title_desc" className="text-xs">Title (Z-A)</SelectItem>
                </SelectContent>
              </Select>
              
              {activeTab === 'drafts' && (
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <div className="flex items-center">
                      <Filter className="w-3 h-3 mr-2" />
                      <span>Status</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                    <SelectItem value="draft" className="text-xs">Draft</SelectItem>
                    <SelectItem value="review" className="text-xs">In Review</SelectItem>
                    <SelectItem value="ready" className="text-xs">Ready</SelectItem>
                    <SelectItem value="archived" className="text-xs">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <TabsContent value="active" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D5765B' }} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <EmptyState 
                title="No active jobs found"
                description="You don't have any active job postings yet. Create your first job posting to start receiving applications."
                icon={Briefcase}
                actionLabel="Create Job Posting"
                onAction={handleCreateNewJob}
              />
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map(job => (
                  <JobCard 
                    key={job.id}
                    job={job}
                    onEdit={() => handleEditJob(job.id, false)}
                    onArchive={() => handleArchiveJob(job.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="archived" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D5765B' }} />
              </div>
            ) : filteredJobs.length === 0 ? (
              <EmptyState 
                title="No archived jobs found"
                description="You don't have any archived job postings yet. Active jobs can be archived when they're no longer accepting applications."
                icon={Archive}
              />
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map(job => (
                  <JobCard 
                    key={job.id}
                    job={job}
                    onEdit={() => handleEditJob(job.id, false)}
                    isArchived
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="drafts" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D5765B' }} />
              </div>
            ) : filteredDrafts.length === 0 ? (
              <EmptyState 
                title="No draft jobs found"
                description="You don't have any job drafts yet. Start creating a job posting and save it as a draft to continue later."
                icon={FileText}
                actionLabel="Create Draft"
                onAction={handleCreateNewJob}
              />
            ) : (
              <div className="grid gap-4">
                {filteredDrafts.map(draft => (
                  <DraftCard 
                    key={draft.id}
                    draft={draft}
                    onEdit={() => handleEditJob(draft.id, true)}
                    onPublish={() => handlePublishJob(draft.id)}
                    onDelete={() => handleDeleteDraft(draft.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </ScrollArea>
    </div>
  );
}

// Job Card Component
function JobCard({ 
  job, 
  onEdit, 
  onArchive,
  isArchived = false
}: { 
  job: Job; 
  onEdit: () => void; 
  onArchive?: () => void;
  isArchived?: boolean;
}) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                style={{ backgroundColor: '#FBE4D5' }}
              >
                <Briefcase className="w-5 h-5" style={{ color: '#D5765B' }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium mb-1 line-clamp-1" style={{ color: '#3A3936' }}>
                  {job.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {job.organization_name && (
                    <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                      <Building className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">{job.organization_name}</span>
                    </div>
                  )}
                  
                  {job.location && (
                    <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">{job.location}</span>
                    </div>
                  )}
                  
                  {job.contract_type && (
                    <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                      {job.contract_type}
                    </Badge>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                    <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Posted {formatDate(job.published_at)}</span>
                  </div>
                  
                  {job.application_end_date && (
                    <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>Closes {formatDate(job.application_end_date)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                    <Users className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>{job.applications_count || 0} applications</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onEdit}
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Edit
            </Button>
            
            {!isArchived && onArchive && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={onArchive}
              >
                <Archive className="w-3 h-3 mr-2" />
                Archive
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                // This would open the job in a new tab
                toast.info('View job functionality coming soon');
              }}
            >
              <Eye className="w-3 h-3 mr-2" />
              View
            </Button>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F1EFEC' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge 
                variant={isArchived ? 'secondary' : 'default'}
                className="text-xs px-2 py-0 h-5"
              >
                {isArchived ? 'Archived' : 'Active'}
              </Badge>
              
              {job.status === 'closed' && (
                <Badge 
                  variant="destructive"
                  className="text-xs px-2 py-0 h-5"
                >
                  Closed
                </Badge>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                // This would navigate to applications view
                toast.info('View applications functionality coming soon');
              }}
            >
              <Users className="w-3 h-3 mr-2" />
              View Applications
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Draft Card Component
function DraftCard({ 
  draft, 
  onEdit, 
  onPublish, 
  onDelete 
}: { 
  draft: JobDraft; 
  onEdit: () => void; 
  onPublish: () => void; 
  onDelete: () => void;
}) {
  return (
    <Card className="border shadow-sm hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-start space-x-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                style={{ backgroundColor: '#F1EFEC' }}
              >
                <FileText className="w-5 h-5" style={{ color: '#66615C' }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium mb-1 line-clamp-1" style={{ color: '#3A3936' }}>
                  {draft.title || 'Untitled Draft'}
                </h3>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {draft.organization_name && (
                    <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                      <Building className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate max-w-[150px]">{draft.organization_name}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                    <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Last edited {formatDate(draft.last_edited_at)}</span>
                  </div>
                  
                  <div className="flex items-center text-xs" style={{ color: '#66615C' }}>
                    <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Created {formatDate(draft.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 self-end md:self-center">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onEdit}
            >
              <Edit3 className="w-3 h-3 mr-2" />
              Edit
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onDelete}
            >
              <Trash2 className="w-3 h-3 mr-2" />
              Delete
            </Button>
            
            <Button
              size="sm"
              className="h-8 text-xs text-white"
              style={{ backgroundColor: '#D5765B' }}
              onClick={onPublish}
            >
              <Send className="w-3 h-3 mr-2" />
              Publish
            </Button>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t" style={{ borderColor: '#F1EFEC' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <StatusBadge status={draft.draft_status} />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onEdit}
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Open in Editor
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'draft':
      return (
        <Badge 
          variant="outline"
          className="text-xs px-2 py-0 h-5"
          style={{ borderColor: '#D5765B', color: '#D5765B' }}
        >
          Draft
        </Badge>
      );
    case 'review':
      return (
        <Badge 
          variant="outline"
          className="text-xs px-2 py-0 h-5"
          style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
        >
          In Review
        </Badge>
      );
    case 'ready':
      return (
        <Badge 
          variant="outline"
          className="text-xs px-2 py-0 h-5"
          style={{ borderColor: '#10B981', color: '#10B981' }}
        >
          Ready
        </Badge>
      );
    case 'archived':
      return (
        <Badge 
          variant="outline"
          className="text-xs px-2 py-0 h-5"
          style={{ borderColor: '#6B7280', color: '#6B7280' }}
        >
          Archived
        </Badge>
      );
    default:
      return (
        <Badge 
          variant="outline"
          className="text-xs px-2 py-0 h-5"
        >
          {status}
        </Badge>
      );
  }
}

// Empty State Component
function EmptyState({ 
  title, 
  description, 
  icon: Icon, 
  actionLabel, 
  onAction 
}: { 
  title: string; 
  description: string; 
  icon: React.ComponentType<any>; 
  actionLabel?: string; 
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: '#F1EFEC' }}
      >
        <Icon className="w-8 h-8" style={{ color: '#66615C' }} />
      </div>
      
      <h3 
        className="text-lg font-medium mb-2"
        style={{ color: '#3A3936' }}
      >
        {title}
      </h3>
      
      <p 
        className="text-sm font-light max-w-md mb-6"
        style={{ color: '#66615C' }}
      >
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="text-white"
          style={{ backgroundColor: '#D5765B' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Helper function to format dates
function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return format(date, 'MMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
}