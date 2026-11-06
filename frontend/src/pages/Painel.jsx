import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { botao, campo, dataLocal, mensagemErro, moeda, painel } from '../services/estoque';

const rota = '/inteligencia';
const porPagina = 20;
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });
const estados = {
  NOVO: 'Novo', LIDO: 'Lido', EM_TRATAMENTO: 'Em tratamento', RESOLVIDO: 'Resolvido', DESCARTADO: 'Descartado',
};
const prioridades = { 1: 'Crítica', 2: 'Atenção', 3: 'Observação', 4: 'Oportunidade' };
const cores = {
  1: 'bg-red-50 text-red-800', 2: 'bg-amber-50 text-amber-800', 3: 'bg-blue-50 text-blue-800', 4: 'bg-green-50 text-green-800',
};
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

function Indicadores({ dados }) {
  const variacao = dados.variacao_vendas_percentual;
  const cards = [
    ['Vendas confirmadas', moeda.format(dados.valor_vendas),
      dados.pedidos_venda + ' vendas · ' + (variacao === null ? 'sem base anterior' : n(variacao) + '% ante o período anterior')],
    ['Compras confirmadas', moeda.format(dados.valor_compras), dados.pedidos_compra + ' pedidos no período'],
    ['Valor estimado em estoque', moeda.format(dados.valor_estoque_estimado),
      'Último custo recebido · ' + dados.produtos_sem_custo + ' produtos sem custo registrado'],
    ['Alertas em aberto', n(dados.alertas_abertos), 'Novos, lidos ou em tratamento'],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([titulo, valor, detalhe]) => (
        <article key={titulo} className={painel}>
          <h2 className="text-sm font-medium text-gray-600">{titulo}</h2>
          <p className="mt-2 text-2xl font-semibold text-gray-950">{valor}</p>
          <p className="mt-1 text-xs text-gray-500">{detalhe}</p>
        </article>
      ))}
    </div>
  );
}

function SerieDiaria({ serie }) {
  const maximo = Math.max(1, ...serie.flatMap((dia) => [Number(dia.vendas), Number(dia.compras)]));
  return (
    <section className={painel}>
      <h2 className="font-semibold">Compras e vendas por dia</h2>
      <p className="mt-1 text-xs text-gray-600">
        <span className="mr-3 text-blue-700">● Vendas</span><span className="text-emerald-700">● Compras</span>
      </p>
      <svg className="mt-3 h-24 w-full" viewBox="0 0 300 70" preserveAspectRatio="none"
        role="img" aria-label="Gráfico diário de compras e vendas em reais">
        {serie.map((dia, i) => {
          const vendas = Number(dia.vendas) / maximo * 69;
          const compras = Number(dia.compras) / maximo * 69;
          return (
            <g key={dia.dia}>
              <title>{dataCurta(dia.dia)} · Vendas {moeda.format(dia.vendas)} · Compras {moeda.format(dia.compras)}</title>
              <rect x={i * 10} y={0} width={10} height={70} fill="transparent" />
              <rect x={i * 10} y={70 - vendas} width={4} height={vendas} fill="#2563eb" />
              <rect x={i * 10 + 4.5} y={70 - compras} width={4} height={compras} fill="#047857" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between border-t border-gray-200 pt-2 text-xs text-gray-500">
        <span>{dataCurta(serie[0].dia)}</span><span>{dataCurta(serie.at(-1).dia)}</span>
      </div>
    </section>
  );
}

function Comparacoes({ comparacoes }) {
  return (
    <section className={painel + ' overflow-x-auto'}>
      <h2 className="mb-3 font-semibold">Variação de vendas por produto</h2>
      {comparacoes.length === 0 ? <p className="text-sm text-gray-500">Sem vendas confirmadas nas duas janelas.</p> : (
        <table className="w-full text-left text-sm">
          <thead><tr><th>Produto</th><th>30 dias anteriores</th><th>Últimos 30 dias</th><th>Variação</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {comparacoes.map((linha) => (
              <tr key={linha.sku}>
                <td className="py-2">{linha.nome} <span className="text-xs text-gray-500">{linha.sku}</span></td>
                <td>{n(linha.anterior)}</td><td>{n(linha.atual)}</td>
                <td>{linha.variacao === null ? 'Sem base anterior' : n(linha.variacao) + '%'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function CartaoAlerta({ alerta, podeTratar, ocupado, aoTratar }) {
  const [destino, setDestino] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const aberto = ['NOVO', 'LIDO', 'EM_TRATAMENTO'].includes(alerta.status);
  return (
    <article className="rounded-lg border border-gray-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{alerta.titulo}</h3>
        <span className={'rounded-full px-2 py-0.5 text-xs ' + cores[alerta.prioridade]}>
          {prioridades[alerta.prioridade]} · {estados[alerta.status]}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-700">{evidencia(alerta)}</p>
      <p className="mt-1 text-xs text-gray-500">{dataLocal(alerta.gerado_em)}</p>
      {alerta.justificativa && <p className="mt-2 text-sm">{alerta.justificativa}</p>}
      {aberto && podeTratar && (
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-blue-700">
          {alerta.status === 'NOVO' && <button disabled={ocupado} onClick={() => aoTratar(alerta.id, 'LIDO')}>Marcar como lido</button>}
          {alerta.status === 'LIDO' && <button disabled={ocupado} onClick={() => aoTratar(alerta.id, 'EM_TRATAMENTO')}>Iniciar tratamento</button>}
          {alerta.status !== 'NOVO' && (
            <>
              <button disabled={ocupado} onClick={() => setDestino('RESOLVIDO')}>Resolver</button>
              <button disabled={ocupado} onClick={() => setDestino('DESCARTADO')}>Descartar</button>
            </>
          )}
        </div>
      )}
      {destino && aberto && (
        <form className="mt-2" onSubmit={(e) => {
          e.preventDefault();
          aoTratar(alerta.id, destino, justificativa.trim());
        }}>
          <label className="block text-sm">Justificativa para {destino === 'RESOLVIDO' ? 'resolver' : 'descartar'}
            <textarea className={campo} value={justificativa} maxLength={500} required disabled={ocupado}
              onChange={(e) => setJustificativa(e.target.value)} />
          </label>
          <button className={botao} disabled={ocupado || !justificativa.trim()}>Confirmar encerramento</button>
          <button type="button" className="ml-2 text-sm" disabled={ocupado} onClick={() => setDestino(null)}>Cancelar</button>
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
  if (erro) return <p role="alert" className="text-red-700">{erro}</p>;
  if (!regras) return <p className="text-sm text-gray-500">Carregando regras…</p>;
  return (
    <form className="mt-3 grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); aoSalvar(regras); }}>
      {camposRegras.map(([id, nome, min, max]) => (
        <label className="text-sm" key={id}>{nome}
          <input className={campo} type="number" min={min} max={max} value={regras[id]} required disabled={ocupado}
            onChange={(e) => setRegras({ ...regras, [id]: e.target.value })} />
        </label>
      ))}
      <div><button className={botao} disabled={ocupado}>Salvar regras</button></div>
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

  async function buscar(acaoAtual, cursor) {
    setErro('');
    setOcupado(true);
    try {
      const { data } = await api.get(rota + '/auditoria', { params: { antes_de: cursor, acao: acaoAtual || undefined } });
      setEventos((atual) => cursor ? [...atual, ...data] : data);
      setMais(data.length === 25);
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={(e) => {
        e.preventDefault();
        const valor = acao.trim().toUpperCase();
        setFiltro(valor);
        buscar(valor);
      }}>
        <label className="text-sm">Ação (opcional)
          <input className={campo} maxLength={60} value={acao} placeholder="Ex.: LOGIN" onChange={(e) => setAcao(e.target.value)} />
        </label>
        <button className={botao} disabled={ocupado}>Consultar eventos</button>
      </form>
      {erro && <p role="alert" className="mt-2 text-sm text-red-700">{erro}</p>}
      <div className="mt-3 space-y-2">
        {eventos.map((evento) => (
          <details key={evento.id} className="rounded border border-gray-200 p-2 text-sm">
            <summary className="cursor-pointer">{evento.acao} · {evento.id_usuario ? 'Usuário #' + evento.id_usuario : 'Sistema'} · {dataLocal(evento.data_hora)}</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(evento.detalhes, null, 2)}</pre>
          </details>
        ))}
      </div>
      {mais && <button className={botao + ' mt-2'} disabled={ocupado} onClick={() => buscar(filtro, eventos.at(-1).id)}>Ver eventos anteriores</button>}
    </>
  );
}

const filtroInicial = { encerrados: false, pagina: 0 };

export default function Painel() {
  const [dados, setDados] = useState(null);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
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
    setErro('');
    setAviso('');
    try {
      const resposta = await operacao();
      if (atualizar) {
        setDados(await consultar(proximoFiltro));
        setFiltro(proximoFiltro);
        setResumo(null);
      }
      if (mensagem) setAviso(mensagem);
      return resposta;
    } catch (e) {
      setErro(mensagemErro(e));
    } finally {
      setOcupado(false);
    }
  }

  if (!dados) return erro ? <p role="alert">{erro}</p> : <p>Carregando painel…</p>;
  const { indicadores, alertas, notificacoes } = dados;
  const mudarFiltro = (novos) => operar(() => Promise.resolve(), null, { ...filtro, ...novos });
  const tratar = (id, status, justificativa) => operar(
    () => api.patch(rota + '/alertas/' + id, { status, justificativa }),
    'Alerta atualizado.', { ...filtro, pagina: 0 },
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Painel de gestão</h1>
          <p className="text-sm text-gray-600">{dataCurta(indicadores.inicio_atual)} a {dataCurta(indicadores.referencia)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/estoque" className="text-sm text-blue-700">Extrato de estoque</Link>
          {indicadores.pode_gerenciar && <button className={botao} disabled={ocupado}
            onClick={() => operar(() => api.post(rota + '/processar'), 'Alertas atualizados.', filtroInicial)}>Atualizar alertas</button>}
        </div>
      </header>
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
      {aviso && <p role="status" className="text-sm text-green-700">{aviso}</p>}
      <Indicadores dados={indicadores} />
      <SerieDiaria serie={indicadores.serie} />
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <section className={painel}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Alertas</h2>
            <div className="flex items-center gap-3 text-sm">
              <button disabled={ocupado} aria-pressed={!filtro.encerrados} onClick={() => mudarFiltro({ encerrados: false, pagina: 0 })}>Abertos</button>
              <button disabled={ocupado} aria-pressed={filtro.encerrados} onClick={() => mudarFiltro({ encerrados: true, pagina: 0 })}>Encerrados</button>
            </div>
          </div>
          <div className="space-y-2">
            {alertas.length === 0 && <p className="text-sm text-gray-500">Nenhum alerta nesta página.</p>}
            {alertas.map((alerta) => <CartaoAlerta key={alerta.id} alerta={alerta} podeTratar={indicadores.pode_tratar}
              ocupado={ocupado} aoTratar={tratar} />)}
          </div>
          <div className="mt-2 flex gap-3 text-sm text-blue-700">
            {filtro.pagina > 0 && <button disabled={ocupado} onClick={() => mudarFiltro({ pagina: filtro.pagina - 1 })}>Página anterior</button>}
            {alertas.length === porPagina && <button disabled={ocupado} onClick={() => mudarFiltro({ pagina: filtro.pagina + 1 })}>Próxima página</button>}
          </div>
        </section>
        <div className="space-y-4">
          <section className={painel}>
            <h2 className="mb-2 font-semibold">Notificações não lidas</h2>
            {notificacoes.length === 0 && <p className="text-sm text-gray-500">Nenhuma notificação pendente.</p>}
            <ul className="divide-y divide-gray-100 text-sm">
              {notificacoes.map((item) => <li key={item.id} className="py-2">
                <p>{item.titulo}</p>
                <button className="text-blue-700" disabled={ocupado}
                  onClick={() => operar(() => api.patch(rota + '/notificacoes/' + item.id + '/ler'), 'Notificação lida.')}>Marcar notificação como lida</button>
              </li>)}
            </ul>
          </section>
          {indicadores.pode_gerenciar && (
            <section className={painel}>
              <h2 className="font-semibold">Orientações para os alertas</h2>
              <p className="my-2 text-sm text-gray-600">Resumo sob demanda dos cinco alertas abertos de maior prioridade.</p>
              <button className={botao} aria-busy={gerandoResumo} disabled={ocupado || !indicadores.alertas_abertos}
                onClick={async () => {
                  setGerandoResumo(true);
                  try {
                    const resposta = await operar(() => api.post(rota + '/resumo'), null, filtro, false);
                    if (resposta) setResumo(resposta.data);
                  } finally {
                    setGerandoResumo(false);
                  }
                }}>{gerandoResumo ? 'Gerando resumo…' : 'Gerar resumo'}</button>
              {resumo && (
                <div className="mt-3 space-y-2 text-sm" role="status">
                  <p className="text-xs text-gray-500">{resumo.fonte === 'LLM' ? 'Orientações geradas por IA' : 'Orientações das regras do StockFlow'}</p>
                  {resumo.itens.map((item) => <div key={item.id_alerta}><h3 className="font-medium">{item.titulo}</h3><p>{item.orientacao}</p></div>)}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      <Comparacoes comparacoes={indicadores.comparacoes} />
      {indicadores.pode_gerenciar && (
        <>
          <section className={painel}>
            <h2 className="font-semibold">
              <button type="button" aria-expanded={mostrarRegras} onClick={() => setMostrarRegras(!mostrarRegras)}>Regras de alerta</button>
            </h2>
            {mostrarRegras && <Configuracao ocupado={ocupado}
              aoSalvar={(regras) => operar(() => api.put(rota + '/regras', regras), 'Regras salvas.', filtroInicial)} />}
          </section>
          <section className={painel}>
            <h2 className="font-semibold">Trilha de auditoria</h2>
            <Auditoria />
          </section>
        </>
      )}
    </div>
  );
}
