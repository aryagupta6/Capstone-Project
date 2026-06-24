import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../utils/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.data);
    } catch (err) {
      setError('Failed to fetch admin stats. Ensure you are signed in as an administrator.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500 font-medium font-sans">Compiling global registry analytics...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Administration</h1>
        <p className="mt-1.5 text-sm text-gray-500">Monitor cluster traffic logs, user approval pipelines, and data counts.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Metrics widgets */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Villages</dt>
          <dd className="mt-2 text-2xl font-bold text-gray-900">{(stats?.totalVillages || 0).toLocaleString()}</dd>
          <p className="mt-3.5 text-xs text-green-600 font-semibold flex items-center">
            <span className="mr-1">●</span> 29 States & Union Territories
          </p>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active B2B Portals</dt>
          <dd className="mt-2 text-2xl font-bold text-gray-900">{stats?.activeUsers || 0}</dd>
          <p className="mt-3.5 text-xs text-gray-400 font-medium">Approved enterprise accounts</p>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Awaiting Approvals</dt>
          <dd className="mt-2 text-2xl font-bold text-yellow-600">{stats?.pendingUsers || 0}</dd>
          <p className="mt-3.5 text-xs text-yellow-600 font-semibold">
            Action required in user queue
          </p>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Latency</dt>
          <dd className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-gray-900">{stats?.avgResponseTime || 0}</span>
            <span className="text-xs font-semibold text-gray-400">ms</span>
          </dd>
          <p className="mt-3.5 text-xs text-green-600 font-semibold flex items-center">
            <span className="mr-1">●</span> Cluster healthy (Sub-100ms)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: Requests timeline */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Total System Traffic (30 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#4F46E5" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Top States by Village Count */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Top 10 States by Village Density</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.topStates || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={9} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Plan type distribution */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 flex flex-col justify-between col-span-1 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Plan Distribution</h2>
          <div className="flex flex-col md:flex-row items-center justify-around h-60">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats?.planDistribution || []}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    dataKey="value"
                  >
                    {(stats?.planDistribution || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 mt-4 md:mt-0 font-medium text-sm">
              {(stats?.planDistribution || []).map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="text-gray-600">{entry.name}:</span>
                  <span className="font-bold text-gray-800">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
