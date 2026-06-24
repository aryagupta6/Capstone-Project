import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import useAuthStore from '../utils/authStore';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user?.status === 'ACTIVE') {
      fetchDashboardStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      const { data } = await api.get('/dashboard/usage');
      setMetrics(data.data);
    } catch (err) {
      setError('Could not query API consumption logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // If user is pending admin approval (Section 9.1)
  if (user?.status === 'PENDING_APPROVAL') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center bg-white rounded-lg shadow border border-gray-100 my-8">
        <div className="flex justify-center mb-6">
          <span className="p-4 bg-yellow-50 text-yellow-600 rounded-full">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Registration Pending Approval</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Thank you for registering {user.businessName || 'your company'}! Our administration team is validating your business details. You will be able to generate API keys and make requests as soon as your account is activated.
        </p>
        <div className="text-xs text-gray-400">
          Email: <span className="font-semibold">{user.email}</span>
        </div>
      </div>
    );
  }

  // If user is suspended
  if (user?.status === 'SUSPENDED') {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 sm:px-6 lg:px-8 text-center bg-white rounded-lg shadow border border-gray-100 my-8">
        <div className="flex justify-center mb-6">
          <span className="p-4 bg-red-50 text-red-600 rounded-full">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h1>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Your organization developer account has been suspended by system administrators. Please reach out to customer support to resolve plan billing or misuse flags.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-500 font-medium">Querying platform state...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Client Console</h1>
        <p className="mt-1.5 text-sm text-gray-500">Welcome, developer from {user?.businessName || 'your organization'}</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Usage summary cards (Section 9.2) */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Daily quota usage */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Consumption</dt>
          <dd className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics?.used24h || 0}</span>
            <span className="text-xs font-medium text-gray-400">/ {metrics?.limit === 1000000 ? 'Unlimited' : `${metrics?.limit?.toLocaleString()} limit`}</span>
          </dd>
          <div className="mt-3.5 w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${Math.min(((metrics?.used24h || 0) / (metrics?.limit || 1)) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Monthly consumption */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Requests</dt>
          <dd className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{(metrics?.usedMonth || 0).toLocaleString()}</span>
          </dd>
          <p className="mt-3.5 text-xs text-gray-400 font-medium">Aggregated billing cycle start</p>
        </div>

        {/* Card 3: Avg Response Time */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Latency (24h)</dt>
          <dd className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-gray-900">{metrics?.avgResponseTime || 0}</span>
            <span className="text-xs font-semibold text-gray-400">ms</span>
          </dd>
          <p className="mt-3.5 text-xs text-green-600 font-semibold flex items-center">
            <span className="mr-1">●</span> SLA target: Sub-100ms
          </p>
        </div>

        {/* Card 4: Success Rate */}
        <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-100 p-5">
          <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Request Success Rate</dt>
          <dd className="mt-2">
            <span className="text-2xl font-bold text-gray-900">{metrics?.successRate || 100}%</span>
          </dd>
          <p className="mt-3.5 text-xs text-gray-400 font-medium">Integrity rating of developer clients</p>
        </div>
      </div>

      {/* Next Steps Quickstart section */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900">🚀 Quickstart Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">Step 1</span>
            <h3 className="text-sm font-semibold text-gray-800 mt-1 mb-2">Get API Credentials</h3>
            <p className="text-xs text-gray-500 mb-4">Go to credentials tab to generate and configure client API keys.</p>
            <Link to="/api-keys" className="text-xs font-semibold text-blue-600 hover:text-blue-500">Configure keys →</Link>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">Step 2</span>
            <h3 className="text-sm font-semibold text-gray-800 mt-1 mb-2">Test Search Sandbox</h3>
            <p className="text-xs text-gray-500 mb-4">Query villages and view real hierarchical address structures live.</p>
            <Link to="/search" className="text-xs font-semibold text-blue-600 hover:text-blue-500">Try sandbox →</Link>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">Step 3</span>
            <h3 className="text-sm font-semibold text-gray-800 mt-1 mb-2">Read Documentation</h3>
            <p className="text-xs text-gray-500 mb-4">Review integration examples for Axios, cURL, Python, and Swagger.</p>
            <a href="http://localhost:3000/docs" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:text-blue-500">Interactive API Docs →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
