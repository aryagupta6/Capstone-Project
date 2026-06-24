import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Access Control selection state
  const [selectedUser, setSelectedUser] = useState(null);
  const [userAllowedStates, setUserAllowedStates] = useState([]);

  useEffect(() => {
    fetchUsersAndStates();
  }, []);

  const fetchUsersAndStates = async () => {
    try {
      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.data || []);
      
      const statesRes = await api.get('/states?limit=100'); // Fetch all states
      setStates(statesRes.data.data || []);
    } catch (err) {
      setError('Failed to fetch user accounts or state catalogs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, status) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/admin/users/${userId}/status`, { status });
      if (data.success) {
        setSuccess(`User status updated to ${status} successfully.`);
        fetchUsersAndStates();
      }
    } catch (err) {
      setError('Failed to update user status.');
    }
  };

  const handleUpdatePlan = async (userId, planType) => {
    setError('');
    setSuccess('');
    try {
      const { data } = await api.post(`/admin/users/${userId}/plan`, { planType });
      if (data.success) {
        setSuccess(`User plan updated to ${planType} successfully.`);
        fetchUsersAndStates();
      }
    } catch (err) {
      setError('Failed to update user plan.');
    }
  };

  const handleOpenAccessModal = (user) => {
    setSelectedUser(user);
    // Gather state IDs currently allowed
    const currentIds = user.stateAccess?.map((a) => a.stateId) || [];
    setUserAllowedStates(currentIds);
  };

  const handleToggleState = (stateId) => {
    setUserAllowedStates((prev) => 
      prev.includes(stateId) ? prev.filter((id) => id !== stateId) : [...prev, stateId]
    );
  };

  const handleSaveAccess = async () => {
    if (!selectedUser) return;
    setError('');
    setSuccess('');

    try {
      const { data } = await api.post(`/admin/users/${selectedUser.id}/access`, { 
        stateIds: userAllowedStates 
      });
      if (data.success) {
        setSuccess(`Access permission matrix updated for ${selectedUser.email}.`);
        setSelectedUser(null);
        fetchUsersAndStates();
      }
    } catch (err) {
      setError('Failed to save state access rules.');
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500 font-medium">Fetching active client directories...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">B2B Developer Accounts</h1>
        <p className="mt-1.5 text-sm text-gray-500">Approve new B2B registration requests, configure plan quotas, and assign state-level access constraints.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* State Access Controls Modal overlay */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-xl border border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Manage State Access Mapping</h3>
              <p className="text-xs text-gray-500 mt-1">Select the states authorized for {selectedUser.email} ({selectedUser.businessName || 'No Business Name'}). Only applies to FREE and PREMIUM tiers.</p>
            </div>

            <div className="overflow-y-auto flex-1 grid grid-cols-2 gap-3 py-2 border-y border-gray-100 pr-2">
              {states.map((state) => (
                <label key={state.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 select-none">
                  <input
                    type="checkbox"
                    checked={userAllowedStates.includes(state.id)}
                    onChange={() => handleToggleState(state.id)}
                    className="h-4.5 w-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-gray-700">{state.stateName}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAccess}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold"
              >
                Save Matrix Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User listing card grid/table */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Accounts Directory</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan Tier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">State Bounds</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Manage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((userAccount) => (
                <tr key={userAccount.id}>
                  {/* Business Name */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{userAccount.businessName || 'N/A'}</div>
                    <div className="text-xs text-gray-400">GST: {userAccount.gstNumber || 'None'}</div>
                  </td>
                  {/* Email & Phone */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-xs font-mono font-bold text-gray-600">{userAccount.email}</div>
                    <div className="text-[10px] text-gray-400 font-semibold">{userAccount.phone || 'No phone'}</div>
                  </td>
                  {/* Status badge */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      userAccount.status === 'ACTIVE' 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : userAccount.status === 'PENDING_APPROVAL' 
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {userAccount.status}
                    </span>
                  </td>
                  {/* Plan dropdown selection */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {userAccount.role === 'ADMIN' ? (
                      <span className="text-xs font-bold text-purple-600">SYSTEM ADMIN</span>
                    ) : (
                      <select
                        value={userAccount.planType}
                        onChange={(e) => handleUpdatePlan(userAccount.id, e.target.value)}
                        className="text-xs font-bold bg-gray-50 border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PREMIUM">PREMIUM</option>
                        <option value="PRO">PRO</option>
                        <option value="UNLIMITED">UNLIMITED</option>
                      </select>
                    )}
                  </td>
                  {/* State limits count */}
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                    {userAccount.role === 'ADMIN' || ['PRO', 'UNLIMITED'].includes(userAccount.planType) ? (
                      <span className="text-green-600 font-semibold">All States (Unbounded)</span>
                    ) : (
                      <span>{userAccount.stateAccess?.length || 0} States allowed</span>
                    )}
                  </td>
                  {/* Manager action toggles */}
                  <td className="px-4 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                    {userAccount.role !== 'ADMIN' && (
                      <>
                        {userAccount.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleUpdateStatus(userAccount.id, 'ACTIVE')}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold"
                          >
                            Approve
                          </button>
                        )}
                        {userAccount.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUpdateStatus(userAccount.id, 'SUSPENDED')}
                            className="text-red-600 hover:text-red-950"
                          >
                            Suspend
                          </button>
                        )}
                        {userAccount.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleUpdateStatus(userAccount.id, 'ACTIVE')}
                            className="text-green-600 hover:text-green-950 font-semibold"
                          >
                            Unsuspend
                          </button>
                        )}
                        
                        {!['PRO', 'UNLIMITED'].includes(userAccount.planType) && (
                          <button
                            onClick={() => handleOpenAccessModal(userAccount)}
                            className="text-blue-600 hover:text-blue-950 ml-2"
                          >
                            Manage Access
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
