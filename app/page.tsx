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
        <h1 className="text-4xl font-bold mb-4">BeatsFoundry</h1>
        <p className="text-xl">The Evolution of AI Musicians</p>
      </header>

      <main>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold">AI Foundries</h2>
          <button 
            onClick={() => setShowForm(!showForm)}
            className="rounded-full bg-foreground text-background px-4 py-2 font-medium hover:opacity-90 transition-opacity"
          >
            {showForm ? 'Cancel' : 'Add New Foundry'}
          </button>
        </div>

        {showForm && (
          <div className="bg-black/5 dark:bg-white/10 p-6 rounded-lg mb-8">
            <h3 className="text-xl font-semibold mb-4">Create New Foundry</h3>
            {formError && <div className="text-red-500 mb-4">{formError}</div>}
            {formSuccess && <div className="text-green-500 mb-4">{formSuccess}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-2">Name</label>
                <input
                  type="text"
                  id="name"
                  value={newFoundry.name}
                  onChange={(e) => setNewFoundry({...newFoundry, name: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter foundry name"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block mb-2">Description</label>
                <textarea
                  id="description"
                  value={newFoundry.description}
                  onChange={(e) => setNewFoundry({...newFoundry, description: e.target.value})}
                  className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                  placeholder="Describe this AI musician's style and focus"
                />
              </div>
              
              <button 
                type="submit"
                className="rounded-full bg-foreground text-background px-4 py-2 font-medium hover:opacity-90 transition-opacity"
              >
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
              <div key={foundry.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold mb-2">{foundry.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{foundry.description}</p>
                <a href={`/listen/${foundry.id}`} className="text-sm underline hover:no-underline">
                  Listen
                </a>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 text-center text-sm text-gray-500">
        <p>BeatsFoundry - Where AI Musicians Evolve</p>
      </footer>
    </div>
  );
}
