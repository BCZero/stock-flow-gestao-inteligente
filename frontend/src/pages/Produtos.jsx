import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import { mensagemErro } from '../services/estoque';
import {
  Botao, CabecalhoPagina, Campo, Carregando, Cartao, Celula, EstadoVazio, Etiqueta, Linha, Selecao, Tabela, useAvisos,
} from '../components/ui';

const unidades = ['UN', 'CX', 'KG', 'G', 'L', 'ML', 'PCT', 'M'];

const Produtos = () => {
  const { avisar, confirmar } = useAvisos();
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
      if (resCat.data.length > 0) setIdCategoria((atual) => atual || resCat.data[0].id);
    } catch (error) {
      avisar(mensagemErro(error), 'perigo');
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
      avisar('Produto cadastrado.');
      carregarDados();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao salvar produto', 'perigo');
    }
  };

  const handleExcluir = async (produto) => {
    const ok = await confirmar({ titulo: 'Excluir produto?', texto: `${produto.sku} · ${produto.nome} será removido do catálogo.`, acao: 'Excluir' });
    if (!ok) return;
    try {
      await api.delete(`/produtos/${produto.id}`);
      avisar('Produto excluído.');
      carregarDados();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao excluir produto', 'perigo');
    }
  };

  const nomeCategoria = (produto) => produto.categoria?.nome
    ?? categorias.find((c) => c.id === produto.id_categoria)?.nome ?? '—';

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Produtos" icone={Package} descricao="Catálogo de itens controlados no estoque." />

      <Cartao titulo="Novo produto">
        {!loading && categorias.length === 0 ? (
          <EstadoVazio icone={Package} titulo="Cadastre uma categoria primeiro" texto="Todo produto pertence a uma categoria.">
            <Link to="/categorias" className="text-sm font-semibold text-marca-700 hover:text-marca-800">Ir para categorias</Link>
          </EstadoVazio>
        ) : (
          <form onSubmit={handleSalvar} className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-end xl:grid-cols-[150px_1fr_220px_220px_auto]">
            <Campo label="SKU" required value={sku} onChange={(e) => setSku(e.target.value)} placeholder="CAFE-250" />
            <Campo label="Nome do produto" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Café torrado 250 g" />
            <Selecao label="Categoria" value={idCategoria} onChange={(e) => setIdCategoria(e.target.value)}
              opcoes={categorias.map((c) => ({ value: c.id, label: c.nome }))} />
            <div className="grid grid-cols-2 gap-3">
              <Selecao label="Unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)}
                opcoes={unidades.map((u) => ({ value: u, label: u }))} />
              <Campo label="Mínimo" type="number" min="0" step="0.001" value={estoqueMin} onChange={(e) => setEstoqueMin(e.target.value)} />
            </div>
            <Botao type="submit" icone={Plus}>Salvar</Botao>
          </form>
        )}
      </Cartao>

      <Cartao titulo="Produtos cadastrados" semPadding
        acoes={produtos.length > 0 && <Etiqueta tom="marca">{produtos.length} itens</Etiqueta>}>
        {loading ? <Carregando /> : produtos.length === 0 ? (
          <EstadoVazio icone={Package} titulo="Nenhum produto no catálogo" texto="Cadastre o primeiro produto para começar a controlar o estoque." />
        ) : (
          <Tabela colunas={[
            { titulo: 'SKU' }, { titulo: 'Produto' }, { titulo: 'Categoria' },
            { titulo: 'Mínimo', className: 'text-right' }, { titulo: 'Ações', className: 'w-32 text-right' },
          ]}>
            {produtos.map((p) => (
              <Linha key={p.id}>
                <Celula className="whitespace-nowrap font-mono text-xs text-slate-500">{p.sku}</Celula>
                <Celula className="font-medium text-slate-900">{p.nome}</Celula>
                <Celula><Etiqueta tom="neutro">{nomeCategoria(p)}</Etiqueta></Celula>
                <Celula numero>{Number(p.estoque_minimo).toLocaleString('pt-BR')} {p.unidade_medida}</Celula>
                <Celula className="text-right">
                  <Botao variante="perigoDiscreto" icone={Trash2} onClick={() => handleExcluir(p)}>Excluir</Botao>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </div>
  );
};

export default Produtos;
