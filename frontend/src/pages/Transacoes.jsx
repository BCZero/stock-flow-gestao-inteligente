import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileText, PackageCheck, Pencil, Plus, Receipt, ShoppingCart, Trash2 } from 'lucide-react';
import api from '../services/api';
import { Seletor } from '../components/CamposEstoque';
import { dataLocal, mensagemErro, moeda, nomeRegistro, useCadastrosEstoque } from '../services/estoque';
import {
  Botao, CabecalhoPagina, Campo, Carregando, Cartao, EstadoVazio, Etiqueta, Mensagem, statusDocumento, useAvisos,
} from '../components/ui';

const novoItem = () => ({
  chave: crypto.randomUUID(), id_produto: '', id_local: '', quantidade: '', valor_unitario: '', desconto: '0',
});
const novoRascunho = () => ({ id: null, id_pessoa: '', data_prevista: '', itens: [novoItem()] });
const qtd = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 });

function Numero({ label, value, onChange, step, min = '0', max, required = true }) {
  return (
    <Campo label={label} type="number" min={min} max={max} step={step} required={required}
      value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

export default function Transacoes({ tipo }) {
  const compra = tipo === 'compras';
  const caminho = '/estoque/' + tipo;
  const { avisar } = useAvisos();
  const { dados, erro: erroCadastros } = useCadastrosEstoque(true);
  const [documentos, setDocumentos] = useState([]);
  const [carregandoDocs, setCarregandoDocs] = useState(true);
  const [rascunho, setRascunho] = useState(novoRascunho);
  const [recebimento, setRecebimento] = useState(null);
  const [quantidades, setQuantidades] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const chaveRecebimento = useRef(null);
  const formulario = useRef(null);

  useEffect(() => {
    let ativo = true;
    api.get(caminho).then(({ data }) => {
      if (ativo) setDocumentos(data);
    }).catch((falha) => {
      if (ativo) setErro(mensagemErro(falha));
    }).finally(() => {
      if (ativo) setCarregandoDocs(false);
    });
    return () => { ativo = false; };
  }, [caminho]);

  function alterarItem(chave, atributo, valor) {
    setRascunho((atual) => ({
      ...atual, itens: atual.itens.map((item) => item.chave === chave ? { ...item, [atributo]: valor } : item),
    }));
  }

  async function executar(operacao, mensagem) {
    setOcupado(true);
    try {
      const { data } = await operacao();
      setDocumentos((atuais) => atuais.some((doc) => doc.id === data.id)
        ? atuais.map((doc) => doc.id === data.id ? data : doc)
        : [data, ...atuais]);
      avisar(mensagem);
      return true;
    } catch (falha) {
      avisar(mensagemErro(falha), 'perigo');
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function salvar(evento) {
    evento.preventDefault();
    const corpo = {
      id_pessoa: rascunho.id_pessoa || null,
      data_prevista: rascunho.data_prevista || null,
      itens: rascunho.itens.map(({ id_produto, id_local, quantidade, valor_unitario, desconto }) => ({
        id_produto, id_local, quantidade, valor_unitario, desconto,
      })),
    };
    const salvo = await executar(
      () => rascunho.id ? api.put(caminho + '/' + rascunho.id, corpo) : api.post(caminho, corpo),
      'Rascunho salvo.',
    );
    if (salvo) setRascunho(novoRascunho());
  }

  function editar(doc) {
    setRascunho({
      id: doc.id,
      id_pessoa: doc.id_pessoa ?? '',
      data_prevista: doc.data_prevista ?? '',
      itens: doc.itens.map((item) => ({ ...item, chave: crypto.randomUUID() })),
    });
    formulario.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function iniciarRecebimento(doc) {
    setRecebimento(doc);
    setQuantidades({});
    chaveRecebimento.current = null;
  }

  async function receber(evento) {
    evento.preventDefault();
    const itens = Object.entries(quantidades)
      .filter(([, quantidade]) => Number(quantidade) > 0)
      .map(([id_item, quantidade]) => ({ id_item, quantidade }));
    if (itens.length === 0) {
      avisar('Informe uma quantidade a receber em pelo menos um item.', 'atencao');
      return;
    }
    chaveRecebimento.current ??= crypto.randomUUID();
    const salvo = await executar(
      () => api.post(caminho + '/' + recebimento.id + '/receber', { chave: chaveRecebimento.current, itens }),
      'Recebimento registrado.',
    );
    if (salvo) setRecebimento(null);
  }

  const titulo = compra ? 'Compras' : 'Vendas';
  const cabecalho = (
    <CabecalhoPagina titulo={titulo} icone={compra ? ShoppingCart : Receipt}
      descricao={compra
        ? 'Pedidos a fornecedores. O saldo só aumenta quando os itens são recebidos.'
        : 'Saídas para clientes. Ao confirmar, o estoque é baixado na hora.'} />
  );

  if (!dados) {
    return (
      <div className="space-y-6">
        {cabecalho}
        {erroCadastros ? <Mensagem>{erroCadastros}</Mensagem> : <Carregando texto="Carregando cadastros…" />}
      </div>
    );
  }

  const pessoas = dados.pessoas.filter((pessoa) => pessoa.tipo === (compra ? 'FORNECEDOR' : 'CLIENTE'));
  const produtos = dados.produtos.filter((produto) => produto.ativo);
  const totalRascunho = rascunho.itens.reduce((soma, item) => soma
    + (Number(item.quantidade) || 0) * (Number(item.valor_unitario) || 0) - (compra ? 0 : Number(item.desconto) || 0), 0);

  return (
    <div className="space-y-6">
      {cabecalho}
      {erro && <Mensagem>{erro}</Mensagem>}

      <div ref={formulario} className="scroll-mt-6">
        <Cartao titulo={rascunho.id ? 'Editar rascunho #' + rascunho.id : 'Novo rascunho'}
          descricao="Salve como rascunho e confirme quando estiver tudo certo."
          acoes={rascunho.id && <Etiqueta tom="atencao"><Pencil className="h-3 w-3" aria-hidden="true" />Editando</Etiqueta>}>
          <form onSubmit={salvar}>
            <fieldset disabled={ocupado} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Seletor label={compra ? 'Fornecedor' : 'Cliente (opcional)'} registros={pessoas}
                  required={compra} value={rascunho.id_pessoa}
                  onChange={(v) => setRascunho({ ...rascunho, id_pessoa: v })} />
                {compra && (
                  <Campo label="Previsão de entrega" type="date" value={rascunho.data_prevista}
                    onChange={(e) => setRascunho({ ...rascunho, data_prevista: e.target.value })} />
                )}
              </div>
              {rascunho.itens.map((item, indice) => (
                <fieldset key={item.chave} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-700">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-marca-600 text-[11px] text-white">{indice + 1}</span>
                    Item
                  </legend>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Seletor label="Produto" registros={produtos} value={item.id_produto} onChange={(v) => alterarItem(item.chave, 'id_produto', v)} />
                    <Seletor label={compra ? 'Local de destino' : 'Local de origem'} registros={dados.locais}
                      value={item.id_local} onChange={(v) => alterarItem(item.chave, 'id_local', v)} />
                    <Numero label="Quantidade" step="0.001" min="0.001" value={item.quantidade} onChange={(v) => alterarItem(item.chave, 'quantidade', v)} />
                    <Numero label="Valor unitário (R$)" step="0.01" value={item.valor_unitario} onChange={(v) => alterarItem(item.chave, 'valor_unitario', v)} />
                    {!compra && <Numero label="Desconto do item (R$)" step="0.01" value={item.desconto} onChange={(v) => alterarItem(item.chave, 'desconto', v)} />}
                  </div>
                  {rascunho.itens.length > 1 && (
                    <Botao variante="perigoDiscreto" icone={Trash2} className="-ml-2.5 mt-2" onClick={() => setRascunho({
                      ...rascunho, itens: rascunho.itens.filter((linha) => linha.chave !== item.chave),
                    })}>Remover item</Botao>
                  )}
                </fieldset>
              ))}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <Botao type="submit" icone={FileText} disabled={!produtos.length || !dados.locais.length || (compra && !pessoas.length)}>Salvar rascunho</Botao>
                <Botao variante="secundario" icone={Plus} disabled={rascunho.itens.length >= 100}
                  onClick={() => setRascunho({ ...rascunho, itens: [...rascunho.itens, novoItem()] })}>Adicionar item</Botao>
                {rascunho.id && <Botao variante="discreto" onClick={() => setRascunho(novoRascunho())}>Cancelar edição</Botao>}
                <p className="ml-auto text-sm text-slate-500">
                  Total estimado <span className="numero ml-1 font-display text-lg font-bold text-slate-900">{moeda.format(totalRascunho)}</span>
                </p>
              </div>
            </fieldset>
          </form>
        </Cartao>
      </div>

      {recebimento && (
        <Cartao titulo={'Receber compra #' + recebimento.id} descricao="Informe o que chegou. Itens não informados continuam pendentes."
          className="ring-2 ring-marca-500/30" acoes={<PackageCheck className="h-5 w-5 text-marca-500" aria-hidden="true" />}>
          <form onSubmit={receber}>
            <fieldset disabled={ocupado} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {recebimento.itens.filter((item) => Number(item.quantidade) > Number(item.quantidade_recebida)).map((item) => {
                  const restante = (Number(item.quantidade) - Number(item.quantidade_recebida)).toFixed(3);
                  const label = nomeRegistro(dados.produtos, item.id_produto) + ' · '
                    + nomeRegistro(dados.locais, item.id_local) + ' · restante ' + qtd.format(restante);
                  return <Numero key={item.id} label={label} step="0.001" max={restante} required={false}
                    value={quantidades[item.id] ?? ''} onChange={(valor) => {
                      chaveRecebimento.current = null;
                      setQuantidades({ ...quantidades, [item.id]: valor });
                    }} />;
                })}
              </div>
              <div className="flex gap-2">
                <Botao type="submit" icone={PackageCheck}>Registrar recebimento</Botao>
                <Botao variante="secundario" onClick={() => setRecebimento(null)}>Fechar</Botao>
              </div>
            </fieldset>
          </form>
        </Cartao>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documentos registrados</h2>
          {documentos.length > 0 && <Etiqueta tom="marca">{documentos.length}</Etiqueta>}
        </div>
        {carregandoDocs && <Carregando texto="Carregando documentos…" />}
        {!carregandoDocs && documentos.length === 0 && (
          <Cartao>
            <EstadoVazio icone={compra ? ShoppingCart : Receipt} titulo={compra ? 'Registre sua primeira compra' : 'Registre sua primeira venda'}
              texto="Preencha o rascunho acima e salve. Ele aparece aqui para revisão e confirmação." />
          </Cartao>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {documentos.map((doc) => {
            const status = statusDocumento[doc.status] ?? { rotulo: doc.status, tom: 'neutro' };
            return (
              <Cartao key={doc.id} as="article" className="flex flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{compra ? 'Compra' : 'Venda'} #{doc.id}</h3>
                      <Etiqueta tom={status.tom}>{status.rotulo}</Etiqueta>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {doc.id_pessoa ? nomeRegistro(pessoas, doc.id_pessoa) : 'Cliente não informado'} · {dataLocal(doc.criado_em)}
                    </p>
                    {doc.data_prevista && <p className="text-sm text-slate-500">Entrega prevista {doc.data_prevista.split('-').reverse().join('/')}</p>}
                  </div>
                  <p className="numero font-display text-xl font-bold text-slate-900">{moeda.format(doc.valor_total)}</p>
                </div>
                <ul className="my-4 divide-y divide-slate-100 rounded-lg border border-slate-100 text-sm">
                  {doc.itens.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span>
                        <span className="font-medium text-slate-800">{nomeRegistro(dados.produtos, item.id_produto)}</span>
                        <span className="text-slate-400"> · {nomeRegistro(dados.locais, item.id_local)}</span>
                      </span>
                      <span className="numero text-slate-600">
                        {qtd.format(item.quantidade)} × {moeda.format(item.valor_unitario)}
                        {compra && <span className="ml-2 text-xs text-slate-400">recebido {qtd.format(item.quantidade_recebida)}</span>}
                        {!compra && Number(item.desconto) > 0 && <span className="ml-2 text-xs text-emerald-700">−{moeda.format(item.desconto)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2">
                  {doc.status === 'RASCUNHO' && (
                    <>
                      <Botao icone={CheckCircle2} disabled={ocupado || rascunho.id === doc.id}
                        onClick={() => executar(() => api.post(caminho + '/' + doc.id + '/confirmar'), 'Documento confirmado.')}>
                        {compra ? 'Confirmar compra' : 'Confirmar venda e baixar estoque'}
                      </Botao>
                      <Botao variante="secundario" icone={Pencil} disabled={ocupado} onClick={() => editar(doc)}>Editar</Botao>
                    </>
                  )}
                  {compra && ['CONFIRMADA', 'PARCIAL'].includes(doc.status) && (
                    <Botao icone={PackageCheck} disabled={ocupado} onClick={() => iniciarRecebimento(doc)}>Receber itens</Botao>
                  )}
                </div>
              </Cartao>
            );
          })}
        </div>
      </section>
    </div>
  );
}
