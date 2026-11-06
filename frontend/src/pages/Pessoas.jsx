import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import api from '../services/api';

const Pessoas = () => {
  const [pessoas, setPessoas] = useState([]);
  const [tipo, setTipo] = useState('CLIENTE');
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const { data } = await api.get('/pessoas/');
      setPessoas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pessoas/', { tipo, nome, cpf_cnpj: cpfCnpj });
      setNome(''); setCpfCnpj('');
      carregarDados();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao salvar pessoa");
    }
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Deseja realmente excluir?")) return;
    try {
      await api.delete(`/pessoas/${id}`);
      carregarDados();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao excluir cadastro");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Clientes e Fornecedores</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <form onSubmit={handleSalvar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-blue-500">
                <option value="CLIENTE">Cliente</option>
                <option value="FORNECEDOR">Fornecedor</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2">
              <input type="text" required placeholder="Nome / Razão Social" value={nome} onChange={e=>setNome(e.target.value)} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="col-span-1 md:col-span-1 flex gap-2">
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
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {pessoas.map((pes) => (
                  <tr key={pes.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${pes.tipo === 'CLIENTE' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                        {pes.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{pes.nome}</td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleExcluir(pes.id)} className="text-red-500 hover:text-red-700 font-medium">Excluir</button>
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

export default Pessoas;
