import React from 'react';
import { motion } from 'framer-motion';

interface SplitScreenProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  leftWidth?: string;
  rightWidth?: string;
}

export function SplitScreen({ 
  leftContent, 
  rightContent, 
  leftWidth = "50%", 
  rightWidth = "50%" 
}: SplitScreenProps) {
  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ backgroundColor: '#F9F7F4' }}>
      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col justify-center"
        style={{ width: leftWidth }}
      >
        {leftContent}
      </motion.div>

      {/* Right Panel */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col justify-center"
        style={{ width: rightWidth }}
      >
        {rightContent}
      </motion.div>
    </div>
  );
}