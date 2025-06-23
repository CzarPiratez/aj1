import React from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AIFallbackPageProps {
  onRetry: () => void;
  isRetrying?: boolean;
  message?: string;
  draftId?: string;
  canRetry?: boolean;
}

export function AIFallbackPage({ 
  onRetry, 
  isRetrying = false,
  message,
  draftId,
  canRetry = true
}: AIFallbackPageProps) {
  const defaultMessage = "It looks like my AI assistant is currently busy helping others — we're hitting a temporary limit. But don't worry — your input is saved, and I'll be ready to resume shortly.\n\nYou can try again in a few minutes, or continue drafting manually if you'd like.";

  return (
    <div className="h-full flex items-center justify-center p-6" style={{ backgroundColor: '#F9F7F4' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ y: 10 }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: '#FBE4D5' }}
          >
            <Brain className="w-10 h-10" style={{ color: '#D5765B' }} />
          </motion.div>
          
          <h2 
            className="text-2xl font-medium mb-3"
            style={{ color: '#3A3936' }}
          >
            AI Assistant Paused
          </h2>
          
          <p 
            className="text-base font-light mb-2"
            style={{ color: '#66615C' }}
          >
            {message || defaultMessage}
          </p>
          
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Clock className="w-4 h-4" style={{ color: '#D5765B' }} />
            <p className="text-sm" style={{ color: '#D5765B' }}>
              Your input is safely saved
            </p>
          </div>
        </div>
        
        <Card 
          className="border-0 shadow-sm mb-6"
          style={{ backgroundColor: '#FFFFFF' }}
        >
          <CardContent className="p-6">
            <div className="space-y-4">
              {canRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="w-full h-12 rounded-xl font-normal text-white hover:opacity-90 transition-all duration-200"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  {isRetrying ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Retrying AI Generation...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span>Try Again</span>
                    </div>
                  )}
                </Button>
              )}
              
              <div className="flex items-start space-x-3 p-4 rounded-lg" style={{ backgroundColor: '#F1EFEC' }}>
                <div className="mt-0.5">
                  <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p 
                    className="text-sm font-medium mb-1"
                    style={{ color: '#3A3936' }}
                  >
                    Your progress is saved
                  </p>
                  <p 
                    className="text-sm font-light"
                    style={{ color: '#66615C' }}
                  >
                    You can safely close this window and return later. Your job description draft will be waiting for you.
                  </p>
                </div>
              </div>
              
              {!canRetry && (
                <div className="flex items-start space-x-3 p-4 rounded-lg" style={{ backgroundColor: '#FEF3CD' }}>
                  <div className="mt-0.5">
                    <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
                  </div>
                  <div>
                    <p 
                      className="text-sm font-medium mb-1"
                      style={{ color: '#92400E' }}
                    >
                      AI temporarily unavailable
                    </p>
                    <p 
                      className="text-sm font-light"
                      style={{ color: '#92400E' }}
                    >
                      Our AI system is currently offline. Please check back in a few minutes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p 
            className="text-xs font-light mb-2"
            style={{ color: '#66615C' }}
          >
            Need immediate assistance?
          </p>
          <Button
            variant="link"
            className="text-xs font-normal"
            style={{ color: '#D5765B' }}
          >
            Contact Support
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}