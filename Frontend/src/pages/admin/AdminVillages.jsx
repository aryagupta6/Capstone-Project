import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function AdminVillages() {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [subdistricts, setSubdistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSubdistrict, setSelectedSubdistrict] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    try {
      const { data } = await api.get('/states?limit=100');
      setStates(data.data || []);
    } catch (err) {
      setError('Failed to fetch states catalogue.');
    }
  };

  const handleStateChange = async (stateCode) => {
    setSelectedState(stateCode);
    setSelectedDistrict('');
    setSelectedSubdistrict('');
    setDistricts([]);
    setSubdistricts([]);
    setVillages([]);
    setPage(1);

    if (!stateCode) return;

    try {
      const { data } = await api.get(`/states/${stateCode}/districts?limit=100`);
      setDistricts(data.data || []);
    } catch (err) {
      setError('Failed to fetch districts for the selected state.');
    }
  };

  const handleDistrictChange = async (districtCode) => {
    setSelectedDistrict(districtCode);
    setSelectedSubdistrict('');
    setSubdistricts([]);
    setVillages([]);
    setPage(1);

    if (!districtCode) return;

    try {
      const { data } = await api.get(`/districts/${districtCode}/subdistricts?limit=150`);
      setSubdistricts(data.data || []);
    } catch (err) {
      setError('Failed to fetch sub-districts.');
    }
  };

  const handleSubdistrictChange = async (subdistrictCode) => {
    setSelectedSubdistrict(subdistrictCode);
    setVillages([]);
    setPage(1);
    
    if (!subdistrictCode) return;
    fetchVillages(subdistrictCode, 1, limit);
  };

  const fetchVillages = async (subdistrictCode, pageNum, pageSize) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/subdistricts/${subdistrictCode}/villages`, {
        params: {
          page: pageNum,
          limit: pageSize,
        }
      });
      setVillages(data.data || []);
    } catch (err) {
      setError('Failed to fetch villages.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (direction) => {
    const newPage = direction === 'next' ? page + 1 : page - 1;
    setPage(newPage);
    fetchVillages(selectedSubdistrict, newPage, limit);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Geographical Browser</h1>
        <p className="mt-1.5 text-sm text-gray-500">Explore, search, and audit states, districts, sub-districts, and villages inside the master dataset.</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Hierarchical dropdown selectors */}
      <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wider">Hierarchy Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* State selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">State Name (Required)</label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-gray-700"
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s.stateCode} value={s.stateCode}>{s.stateName}</option>
              ))}
            </select>
          </div>

          {/* District selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">District Name</label>
            <select
              disabled={!selectedState}
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-gray-700 disabled:opacity-50"
            >
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d.districtCode} value={d.districtCode}>{d.districtName}</option>
              ))}
            </select>
          </div>

          {/* Subdistrict selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Sub-District Name</label>
            <select
              disabled={!selectedDistrict}
              value={selectedSubdistrict}
              onChange={(e) => handleSubdistrictChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-gray-700 disabled:opacity-50"
            >
              <option value="">Select Sub-District</option>
              {subdistricts.map((sub) => (
                <option key={sub.subDistrictCode} value={sub.subDistrictCode}>{sub.subDistrictName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Villages results */}
      {selectedSubdistrict && (
        <div className="bg-white shadow rounded-lg border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Villages list
            </h2>
            <span className="text-xs font-semibold text-gray-500">
              Page size: {limit} rows
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500 font-medium">Querying villages...</div>
          ) : villages.length === 0 ? (
            <p className="text-sm text-gray-500 italic text-center py-8">No villages registered in this subdistrict.</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-gray-100 rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Village MDDS Code</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Village Name</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {villages.map((v) => (
                      <tr key={v.id}>
                        <td className="px-6 py-3.5 whitespace-nowrap text-xs font-mono font-bold text-gray-600">{v.villageCode}</td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-xs font-semibold text-gray-900">{v.villageName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center pt-4">
                <span className="text-xs text-gray-500">Page {page}</span>
                <div className="flex space-x-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => handlePageChange('prev')}
                    className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Previous
                  </button>
                  <button
                    disabled={villages.length < limit}
                    onClick={() => handlePageChange('next')}
                    className="px-3 py-1 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
