import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Paperclip, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatInputProps {
  onSend: (message: string) => void;
  onFileUpload?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ 
  onSend, 
  onFileUpload, 
  disabled = false, 
  placeholder = "Ask me anything about jobs, CVs, or matches..." 
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.max(60, Math.min(textareaRef.current.scrollHeight, 200));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    e.target.value = '';
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Here you would implement actual voice recording logic
  };

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <div className="p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      <motion.div
        className="relative rounded-2xl border transition-all duration-200 shadow-sm"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: isFocused ? '#D5765B' : '#D8D5D2',
          borderWidth: '1px',
        }}
        animate={{
          borderColor: isFocused ? '#D5765B' : '#D8D5D2',
          boxShadow: isFocused ? '0 0 0 3px rgba(213, 118, 91, 0.1)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div className="flex items-end space-x-2 p-3">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="flex-1 min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent font-light text-sm focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 leading-relaxed"
            style={{ 
              color: '#3A3936',
              boxShadow: 'none'
            }}
            disabled={disabled}
          />

          <motion.div
            whileHover={{ scale: canSend ? 1.1 : 1 }}
            whileTap={{ scale: canSend ? 0.9 : 1 }}
            className="flex-shrink-0"
          >
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="h-6 w-6 rounded-lg text-white transition-all duration-200 shadow-sm p-0 flex items-center justify-center"
              style={{ 
                backgroundColor: canSend ? '#D5765B' : '#D8D5D2',
                opacity: canSend ? 1 : 0.5
              }}
            >
              <ArrowUp className="w-3 h-3" />
            </Button>
          </motion.div>
        </div>

        <div 
          className="flex items-center justify-between px-3 pb-2 pt-1 border-t"
          style={{ borderColor: '#F1EFEC' }}
        >
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFileUpload}
              className="h-5 w-5 p-0 rounded-md hover:shadow-sm transition-all duration-200"
              style={{ color: '#66615C' }}
              disabled={disabled}
            >
              <Paperclip className="w-2.5 h-2.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRecording}
              className="h-5 w-5 p-0 rounded-md hover:shadow-sm transition-all duration-200"
              style={{ 
                color: isRecording ? '#D5765B' : '#66615C',
                backgroundColor: isRecording ? '#FBE4D5' : 'transparent'
              }}
              disabled={disabled}
            >
              {isRecording ? (
                <Square className="w-2.5 h-2.5" />
              ) : (
                <Mic className="w-2.5 h-2.5" />
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-1 text-xs" style={{ color: '#66615C' }}>
            <span>{input.length}</span>
            <span>/</span>
            <span>2000</span>
          </div>
        </div>
      </motion.div>
      
      <div className="flex justify-between items-center mt-2">
        <p 
          className="text-xs font-light"
          style={{ color: '#66615C' }}
        >
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}