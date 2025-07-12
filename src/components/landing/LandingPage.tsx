import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Heart, 
  GraduationCap, 
  Leaf, 
  Shield, 
  Globe, 
  Users, 
  User, 
  CheckCircle, 
  X,
  Target,
  Building,
  Activity,
  Briefcase,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function LandingPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [, setShowSuccessMessage] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) throw error;

        // Verify user profile exists
        if (data.user) {
          const { error: profileError } = await supabase
            .from('users')
            .select('id')
            .eq('id', data.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { error: createError } = await supabase
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || '',
                avatar_url: data.user.user_metadata?.avatar_url || null,
              });

            if (createError) {
              console.error('Error creating user profile:', createError);
            }
          }
        }

        toast.success('Welcome back to AidJobs!');
      } else {
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

        if (error) throw error;

        if (data.user && !data.user.email_confirmed_at) {
          setShowSuccessMessage(true);
        } else {
          toast.success('Account created successfully!');
        }

        setEmail('');
        setPassword('');
        setName('');
      }
    } catch (error: any) {
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
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [email, password, isLogin, name]);

    const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setResetEmailSent(true);
      toast.success('Password reset email sent!');

    } catch (error: any) {
      let errorMessage = 'An error occurred. Please try again.';

      if (error.message?.includes('User not found')) {
        errorMessage = 'There is no user with this email address. Please check your email and try again.';
      } else if (error.message?.includes('Unable to validate email address')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message?.includes('Email rate limit exceeded')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
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
    setPassword(false);
    setShowSuccessMessage(false);
  };

  const dismissSuccessMessage = () => {
    setShowSuccessMessage(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ backgroundColor: '#F9F7F4' }}>
      {/* Main Content */}
      <div className="h-full overflow-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="grid lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto min-h-[calc(100vh-120px)]">

            {/* Left Column - Form Card (Reduced width by 15% + 20px spacing) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1 lg:col-span-4 flex flex-col justify-center"
              style={{ marginRight: '20px' }} // Added 20px spacing
            >
              {/* Success Message Banner */}
              <AnimatePresence>
                {setShowSuccessMessage() && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="mb-4 rounded-xl shadow-sm overflow-hidden relative"
                    style={{ backgroundColor: '#F5F3F0' }}
                  >
                    <div 
                      className="absolute left-0 top-0 w-1 h-full"
                      style={{ backgroundColor: '#D5765B' }}
                    ></div>
                    <div className="pl-4 pr-3 py-3 flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: '#FBE4D5' }}
                        >
                          <CheckCircle 
                            className="w-3 h-3"
                            style={{ color: '#D5765B' }}
                          />
                        </div>
                        <div>
                          <h3 
                            className="font-normal text-sm mb-1"
                            style={{ color: '#2D2B28' }}
                          >
                            Welcome to AidJobs!
                          </h3>
                          <p 
                            className="font-light text-xs leading-relaxed"
                            style={{ color: '#5A5651' }}
                          >
                            Please check your email to confirm your account.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={dismissSuccessMessage}
                        className="flex-shrink-0 p-1 rounded-full hover:bg-black/5 transition-colors duration-200"
                        style={{ color: '#66615C' }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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

                {showForgotPassword ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    {resetEmailSent ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Email Sent!</h3>
                        <p className="text-gray-600 mb-6">
                          We've sent a password reset link to <strong>{email}</strong>. 
                          Check your inbox and follow the instructions to reset your password.
                        </p>
                        <Button
                          type="button"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setResetEmailSent(false);
                            setEmail('');
                          }}
                          className="text-orange-600 hover:text-orange-700 font-medium"
                        >
                          Back to Sign In
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="text-center mb-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Reset Your Password</h3>
                          <p className="text-gray-600">
                            Enter your email address and we'll send you a link to reset your password.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="reset-email" className="text-xs font-normal" style={{ color: '#3A3936' }}>
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3" style={{ color: '#66615C' }} />
                            <Input
                              id="reset-email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              required
                              className="pl-9 h-10 rounded-xl border font-light text-sm"
                              style={{
                                backgroundColor: '#FFFFFF',
                                borderColor: '#D8D5D2',
                                color: '#3A3936'
                              }}
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="w-full h-10 rounded-xl font-normal text-white hover:opacity-90 transition-opacity duration-200 flex items-center justify-center gap-2 text-sm"
                          style={{ backgroundColor: '#D5765B' }}
                        >
                          {loading ? 'Sending...' : 'Send Reset Email'}
                        </Button>

                        <Button
                          type="button"
                          onClick={() => setShowForgotPassword(false)}
                          className="w-full text-gray-600 hover:text-gray-800 font-medium py-2"
                        >
                          Back to Sign In
                        </Button>
                      </>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <AnimatePresence mode="wait">
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
                    </AnimatePresence>

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
                      <div className="flex justify-between items-center">
                        <Label
                          htmlFor="password"
                          className="text-xs font-normal"
                          style={{ color: '#3A3936' }}
                        >
                          Password
                        </Label>
                        {isLogin && (
                          <Button
                            type="button"
                            variant="link"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-xs font-normal hover:opacity-70 transition-opacity duration-200"
                            style={{ color: '#66615C' }}
                            disabled={loading}
                          >
                            Forgot Password?
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3 h-3"
                          style={{ color: '#66615C' }}
                        />
                        <Input
                          id="password"
                          type={password ? 'text' : 'password'}
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
                          onClick={() => setPassword(!password)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 transition-opacity duration-200"
                          style={{ color: '#66615C' }}
                          disabled={loading}
                        >
                          {password ? (
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

                    {/* Toggle between Sign In and Sign Up */}
                    <div className="text-center space-y-2">

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
                )}
              </div>
            </motion.div>

            {/* Right Column - Trust Logos, INGOs & Insights (Expanded width) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="order-1 lg:order-2 lg:col-span-8 flex flex-col justify-center space-y-5"
            >
              {/* Trust Section */}
              <div>
                <div className="text-center lg:text-left mb-3">
                  <h2 
                    className="text-lg font-light mb-2"
                    style={{ color: '#3A3936' }}
                  >
                    Trusted by mission-driven organizations worldwide
                  </h2>
                </div>

                {/* Impact Sectors */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 items-center mb-4">
                  {impactSectors.map((sector, index) => (
                    <motion.div
                      key={sector.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.05 }}
                      className="flex items-center justify-center p-2 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300"
                      style={{ backgroundColor: '#F1EFEC' }}
                    >
                      <div className="text-center">
                        <div 
                          className="w-5 h-5 rounded-md flex items-center justify-center mb-1 mx-auto"
                          style={{ backgroundColor: '#FBE4D5' }}
                        >
                          <sector.icon 
                            className="w-2.5 h-2.5"
                            style={{ color: '#D5765B' }}
                          />
                        </div>
                        <p 
                          className="text-xs font-light"
                          style={{ color: '#66615C' }}
                        >
                          {sector.name}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* High-Profile INGOs - First Row */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {highProfileINGOs.slice(0, 4).map((org, index) => (
                    <motion.div
                      key={org.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
                      className="flex items-center justify-center p-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      <div className="text-center">
                        <div 
                          className="w-6 h-6 rounded-lg flex items-center justify-center mb-1 mx-auto"
                          style={{ backgroundColor: org.bgColor }}
                        >
                          <org.icon 
                            className="w-3 h-3"
                            style={{ color: org.iconColor }}
                          />
                        </div>
                        <p 
                          className="text-xs font-medium leading-tight"
                          style={{ color: '#3A3936' }}
                        >
                          {org.name}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* High-Profile INGOs - Second Row */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {highProfileINGOs.slice(4, 8).map((org, index) => (
                    <motion.div
                      key={org.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.8 + index * 0.05 }}
                      className="flex items-center justify-center p-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                      style={{ backgroundColor: '#FFFFFF' }}
                    >
                      <div className="text-center">
                        <div 
                          className="w-6 h-6 rounded-lg flex items-center justify-center mb-1 mx-auto"
                          style={{ backgroundColor: org.bgColor }}
                        >
                          <org.icon 
                            className="w-3 h-3"
                            style={{ color: org.iconColor }}
                          />
                        </div>
                        <p 
                          className="text-xs font-medium leading-tight"
                          style={{ color: '#3A3936' }}
                        >
                          {org.name}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                  className="text-center lg:text-left"
                >
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: '#FBE4D5' }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: '#D5765B' }}
                    ></div>
                    <p 
                      className="text-xs font-light"
                      style={{ color: '#3A3936' }}
                    >
                      AI-powered matching • 10,000+ opportunities • Purpose-driven careers
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Today's Insights & SDG Alignment Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 
                    className="text-sm font-medium"
                    style={{ color: '#3A3936' }}
                  >
                    Today's Insights & SDG Alignment
                  </h3>
                  <Badge 
                    variant="outline" 
                    className="text-xs px-2 py-0.5" 
                    style={{ borderColor: '#D8D5D2', color: '#66615C' }}
                  >
                    <Activity className="w-2 h-2 mr-1" />
                    Real-time
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {impactStats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.3 + index * 0.05 }}
                    >
                      <Card 
                        className="text-center border-0 shadow-sm hover:shadow-md transition-all duration-200"
                        style={{ backgroundColor: '#F1EFEC' }}
                      >
                        <CardContent className="p-2">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <stat.icon className="w-2 h-2" style={{ color: '#D5765B' }} />
                            <p 
                              className="text-xs font-medium"
                              style={{ color: '#3A3936' }}
                            >
                              {stat.value}
                            </p>
                            {stat.change && (
                              <span className="text-xs" style={{ color: '#D5765B' }}>
                                +{stat.change}%
                              </span>
                            )}
                          </div>
                          <p 
                            className="text-xs font-light leading-tight"
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
            </motion.div>
          </div>
        </div>
      </div>

      {/* Copyright text - Fixed at bottom left */}
      <div className="absolute bottom-0 left-0 py-4 px-4 bg-transparent">
        <p 
          className="text-xs font-light"
          style={{ color: '#66615C' }}
        >
          © AidJobs 2025
        </p>
      </div>
    </div>
  );
}

// Updated impact sectors with requested changes
const impactSectors = [
  { name: 'Global Health', icon: Heart },
  { name: 'Education', icon: GraduationCap },
  { name: 'Environment', icon: Leaf },
  { name: 'Human Rights', icon: Shield },
  { name: 'Livelihood', icon: Briefcase },
  { name: 'More...', icon: MoreHorizontal },
];

// High-profile INGOs and aid agencies with dummy logos
const highProfileINGOs = [
  { name: 'UNICEF', icon: Heart, bgColor: '#E3F2FD', iconColor: '#1976D2' },
  { name: 'WHO', icon: Shield, bgColor: '#E8F5E8', iconColor: '#388E3C' },
  { name: 'WFP', icon: Globe, bgColor: '#FFF3E0', iconColor: '#F57C00' },
  { name: 'UNHCR', icon: Users, bgColor: '#F3E5F5', iconColor: '#7B1FA2' },
  { name: 'Oxfam', icon: Leaf, bgColor: '#E0F2F1', iconColor: '#00695C' },
  { name: 'MSF', icon: Heart, bgColor: '#FFEBEE', iconColor: '#D32F2F' },
  { name: 'Save', icon: Shield, bgColor: '#E8EAF6', iconColor: '#3F51B5' },
  { name: 'IRC', icon: Globe, bgColor: '#FFF8E1', iconColor: '#FBC02D' },
];

// Impact stats data matching the dashboard
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