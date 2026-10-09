import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';

const Locais = () => {
  const [locais, setLocais] = useState([]);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const { data } = await api.get('/locais/');
      setLocais(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locais/', { nome });
      setNome('');
      carregarDados();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao salvar local");
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Deseja realmente excluir?")) return;
    try {
      await api.delete(`/locais/${id}`);
      carregarDados();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Locais de Estoque</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSalvar} className="flex gap-4">
            <input
              type="text"
              required
              placeholder="Nome do Local (Ex: Prateleira A, Galpão 1)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center">
              <Plus className="h-5 w-5 mr-2" /> Salvar Local
            </button>
          </form>
        </div>

        <div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando...</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Local</th>
                  <th className="px-6 py-4 font-medium w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {locais.map((loc) => (
                  <tr key={loc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{loc.nome}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleExcluir(loc.id)} className="text-red-500 hover:text-red-700 font-medium">Excluir</button>
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

export default Locais;
