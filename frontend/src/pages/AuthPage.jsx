import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import SignInForm from '../components/auth/SignInForm';
import SignUpForm from '../components/auth/SignUpForm';
import { Button } from '../components/ui/button';
import useAuthStore from '../stores/authStore';

const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, clearError } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Clear any existing errors when switching between forms
    clearError();
  }, [isSignUp, clearError]);

  const handleAuthSuccess = (result) => {
    if (isSignUp && result?.autoLogin) {
      // User was automatically logged in after registration
      navigate('/home');
    } else if (isSignUp) {
      // Show success message and redirect to sign-in
      setShowSuccessMessage(true);
      setTimeout(() => {
        setIsSignUp(false);
        setShowSuccessMessage(false);
      }, 3000);
    } else {
      // Regular sign-in
      navigate('/home');
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setShowSuccessMessage(false);
  };

  return (
    <AuthLayout
      title={isSignUp ? 'Create Account' : 'Welcome Back'}
      description={
        isSignUp
          ? 'Create your LLM_MODES account to get started'
          : 'Sign in to your LLM_MODES account'
      }
    >
      <div className="space-y-6">
        {showSuccessMessage && (
          <div className="p-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md animate-fade-in">
            <div className="flex items-center">
              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Account created successfully! Redirecting to sign in...
            </div>
          </div>
        )}

        <div className={`transition-all duration-300 ${showSuccessMessage ? 'opacity-50 pointer-events-none' : ''}`}>
          {isSignUp ? (
            <SignUpForm onSuccess={handleAuthSuccess} />
          ) : (
            <SignInForm onSuccess={handleAuthSuccess} />
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <Button
            variant="link"
            onClick={toggleAuthMode}
            className="p-0 h-auto font-medium text-blue-600 hover:text-blue-700 transition-colors"
            disabled={showSuccessMessage}
          >
            {isSignUp ? 'Sign in here' : 'Create account here'}
          </Button>
        </div>
        
        {/* Additional Features */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>🔒 End-to-end encrypted</p>
          <p>⚡ Lightning fast</p>
          <p>🌍 Available worldwide</p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default AuthPage;