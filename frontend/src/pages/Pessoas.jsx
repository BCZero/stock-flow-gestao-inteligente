import { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import api from '../services/api';
import { mensagemErro } from '../services/estoque';
import {
  Botao, CabecalhoPagina, Campo, Carregando, Cartao, Celula, EstadoVazio, Etiqueta, Linha, Selecao, Tabela, useAvisos,
} from '../components/ui';

const tipos = {
  CLIENTE: { rotulo: 'Cliente', tom: 'marca' },
  FORNECEDOR: { rotulo: 'Fornecedor', tom: 'destaque' },
};

const Pessoas = () => {
  const { avisar, confirmar } = useAvisos();
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
      avisar(mensagemErro(error), 'perigo');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/pessoas/', { tipo, nome, cpf_cnpj: cpfCnpj });
      setNome(''); setCpfCnpj('');
      avisar(tipos[tipo].rotulo + ' cadastrado.');
      carregarDados();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao salvar pessoa', 'perigo');
    }
  };

  const handleExcluir = async (pessoa) => {
    const ok = await confirmar({ titulo: 'Excluir cadastro?', texto: `"${pessoa.nome}" será removido.`, acao: 'Excluir' });
    if (!ok) return;
    try {
      await api.delete(`/pessoas/${pessoa.id}`);
      avisar('Cadastro excluído.');
      carregarDados();
    } catch (error) {
      avisar(error.response?.data?.detail || 'Erro ao excluir cadastro', 'perigo');
    }
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Clientes e fornecedores" icone={Users} descricao="Quem compra de você e de quem você compra." />

      <Cartao titulo="Novo cadastro">
        <form onSubmit={handleSalvar} className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
          <Selecao label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}
            opcoes={Object.entries(tipos).map(([value, { rotulo }]) => ({ value, label: rotulo }))} />
          <Campo label="Nome ou razão social" required value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder={tipo === 'CLIENTE' ? 'Maria Souza' : 'Distribuidora Exemplo Ltda.'} />
          <Botao type="submit" icone={Plus}>Salvar</Botao>
        </form>
      </Cartao>

      <Cartao titulo="Cadastros" semPadding>
        {loading ? <Carregando /> : pessoas.length === 0 ? (
          <EstadoVazio icone={Users} titulo="Cadastre clientes e fornecedores" texto="Fornecedores são obrigatórios nas compras; clientes são opcionais nas vendas." />
        ) : (
          <Tabela colunas={[{ titulo: 'Tipo', className: 'w-36' }, { titulo: 'Nome' }, { titulo: 'Ações', className: 'w-32 text-right' }]}>
            {pessoas.map((pes) => (
              <Linha key={pes.id}>
                <Celula><Etiqueta tom={tipos[pes.tipo]?.tom}>{tipos[pes.tipo]?.rotulo ?? pes.tipo}</Etiqueta></Celula>
                <Celula className="font-medium text-slate-900">{pes.nome}</Celula>
                <Celula className="text-right">
                  <Botao variante="perigoDiscreto" icone={Trash2} onClick={() => handleExcluir(pes)}>Excluir</Botao>
                </Celula>
              </Linha>
            ))}
          </Tabela>
        )}
      </Cartao>
    </div>
  );
};

export default Pessoas;
