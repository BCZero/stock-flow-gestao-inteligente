import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { Seletor } from '../components/CamposEstoque';
import {
  botao, campo, dataLocal, mensagemErro, nomeRegistro, painel, useCadastrosEstoque,
} from '../services/estoque';

const ajusteVazio = { id_produto: '', id_local: '', variacao: '', motivo: '' };

function consultarEstoque() {
  return Promise.all([api.get('/estoque/saldos'), api.get('/estoque/movimentacoes')]);
}

export default function Estoque() {
  const { dados, erro: erroCadastros } = useCadastrosEstoque();
  const [saldos, setSaldos] = useState([]);
  const [movimentos, setMovimentos] = useState([]);
  const [ajuste, setAjuste] = useState(ajusteVazio);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
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
    setErro('');
    setAviso('');
    try {
      chave.current ??= crypto.randomUUID();
      await api.post('/estoque/ajustes', { ...ajuste, chave: chave.current });
      chave.current = null;
      setAjuste(ajusteVazio);
      setAviso('Ajuste registrado.');
      atualizar(await consultarEstoque());
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setOcupado(false);
    }
  }

  async function carregarMais() {
    setOcupado(true);
    setErro('');
    try {
      const { data } = await api.get('/estoque/movimentacoes', { params: { antes_de: movimentos.at(-1).id } });
      setMovimentos((atuais) => [...atuais, ...data]);
      setMais(data.length === 50);
    } catch (falha) {
      setErro(mensagemErro(falha));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
      {(erro || erroCadastros) && <p role="alert" className="text-red-700">{erro || erroCadastros}</p>}
      {aviso && <p role="status" className="text-green-700">{aviso}</p>}
      {dados && (
        <>
          <section className={painel}>
            <h2 className="mb-3 text-lg font-semibold">Ajuste manual</h2>
            <form onSubmit={salvar}>
              <fieldset disabled={ocupado} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Seletor label="Produto" registros={dados.produtos} value={ajuste.id_produto} onChange={(v) => alterar('id_produto', v)} />
                <Seletor label="Local" registros={dados.locais} value={ajuste.id_local} onChange={(v) => alterar('id_local', v)} />
                <label className="text-sm font-medium">
                  Variação (positiva ou negativa)
                  <input className={campo} type="number" step="0.001" required value={ajuste.variacao} onChange={(e) => alterar('variacao', e.target.value)} />
                </label>
                <label className="text-sm font-medium">
                  Motivo
                  <input className={campo} required maxLength={255} value={ajuste.motivo} onChange={(e) => alterar('motivo', e.target.value)} />
                </label>
                <button className={botao} disabled={!dados.produtos.length || !dados.locais.length}>Registrar ajuste</button>
              </fieldset>
            </form>
          </section>
          <section className={painel + ' overflow-x-auto'}>
            <h2 className="mb-3 text-lg font-semibold">Saldo por produto e local</h2>
            {saldos.length === 0 ? <p className="text-sm text-gray-500">Nenhum saldo registrado.</p> : (
              <table className="w-full text-left text-sm">
                <thead><tr><th>Produto</th><th>Local</th><th>Quantidade</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {saldos.map((saldo) => (
                    <tr key={saldo.id_produto + ':' + saldo.id_local}>
                      <td className="py-2">{nomeRegistro(dados.produtos, saldo.id_produto)}</td>
                      <td>{nomeRegistro(dados.locais, saldo.id_local)}</td><td>{saldo.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          <section className={painel + ' overflow-x-auto'}>
            <h2 className="mb-3 text-lg font-semibold">Histórico de movimentações</h2>
            {movimentos.length === 0 ? <p className="text-sm text-gray-500">Nenhuma movimentação registrada.</p> : (
              <table className="w-full text-left text-sm">
                <thead><tr><th>Data e hora</th><th>Produto</th><th>Local</th><th>Tipo</th><th>Quantidade</th><th>Antes → depois</th><th>Usuário</th><th>Origem ou motivo</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {movimentos.map((mov) => (
                    <tr key={mov.id}>
                      <td className="py-2">{dataLocal(mov.data)}</td>
                      <td>{nomeRegistro(dados.produtos, mov.id_produto)}</td>
                      <td>{nomeRegistro(dados.locais, mov.id_local)}</td>
                      <td>{mov.tipo}</td><td>{mov.quantidade}</td>
                      <td>{mov.saldo_anterior ?? '—'} → {mov.saldo_posterior ?? '—'}</td>
                      <td>#{mov.id_usuario}</td>
                      <td>{mov.motivo || (mov.id_item_compra && 'Item de compra #' + mov.id_item_compra) || (mov.id_item_venda && 'Item de venda #' + mov.id_item_venda) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {mais && <button type="button" className={botao + ' mt-3'} disabled={ocupado} onClick={carregarMais}>Ver movimentos anteriores</button>}
          </section>
        </>
      )}
    </div>
  );
}
