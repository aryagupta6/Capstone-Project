import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../utils/authStore';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'ADMIN';

  // Helper to determine if link is active
  const isActive = (path) => location.pathname === path;
  
  const linkClass = (path) => 
    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
      isActive(path) 
        ? 'border-blue-600 text-gray-900' 
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center mr-8">
                <span className="text-xl font-bold text-blue-600 tracking-tight">Village API</span>
                {isAdmin && <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded">Admin</span>}
              </div>
              
              <div className="hidden sm:flex sm:space-x-8">
                {!isAdmin ? (
                  <>
                    <Link to="/" className={linkClass('/')}>Dashboard</Link>
                    <Link to="/search" className={linkClass('/search')}>Search sandbox</Link>
                    <Link to="/api-keys" className={linkClass('/api-keys')}>API Credentials</Link>
                    <Link to="/usage" className={linkClass('/usage')}>Consumption</Link>
                    <Link to="/docs" className={linkClass('/docs')}>API Reference</Link>
                  </>
                ) : (
                  <>
                    <Link to="/admin" className={linkClass('/admin')}>Overview</Link>
                    <Link to="/admin/users" className={linkClass('/admin/users')}>B2B Accounts</Link>
                    <Link to="/admin/logs" className={linkClass('/admin/logs')}>API Traffic Logs</Link>
                    <Link to="/admin/villages" className={linkClass('/admin/villages')}>Village Browser</Link>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-semibold text-gray-500">{user?.email}</span>
                {!isAdmin && <span className="text-[10px] text-blue-600 font-bold tracking-wider">{user?.planType} PLAN</span>}
              </div>
              
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 border border-red-200 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 hover:text-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-1 w-full">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-400">
          Village API © {new Date().getFullYear()} — Production Grade geographical SaaS
        </div>
      </footer>
    </div>
  );
}
