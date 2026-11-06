import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Setup2FA from './pages/Setup2FA';
import Layout from './components/Layout';
import Categorias from './pages/Categorias';
import Produtos from './pages/Produtos';
import Locais from './pages/Locais';
import Pessoas from './pages/Pessoas';
import Estoque from './pages/Estoque';
import Transacoes from './pages/Transacoes';
import Painel from './pages/Painel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/2fa-setup" element={<Setup2FA />} />
        
        {/* Rotas Protegidas com Layout (Sidebar) */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Painel />} />
          <Route path="/categorias" element={<Categorias />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/locais" element={<Locais />} />
          <Route path="/pessoas" element={<Pessoas />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/compras" element={<Transacoes key="compras" tipo="compras" />} />
          <Route path="/vendas" element={<Transacoes key="vendas" tipo="vendas" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
