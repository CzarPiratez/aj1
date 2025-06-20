import { useState, useCallback, useContext, createContext, ReactNode } from 'react';

// Enhanced app state with more granular tracking
export interface AppState {
  // Document states
  cvUploaded: boolean;
  cvAnalyzed: boolean;
  coverLetterGenerated: boolean;
  coverLetterRefined: boolean;
  
  // Job states
  jobSelected: boolean;
  jobPosted: boolean;
  jobMatched: boolean;
  jobSearchPerformed: boolean;
  
  // Organization states
  orgProfileCreated: boolean;
  
  // Career development states
  skillGapsAnalyzed: boolean;
  alternateRolesSuggested: boolean;
  
  // User journey tracking
  userType: 'candidate' | 'organization' | 'both' | null;
  onboardingCompleted: boolean;
  
  // Progress tracking
  completedActions: string[];
  suggestedNextActions: string[];
}

interface AppStateContextType {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  addCompletedAction: (action: string) => void;
  getSuggestedActions: () => string[];
  getToolAvailability: (toolId: string) => {
    isAvailable: boolean;
    reason?: string;
    suggestedAction?: string;
  };
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

const initialState: AppState = {
  cvUploaded: false,
  cvAnalyzed: false,
  coverLetterGenerated: false,
  coverLetterRefined: false,
  jobSelected: false,
  jobPosted: false,
  jobMatched: false,
  jobSearchPerformed: false,
  orgProfileCreated: false,
  skillGapsAnalyzed: false,
  alternateRolesSuggested: false,
  userType: null,
  onboardingCompleted: false,
  completedActions: [],
  suggestedNextActions: []
};

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // Auto-update suggested next actions based on new state
      newState.suggestedNextActions = calculateSuggestedActions(newState);
      
      return newState;
    });
  }, []);

  const addCompletedAction = useCallback((action: string) => {
    setState(prev => ({
      ...prev,
      completedActions: [...prev.completedActions, action]
    }));
  }, []);

  const getSuggestedActions = useCallback(() => {
    return calculateSuggestedActions(state);
  }, [state]);

  const getToolAvailability = useCallback((toolId: string) => {
    return checkToolAvailability(toolId, state);
  }, [state]);

  return (
    <AppStateContext.Provider value={{
      state,
      updateState,
      addCompletedAction,
      getSuggestedActions,
      getToolAvailability
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return context;
}

// Smart logic to suggest next actions based on current state
function calculateSuggestedActions(state: AppState): string[] {
  const suggestions: string[] = [];

  // Onboarding flow
  if (!state.onboardingCompleted) {
    if (!state.userType) {
      suggestions.push('Tell me about your role (candidate/organization)');
    }
    return suggestions;
  }

  // Candidate journey
  if (state.userType === 'candidate' || state.userType === 'both') {
    if (!state.cvUploaded) {
      suggestions.push('Upload your CV for analysis');
    } else if (!state.cvAnalyzed) {
      suggestions.push('Analyze your CV for insights');
    } else if (!state.jobSearchPerformed) {
      suggestions.push('Search for relevant jobs');
    } else if (!state.jobMatched) {
      suggestions.push('Find job matches for your profile');
    } else if (state.jobSelected && !state.coverLetterGenerated) {
      suggestions.push('Write a cover letter for selected job');
    }
  }

  // Organization journey
  if (state.userType === 'organization' || state.userType === 'both') {
    if (!state.jobPosted) {
      suggestions.push('Post a job or create job description');
    } else if (!state.orgProfileCreated) {
      suggestions.push('Create organization profile');
    }
  }

  // Advanced features
  if (state.cvUploaded && !state.skillGapsAnalyzed) {
    suggestions.push('Analyze skill gaps and opportunities');
  }

  return suggestions.slice(0, 3); // Limit to top 3 suggestions
}

// Enhanced tool availability checking with detailed feedback
function checkToolAvailability(toolId: string, state: AppState) {
  const toolRequirements: Record<string, {
    check: (state: AppState) => boolean;
    reason: string;
    suggestedAction: string;
  }> = {
    'upload-cv': {
      check: () => true,
      reason: '',
      suggestedAction: ''
    },
    'analyze-cv': {
      check: (state) => state.cvUploaded,
      reason: 'Upload your CV first',
      suggestedAction: 'Upload CV for Analysis'
    },
    'revise-cv': {
      check: (state) => state.jobSelected && state.cvUploaded,
      reason: 'Select a job and upload your CV first',
      suggestedAction: 'Search Jobs (AI-Powered)'
    },
    'cover-letter': {
      check: (state) => state.jobSelected,
      reason: 'Select a job first',
      suggestedAction: 'Search Jobs (AI-Powered)'
    },
    'refine-cover-letter': {
      check: (state) => state.coverLetterGenerated,
      reason: 'Generate a cover letter first',
      suggestedAction: 'Write Cover Letter'
    },
    'post-job': {
      check: () => true,
      reason: '',
      suggestedAction: ''
    },
    'search-jobs-ai': {
      check: () => true,
      reason: '',
      suggestedAction: ''
    },
    'manual-job-search': {
      check: () => true,
      reason: '',
      suggestedAction: ''
    },
    'match-cv': {
      check: (state) => state.cvUploaded,
      reason: 'Upload your CV first',
      suggestedAction: 'Upload CV for Analysis'
    },
    'skill-gaps': {
      check: (state) => state.cvUploaded && state.cvAnalyzed,
      reason: 'Upload and analyze your CV first',
      suggestedAction: 'Upload CV for Analysis'
    },
    'alternate-roles': {
      check: (state) => state.jobMatched || state.skillGapsAnalyzed,
      reason: 'Complete job matching or skill analysis first',
      suggestedAction: 'Match CV to Jobs'
    },
    'org-profile': {
      check: (state) => state.jobPosted,
      reason: 'Post a job first',
      suggestedAction: 'Post a Job / Generate JD'
    }
  };

  const requirement = toolRequirements[toolId];
  if (!requirement) {
    return { isAvailable: true };
  }

  const isAvailable = requirement.check(state);
  return {
    isAvailable,
    reason: isAvailable ? undefined : requirement.reason,
    suggestedAction: isAvailable ? undefined : requirement.suggestedAction
  };
}