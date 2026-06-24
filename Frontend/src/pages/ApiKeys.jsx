import { useState, useEffect } from 'react';
import api from '../utils/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Named API key creation state
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKeyDetails, setCreatedKeyDetails] = useState(null); // Displays plaintext secret once

  // Secret regeneration state
  const [regeneratedSecretDetails, setRegeneratedSecretDetails] = useState(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const { data } = await api.get('/api-keys');
      setKeys(data.data || []);
    } catch (err) {
      setError('Failed to retrieve keys.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setError('');
    setIsCreating(true);
    setCreatedKeyDetails(null);

    try {
      const { data } = await api.post('/api-keys/create', { keyName: newKeyName });
      if (data.success) {
        setCreatedKeyDetails(data.data);
        setNewKeyName('');
        fetchKeys();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate key.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async (keyString) => {
    if (!confirm('Are you sure you want to revoke this API credential? This action will break any live integrations utilizing this key.')) {
      return;
    }

    try {
      const { data } = await api.post('/revoke-key', { apiKey: keyString });
      if (data.success) {
        fetchKeys();
      }
    } catch (err) {
      setError('Failed to revoke API key.');
      console.error(err);
    }
  };

  const handleRegenerateSecret = async (keyString) => {
    if (!confirm('Are you sure you want to regenerate the API secret? The existing secret will be immediately invalidated.')) {
      return;
    }

    setError('');
    setRegeneratedSecretDetails(null);

    try {
      const { data } = await api.post('/api-keys/regenerate', { apiKey: keyString });
      if (data.success) {
        setRegeneratedSecretDetails({
          apiKey: keyString,
          apiSecret: data.apiSecret,
        });
        fetchKeys();
      }
    } catch (err) {
      setError('Failed to regenerate secret.');
      console.error(err);
    }
  };

  const copyToClipboard = (text, type = 'Value') => {
    navigator.clipboard.writeText(text);
    alert(`${type} copied to clipboard!`);
  };

  // Mask helper (Section 9.3)
  const maskKey = (keyStr) => {
    if (!keyStr) return '';
    return `${keyStr.slice(0, 7)}****${keyStr.slice(-4)}`;
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500 font-medium">Loading API Credentials...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">API Credentials</h1>
        <p className="mt-1.5 text-sm text-gray-500">Manage developer API keys and secrets to authorize B2B applications.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Secret presentation overlays (shown only once on creation/regeneration) */}
      {(createdKeyDetails || regeneratedSecretDetails) && (
        <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-lg space-y-4">
          <div className="flex items-center space-x-2 text-yellow-800">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-bold text-base">API Secret Key Generated (View Once)</h3>
          </div>
          
          <p className="text-sm text-yellow-700">
            This secret key is hashed using SHA-256 and stored securely. For security reasons, **it will not be shown again**. Copy and store it in a secure password manager now.
          </p>

          <div className="bg-white p-4 rounded border border-yellow-100 space-y-3 font-mono text-xs text-gray-800">
            <div>
              <span className="font-bold text-gray-500 block mb-1">API KEY:</span>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <span>{createdKeyDetails?.apiKey || regeneratedSecretDetails?.apiKey}</span>
                <button
                  onClick={() => copyToClipboard(createdKeyDetails?.apiKey || regeneratedSecretDetails?.apiKey, 'API Key')}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div>
              <span className="font-bold text-gray-500 block mb-1">API SECRET:</span>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded border border-red-100">
                <span className="text-red-600 font-bold">{createdKeyDetails?.apiSecret || regeneratedSecretDetails?.apiSecret}</span>
                <button
                  onClick={() => copyToClipboard(createdKeyDetails?.apiSecret || regeneratedSecretDetails?.apiSecret, 'API Secret')}
                  className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setCreatedKeyDetails(null);
              setRegeneratedSecretDetails(null);
            }}
            className="px-4 py-2 bg-yellow-600 text-white text-xs font-semibold rounded hover:bg-yellow-700 transition-colors"
          >
            I have stored this secret securely
          </button>
        </div>
      )}

      {/* API Key Creation Form */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create New API Key</h2>
        <form onSubmit={handleCreateKey} className="flex gap-4 max-w-lg">
          <input
            type="text"
            required
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g., Production Server, Staging Environment"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <button
            type="submit"
            disabled={isCreating || keys.filter(k => k.isActive).length >= 5}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 text-sm transition-colors disabled:bg-gray-400"
          >
            {isCreating ? 'Generating...' : 'Generate Key'}
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-400">Maximum of 5 active keys allowed per account.</p>
      </div>

      {/* Keys display table */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Your Active API Keys</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No keys found. Please generate a key above to authorize requests.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Key Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">API Key</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{key.keyName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{maskKey(key.apiKey)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        key.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-3">
                      <button
                        onClick={() => copyToClipboard(key.apiKey, 'API Key')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Copy
                      </button>
                      {key.isActive && (
                        <>
                          <button
                            onClick={() => handleRegenerateSecret(key.apiKey)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            Regen Secret
                          </button>
                          <button
                            onClick={() => handleRevokeKey(key.apiKey)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration Code Snippets */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">cURL Integration Example</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-xs font-mono">
{`# Autocomplete search request
curl -X GET "http://localhost:3000/v1/search?q=manibeli" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-api-secret: YOUR_API_SECRET"`}
        </pre>
      </div>
    </div>
  );
}
