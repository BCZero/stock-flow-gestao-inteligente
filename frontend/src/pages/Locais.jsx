import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { mensagemErro } from '../services/estoque';
import {
  Botao, CabecalhoPagina, Campo, Carregando, Cartao, Celula, EstadoVazio, Linha, Tabela, useAvisos,
} from '../components/ui';

const Locais = () => {
  const { avisar, confirmar } = useAvisos();
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
      avisar(mensagemErro(error), 'perigo');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/locais/', { nome });
      setNome('');
      avisar('Local cadastrado.');
      carregarDados();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao salvar local', 'perigo');
    }
  };

  const handleExcluir = async (local) => {
    const ok = await confirmar({ titulo: 'Excluir local?', texto: `"${local.nome}" será removido do cadastro.`, acao: 'Excluir' });
    if (!ok) return;
    try {
      await api.delete(`/locais/${local.id}`);
      avisar('Local excluído.');
      carregarDados();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao excluir cadastro', 'perigo');
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Locais de estoque" icone={MapPin} descricao="Onde os produtos ficam guardados: depósito, balcão, prateleira." />

      <Cartao titulo="Novo local">
        <form onSubmit={handleSalvar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Campo label="Nome do local" className="flex-1" required value={nome}
            placeholder="Depósito, Prateleira A, Galpão 1…" onChange={(e) => setNome(e.target.value)} />
          <Botao type="submit" icone={Plus}>Salvar local</Botao>
        </form>
      </Cartao>

      <Cartao titulo="Locais cadastrados" semPadding>
        {loading ? <Carregando /> : locais.length === 0 ? (
          <EstadoVazio icone={MapPin} titulo="Cadastre seu primeiro local" texto="Compras, vendas e ajustes sempre indicam um local de estoque." />
        ) : (
          <Tabela colunas={[{ titulo: 'Local' }, { titulo: 'Ações', className: 'w-32 text-right' }]}>
            {locais.map((loc) => (
              <Linha key={loc.id}>
                <Celula className="font-medium text-slate-900">
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-marca-500" aria-hidden="true" />{loc.nome}</span>
                </Celula>
                <Celula className="text-right">
                  <Botao variante="perigoDiscreto" icone={Trash2} onClick={() => handleExcluir(loc)}>Excluir</Botao>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </div>
  );
};

export default Locais;
