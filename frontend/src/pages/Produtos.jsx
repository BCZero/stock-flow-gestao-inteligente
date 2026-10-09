import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';

const Produtos = () => {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [sku, setSku] = useState('');
  const [nome, setNome] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [estoqueMin, setEstoqueMin] = useState(0);
  const [idCategoria, setIdCategoria] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [resProd, resCat] = await Promise.all([
        api.get('/produtos/'),
        api.get('/categorias/')
      ]);
      setProdutos(resProd.data);
      setCategorias(resCat.data);
      if (resCat.data.length > 0) setIdCategoria(resCat.data[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/produtos/', {
        sku,
        nome,
        unidade_medida: unidade,
        estoque_minimo: parseFloat(estoqueMin),
        id_categoria: parseInt(idCategoria)
      });
      setSku(''); setNome(''); setEstoqueMin(0);
      carregarDados();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao salvar produto");
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Excluir produto?")) return;
    try {
      await api.delete(`/produtos/${id}`);
      carregarDados();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Produtos</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Novo Produto</h2>
          
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-1 lg:col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
              <input type="text" required value={sku} onChange={e=>setSku(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" placeholder="Código Único" />
            </div>
            <div className="col-span-1 md:col-span-1 lg:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Produto</label>
              <input type="text" required value={nome} onChange={e=>setNome(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select value={idCategoria} onChange={e=>setIdCategoria(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-blue-500">
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="col-span-1 flex items-end">
              <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 flex items-center justify-center text-sm font-medium">
                <Plus className="h-4 w-4 mr-1" /> Salvar
              </button>
            </div>
          </form>
        </div>

        <div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 font-medium">Categoria ID</th>
                  <th className="px-6 py-4 font-medium w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {produtos.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-gray-500">{p.sku}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{p.nome}</td>
                    <td className="px-6 py-4 text-gray-500">Cat: #{p.id_categoria}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleExcluir(p.id)} className="text-red-500 hover:text-red-700 font-medium">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Produtos;
