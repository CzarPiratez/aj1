import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  ArrowRight,
  Target,
  Heart,
  Globe,
  CheckCircle,
  MessageSquare,
  Clock,
  Lightbulb,
  Rocket,
  Search,
  Activity,
  Brain,
  Compass as CompassIcon,
  TrendingUp as TrendingUpIcon,
  Shield,
  Building
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { checkAIStatus } from '@/lib/ai';

interface AuthenticatedIndexProps {
  profile?: any;
}

export function AuthenticatedIndex({ profile }: AuthenticatedIndexProps) {
  const firstName = profile?.name?.split(' ')[0] || 'there';
  const currentHour = new Date().getHours();
  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

  // Daily insight state
  const [dailyInsight, setDailyInsight] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; model: string; error?: string } | null>(null);

  // Select a random daily insight on component mount
  useEffect(() => {
    const randomInsight = dailyInsights[Math.floor(Math.random() * dailyInsights.length)];
    setDailyInsight(randomInsight);
    
    // Check AI status
    checkAIStatus().then(setAiStatus);
  }, []);

  // Check if this is a developer (you can customize this logic)
  const isDeveloper = profile?.email === 'developer@aidjobs.com' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname.includes('127.0.0.1');

  return (
    <div className="h-full overflow-auto" style={{ backgroundColor: '#F9F7F4' }}>
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Top Section with Header and Daily Insight */}
        <div className="flex items-start justify-between mb-8">
          {/* Refined Header - Left Aligned & Smaller Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-left">
              <h1 
                className="text-2xl font-light mb-2 tracking-tight"
                style={{ 
                  color: '#3A3936',
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                }}
              >
                Good {timeOfDay}, {firstName}
              </h1>
              
              <p 
                className="text-sm font-light"
                style={{ color: '#66615C' }}
              >
                You're now inside your intelligent career and hiring HQ.
              </p>
              
              {/* AI Status Indicator */}
              {aiStatus && (
                <div className="flex items-center mt-2 space-x-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${aiStatus.available ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span className="text-xs" style={{ color: '#66615C' }}>
                    AI Engine: {aiStatus.available ? 'Online' : 'Offline'} ({aiStatus.model})
                  </span>
                </div>
              )}

              {/* Developer Debug Link */}
              {isDeveloper && (
                <div className="flex items-center mt-2 space-x-2">
                  <Shield className="w-3 h-3" style={{ color: '#D5765B' }} />
                  <a 
                    href="/dev/auth-debug" 
                    target="_blank"
                    className="text-xs hover:underline"
                    style={{ color: '#D5765B' }}
                  >
                    🔐 Auth Debug Tool
                  </a>
                </div>
              )}
            </div>
          </motion.div>

          {/* Compact Daily Insight Card - Top Right Corner with Light Terracotta */}
          {dailyInsight && (
            <motion.div
              initial={{ opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-shrink-0 ml-8"
            >
              <Card 
                className="border-0 shadow-sm hover:shadow-md transition-all duration-300 w-64"
                style={{ backgroundColor: '#FBE4D5' }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start space-x-2">
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#D5765B' }}
                    >
                      <dailyInsight.icon className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 
                          className="text-xs font-medium"
                          style={{ color: '#3A3936' }}
                        >
                          {dailyInsight.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className="text-xs px-1.5 py-0.5"
                          style={{ borderColor: '#D5765B', color: '#D5765B', fontSize: '10px' }}
                        >
                          Today
                        </Badge>
                      </div>
                      <p 
                        className="text-xs font-light leading-relaxed"
                        style={{ color: '#66615C' }}
                      >
                        {dailyInsight.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Quick Start Actions - More Spacious */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-lg font-medium"
              style={{ color: '#3A3936' }}
            >
              Quick Start
            </h3>
            <Badge variant="outline" className="text-sm px-3 py-1" style={{ borderColor: '#D8D5D2', color: '#66615C' }}>
              <Clock className="w-3 h-3 mr-1" />
              2-5 min each
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickStartActions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Card 
                  className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group h-20"
                  style={{ backgroundColor: '#FFFFFF' }}
                >
                  <CardContent className="p-4 h-full flex items-center">
                    <div className="flex items-center space-x-3 w-full">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                        style={{ backgroundColor: '#FBE4D5' }}
                      >
                        <action.icon className="w-4 h-4" style={{ color: '#D5765B' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-sm font-medium truncate"
                          style={{ color: '#3A3936' }}
                        >
                          {action.title}
                        </p>
                        <p 
                          className="text-sm font-light opacity-75"
                          style={{ color: '#66615C' }}
                        >
                          {action.subtitle}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Main Content Grid - More Spacious */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          
          {/* For Candidates - Left Aligned with Right-Aligned Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <h3 
                    className="text-lg font-medium mb-1"
                    style={{ color: '#3A3936' }}
                  >
                    For Candidates
                  </h3>
                  <p className="text-sm font-light" style={{ color: '#66615C' }}>
                    Discover the whole career map
                  </p>
                </div>
                <Button
                  size="sm"
                  className="h-8 px-4 rounded-lg font-light text-white hover:opacity-90 transition-all duration-200 text-sm"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  <Upload className="w-3 h-3 mr-2" />
                  Upload CV
                </Button>
              </div>
            </div>
            
            <div className="grid gap-3">
              {candidateFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Card 
                    className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group h-16"
                    style={{ backgroundColor: '#FFFFFF' }}
                  >
                    <CardContent className="p-4 h-full flex items-center">
                      <div className="flex items-center space-x-3 w-full">
                        <CheckCircle 
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: '#D5765B' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm font-medium mb-1"
                            style={{ color: '#3A3936' }}
                          >
                            {feature.title}
                          </p>
                          <p 
                            className="text-sm font-light leading-tight opacity-75"
                            style={{ color: '#66615C' }}
                          >
                            {feature.description}
                          </p>
                        </div>
                        <ArrowRight 
                          className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" 
                          style={{ color: '#D5765B' }} 
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* For Organizations - Left Aligned with Coming Soon Message */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="mb-4">
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <h3 
                    className="text-lg font-medium mb-1"
                    style={{ color: '#3A3936' }}
                  >
                    For Organizations
                  </h3>
                  <p className="text-sm font-light" style={{ color: '#66615C' }}>
                    Truly meaningful hiring
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled
                  className="h-8 px-4 rounded-lg font-light text-white opacity-50 text-sm"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  <Rocket className="w-3 h-3 mr-2" />
                  Coming Soon
                </Button>
              </div>
            </div>
            
            <div className="grid gap-3">
              {organizationFeatures.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                >
                  <Card 
                    className="border-0 shadow-sm transition-all duration-200 h-16 opacity-75"
                    style={{ backgroundColor: '#F1EFEC' }}
                  >
                    <CardContent className="p-4 h-full flex items-center">
                      <div className="flex items-center space-x-3 w-full">
                        <Rocket 
                          className="w-4 h-4 flex-shrink-0"
                          style={{ color: '#D5765B' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p 
                            className="text-sm font-medium mb-1"
                            style={{ color: '#3A3936' }}
                          >
                            {feature.title}
                          </p>
                          <p 
                            className="text-sm font-light leading-tight opacity-75"
                            style={{ color: '#66615C' }}
                          >
                            {feature.description}
                          </p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className="text-xs px-2 py-1"
                          style={{ borderColor: '#D5765B', color: '#D5765B' }}
                        >
                          Soon
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Impact Stats with SDG Alignment - Reduced Font Sizes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 
              className="text-lg font-medium"
              style={{ color: '#3A3936' }}
            >
              Today's Insights & SDG Alignment
            </h3>
            <Badge variant="outline" className="text-sm px-3 py-1" style={{ borderColor: '#D8D5D2', color: '#66615C' }}>
              <Activity className="w-3 h-3 mr-1" />
              Real-time
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {impactStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + index * 0.05 }}
              >
                <Card 
                  className="text-center border-0 shadow-sm hover:shadow-md transition-all duration-200 h-20"
                  style={{ backgroundColor: '#F1EFEC' }}
                >
                  <CardContent className="p-4 h-full flex flex-col justify-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <stat.icon className="w-3 h-3" style={{ color: '#D5765B' }} />
                      <p 
                        className="text-xs font-medium"
                        style={{ color: '#3A3936' }}
                      >
                        {stat.value}
                      </p>
                      {stat.change && (
                        <span className="text-xs" style={{ color: '#D5765B' }}>+{stat.change}%</span>
                      )}
                    </div>
                    <p 
                      className="text-xs font-light"
                      style={{ color: '#66615C' }}
                    >
                      {stat.label}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Ultra-refined data structures
const quickStartActions = [
  {
    id: 'upload-cv',
    title: 'Upload CV',
    subtitle: 'AI analysis',
    icon: Upload
  },
  {
    id: 'search-jobs',
    title: 'Find Jobs',
    subtitle: 'Smart search',
    icon: Search
  },
  {
    id: 'ai-chat',
    title: 'AI Chat',
    subtitle: 'Get guidance',
    icon: MessageSquare
  },
  {
    id: 'career-insights',
    title: 'Career Insights',
    subtitle: 'Skill analysis',
    icon: Lightbulb
  }
];

const candidateFeatures = [
  {
    title: 'Full CV analysis',
    description: 'Beyond keywords to story, structure, tone'
  },
  {
    title: 'AI-curated matches',
    description: 'Reasoned, human-like explanations'
  },
  {
    title: 'Alternative paths',
    description: '"You could also thrive in Impact Evaluation roles"'
  },
  {
    title: 'Skill gap identification',
    description: 'Know what\'s missing and how to grow'
  },
  {
    title: 'Microlearning pathways',
    description: 'Auto-suggested resources to close gaps'
  },
  {
    title: 'Project opportunities',
    description: 'Real-world impact gigs, not just jobs'
  }
];

const organizationFeatures = [
  {
    title: 'AI-powered job posting',
    description: 'Coming soon - intelligent job description generation'
  },
  {
    title: 'Smart candidate matching',
    description: 'Coming soon - AI-driven talent discovery'
  },
  {
    title: 'Organization profile builder',
    description: 'Coming soon - showcase your mission and culture'
  },
  {
    title: 'Hiring analytics',
    description: 'Coming soon - insights into your recruitment process'
  }
];

const impactStats = [
  {
    value: '12.5K',
    label: 'SDG-Aligned Jobs',
    icon: Target,
    change: 15
  },
  {
    value: '847',
    label: 'Organizations',
    icon: Building,
    change: 8
  },
  {
    value: '96%',
    label: 'Mission Match',
    icon: Heart,
    change: 3
  },
  {
    value: '67',
    label: 'Countries',
    icon: Globe,
    change: 12
  }
];

// Daily insights data - rotates randomly each day
const dailyInsights = [
  {
    title: 'AI Career Insight',
    content: 'Candidates with nonprofit experience are 3x more likely to stay long-term.',
    icon: Brain
  },
  {
    title: 'Hiring Trend',
    content: 'Remote-first nonprofits are seeing 40% more applications this week.',
    icon: TrendingUpIcon
  },
  {
    title: 'SDG Focus',
    content: 'Climate action roles (SDG 13) have increased 67% this month.',
    icon: Globe
  },
  {
    title: 'Skills Gap Alert',
    content: 'Data analysis skills are in high demand across nonprofits.',
    icon: CompassIcon
  },
  {
    title: 'Network Effect',
    content: 'AI chat users are 2.5x more likely to find their ideal role.',
    icon: MessageSquare
  },
  {
    title: 'Impact Opportunity',
    content: 'Organizations with impact metrics get 85% more applications.',
    icon: Target
  }
];