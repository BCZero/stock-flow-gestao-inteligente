import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, BellRing, ChevronDown, ClipboardList, LayoutDashboard,
  RefreshCw, Settings2, ShoppingCart, Sparkles, TrendingUp, Wallet, Warehouse,
} from 'lucide-react';
import api from '../services/api';
import { dataLocal, mensagemErro, moeda } from '../services/estoque';
import {
  AreaTexto, Botao, CabecalhoPagina, Campo, Carregando, Cartao, Celula, EstadoVazio, Etiqueta, Indicador, Linha,
  Mensagem, Tabela, estadoAlerta, prioridadeAlerta, useAvisos,
} from '../components/ui';

const rota = '/inteligencia';
const porPagina = 20;
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const camposRegras = [
  ['dias_produto_parado', 'Dias sem venda', 1, 365],
  ['variacao_percentual', 'Variação mínima (%)', 1, 100],
  ['tolerancia_atraso_dias', 'Tolerância de atraso (dias)', 0, 90],
];

const dataCurta = (dia) => dia.split('-').reverse().join('/');
const n = (valor) => numero.format(Number(valor));

function evidencia({ tipo, dados }) {
  if (tipo === 'ESTOQUE_CRITICO') return 'Saldo ' + n(dados.saldo) + ' · mínimo ' + n(dados.limite);
  if (tipo === 'PRODUTO_PARADO') return dados.dias_sem_venda + ' dias sem venda · saldo ' + n(dados.saldo);
  if (tipo === 'ATRASO_FORNECEDOR') return dados.dias_atraso + ' dias de atraso · itens pendentes ' + dados.itens_pendentes;
  return n(dados.anterior) + ' → ' + n(dados.atual) + ' unidades · ' + n(dados.variacao_percentual) + '%';
}

async function consultar(filtro) {
  const [indicadores, alertas, notificacoes] = await Promise.all([
    api.get(rota + '/painel'),
    api.get(rota + '/alertas', { params: { encerrados: filtro.encerrados, deslocamento: filtro.pagina * porPagina } }),
    api.get(rota + '/notificacoes'),
  ]);
  return { indicadores: indicadores.data, alertas: alertas.data, notificacoes: notificacoes.data };
}

function Tendencia({ variacao }) {
  if (variacao === null || variacao === undefined) return <Etiqueta tom="neutro">Sem base anterior</Etiqueta>;
  const valor = Number(variacao);
  const Icone = valor >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <Etiqueta tom={valor >= 0 ? 'sucesso' : 'perigo'}>
      <Icone className="h-3 w-3" aria-hidden="true" />{n(Math.abs(valor))}%
    </Etiqueta>
  );
}

function Indicadores({ dados }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador titulo="Vendas confirmadas" valor={moeda.format(dados.valor_vendas)} icone={TrendingUp}
        tendencia={<Tendencia variacao={dados.variacao_vendas_percentual} />} detalhe={dados.pedidos_venda + ' vendas no período'} />
      <Indicador titulo="Compras confirmadas" valor={moeda.format(dados.valor_compras)} icone={ShoppingCart} tom="sucesso"
        detalhe={dados.pedidos_compra + ' pedidos no período'} />
      <Indicador titulo="Valor estimado em estoque" valor={moeda.format(dados.valor_estoque_estimado)} icone={Wallet}
        detalhe={'Último custo recebido · ' + dados.produtos_sem_custo + ' sem custo'} />
      <Indicador titulo="Alertas em aberto" valor={n(dados.alertas_abertos)} icone={BellRing}
        tom={dados.alertas_abertos > 0 ? 'destaque' : 'sucesso'} detalhe="Novos, lidos ou em tratamento" />
    </div>
  );
}

function SerieDiaria({ serie }) {
  const maximo = Math.max(1, ...serie.flatMap((dia) => [Number(dia.vendas), Number(dia.compras)]));
  const largura = serie.length * 10;
  return (
    <Cartao titulo="Compras e vendas por dia" descricao="Valores confirmados nos últimos 30 dias"
      acoes={(
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-marca-500" />Vendas</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destaque-400" />Compras</span>
        </div>
      )}>
      <svg className="h-40 w-full" viewBox={`0 0 ${largura} 72`} preserveAspectRatio="none"
        role="img" aria-label="Gráfico diário de compras e vendas em reais">
        {[18, 36, 54].map((y) => <line key={y} x1="0" x2={largura} y1={y} y2={y} className="stroke-slate-200" strokeWidth="0.3" />)}
        {serie.map((dia, i) => {
          const vendas = Number(dia.vendas) / maximo * 70;
          const compras = Number(dia.compras) / maximo * 70;
          return (
            <g key={dia.dia}>
              <title>{dataCurta(dia.dia)} · Vendas {moeda.format(dia.vendas)} · Compras {moeda.format(dia.compras)}</title>
              <rect x={i * 10} y={0} width={10} height={72} fill="transparent" />
              <rect x={i * 10 + 1} y={72 - vendas} width={3.8} height={vendas} rx="0.8" className="fill-marca-500" />
              <rect x={i * 10 + 5.2} y={72 - compras} width={3.8} height={compras} rx="0.8" className="fill-destaque-400" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
        <span>{dataCurta(serie[0].dia)}</span><span>{dataCurta(serie.at(-1).dia)}</span>
      </div>
    </Cartao>
  );
}

function Comparacoes({ comparacoes }) {
  return (
    <Cartao titulo="Variação de vendas por produto" descricao="Últimos 30 dias comparados aos 30 anteriores" semPadding>
      {comparacoes.length === 0 ? (
        <EstadoVazio icone={TrendingUp} titulo="Sem vendas para comparar" texto="Confirme vendas para acompanhar a variação por produto." />
      ) : (
        <Tabela colunas={[
          { titulo: 'Produto' }, { titulo: '30 dias anteriores', className: 'text-right' },
          { titulo: 'Últimos 30 dias', className: 'text-right' }, { titulo: 'Variação', className: 'text-right' },
        ]}>
          {comparacoes.map((linha) => (
            <Linha key={linha.sku}>
              <Celula><span className="font-medium text-slate-900">{linha.nome}</span> <span className="ml-1 font-mono text-xs text-slate-400">{linha.sku}</span></Celula>
              <Celula numero>{n(linha.anterior)}</Celula>
              <Celula numero>{n(linha.atual)}</Celula>
              <Celula numero><Tendencia variacao={linha.variacao} /></Celula>
            </Linha>
          ))}
        </Tabela>
      )}
    </Cartao>
  );
}

function CartaoAlerta({ alerta, podeTratar, ocupado, aoTratar }) {
  const [destino, setDestino] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const aberto = ['NOVO', 'LIDO', 'EM_TRATAMENTO'].includes(alerta.status);
  const prioridade = prioridadeAlerta[alerta.prioridade];
  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 pl-5">
      <span className={`absolute inset-y-0 left-0 w-1 ${prioridade.barra}`} aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-sans font-semibold text-slate-900">{alerta.titulo}</h3>
        <div className="flex gap-1.5">
          <Etiqueta tom={prioridade.tom}>{prioridade.rotulo}</Etiqueta>
          <Etiqueta tom="neutro">{estadoAlerta[alerta.status]}</Etiqueta>
        </div>
      </div>
      <p className="numero mt-1 text-sm text-slate-600">{evidencia(alerta)}</p>
      <p className="mt-1 text-xs text-slate-400">{dataLocal(alerta.gerado_em)}</p>
      {alerta.justificativa && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{alerta.justificativa}</p>}
      {aberto && podeTratar && (
        <div className="-ml-2.5 mt-2 flex flex-wrap gap-1">
          {alerta.status === 'NOVO' && <Botao variante="discreto" disabled={ocupado} onClick={() => aoTratar(alerta.id, 'LIDO')}>Marcar como lido</Botao>}
          {alerta.status === 'LIDO' && <Botao variante="discreto" disabled={ocupado} onClick={() => aoTratar(alerta.id, 'EM_TRATAMENTO')}>Iniciar tratamento</Botao>}
          {alerta.status !== 'NOVO' && (
            <>
              <Botao variante="discreto" disabled={ocupado} onClick={() => setDestino('RESOLVIDO')}>Resolver</Botao>
              <Botao variante="perigoDiscreto" disabled={ocupado} onClick={() => setDestino('DESCARTADO')}>Descartar</Botao>
            </>
          )}
        </div>
      )}
      {destino && aberto && (
        <form className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3" onSubmit={(e) => {
          e.preventDefault();
          aoTratar(alerta.id, destino, justificativa.trim());
        }}>
          <AreaTexto label={'Justificativa para ' + (destino === 'RESOLVIDO' ? 'resolver' : 'descartar')}
            value={justificativa} maxLength={500} required disabled={ocupado} onChange={(e) => setJustificativa(e.target.value)} />
          <div className="flex gap-2">
            <Botao type="submit" disabled={ocupado || !justificativa.trim()}>Confirmar encerramento</Botao>
            <Botao variante="secundario" disabled={ocupado} onClick={() => setDestino(null)}>Cancelar</Botao>
          </div>
        </form>
      )}
    </article>
  );
}

function Configuracao({ aoSalvar, ocupado }) {
  const [regras, setRegras] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    api.get(rota + '/regras').then(({ data }) => setRegras(data)).catch((e) => setErro(mensagemErro(e)));
  }, []);
  if (erro) return <Mensagem>{erro}</Mensagem>;
  if (!regras) return <Carregando texto="Carregando regras…" />;
  return (
    <form className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end" onSubmit={(e) => { e.preventDefault(); aoSalvar(regras); }}>
      {camposRegras.map(([id, nome, min, max]) => (
        <Campo key={id} label={nome} type="number" min={min} max={max} value={regras[id]} required disabled={ocupado}
          onChange={(e) => setRegras({ ...regras, [id]: e.target.value })} />
      ))}
      <Botao type="submit" disabled={ocupado}>Salvar regras</Botao>
    </form>
  );
}

function Auditoria() {
  const [eventos, setEventos] = useState([]);
  const [acao, setAcao] = useState('');
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mais, setMais] = useState(false);
  const [consultou, setConsultou] = useState(false);

  async function buscar(acaoAtual, cursor) {
    setErro('');
    setOcupado(true);
    try {
      const { data } = await api.get(rota + '/auditoria', { params: { antes_de: cursor, acao: acaoAtual || undefined } });
      setEventos((atual) => cursor ? [...atual, ...data] : data);
      setMais(data.length === 25);
      setConsultou(true);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => {
        e.preventDefault();
        const valor = acao.trim().toUpperCase();
        setFiltro(valor);
        buscar(valor);
      }}>
        <Campo label="Ação (opcional)" maxLength={60} value={acao} placeholder="LOGIN" onChange={(e) => setAcao(e.target.value)} />
        <Botao type="submit" variante="secundario" icone={ClipboardList} carregando={ocupado}>Consultar eventos</Botao>
      </form>
      {erro && <div className="mt-3"><Mensagem>{erro}</Mensagem></div>}
      {consultou && eventos.length === 0 && <p className="mt-4 text-sm text-slate-500">Nenhum evento encontrado para esse filtro.</p>}
      <div className="mt-4 space-y-2">
        {eventos.map((evento) => (
          <details key={evento.id} className="group rounded-lg border border-slate-200 text-sm open:bg-slate-50">
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2.5">
              <Etiqueta tom="marca">{evento.acao}</Etiqueta>
              <span className="text-slate-600">{evento.id_usuario ? 'Usuário #' + evento.id_usuario : 'Sistema'}</span>
              <span className="ml-auto text-xs text-slate-400">{dataLocal(evento.data_hora)}</span>
            </summary>
            <pre className="overflow-x-auto whitespace-pre-wrap border-t border-slate-200 px-3 py-2 font-mono text-xs text-slate-600">{JSON.stringify(evento.detalhes, null, 2)}</pre>
          </details>
        ))}
      </div>
      {mais && <Botao variante="secundario" className="mt-3" disabled={ocupado} onClick={() => buscar(filtro, eventos.at(-1).id)}>Ver eventos anteriores</Botao>}
    </>
  );
}

const filtroInicial = { encerrados: false, pagina: 0 };

function Alternador({ ativo, aoMudar, ocupado }) {
  const opcoes = [[false, 'Abertos'], [true, 'Encerrados']];
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
      {opcoes.map(([valor, rotulo]) => (
        <button key={rotulo} type="button" disabled={ocupado} aria-pressed={ativo === valor} onClick={() => aoMudar(valor)}
          className={`rounded-md px-3 py-1 font-medium transition-colors ${ativo === valor ? 'bg-white text-marca-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}>
          {rotulo}
        </button>
      ))}
    </div>
  );
}

export default function Painel() {
  const { avisar } = useAvisos();
  const [dados, setDados] = useState(null);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resumo, setResumo] = useState(null);
  const [gerandoResumo, setGerandoResumo] = useState(false);
  const [mostrarRegras, setMostrarRegras] = useState(false);

  useEffect(() => {
    let ativo = true;
    consultar(filtroInicial).then((resultado) => {
      if (ativo) setDados(resultado);
    }).catch((e) => {
      if (ativo) setErro(mensagemErro(e));
    });
    return () => { ativo = false; };
  }, []);

  async function operar(operacao, mensagem, proximoFiltro = filtro, atualizar = true) {
    setOcupado(true);
    try {
      const resposta = await operacao();
      if (atualizar) {
        setDados(await consultar(proximoFiltro));
        setFiltro(proximoFiltro);
        setResumo(null);
      }
      if (mensagem) avisar(mensagem);
      return resposta;
    } catch (e) {
      avisar(mensagemErro(e), 'perigo');
    } finally {
      setOcupado(false);
    }
  }

  if (!dados) return erro ? <Mensagem>{erro}</Mensagem> : <Carregando texto="Carregando painel…" />;
  const { indicadores, alertas, notificacoes } = dados;
  const mudarFiltro = (novos) => operar(() => Promise.resolve(), null, { ...filtro, ...novos });
  const tratar = (id, status, justificativa) => operar(
    () => api.patch(rota + '/alertas/' + id, { status, justificativa }),
    'Alerta atualizado.', { ...filtro, pagina: 0 },
  );

  return (
    <div className="space-y-6">
      <CabecalhoPagina titulo="Painel de gestão" icone={LayoutDashboard}
        descricao={'Período de ' + dataCurta(indicadores.inicio_atual) + ' a ' + dataCurta(indicadores.referencia)}>
        <Link to="/estoque" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50">
          <Warehouse className="h-4 w-4" aria-hidden="true" /> Extrato de estoque
        </Link>
        {indicadores.pode_gerenciar && (
          <Botao icone={RefreshCw} disabled={ocupado}
            onClick={() => operar(() => api.post(rota + '/processar'), 'Alertas atualizados.', filtroInicial)}>Atualizar alertas</Botao>
        )}
      </CabecalhoPagina>

      <Indicadores dados={indicadores} />
      <SerieDiaria serie={indicadores.serie} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Cartao titulo="Alertas" descricao="Situações que pedem atenção no estoque"
          acoes={<Alternador ativo={filtro.encerrados} ocupado={ocupado} aoMudar={(v) => mudarFiltro({ encerrados: v, pagina: 0 })} />}>
          <div className="space-y-3">
            {alertas.length === 0 && (
              <EstadoVazio icone={AlertTriangle} titulo={filtro.encerrados ? 'Nenhum alerta encerrado' : 'Tudo em ordem por aqui'}
                texto={filtro.encerrados ? 'Alertas resolvidos ou descartados aparecem nesta lista.' : 'Nenhum alerta aberto nesta página.'} />
            )}
            {alertas.map((alerta) => <CartaoAlerta key={alerta.id} alerta={alerta} podeTratar={indicadores.pode_tratar}
              ocupado={ocupado} aoTratar={tratar} />)}
          </div>
          {(filtro.pagina > 0 || alertas.length === porPagina) && (
            <div className="mt-4 flex justify-between border-t border-slate-100 pt-3">
              {filtro.pagina > 0 ? <Botao variante="secundario" disabled={ocupado} onClick={() => mudarFiltro({ pagina: filtro.pagina - 1 })}>Página anterior</Botao> : <span />}
              {alertas.length === porPagina && <Botao variante="secundario" disabled={ocupado} onClick={() => mudarFiltro({ pagina: filtro.pagina + 1 })}>Próxima página</Botao>}
            </div>
          )}
        </Cartao>

        <div className="space-y-6">
          <Cartao titulo="Notificações não lidas"
            acoes={notificacoes.length > 0 && <Etiqueta tom="destaque">{notificacoes.length}</Etiqueta>}>
            {notificacoes.length === 0 ? (
              <EstadoVazio icone={Bell} titulo="Nada pendente" texto="Você está em dia com as notificações." />
            ) : (
              <ul className="-my-2 divide-y divide-slate-100 text-sm">
                {notificacoes.map((item) => (
                  <li key={item.id} className="py-3">
                    <p className="text-slate-700">{item.titulo}</p>
                    <Botao variante="discreto" className="-ml-2.5 mt-1" disabled={ocupado}
                      onClick={() => operar(() => api.patch(rota + '/notificacoes/' + item.id + '/ler'), 'Notificação lida.')}>
                      Marcar como lida
                    </Botao>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          {indicadores.pode_gerenciar && (
            <section className="rounded-2xl bg-marca-950 p-5 text-white shadow-cartao">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-destaque-400" aria-hidden="true" />
                <h2 className="text-base font-semibold text-white">Orientações para os alertas</h2>
              </div>
              <p className="mt-1.5 text-sm text-marca-100/75">Resumo sob demanda dos cinco alertas abertos de maior prioridade.</p>
              <button type="button" aria-busy={gerandoResumo} disabled={ocupado || !indicadores.alertas_abertos}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destaque-400 px-4 py-2 text-sm font-semibold text-marca-950 transition-colors hover:bg-destaque-300 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={async () => {
                  setGerandoResumo(true);
                  try {
                    const resposta = await operar(() => api.post(rota + '/resumo'), null, filtro, false);
                    if (resposta) setResumo(resposta.data);
                  } finally {
                    setGerandoResumo(false);
                  }
                }}>
                <Sparkles className="h-4 w-4" aria-hidden="true" />{gerandoResumo ? 'Gerando resumo…' : 'Gerar resumo'}
              </button>
              {resumo && (
                <div className="mt-4 space-y-3 rounded-xl bg-white/5 p-4 text-sm ring-1 ring-white/10" role="status">
                  <p className="text-xs font-medium uppercase tracking-wide text-destaque-300">
                    {resumo.fonte === 'LLM' ? 'Orientações geradas por IA' : 'Orientações das regras do StockFlow'}
                  </p>
                  {resumo.itens.map((item) => (
                    <div key={item.id_alerta}>
                      <h3 className="font-sans font-semibold text-white">{item.titulo}</h3>
                      <p className="mt-0.5 text-marca-100/80">{item.orientacao}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      <Comparacoes comparacoes={indicadores.comparacoes} />

      {indicadores.pode_gerenciar && (
        <>
          <Cartao>
            <button type="button" aria-expanded={mostrarRegras} onClick={() => setMostrarRegras(!mostrarRegras)}
              className="flex w-full items-center gap-3 text-left">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-marca-50 text-marca-700"><Settings2 className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="flex-1">
                <span className="block font-display font-semibold text-slate-900">Regras de alerta</span>
                <span className="block text-sm text-slate-500">Limites usados para gerar os alertas desta empresa</span>
              </span>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${mostrarRegras ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {mostrarRegras && (
              <div className="mt-5 border-t border-slate-100 pt-5">
                <Configuracao ocupado={ocupado}
                  aoSalvar={(regras) => operar(() => api.put(rota + '/regras', regras), 'Regras salvas.', filtroInicial)} />
              </div>
            )}
          </Cartao>
          <Cartao titulo="Trilha de auditoria" descricao="Acessos, cadastros, operações de estoque e tratamento de alertas">
            <Auditoria />
          </Cartao>
        </>
      )}
    </div>
  );
}
