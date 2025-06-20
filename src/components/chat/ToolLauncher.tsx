import React from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Briefcase, 
  Search, 
  Target, 
  FileEdit, 
  Mail, 
  Building, 
  Lightbulb, 
  RotateCcw, 
  Wand2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Tool {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  category: 'documents' | 'jobs' | 'career' | 'organization';
  description: string;
  estimatedTime?: string;
  difficulty?: 'easy' | 'medium' | 'advanced';
  isAvailable: boolean;
  requirementText?: string;
  onLaunch: () => void;
}

interface ToolLauncherProps {
  tools: Tool[];
  onToolLaunch: (toolId: string) => void;
}

export function ToolLauncher({ tools, onToolLaunch }: ToolLauncherProps) {
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return '#10B981'; // Green
      case 'medium': return '#F59E0B'; // Yellow
      case 'advanced': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const groupedTools = tools.reduce((acc, tool) => {
    if (!acc[tool.category]) {
      acc[tool.category] = [];
    }
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const categoryLabels = {
    documents: 'Documents & CVs',
    jobs: 'Jobs & Matching',
    career: 'Career Development',
    organization: 'Organization'
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h2 
          className="text-lg font-medium mb-2"
          style={{ color: '#3A3936' }}
        >
          AI Tools & Features
        </h2>
        <p 
          className="text-sm font-light"
          style={{ color: '#66615C' }}
        >
          Choose a tool to get started with your recruitment journey
        </p>
      </div>

      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <div key={category} className="space-y-3">
          <h3 
            className="text-sm font-medium"
            style={{ color: '#3A3936' }}
          >
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h3>
          
          <div className="grid gap-3">
            {categoryTools.map((tool, index) => {
              const IconComponent = tool.icon;
              
              return (
                <motion.div
                  key={tool.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${
                      tool.isAvailable ? '' : 'opacity-60'
                    }`}
                    style={{ backgroundColor: '#FFFFFF' }}
                    onClick={() => tool.isAvailable && onToolLaunch(tool.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: tool.isAvailable ? '#FBE4D5' : '#F1EFEC' }}
                        >
                          <IconComponent 
                            className="w-5 h-5"
                            style={{ color: tool.isAvailable ? '#D5765B' : '#66615C' }}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h4 
                              className="text-sm font-medium"
                              style={{ color: '#3A3936' }}
                            >
                              {tool.label}
                            </h4>
                            
                            <div className="flex flex-col items-end space-y-1">
                              {tool.estimatedTime && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-2 py-0.5"
                                  style={{ borderColor: '#D8D5D2', color: '#66615C' }}
                                >
                                  {tool.estimatedTime}
                                </Badge>
                              )}
                              {tool.difficulty && (
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: getDifficultyColor(tool.difficulty) }}
                                />
                              )}
                            </div>
                          </div>
                          
                          <p 
                            className="text-xs font-light leading-relaxed mb-3"
                            style={{ color: '#66615C' }}
                          >
                            {tool.description}
                          </p>
                          
                          {!tool.isAvailable && tool.requirementText && (
                            <p 
                              className="text-xs italic mb-3"
                              style={{ color: '#D5765B' }}
                            >
                              Requires: {tool.requirementText}
                            </p>
                          )}
                          
                          <Button
                            size="sm"
                            disabled={!tool.isAvailable}
                            className="h-7 px-3 rounded-lg font-light text-white hover:opacity-90 transition-all duration-200 text-xs"
                            style={{ 
                              backgroundColor: tool.isAvailable ? '#D5765B' : '#D8D5D2',
                              opacity: tool.isAvailable ? 1 : 0.5
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (tool.isAvailable) {
                                onToolLaunch(tool.id);
                              }
                            }}
                          >
                            {tool.isAvailable ? 'Launch Tool' : 'Not Available'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}