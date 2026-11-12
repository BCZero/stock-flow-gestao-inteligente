import { useState, useEffect } from 'react';
import { Plus, Tags, Trash2 } from 'lucide-react';
import api from '../services/api';
import { mensagemErro } from '../services/estoque';
import {
  Botao, CabecalhoPagina, Campo, Carregando, Cartao, Celula, EstadoVazio, Linha, Tabela, useAvisos,
} from '../components/ui';

const Categorias = () => {
  const { avisar, confirmar } = useAvisos();
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
      avisar(mensagemErro(error), 'perigo');
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
      avisar('Categoria cadastrada.');
      carregarCategorias();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao criar categoria', 'perigo');
    }
  };

  const handleExcluir = async (categoria) => {
    const ok = await confirmar({ titulo: 'Excluir categoria?', texto: `"${categoria.nome}" será removida do cadastro.`, acao: 'Excluir' });
    if (!ok) return;
    try {
      await api.delete(`/categorias/${categoria.id}`);
      avisar('Categoria excluída.');
      carregarCategorias();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao excluir categoria', 'perigo');
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Categorias" icone={Tags} descricao="Agrupe os produtos para organizar o catálogo e os relatórios." />

      <Cartao titulo="Nova categoria">
        <form onSubmit={handleSalvar} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Campo label="Nome da categoria" className="flex-1" required value={novaCategoria}
            placeholder="Bebidas, Limpeza, Eletrônicos…" onChange={(e) => setNovaCategoria(e.target.value)} />
          <Botao type="submit" icone={Plus}>Salvar categoria</Botao>
        </form>
      </Cartao>

      <Cartao titulo="Categorias cadastradas" semPadding>
        {loading ? <Carregando /> : categorias.length === 0 ? (
          <EstadoVazio icone={Tags} titulo="Crie sua primeira categoria" texto="Categorias são obrigatórias para cadastrar produtos." />
        ) : (
          <Tabela colunas={[{ titulo: 'Código', className: 'w-28' }, { titulo: 'Nome' }, { titulo: 'Ações', className: 'w-32 text-right' }]}>
            {categorias.map((cat) => (
              <Linha key={cat.id}>
                <Celula className="font-mono text-xs text-slate-400">#{cat.id}</Celula>
                <Celula className="font-medium text-slate-900">{cat.nome}</Celula>
                <Celula className="text-right">
                  <Botao variante="perigoDiscreto" icone={Trash2} onClick={() => handleExcluir(cat)}>Excluir</Botao>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </div>
  );
};

export default Categorias;
