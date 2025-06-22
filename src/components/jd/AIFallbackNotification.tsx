import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Edit3, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AIFallbackNotificationProps {
  onRetry: () => void;
  onContinueManually: () => void;
  isRetrying?: boolean;
  message?: string;
}

export function AIFallbackNotification({ 
  onRetry, 
  onContinueManually, 
  isRetrying = false,
  message 
}: AIFallbackNotificationProps) {
  const defaultMessage = "Looks like AI is temporarily offline — but don't worry, your job brief has been saved. You can continue drafting manually, or take a short break while we reconnect.\n\nThis happens rarely, and we'll notify you once everything's running smoothly again.";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-6"
    >
      <Card 
        className="border-0 shadow-sm"
        style={{ backgroundColor: '#FEF3CD' }}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#F59E0B' }}
            >
              <Brain className="w-4 h-4 text-white" />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 
                  className="text-sm font-medium"
                  style={{ color: '#92400E' }}
                >
                  🧠 Assistant Paused
                </h3>
                <div className="flex items-center space-x-1">
                  <div 
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#F59E0B' }}
                  />
                  <span className="text-xs" style={{ color: '#92400E' }}>
                    Reconnecting...
                  </span>
                </div>
              </div>
              
              <p 
                className="text-sm font-light leading-relaxed mb-4 whitespace-pre-line"
                style={{ color: '#92400E' }}
              >
                {message || defaultMessage}
              </p>
              
              <div className="flex items-center space-x-3">
                <Button
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="h-8 px-4 rounded-lg font-light text-white hover:opacity-90 transition-all duration-200 text-xs"
                  style={{ backgroundColor: '#D5765B' }}
                >
                  {isRetrying ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Trying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onContinueManually}
                  className="h-8 px-4 rounded-lg font-light text-xs border hover:shadow-sm transition-all duration-200"
                  style={{ 
                    borderColor: '#F59E0B',
                    color: '#92400E',
                    backgroundColor: '#FFFFFF'
                  }}
                >
                  <Edit3 className="w-3 h-3 mr-2" />
                  Continue Manually
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}