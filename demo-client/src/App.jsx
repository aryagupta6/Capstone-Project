import { useState, useEffect } from 'react';
import axios from 'axios';

// Demo API credentials (replace with your actual demo key)
const API_KEY = 'demo_api_key';
const API_SECRET = 'demo_api_secret';

function App() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    village: '',
    subDistrict: '',
    district: '',
    state: '',
    country: 'India',
    message: ''
  });

  const [villageQuery, setVillageQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (villageQuery.length >= 2) {
      fetchSuggestions(villageQuery);
    } else {
      setSuggestions([]);
    }
  }, [villageQuery]);

  const fetchSuggestions = async (query) => {
    try {
      const { data } = await axios.get(`/api/v1/autocomplete?q=${encodeURIComponent(query)}`, {
        headers: {
          'x-api-key': API_KEY,
          'x-api-secret': API_SECRET
        }
      });
      setSuggestions(data.data || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const handleVillageSelect = async (suggestion) => {
    setVillageQuery(suggestion.label.split(' (')[0]);
    setShowSuggestions(false);

    // Fetch full details
    try {
      const { data } = await axios.get(`/api/v1/search?q=${encodeURIComponent(suggestion.label.split(' (')[0])}&limit=1`, {
        headers: {
          'x-api-key': API_KEY,
          'x-api-secret': API_SECRET
        }
      });

      if (data.data && data.data.length > 0) {
        const village = data.data[0];
        setFormData({
          ...formData,
          village: village.hierarchy.village,
          subDistrict: village.hierarchy.subDistrict,
          district: village.hierarchy.district,
          state: village.hierarchy.state,
          country: village.hierarchy.country
        });
      }
    } catch (err) {
      console.error('Failed to fetch village details:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Contact Form Demo</h1>
            <p className="mt-2 text-sm text-gray-600">
              Powered by Village API - Autocomplete Address Selection
            </p>
          </div>

          {submitted && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">✓ Form submitted successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 1234567890"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address Details</h3>
              
              <div className="relative mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Village / Area * (Start typing to search)
                </label>
                <input
                  type="text"
                  required
                  value={villageQuery}
                  onChange={(e) => setVillageQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type village name..."
                />
                
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleVillageSelect(suggestion)}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{suggestion.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sub-District
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.subDistrict}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.district}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.state}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.country}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your message here..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
              Submit Form
            </button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>Demo Note:</strong> This form demonstrates the Village API autocomplete feature. 
              Address fields are automatically populated when you select a village.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
