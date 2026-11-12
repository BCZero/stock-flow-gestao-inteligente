import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Boxes, History, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';
import { Seletor } from '../components/CamposEstoque';
import { dataLocal, mensagemErro, nomeRegistro, useCadastrosEstoque } from '../services/estoque';
import {
  Botao, Campo, CabecalhoPagina, Carregando, Cartao, Celula, EstadoVazio, Etiqueta, Linha, Mensagem, Tabela,
  tipoMovimento, useAvisos,
} from '../components/ui';

const ajusteVazio = { id_produto: '', id_local: '', variacao: '', motivo: '' };
const qtd = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function consultarEstoque() {
  return Promise.all([api.get('/estoque/saldos'), api.get('/estoque/movimentacoes')]);
}

export default function Estoque() {
  const { avisar } = useAvisos();
  const { dados, erro: erroCadastros } = useCadastrosEstoque();
  const [saldos, setSaldos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [ajuste, setAjuste] = useState(ajusteVazio);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mais, setMais] = useState(false);
  const chave = useRef(null);

  function atualizar([saldo, historico]) {
    setSaldos(saldo.data);
    setMovimentos(historico.data);
    setMais(historico.data.length === 50);
  }

  useEffect(() => {
    let ativo = true;
    consultarEstoque().then((resultado) => {
      if (ativo) atualizar(resultado);
    }).catch((falha) => {
      if (ativo) setErro(mensagemErro(falha));
    });
    return () => { ativo = false; };
  }, []);

  function alterar(campoAjuste, valor) {
    chave.current = null;
    setAjuste((atual) => ({ ...atual, [campoAjuste]: valor }));
  }

  async function salvar(evento) {
    evento.preventDefault();
    setOcupado(true);
    try {
      chave.current ??= crypto.randomUUID();
      await api.post('/estoque/ajustes', { ...ajuste, chave: chave.current });
      chave.current = null;
      setAjuste(ajusteVazio);
      avisar('Ajuste registrado.');
      atualizar(await consultarEstoque());
    } catch (falha) {
      avisar(mensagemErro(falha), 'perigo');
    } finally {
      setOcupado(false);
    }
  }

  async function carregarMais() {
    setOcupado(true);
    try {
      const { data } = await api.get('/estoque/movimentacoes', { params: { antes_de: movimentos.at(-1).id } });
      setMovimentos((atuais) => [...atuais, ...data]);
      setMais(data.length === 50);
    } catch (falha) {
      avisar(mensagemErro(falha), 'perigo');
    } finally {
      setOcupado(false);
    }
  }

  const produto = (id) => dados?.produtos.find((p) => p.id === Number(id));
  const abaixoDoMinimo = (saldo) => {
    const minimo = Number(produto(saldo.id_produto)?.estoque_minimo ?? 0);
    return minimo > 0 && Number(saldo.quantidade) < minimo;
  };
  const criticos = saldos.filter(abaixoDoMinimo).length;

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Estoque" icone={Boxes} descricao="Saldos por produto e local, ajustes e histórico de movimentações." />
      {(erro || erroCadastros) && <Mensagem>{erro || erroCadastros}</Mensagem>}
      {!dados && !erroCadastros && <Carregando texto="Carregando cadastros…" />}
      {dados && (
        <>
          <Cartao titulo="Ajuste manual" descricao="Corrige o saldo após contagem física, perda ou avaria. O motivo fica registrado na auditoria."
            acoes={<SlidersHorizontal className="h-5 w-5 text-marca-500" aria-hidden="true" />}>
            <form onSubmit={salvar}>
              <fieldset disabled={ocupado} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_160px_1.4fr_auto] xl:items-end">
                <Seletor label="Produto" registros={dados.produtos} value={ajuste.id_produto} onChange={(v) => alterar('id_produto', v)} />
                <Seletor label="Local" registros={dados.locais} value={ajuste.id_local} onChange={(v) => alterar('id_local', v)} />
                <Campo label="Variação (+/−)" type="number" step="0.001" required value={ajuste.variacao}
                  placeholder="-2" onChange={(e) => alterar('variacao', e.target.value)} />
                <Campo label="Motivo" required maxLength={255} value={ajuste.motivo}
                  placeholder="Diferença na contagem física" onChange={(e) => alterar('motivo', e.target.value)} />
                <Botao type="submit" carregando={ocupado} disabled={!dados.produtos.length || !dados.locais.length}>Registrar ajuste</Botao>
              </fieldset>
            </form>
          </Cartao>

          <Cartao titulo="Saldo por produto e local" semPadding
            acoes={criticos > 0 && <Etiqueta tom="perigo"><AlertTriangle className="h-3 w-3" aria-hidden="true" />{criticos} abaixo do mínimo</Etiqueta>}>
            {saldos.length === 0 ? (
              <EstadoVazio icone={Boxes} titulo="Nenhum saldo ainda" texto="Registre o recebimento de uma compra ou um ajuste para formar o primeiro saldo." />
            ) : (
              <Tabela colunas={[
                { titulo: 'Produto' }, { titulo: 'Local' }, { titulo: 'Mínimo', className: 'text-right' },
                { titulo: 'Saldo', className: 'text-right' },
              ]}>
                {saldos.map((saldo) => {
                  const item = produto(saldo.id_produto);
                  const critico = abaixoDoMinimo(saldo);
                  return (
                    <Linha key={saldo.id_produto + ':' + saldo.id_local} className={critico ? 'bg-rose-50/50' : ''}>
                      <Celula className="font-medium text-slate-900">
                        {nomeRegistro(dados.produtos, saldo.id_produto)}
                        {item && <span className="ml-2 font-mono text-xs text-slate-400">{item.sku}</span>}
                      </Celula>
                      <Celula>{nomeRegistro(dados.locais, saldo.id_local)}</Celula>
                      <Celula numero className="text-slate-500">{item ? qtd.format(item.estoque_minimo) : '—'}</Celula>
                      <Celula numero>
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${critico ? 'text-rose-700' : 'text-slate-900'}`}>
                          {critico && <AlertTriangle className="h-3.5 w-3.5" aria-label="Abaixo do mínimo" />}
                          {qtd.format(saldo.quantidade)} {item?.unidade_medida}
                        </span>
                      </Celula>
                    </Linha>
                  );
                })}
              </Tabela>
            )}
          </Cartao>

          <Cartao titulo="Histórico de movimentações" semPadding acoes={<History className="h-5 w-5 text-marca-500" aria-hidden="true" />}>
            {movimentos.length === 0 ? (
              <EstadoVazio icone={History} titulo="Sem movimentações" texto="Entradas, saídas e ajustes aparecem aqui em ordem cronológica." />
            ) : (
              <Tabela colunas={[
                { titulo: 'Data e hora' }, { titulo: 'Produto' }, { titulo: 'Local' }, { titulo: 'Tipo' },
                { titulo: 'Quantidade', className: 'text-right' }, { titulo: 'Antes → depois', className: 'text-right' },
                { titulo: 'Usuário' }, { titulo: 'Origem ou motivo' },
              ]}>
                {movimentos.map((mov) => {
                  const tipo = tipoMovimento[mov.tipo] ?? { rotulo: mov.tipo, tom: 'neutro' };
                  return (
                    <Linha key={mov.id}>
                      <Celula className="whitespace-nowrap text-slate-500">{dataLocal(mov.data)}</Celula>
                      <Celula className="font-medium text-slate-900">{nomeRegistro(dados.produtos, mov.id_produto)}</Celula>
                      <Celula>{nomeRegistro(dados.locais, mov.id_local)}</Celula>
                      <Celula><Etiqueta tom={tipo.tom}>{tipo.rotulo}</Etiqueta></Celula>
                      <Celula numero className="font-semibold">{qtd.format(mov.quantidade)}</Celula>
                      <Celula numero className="whitespace-nowrap text-slate-500">
                        {mov.saldo_anterior ?? '—'} → <span className="text-slate-800">{mov.saldo_posterior ?? '—'}</span>
                      </Celula>
                      <Celula className="text-slate-500">#{mov.id_usuario}</Celula>
                      <Celula className="text-slate-500">
                        {mov.motivo || (mov.id_item_compra && 'Item de compra #' + mov.id_item_compra) || (mov.id_item_venda && 'Item de venda #' + mov.id_item_venda) || '—'}
                      </Celula>
                    </Linha>
                  );
                })}
              </Tabela>
            )}
            {mais && (
              <div className="border-t border-slate-100 px-5 py-3">
                <Botao variante="secundario" disabled={ocupado} onClick={carregarMais}>Ver movimentos anteriores</Botao>
              </div>
            )}
          </Cartao>
        </>
      )}
    </div>
  );
}
