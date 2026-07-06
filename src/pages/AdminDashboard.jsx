import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, Database, LogOut } from 'lucide-react';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Admin Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{user?.email}</span>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Platform Settings</h1>
          <p className="text-gray-400">Manage your AI Resume Builder configurations and users.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Settings Card */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">General Settings</h3>
            <p className="text-gray-400 text-sm mb-4">Configure global application variables and limits.</p>
            <button className="text-blue-400 text-sm font-medium hover:text-blue-300">Manage Settings &rarr;</button>
          </div>

          {/* Users Card */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">User Management</h3>
            <p className="text-gray-400 text-sm mb-4">View and manage authenticated users and profiles.</p>
            <button className="text-green-400 text-sm font-medium hover:text-green-300">View Users &rarr;</button>
          </div>

          {/* Database Card */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
              <Database className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Database Stats</h3>
            <p className="text-gray-400 text-sm mb-4">Monitor database storage, resumes generated, and API usage.</p>
            <button className="text-purple-400 text-sm font-medium hover:text-purple-300">View Stats &rarr;</button>
          </div>
        </div>

        {/* Detailed Settings Section Placeholder */}
        <div className="mt-12 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold">API Configurations</h2>
          </div>
          <div className="p-6">
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-gray-400 mb-2">OpenRouter API Key (Placeholder)</label>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  value="sk-or-v1-***************************"
                  readOnly
                  className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-500"
                />
                <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors">
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
