import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, MapPin, Users, LogOut, Boxes, ShoppingCart, Receipt } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, path }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  
  return (
    <Link
      to={path}
      className={`flex items-center space-x-3 whitespace-nowrap px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-blue-50 text-blue-700 font-medium' 
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
      <span>{label}</span>
    </Link>
  );
};

const Layout = () => {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-dvh flex-col bg-gray-50 md:flex-row">
      {/* Sidebar */}
      <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white md:w-64 md:border-r">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">StockFlow</h1>
        </div>
        
        <div className="flex flex-1 gap-1 overflow-x-auto px-3 py-2 md:block md:space-y-1 md:overflow-y-auto md:py-4">
          <SidebarItem icon={LayoutDashboard} label="Painel" path="/dashboard" />
          <SidebarItem icon={Tags} label="Categorias" path="/categorias" />
          <SidebarItem icon={Package} label="Produtos" path="/produtos" />
          <SidebarItem icon={MapPin} label="Locais de Estoque" path="/locais" />
          <SidebarItem icon={Users} label="Pessoas" path="/pessoas" />
          <SidebarItem icon={Boxes} label="Estoque" path="/estoque" />
          <SidebarItem icon={ShoppingCart} label="Compras" path="/compras" />
          <SidebarItem icon={Receipt} label="Vendas" path="/vendas" />
        </div>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Ambiente Administrativo</h2>
        </header>
        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
