import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function Usage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsage();
  }, []);

  const fetchUsage = async () => {
    try {
      const { data } = await api.get('/usage');
      setUsage(data.data);
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  // Mock data for charts (in production, this would come from API)
  const usageData = [
    { date: 'Mon', requests: 45 },
    { date: 'Tue', requests: 52 },
    { date: 'Wed', requests: 38 },
    { date: 'Thu', requests: 65 },
    { date: 'Fri', requests: 48 },
    { date: 'Sat', requests: 30 },
    { date: 'Sun', requests: 25 },
  ];

  const pieData = [
    { name: 'Used', value: usage?.used || 0 },
    { name: 'Remaining', value: typeof usage?.remaining === 'number' ? usage.remaining : 0 },
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">API Usage</h1>
        <p className="mt-2 text-sm text-gray-600">Monitor your API consumption</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Overview</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Plan Type</span>
              <span className="text-sm font-medium text-gray-900">{usage?.plan}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Requests Used (24h)</span>
              <span className="text-sm font-medium text-gray-900">{usage?.used || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Daily Limit</span>
              <span className="text-sm font-medium text-gray-900">
                {usage?.limit === Infinity ? 'Unlimited' : usage?.limit}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Remaining</span>
              <span className="text-sm font-medium text-gray-900">{usage?.remaining}</span>
            </div>
            <div className="pt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{
                    width: `${usage?.limit === Infinity ? 0 : ((usage?.used || 0) / (usage?.limit || 1)) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Weekly Requests</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={usageData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="requests" stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Tip</h3>
        <p className="text-sm text-blue-700">
          Upgrade your plan to get higher rate limits and access to premium features.
        </p>
      </div>
    </div>
  );
}
