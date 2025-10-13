
import {
  ChartBarIcon,
  FolderIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { FaChartBar } from "react-icons/fa";
import { FiDatabase } from "react-icons/fi";
import { Link, useLocation } from 'react-router-dom';



const navItems = [
  // { name: 'Dashboard', icon: ChartBarIcon, path: '/dashboard' },
  { name: 'Projects', icon: FolderIcon, path: '/projects' },
  { name: 'Resources', icon: UsersIcon, path: '/resources' },
  { name: 'Productivity', icon: FaChartBar, path: '/productivity' },
  { name: 'Billing', icon: CurrencyDollarIcon, path: '/billing' },
  { name: 'Invoices', icon: Cog6ToothIcon, path: '/invoices' },

  { name: 'Analysis', icon: CalculatorIcon, path: '/calculator' },
  { name: 'Master Database', icon: FiDatabase, path: '/masterdatabase' },
  // { name: 'Admin', icon: Cog6ToothIcon, path: '/admin' },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside className="w-64 h-screen bg-white border-r border-gray-200 p-4 flex flex-col">
      {/* Logo & Title */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <img src="https://img.icons8.com/ios-filled/50/brain.png" alt="Logo" className="w-6 h-6" />
          <h1 className="text-lg font-semibold">Project Management System</h1>
        </div>
        <p className="text-xs text-gray-400 ml-8">v1.0.0</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100"
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
