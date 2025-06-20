import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Briefcase, 
  FileText, 
  Heart, 
  TrendingUp, 
  Users,
  Target,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MainContentProps {
  content: {
    type: string;
    title: string;
    content: string;
  } | null;
}

export function MainContent({ content }: MainContentProps) {
  if (!content) {
    return <WelcomeContent />;
  }

  switch (content.type) {
    case 'job-builder':
      return <JobBuilderContent />;
    case 'cv-analysis':
      return <CVAnalysisContent />;
    case 'matches':
      return <MatchesContent />;
    default:
      return <WelcomeContent />;
  }
}

function WelcomeContent() {
  return (
    <div className="p-8 h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        {/* Hero Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl mb-6"
          >
            <Sparkles className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to AidJobs AI
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your intelligent assistant for nonprofit recruitment. From job posting to candidate matching, 
            I'm here to help you connect talent with purpose.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 text-center"
        >
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-gray-600 mb-6">
            Ask me anything in the chat to begin your nonprofit recruitment journey.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                className="bg-white hover:bg-gray-50"
              >
                {action}
              </Button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function JobBuilderContent() {
  return (
    <div className="p-8 h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
            <Briefcase className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Job Builder Assistant</h1>
          <p className="text-gray-600">
            I'll help you create compelling job postings that attract top nonprofit talent.
          </p>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              The Job Builder module is currently in development. It will feature AI-powered 
              job description generation, requirement optimization, and posting templates.
            </p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Get Notified When Ready
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function CVAnalysisContent() {
  return (
    <div className="p-8 h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">CV Analysis Engine</h1>
          <p className="text-gray-600">
            Advanced AI analysis to understand candidate profiles and nonprofit sector fit.
          </p>
        </div>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">In Development</h3>
            <p className="text-gray-600 mb-4">
              The CV Analysis module will offer intelligent resume parsing, skills extraction, 
              and nonprofit experience evaluation.
            </p>
            <Button className="bg-green-600 hover:bg-green-700">
              Join Beta Testing
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function MatchesContent() {
  return (
    <div className="p-8 h-full overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-2xl mb-4">
            <Heart className="w-8 h-8 text-pink-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Smart Matching System</h1>
          <p className="text-gray-600">
            AI-powered matching between candidates and nonprofit opportunities.
          </p>
        </div>

        <Card className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-200">
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 text-pink-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Algorithm Training</h3>
            <p className="text-gray-600 mb-4">
              Our matching algorithm is being trained on nonprofit sector data to provide 
              the most accurate candidate-job compatibility scores.
            </p>
            <Button className="bg-pink-600 hover:bg-pink-700">
              Preview Matching Logic
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

const features = [
  {
    title: 'Intelligent Job Builder',
    description: 'Create compelling job postings with AI-powered suggestions tailored for nonprofit roles.',
    icon: Briefcase,
  },
  {
    title: 'CV Analysis Engine',
    description: 'Automatically parse and analyze resumes to identify key skills and nonprofit experience.',
    icon: FileText,
  },
  {
    title: 'Smart Matching',
    description: 'Connect the right talent with the right opportunities using advanced AI algorithms.',
    icon: Heart,
  },
  {
    title: 'Impact Insights',
    description: 'Track recruitment metrics and understand your hiring patterns with detailed analytics.',
    icon: TrendingUp,
  },
  {
    title: 'Talent Community',
    description: 'Build relationships with candidates who are passionate about social impact.',
    icon: Users,
  },
  {
    title: 'AI Recommendations',
    description: 'Get personalized suggestions to improve your recruitment process and outcomes.',
    icon: Lightbulb,
  },
];

const quickActions = [
  'Post a new job',
  'Upload CV for analysis',
  'Find job matches',
  'Review applications',
  'Generate cover letter',
];