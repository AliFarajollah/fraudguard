import { useAuth } from '../context/AuthContext';
import { useNavigate, NavLink } from 'react-router-dom';

export function NavBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
            ? 'bg-blue-100 text-blue-700'
            : 'text-slate-600 hover:bg-slate-100'
        }`;

    return (
        <nav className="bg-white border-b border-slate-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-lg">F</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-800">FraudGuard</h1>
                    </div>

                    <div className="flex gap-2">
                        <NavLink to="/dashboard" className={navLinkClass}>
                            Dashboard
                        </NavLink>
                        <NavLink to="/score" className={navLinkClass}>
                            Score Transaction
                        </NavLink>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {user && (
                        <div className="text-right">
                            <div className="text-sm font-medium text-slate-800">
                                {user.email}
                            </div>
                            <div className="text-xs text-slate-500 capitalize">
                                {user.role}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}