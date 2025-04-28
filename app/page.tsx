'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

type Foundry = {
  id: string;
  name: string;
  description: string;
};

export default function Home() {
  const [foundries, setFoundries] = useState<Foundry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [newFoundry, setNewFoundry] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchFoundries();
  }, []);

  const fetchFoundries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/foundries');
      if (!response.ok) throw new Error('Failed to fetch foundries');
      const data = await response.json();
      setFoundries(data);
    } catch (err) {
      setError('Error loading foundries. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    
    if (!newFoundry.name.trim() || !newFoundry.description.trim()) {
      setFormError('Name and description are required');
      return;
    }
    
    try {
      const response = await fetch('/api/foundries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFoundry)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          setFormError(`A foundry named "${newFoundry.name}" already exists`);
        } else {
          setFormError(data.error || 'Failed to create foundry');
        }
        return;
      }
      
      setFormSuccess(`Successfully created ${data.name}!`);
      setNewFoundry({ name: '', description: '' });
      fetchFoundries(); // Refresh the list
      setShowForm(false);
    } catch (err) {
      setFormError('An error occurred. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-12 text-center">
        <div className="flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-3">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
          <h1 className="text-4xl font-bold">BeatFoundry</h1>
        </div>
        <p className="text-xl text-muted-foreground">The Evolution of AI Musicians</p>
      </header>

      <main>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold">AI Foundries</h2>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 font-medium hover:opacity-90 transition-opacity"
          >
            {showForm ? 'Cancel' : 'Add New Foundry'}
          </button>
        </div>

        {showForm && (
          <div className="bg-card text-card-foreground p-8 rounded-xl mb-8 shadow-sm border border-border">
            <h3 className="text-xl font-bold mb-6">Create New Foundry</h3>
            {formError && <div className="text-destructive mb-4 p-3 bg-destructive/10 rounded-lg">{formError}</div>}
            {formSuccess && <div className="text-success mb-4 p-3 bg-success/10 rounded-lg">{formSuccess}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label htmlFor="name" className="block mb-2 font-medium">Name</label>
                <input
                  type="text"
                  id="name"
                  value={newFoundry.name}
                  onChange={(e) => setNewFoundry({...newFoundry, name: e.target.value})}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  placeholder="Enter foundry name"
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block mb-2 font-medium">Description</label>
                <textarea
                  id="description"
                  value={newFoundry.description}
                  onChange={(e) => setNewFoundry({...newFoundry, description: e.target.value})}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                  rows={3}
                  placeholder="Describe this AI musician's style and focus"
                />
              </div>
              
              <button 
                type="submit"
                className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium hover:bg-primary/90 transition-colors shadow-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 5v14"></path>
                  <path d="M5 12h14"></path>
                </svg>
                Create Foundry
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading foundries...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : foundries.length === 0 ? (
          <div className="text-center py-8">
            <p>No foundries found. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {foundries.map((foundry) => (
              <div key={foundry.id} className="border border-border rounded-xl p-6 hover:shadow-md transition-shadow bg-card">
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 font-semibold">
                    {foundry.name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-bold">{foundry.name}</h3>
                </div>
                <p className="text-muted-foreground mb-5">{foundry.description}</p>
                <a 
                  href={`/listen/${foundry.id}`} 
                  className="inline-flex items-center px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                  Listen
                </a>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p>BeatFoundry - Where AI Musicians Evolve</p>
      </footer>
    </div>
  );
}
