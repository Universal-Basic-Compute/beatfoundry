'use client';

import { useState, useEffect } from 'react';

const PASSWORD = 'SyntheticsSouls';

export default function PasswordProtection({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated in localStorage
    const auth = localStorage.getItem('beatfoundry_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('beatfoundry_auth', 'true');
      setError('');
    } else {
      setError('Incorrect password');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-12 h-12">
          <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md p-8 bg-card rounded-xl shadow-lg border border-border">
          <div className="flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-3">
              <path d="M9 18V5l12-2v13"></path>
              <circle cx="6" cy="18" r="3"></circle>
              <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <h1 className="text-2xl font-bold">BeatFoundry</h1>
          </div>
          
          <h2 className="text-xl font-semibold mb-6 text-center">Password Protected</h2>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="password" className="block mb-2 text-sm font-medium">
                Enter Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                placeholder="Password"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full p-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Access Site
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
