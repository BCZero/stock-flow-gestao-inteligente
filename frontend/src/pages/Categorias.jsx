import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCategorias();
  }, []);

  const carregarCategorias = async () => {
    try {
      const { data } = await api.get('/categorias/');
      setCategorias(data);
    } catch (error) {
      console.error("Erro ao carregar categorias", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    if (!novaCategoria) return;
    try {
      await api.post('/categorias/', { nome: novaCategoria });
      setNovaCategoria('');
      carregarCategorias();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao criar categoria");
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Deseja realmente excluir?")) return;
    try {
      await api.delete(`/categorias/${id}`);
      carregarCategorias();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Nova Categoria</h2>
          <form onSubmit={handleSalvar} className="flex gap-4">
            <input
              type="text"
              placeholder="Nome da Categoria (Ex: Eletrônicos)"
              value={novaCategoria}
              onChange={(e) => setNovaCategoria(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center">
              <Plus className="h-5 w-5 mr-2" /> Salvar
            </button>
          </form>
        </div>

        <div className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : categorias.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhuma categoria cadastrada.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {categorias.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">#{cat.id}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{cat.nome}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleExcluir(cat.id)} className="text-red-500 hover:text-red-700 font-medium">Excluir</button>
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

export default Categorias;
