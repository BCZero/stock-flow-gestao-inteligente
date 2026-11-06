import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { Seletor } from '../components/CamposEstoque';
import {
  botao, campo, dataLocal, mensagemErro, moeda, nomeRegistro, painel, useCadastrosEstoque,
} from '../services/estoque';

const novoItem = () => ({
  chave: crypto.randomUUID(), id_produto: '', id_local: '', quantidade: '', valor_unitario: '', desconto: '0',
});
const novoRascunho = () => ({ id: null, id_pessoa: '', data_prevista: '', itens: [novoItem()] });

function Numero({ label, value, onChange, step, min = '0', max, required = true }) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input className={campo} type="number" min={min} max={max} step={step} required={required}
        value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function Transacoes({ tipo }) {
  const compra = tipo === 'compras';
  const caminho = '/estoque/' + tipo;
  const { dados, erro: erroCadastros } = useCadastrosEstoque(true);
  const [documentos, setDocumentos] = useState([]);
  const [rascunho, setRascunho] = useState(novoRascunho);
  const [recebimento, setRecebimento] = useState(null);
  const [quantidades, setQuantidades] = useState({});
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const chaveRecebimento = useRef(null);

  useEffect(() => {
    let ativo = true;
    api.get(caminho).then(({ data }) => {
      if (ativo) setDocumentos(data);
    }).catch((falha) => {
      if (ativo) setErro(mensagemErro(falha));
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
    setErro('');
    setAviso('');
    try {
      const { data } = await operacao();
      setDocumentos((atuais) => atuais.some((doc) => doc.id === data.id)
        ? atuais.map((doc) => doc.id === data.id ? data : doc)
        : [data, ...atuais]);
      setAviso(mensagem);
      return true;
    } catch (falha) {
      setErro(mensagemErro(falha));
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
      setErro('Informe uma quantidade a receber em pelo menos um item.');
      return;
    }
    chaveRecebimento.current ??= crypto.randomUUID();
    const salvo = await executar(
      () => api.post(caminho + '/' + recebimento.id + '/receber', { chave: chaveRecebimento.current, itens }),
      'Recebimento registrado.',
    );
    if (salvo) setRecebimento(null);
  }

  if (!dados) {
    return erroCadastros ? <p role="alert">{erroCadastros}</p> : <p>Carregando cadastros…</p>;
  }

  const pessoas = dados.pessoas.filter((pessoa) => pessoa.tipo === (compra ? 'FORNECEDOR' : 'CLIENTE'));
  const produtos = dados.produtos.filter((produto) => produto.ativo);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">{compra ? 'Compras' : 'Vendas'}</h1>
      {erro && <p role="alert" className="text-red-700">{erro}</p>}
      {aviso && <p role="status" className="text-green-700">{aviso}</p>}
      <section className={painel}>
        <h2 className="mb-3 text-lg font-semibold">{rascunho.id ? 'Editar rascunho #' + rascunho.id : 'Novo rascunho'}</h2>
        <form onSubmit={salvar}>
          <fieldset disabled={ocupado} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Seletor label={compra ? 'Fornecedor' : 'Cliente (opcional)'} registros={pessoas}
                required={compra} value={rascunho.id_pessoa}
                onChange={(v) => setRascunho({ ...rascunho, id_pessoa: v })} />
              {compra && (
                <label className="text-sm font-medium">Previsão de entrega
                  <input className={campo} type="date" value={rascunho.data_prevista}
                    onChange={(e) => setRascunho({ ...rascunho, data_prevista: e.target.value })} />
                </label>
              )}
            </div>
            {rascunho.itens.map((item, indice) => (
              <fieldset key={item.chave} className="rounded-lg border border-gray-200 p-3">
                <legend className="px-1 text-sm font-semibold">Item {indice + 1}</legend>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Seletor label="Produto" registros={produtos} value={item.id_produto} onChange={(v) => alterarItem(item.chave, 'id_produto', v)} />
                  <Seletor label={compra ? 'Local de destino' : 'Local de origem'} registros={dados.locais}
                    value={item.id_local} onChange={(v) => alterarItem(item.chave, 'id_local', v)} />
                  <Numero label="Quantidade" step="0.001" min="0.001" value={item.quantidade} onChange={(v) => alterarItem(item.chave, 'quantidade', v)} />
                  <Numero label="Valor unitário (R$)" step="0.01" value={item.valor_unitario} onChange={(v) => alterarItem(item.chave, 'valor_unitario', v)} />
                  {!compra && <Numero label="Desconto do item (R$)" step="0.01" value={item.desconto} onChange={(v) => alterarItem(item.chave, 'desconto', v)} />}
                </div>
                {rascunho.itens.length > 1 && (
                  <button type="button" className="mt-2 text-sm text-red-700" onClick={() => setRascunho({
                    ...rascunho, itens: rascunho.itens.filter((linha) => linha.chave !== item.chave),
                  })}>Remover item</button>
                )}
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-3">
              <button className={botao} disabled={!produtos.length || !dados.locais.length || (compra && !pessoas.length)}>Salvar rascunho</button>
              <button type="button" className="text-sm text-blue-700" disabled={rascunho.itens.length >= 100}
                onClick={() => setRascunho({ ...rascunho, itens: [...rascunho.itens, novoItem()] })}>Adicionar item</button>
              {rascunho.id && <button type="button" className="text-sm" onClick={() => setRascunho(novoRascunho())}>Cancelar edição</button>}
            </div>
          </fieldset>
        </form>
      </section>
      {recebimento && (
        <section className={painel}>
          <h2 className="mb-3 text-lg font-semibold">Receber compra #{recebimento.id}</h2>
          <form onSubmit={receber}>
            <fieldset disabled={ocupado} className="space-y-3">
              {recebimento.itens.filter((item) => Number(item.quantidade) > Number(item.quantidade_recebida)).map((item) => {
                const restante = (Number(item.quantidade) - Number(item.quantidade_recebida)).toFixed(3);
                const label = nomeRegistro(dados.produtos, item.id_produto) + ' · '
                  + nomeRegistro(dados.locais, item.id_local) + ' · restante ' + restante;
                return <Numero key={item.id} label={label} step="0.001" max={restante} required={false}
                  value={quantidades[item.id] ?? ''} onChange={(valor) => {
                    chaveRecebimento.current = null;
                    setQuantidades({ ...quantidades, [item.id]: valor });
                  }} />;
              })}
              <button className={botao}>Registrar recebimento</button>
              <button type="button" className="ml-3 text-sm" onClick={() => setRecebimento(null)}>Fechar</button>
            </fieldset>
          </form>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Documentos registrados</h2>
        {documentos.length === 0 && <p className="text-sm text-gray-500">Nenhum documento registrado.</p>}
        {documentos.map((doc) => (
          <article key={doc.id} className={painel}>
            <h3 className="font-semibold">#{doc.id} · {doc.status} · {moeda.format(doc.valor_total)}</h3>
            <p className="text-sm text-gray-600">
              {doc.id_pessoa ? nomeRegistro(pessoas, doc.id_pessoa) : 'Cliente não informado'} · {dataLocal(doc.criado_em)}
              {doc.data_prevista && ' · Entrega prevista ' + doc.data_prevista.split('-').reverse().join('/')}
            </p>
            <ul className="my-3 space-y-1 text-sm">
              {doc.itens.map((item) => (
                <li key={item.id}>
                  {nomeRegistro(dados.produtos, item.id_produto)} · {nomeRegistro(dados.locais, item.id_local)} · {item.quantidade} × {moeda.format(item.valor_unitario)}
                  {compra && ' · Recebido: ' + item.quantidade_recebida}
                  {!compra && Number(item.desconto) > 0 && ' · Desconto: ' + moeda.format(item.desconto)}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              {doc.status === 'RASCUNHO' && (
                <>
                  <button type="button" className="text-sm text-blue-700" disabled={ocupado} onClick={() => editar(doc)}>Editar</button>
                  <button type="button" className={botao} disabled={ocupado || rascunho.id === doc.id}
                    onClick={() => executar(() => api.post(caminho + '/' + doc.id + '/confirmar'), 'Documento confirmado.')}>
                    {compra ? 'Confirmar compra' : 'Confirmar venda e baixar estoque'}
                  </button>
                </>
              )}
              {compra && ['CONFIRMADA', 'PARCIAL'].includes(doc.status) && (
                <button type="button" className={botao} disabled={ocupado} onClick={() => iniciarRecebimento(doc)}>Receber itens</button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
