import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [emailFilter, setEmailFilter] = useState('');
  const [endpointFilter, setEndpointFilter] = useState('');
  const [statusCodeFilter, setStatusCodeFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 25,
      };
      if (emailFilter) params.email = emailFilter;
      if (endpointFilter) params.endpoint = endpointFilter;
      if (statusCodeFilter) params.statusCode = statusCodeFilter;

      const { data } = await api.get('/admin/logs', { params });
      if (data.success) {
        setLogs(data.data || []);
        const total = data.meta.total || 0;
        setTotalPages(Math.ceil(total / 25) || 1);
      }
    } catch (err) {
      setError('Failed to fetch API call logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setEmailFilter('');
    setEndpointFilter('');
    setStatusCodeFilter('');
    setPage(1);
    // State updates are async, so we query directly
    setTimeout(() => fetchLogs(), 0);
  };

  const handleDownloadCsv = () => {
    // Generate export URL with auth token
    const token = localStorage.getItem('token');
    const exportUrl = `http://localhost:3000/v1/admin/logs/export?token=${token}`;
    
    // Create hidden anchor element and trigger click
    const link = document.createElement('a');
    link.href = exportUrl;
    link.setAttribute('download', 'api_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (ms) => `${ms}ms`;

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return 'bg-green-50 text-green-700 border-green-100';
    if (code >= 400 && code < 500) return 'bg-yellow-50 text-yellow-700 border-yellow-100';
    return 'bg-red-50 text-red-700 border-red-100';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">API Request Logs</h1>
          <p className="mt-1.5 text-sm text-gray-500">Monitor programmatic API request counts, statuses, and execution latencies in real-time.</p>
        </div>
        <button
          onClick={handleDownloadCsv}
          className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center space-x-1.5 self-start"
        >
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export Logs (CSV)</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Filter panel */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3.5 uppercase tracking-wider">Search Filters</h2>
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">User Email</label>
            <input
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="e.g. client@company.com"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Endpoint Path</label>
            <input
              type="text"
              value={endpointFilter}
              onChange={(e) => setEndpointFilter(e.target.value)}
              placeholder="e.g. /search"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status Code</label>
            <input
              type="number"
              value={statusCodeFilter}
              onChange={(e) => setStatusCodeFilter(e.target.value)}
              placeholder="e.g. 429"
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="px-4 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold"
            >
              Apply
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500 font-medium">Loading traffic logs...</div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-8">No request logs match specified filters.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Business / User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">API Key Label</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Endpoint called</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Latency</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-bold text-gray-800">{log.user?.businessName || 'N/A'}</div>
                        <div className="text-[10px] font-mono text-gray-400">{log.user?.email}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-semibold">
                        {log.apiKey?.keyName || 'Unknown Key'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-gray-600">
                        {log.endpoint}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600 font-semibold">
                        {formatTime(log.responseTime)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-bold ${getStatusColor(log.statusCode)}`}>
                          {log.statusCode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
