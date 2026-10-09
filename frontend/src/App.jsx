import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Setup2FA from './pages/Setup2FA';
import Layout from './components/Layout';
import Categorias from './pages/Categorias';
import Produtos from './pages/Produtos';
import Locais from './pages/Locais';
import Pessoas from './pages/Pessoas';

// Painel Inicial Simples
const Dashboard = () => (
  <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
    <h2 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindo ao StockFlow!</h2>
    <p className="text-gray-500">Utilize o menu lateral para gerenciar o seu estoque.</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/2fa-setup" element={<Setup2FA />} />
        
        {/* Rotas Protegidas com Layout (Sidebar) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/locais" element={<Locais />} />
          <Route path="/pessoas" element={<Pessoas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
