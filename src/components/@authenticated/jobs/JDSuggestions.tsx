import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Wand2, 
  Check, 
  X, 
  Lightbulb, 
  Sparkles,
  AlertTriangle,
  Languages,
  Target,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Suggestion {
  id: string;
  type: 'clarity' | 'inclusivity' | 'tone' | 'jargon' | 'structure';
  title: string;
  description: string;
  original: string;
  suggested: string;
  impact: 'high' | 'medium' | 'low';
}

interface JDSuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  sectionTitle: string;
  sectionContent: string;
  onApplySuggestion: (newContent: string) => void;
  isLoading?: boolean;
}

export function JDSuggestions({ 
  isOpen, 
  onClose, 
  sectionTitle, 
  sectionContent,
  onApplySuggestion,
  isLoading = false
}: JDSuggestionsProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  
  // Generate mock suggestions based on section content and title
  // In a real implementation, these would come from the AI
  const suggestions = generateSuggestions(sectionTitle, sectionContent);

  const handleApplySuggestion = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion.id);
    
    // In a real implementation, you might want to apply the suggestion to only
    // the relevant part of the content, not replace the entire content
    onApplySuggestion(suggestion.suggested);
    
    toast.success('Suggestion applied successfully');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-lg font-medium" style={{ color: '#3A3936' }}>
            <Lightbulb className="w-5 h-5 mr-2" style={{ color: '#D5765B' }} />
            AI Suggestions for {sectionTitle}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FBE4D5' }}>
              <Wand2 className="w-8 h-8 animate-pulse" style={{ color: '#D5765B' }} />
            </div>
            <p className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>
              Analyzing your content...
            </p>
            <p className="text-sm font-light text-center max-w-md" style={{ color: '#66615C' }}>
              Our AI is reviewing your {sectionTitle.toLowerCase()} to provide tailored suggestions for improvement.
            </p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#F1EFEC' }}>
              <Check className="w-8 h-8" style={{ color: '#10B981' }} />
            </div>
            <p className="text-sm font-medium mb-2" style={{ color: '#3A3936' }}>
              No suggestions needed
            </p>
            <p className="text-sm font-light text-center max-w-md" style={{ color: '#66615C' }}>
              Your {sectionTitle.toLowerCase()} looks great! We don't have any suggestions for improvement at this time.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
            <div className="space-y-4 mb-4">
              <p className="text-sm font-light" style={{ color: '#66615C' }}>
                Our AI has analyzed your {sectionTitle.toLowerCase()} and found {suggestions.length} potential improvements. 
                Click "Apply with AI" to implement a suggestion.
              </p>
              
              {suggestions.map((suggestion) => (
                <SuggestionCard 
                  key={suggestion.id}
                  suggestion={suggestion}
                  isSelected={selectedSuggestion === suggestion.id}
                  onApply={() => handleApplySuggestion(suggestion)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-1">
            <Lightbulb className="w-3.5 h-3.5" style={{ color: '#66615C' }} />
            <span className="text-xs font-light" style={{ color: '#66615C' }}>
              Powered by AI
            </span>
          </div>
          
          <Button
            onClick={onClose}
            variant="outline"
            className="h-9"
            style={{ borderColor: '#D8D5D2', color: '#66615C' }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Suggestion Card Component
function SuggestionCard({ 
  suggestion, 
  isSelected,
  onApply
}: { 
  suggestion: Suggestion; 
  isSelected: boolean;
  onApply: () => void;
}) {
  return (
    <Card 
      className={`border transition-all duration-200 ${isSelected ? 'border-green-500 bg-green-50' : ''}`}
      style={{ borderColor: isSelected ? '#10B981' : '#D8D5D2' }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ 
                backgroundColor: getSuggestionTypeColor(suggestion.type).bg,
                color: getSuggestionTypeColor(suggestion.type).text
              }}
            >
              {getSuggestionTypeIcon(suggestion.type, "w-4 h-4")}
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-1" style={{ color: '#3A3936' }}>
                {suggestion.title}
              </h4>
              
              <p className="text-xs font-light mb-2" style={{ color: '#66615C' }}>
                {suggestion.description}
              </p>
              
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-0 h-5"
                  style={{ 
                    borderColor: getImpactColor(suggestion.impact).border,
                    color: getImpactColor(suggestion.impact).text
                  }}
                >
                  {suggestion.impact.charAt(0).toUpperCase() + suggestion.impact.slice(1)} Impact
                </Badge>
                
                <Badge 
                  variant="outline" 
                  className="text-xs px-2 py-0 h-5"
                  style={{ 
                    borderColor: getSuggestionTypeColor(suggestion.type).border,
                    color: getSuggestionTypeColor(suggestion.type).text
                  }}
                >
                  {getSuggestionTypeLabel(suggestion.type)}
                </Badge>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onApply}
            className="h-8 text-xs whitespace-nowrap"
            style={{ 
              borderColor: '#D5765B', 
              color: '#D5765B',
              backgroundColor: '#FBE4D5'
            }}
          >
            <Wand2 className="w-3 h-3 mr-2" />
            Apply with AI
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t" style={{ borderColor: '#F1EFEC' }}>
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: '#66615C' }}>
              Original:
            </p>
            <div 
              className="text-xs p-2 rounded"
              style={{ backgroundColor: '#F1EFEC', color: '#3A3936' }}
            >
              {suggestion.original}
            </div>
          </div>
          
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: '#66615C' }}>
              Suggested:
            </p>
            <div 
              className="text-xs p-2 rounded"
              style={{ backgroundColor: '#FBE4D5', color: '#3A3936' }}
            >
              {suggestion.suggested}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to get suggestion type icon
function getSuggestionTypeIcon(type: string, className: string) {
  switch (type) {
    case 'clarity':
      return <Lightbulb className={className} />;
    case 'inclusivity':
      return <Users className={className} />;
    case 'tone':
      return <Sparkles className={className} />;
    case 'jargon':
      return <Languages className={className} />;
    case 'structure':
      return <Target className={className} />;
    default:
      return <Lightbulb className={className} />;
  }
}

// Helper function to get suggestion type label
function getSuggestionTypeLabel(type: string): string {
  switch (type) {
    case 'clarity':
      return 'Clarity';
    case 'inclusivity':
      return 'Inclusivity';
    case 'tone':
      return 'Tone';
    case 'jargon':
      return 'Jargon';
    case 'structure':
      return 'Structure';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

// Helper function to get suggestion type color
function getSuggestionTypeColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case 'clarity':
      return { bg: '#E0F2F1', text: '#00695C', border: '#80CBC4' };
    case 'inclusivity':
      return { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' };
    case 'tone':
      return { bg: '#FFF8E1', text: '#F57F17', border: '#FFE082' };
    case 'jargon':
      return { bg: '#E3F2FD', text: '#1565C0', border: '#90CAF9' };
    case 'structure':
      return { bg: '#F3E5F5', text: '#6A1B9A', border: '#CE93D8' };
    default:
      return { bg: '#F1EFEC', text: '#66615C', border: '#D8D5D2' };
  }
}

// Helper function to get impact color
function getImpactColor(impact: string): { border: string; text: string } {
  switch (impact) {
    case 'high':
      return { border: '#EF4444', text: '#B91C1C' };
    case 'medium':
      return { border: '#F59E0B', text: '#B45309' };
    case 'low':
      return { border: '#10B981', text: '#047857' };
    default:
      return { border: '#D8D5D2', text: '#66615C' };
  }
}

// Helper function to generate mock suggestions based on section content
// In a real implementation, this would be replaced with AI-generated suggestions
function generateSuggestions(sectionTitle: string, sectionContent: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Skip empty content
  if (!sectionContent.trim()) {
    return [];
  }
  
  // Generate different suggestions based on section type
  if (sectionTitle.toLowerCase().includes('qualifications')) {
    suggestions.push({
      id: 'qual-1',
      type: 'inclusivity',
      title: 'Use more inclusive language in requirements',
      description: 'Some qualification requirements may unintentionally exclude qualified candidates.',
      original: 'Minimum 5 years of experience required. Must be able to work under pressure and handle multiple tasks.',
      suggested: 'Typically requires 3-5 years of relevant experience. Demonstrates ability to prioritize effectively in dynamic environments.',
      impact: 'high'
    });
    
    suggestions.push({
      id: 'qual-2',
      type: 'clarity',
      title: 'Clarify technical requirements',
      description: 'Technical requirements could be more specific to attract qualified candidates.',
      original: 'Experience with data analysis tools.',
      suggested: 'Experience with data analysis tools such as Excel, Power BI, or Tableau. Familiarity with SQL is a plus.',
      impact: 'medium'
    });
  } else if (sectionTitle.toLowerCase().includes('responsibilities')) {
    suggestions.push({
      id: 'resp-1',
      type: 'structure',
      title: 'Group related responsibilities',
      description: 'Organizing responsibilities into logical groups improves readability.',
      original: '- Manage projects\n- Write reports\n- Coordinate with stakeholders\n- Analyze data\n- Present findings',
      suggested: '**Project Management:**\n- Manage projects from planning to completion\n- Coordinate with diverse stakeholders\n\n**Analysis & Reporting:**\n- Analyze data to identify trends and insights\n- Write comprehensive reports\n- Present findings to leadership team',
      impact: 'medium'
    });
    
    suggestions.push({
      id: 'resp-2',
      type: 'tone',
      title: 'Use more action-oriented language',
      description: 'Action verbs create a more engaging and dynamic description of responsibilities.',
      original: 'The candidate will be responsible for managing the team and ensuring project delivery.',
      suggested: 'Lead a diverse team to deliver high-impact projects that advance our mission and create measurable social change.',
      impact: 'medium'
    });
  } else if (sectionTitle.toLowerCase().includes('organization')) {
    suggestions.push({
      id: 'org-1',
      type: 'tone',
      title: 'Enhance mission statement impact',
      description: 'A more inspiring mission statement can attract mission-aligned candidates.',
      original: 'Our organization works to improve education in developing countries.',
      suggested: 'Our organization is dedicated to transforming educational opportunities in underserved communities across the Global South, empowering the next generation of leaders through innovative, sustainable learning solutions.',
      impact: 'high'
    });
  } else if (sectionTitle.toLowerCase().includes('summary') || sectionTitle.toLowerCase().includes('overview')) {
    suggestions.push({
      id: 'sum-1',
      type: 'clarity',
      title: 'Clarify role impact',
      description: 'Be more specific about how this role contributes to organizational mission.',
      original: 'This is an important role in our organization.',
      suggested: 'This role directly contributes to our mission by designing and implementing programs that improve educational outcomes for over 10,000 children annually across our partner communities.',
      impact: 'high'
    });
    
    suggestions.push({
      id: 'sum-2',
      type: 'jargon',
      title: 'Simplify technical language',
      description: 'Some terminology may be unclear to candidates outside your organization.',
      original: 'The candidate will implement our MERL framework and support the PME team with KPI tracking.',
      suggested: 'The candidate will implement our Monitoring, Evaluation, Research and Learning (MERL) framework and support the Program Monitoring & Evaluation team with tracking key performance indicators.',
      impact: 'medium'
    });
  } else if (sectionTitle.toLowerCase().includes('contract') || sectionTitle.toLowerCase().includes('salary')) {
    suggestions.push({
      id: 'sal-1',
      type: 'inclusivity',
      title: 'Add salary transparency',
      description: 'Including salary ranges promotes equity and attracts more diverse candidates.',
      original: 'Competitive salary based on experience.',
      suggested: 'Salary range: $60,000-$75,000 annually, depending on experience and qualifications. We\'re committed to pay equity within our organization.',
      impact: 'high'
    });
    
    suggestions.push({
      id: 'sal-2',
      type: 'clarity',
      title: 'Clarify benefits package',
      description: 'More detailed benefits information helps candidates evaluate the total compensation.',
      original: 'Benefits package included.',
      suggested: 'Benefits include: health insurance with dental and vision coverage, 4 weeks paid vacation, 10 paid holidays, 5 sick days, flexible work arrangements, and professional development opportunities.',
      impact: 'medium'
    });
  }
  
  // Add generic suggestions for any section type if we don't have enough specific ones
  if (suggestions.length < 2) {
    if (sectionContent.includes('must') || sectionContent.includes('required')) {
      suggestions.push({
        id: 'gen-1',
        type: 'inclusivity',
        title: 'Use more inclusive language',
        description: 'Soften requirements to encourage a more diverse applicant pool.',
        original: 'Must have 3+ years of experience. Required to work evenings occasionally.',
        suggested: 'Typically requires 3+ years of experience. The role occasionally involves evening work for special events.',
        impact: 'medium'
      });
    }
    
    if (sectionContent.length > 100 && !sectionContent.includes('\n')) {
      suggestions.push({
        id: 'gen-2',
        type: 'structure',
        title: 'Improve readability with bullet points',
        description: 'Breaking up dense text into bullet points improves readability.',
        original: sectionContent.substring(0, 100) + '...',
        suggested: '• ' + sectionContent.substring(0, 50) + '...\n• ' + sectionContent.substring(50, 100) + '...',
        impact: 'low'
      });
    }
    
    if (!sectionContent.includes('impact') && !sectionContent.includes('mission')) {
      suggestions.push({
        id: 'gen-3',
        type: 'tone',
        title: 'Emphasize mission impact',
        description: 'Connecting this section to your mission can attract purpose-driven candidates.',
        original: sectionContent.substring(0, 100) + '...',
        suggested: sectionContent.substring(0, 100) + '... This work directly contributes to our mission of creating sustainable social impact in communities we serve.',
        impact: 'medium'
      });
    }
  }
  
  return suggestions;
}