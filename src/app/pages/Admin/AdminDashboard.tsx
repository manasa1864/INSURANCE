import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Database, 
  FileText, 
  LogOut, 
  TrendingUp, 
  AlertTriangle,
  Upload,
  Play
} from 'lucide-react';
import { Link } from 'react-router';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex">
      
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="font-bold text-xl tracking-tight text-white">POLICYWISE <span className="text-[#1E64FF]">ADMIN</span></span>
        </div>
        
        <div className="flex-1 py-6 px-3 space-y-1">
          {[
            { id: 'overview', name: 'Overview', icon: LayoutDashboard },
            { id: 'companies', name: 'Companies & Policies', icon: FileText },
            { id: 'model', name: 'ML Model & Data', icon: Database },
            { id: 'audit', name: 'Audit Logs', icon: Users },
            { id: 'settings', name: 'Configuration', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-[#1E64FF] text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-slate-950 p-8 overflow-y-auto">
        
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            <h1 className="text-2xl font-bold text-white">System Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-1">Total Predictions</p>
                <p className="text-3xl font-bold text-white">12,450</p>
                <p className="text-green-500 text-xs mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12% this week</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-1">Active Policies</p>
                <p className="text-3xl font-bold text-white">845</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-1">Model Accuracy</p>
                <p className="text-3xl font-bold text-[#1E64FF]">94.2%</p>
                <p className="text-slate-500 text-xs mt-2">R2 Score: 0.89</p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <p className="text-slate-400 text-sm mb-1">High Risk Cases</p>
                <p className="text-3xl font-bold text-amber-500">128</p>
                <p className="text-amber-500/70 text-xs mt-2 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Requires Review</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-80">
                <h3 className="font-bold text-white mb-6">Prediction Requests (24h)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { h: '00', c: 120 }, { h: '04', c: 80 }, { h: '08', c: 250 }, 
                    { h: '12', c: 450 }, { h: '16', c: 380 }, { h: '20', c: 300 }, { h: '24', c: 150 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="h" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}} />
                    <Line type="monotone" dataKey="c" stroke="#1E64FF" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-80">
                <h3 className="font-bold text-white mb-6">Model Performance by Insurance Type</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Health', val: 92 }, { name: 'Vehicle', val: 96 }, { name: 'Life', val: 88 }, 
                    { name: 'Travel', val: 94 }, { name: 'Home', val: 90 }
                  ]} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                    <XAxis type="number" stroke="#64748b" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={60} stroke="#64748b" />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #334155'}} />
                    <Bar dataKey="val" fill="#1FB6A6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'model' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">ML Model Management</h1>
              <button className="bg-[#1E64FF] hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
                <Play className="w-4 h-4" /> Retrain Model
              </button>
            </div>

            <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 border-dashed flex flex-col items-center justify-center text-center">
              <div className="bg-slate-800 p-4 rounded-full mb-4">
                <Upload className="w-8 h-8 text-[#1E64FF]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Upload Training Dataset</h3>
              <p className="text-slate-400 max-w-md mb-6">Support for CSV, JSON, or Parquet files. Data must follow the v2.4 schema structure.</p>
              <button className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-slate-200 transition-colors">
                Select Files
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h3 className="font-bold text-white">Version History</h3>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Version</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Accuracy</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-300">
                  <tr>
                    <td className="px-6 py-4 font-mono text-white">v2.4.1</td>
                    <td className="px-6 py-4">Today, 10:00 AM</td>
                    <td className="px-6 py-4 text-green-400">94.2%</td>
                    <td className="px-6 py-4"><span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-bold">Active</span></td>
                    <td className="px-6 py-4"><button className="text-blue-400 hover:text-blue-300">Rollback</button></td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-mono">v2.4.0</td>
                    <td className="px-6 py-4">Yesterday</td>
                    <td className="px-6 py-4">93.8%</td>
                    <td className="px-6 py-4"><span className="bg-slate-700 text-slate-400 px-2 py-1 rounded text-xs">Archived</span></td>
                    <td className="px-6 py-4"><button className="text-blue-400 hover:text-blue-300">Deploy</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === 'companies' || activeTab === 'audit' || activeTab === 'settings') && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-in fade-in">
            <Settings className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-slate-400">Module Under Construction</h2>
            <p className="mt-2">This admin module is coming in the next sprint.</p>
          </div>
        )}

      </main>
    </div>
  );
};
