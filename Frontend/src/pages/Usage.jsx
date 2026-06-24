import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

const COLORS = ['#3B82F6', '#E5E7EB'];

export default function Usage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      const { data } = await api.get('/dashboard/usage');
      setMetrics(data.data);
    } catch (err) {
      setError('Failed to fetch detailed API log metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500 font-medium">Analyzing API log streams...</div>;
  }

  // Calculate remaining or set to infinite
  const limit = metrics?.limit || 5000;
  const used = metrics?.used24h || 0;
  const remaining = limit === 1000000 ? 'Unlimited' : Math.max(limit - used, 0);

  const pieData = [
    { name: 'Used', value: used },
    { name: 'Remaining', value: typeof remaining === 'number' ? remaining : 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Consumption Analytics</h1>
        <p className="mt-1.5 text-sm text-gray-500">Monitor your daily quota, response time trends, and call success rates.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Analytics widgets grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Widget 1: Quota Breakdown */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 space-y-6">
          <h2 className="text-lg font-bold text-gray-900">Daily Quota Summary</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Subscription Tier</span>
              <span className="font-bold text-blue-600 tracking-wider">{metrics?.plan}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Requests Used (24h)</span>
              <span className="font-bold text-gray-800">{used.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Daily Limit</span>
              <span className="font-bold text-gray-800">
                {limit === 1000000 ? 'Unlimited' : limit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 font-medium">Remaining Quota</span>
              <span className="font-bold text-green-600">{typeof remaining === 'number' ? remaining.toLocaleString() : remaining}</span>
            </div>
            
            <div className="pt-2">
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${limit === 1000000 ? 0 : Math.min((used / limit) * 100, 100)}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Widget 2: Pie chart visualization */}
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Daily Quota Allocation</h2>
          {limit === 1000000 ? (
            <div className="h-48 flex items-center justify-center text-sm text-gray-500 italic">
              Unlimited Plan: Daily limits do not apply
            </div>
          ) : (
            <div className="flex items-center justify-center h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col text-center">
                <span className="text-lg font-bold text-gray-800">
                  {Math.round((used / limit) * 100)}%
                </span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Used</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Widget 3: Weekly requests line chart (Section 9.2) */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly API Call Timeline</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={metrics?.timeline || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                labelStyle={{ fontWeight: 'bold', color: '#111827' }}
              />
              <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
