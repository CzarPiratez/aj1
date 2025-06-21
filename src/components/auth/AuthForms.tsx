import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AuthFormsProps {
  onSuccess?: () => void;
}

export function AuthForms({ onSuccess }: AuthFormsProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isLogin && !name) {
      toast.error('Please enter your full name');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Basic password validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        console.log('🔐 Attempting to sign in with:', { email });
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        
        if (error) {
          console.error('❌ Sign in error:', error);
          throw error;
        }
        
        console.log('✅ Sign in successful:', data.user?.email);
        
        // Wait a moment for the auth state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast.success('Welcome back to AidJobs!');
        onSuccess?.();
      } else {
        console.log('📝 Attempting to sign up with:', { email, name });
        
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              name: name.trim(),
              full_name: name.trim(),
            },
          },
        });
        
        if (error) {
          console.error('❌ Sign up error:', error);
          throw error;
        }
        
        console.log('✅ Sign up successful:', data.user?.email);
        
        if (data.user && !data.user.email_confirmed_at) {
          toast.success('Account created! Please check your email to confirm your account.');
        } else {
          toast.success('Account created successfully!');
          onSuccess?.();
        }
        
        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (error: any) {
      console.error('❌ Authentication error:', error);
      
      let errorMessage = 'An error occurred. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Try signing in instead.';
      } else if (error.message?.includes('Password should be at least')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message?.includes('Unable to validate email address')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('Email rate limit exceeded')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      } else if (error.message?.includes('Supabase not configured')) {
        errorMessage = 'Database connection error. Please check your configuration.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
  };

  return (
    <div 
      className="rounded-xl shadow-md p-6"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="mb-6">
        <motion.h1 
          key={isLogin ? 'login-title' : 'signup-title'}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl font-light mb-3"
          style={{ color: '#3A3936' }}
        >
          {isLogin ? 'Welcome to AidJobs' : 'Join AidJobs'}
        </motion.h1>
        <motion.p 
          key={isLogin ? 'login-subtitle' : 'signup-subtitle'}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="text-sm font-light leading-relaxed"
          style={{ color: '#66615C' }}
        >
          {isLogin 
            ? 'Your AI-powered path to purpose-driven work'
            : 'Start your journey to meaningful impact'
          }
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-1"
          >
            <Label 
              htmlFor="name" 
              className="text-xs font-normal"
              style={{ color: '#3A3936' }}
            >
              Full Name
            </Label>
            <div className="relative">
              <User 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3"
                style={{ color: '#66615C' }}
              />
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-10 rounded-xl border font-light text-sm"
                style={{ 
                  backgroundColor: '#FFFFFF',
                  borderColor: '#D8D5D2',
                  color: '#3A3936'
                }}
                required={!isLogin}
                disabled={loading}
              />
            </div>
          </motion.div>
        )}

        <div className="space-y-1">
          <Label 
            htmlFor="email" 
            className="text-xs font-normal"
            style={{ color: '#3A3936' }}
          >
            Email
          </Label>
          <div className="relative">
            <Mail 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3"
              style={{ color: '#66615C' }}
            />
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-10 rounded-xl border font-light text-sm"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#D8D5D2',
                color: '#3A3936'
              }}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label 
            htmlFor="password" 
            className="text-xs font-normal"
            style={{ color: '#3A3936' }}
          >
            Password
          </Label>
          <div className="relative">
            <Lock 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3"
              style={{ color: '#66615C' }}
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-9 h-10 rounded-xl border font-light text-sm"
              style={{ 
                backgroundColor: '#FFFFFF',
                borderColor: '#D8D5D2',
                color: '#3A3936'
              }}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 transition-opacity duration-200"
              style={{ color: '#66615C' }}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff className="w-3 h-3" />
              ) : (
                <Eye className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-xl font-normal text-white hover:opacity-90 transition-opacity duration-200 flex items-center justify-center gap-2 text-sm"
          style={{ backgroundColor: '#D5765B' }}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span className="text-xs">{isLogin ? 'Signing in...' : 'Creating account...'}</span>
            </div>
          ) : (
            <>
              {isLogin ? 'Get Started' : 'Create Account'}
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </Button>

        <div className="text-center space-y-2">
          {isLogin && (
            <button
              type="button"
              className="block text-xs font-light hover:opacity-70 transition-opacity duration-200 mx-auto"
              style={{ color: '#66615C' }}
              disabled={loading}
            >
              Forgot Password?
            </button>
          )}
          
          <div className="flex items-center justify-center">
            <span 
              className="text-xs font-light mr-1"
              style={{ color: '#66615C' }}
            >
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs font-normal hover:opacity-70 transition-opacity duration-200 underline underline-offset-2"
              style={{ color: '#D5765B' }}
              disabled={loading}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}