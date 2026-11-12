import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import Botao from './Botao';

/*
 * Avisos temporários (toast) e janela de confirmação no lugar de alert()/confirm().
 *   const { avisar, confirmar } = useAvisos();
 *   avisar('Produto salvo.');                       // tom padrão: sucesso
 *   avisar('Não foi possível excluir.', 'perigo');
 *   if (await confirmar({ titulo: 'Excluir produto?', texto: '…', acao: 'Excluir' })) { … }
 */

const Contexto = createContext(null);
const icones = { sucesso: CheckCircle2, perigo: XCircle, info: Info, atencao: AlertTriangle };
const cores = {
  sucesso: 'text-emerald-600', perigo: 'text-rose-600', info: 'text-sky-600', atencao: 'text-destaque-500',
};

function JanelaConfirmacao({ pedido, aoResponder }) {
  const cancelar = useRef(null);
  useEffect(() => {
    cancelar.current?.focus();
    const tecla = (e) => e.key === 'Escape' && aoResponder(false);
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoResponder]);
  const perigo = pedido.tom !== 'marca';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-marca-950/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && aoResponder(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirmacao-titulo"
        className="w-full max-w-md animate-surgir rounded-2xl bg-white p-6 shadow-flutuante">
        <div className="flex gap-4">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${perigo ? 'bg-rose-50 text-rose-600' : 'bg-marca-50 text-marca-600'}`}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="confirmacao-titulo" className="text-lg font-semibold">{pedido.titulo}</h2>
            {pedido.texto && <p className="mt-1 text-sm text-slate-600">{pedido.texto}</p>}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Botao ref={cancelar} variante="secundario" onClick={() => aoResponder(false)}>Cancelar</Botao>
          <Botao variante={perigo ? 'perigo' : 'primario'} onClick={() => aoResponder(true)}>{pedido.acao ?? 'Confirmar'}</Botao>
        </div>
      </div>
    </div>
  );
}

export function ProvedorAvisos({ children }) {
  const [avisos, setAvisos] = useState([]);
  const [pedido, setPedido] = useState(null);
  const sequencia = useRef(0);

  const fechar = useCallback((id) => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), []);
  const avisar = useCallback((texto, tom = 'sucesso') => {
    const id = ++sequencia.current;
    setAvisos((atuais) => [...atuais.slice(-3), { id, texto, tom }]);
    setTimeout(() => fechar(id), tom === 'perigo' ? 7000 : 4000);
  }, [fechar]);
  const confirmar = useCallback((opcoes) => new Promise((resolver) => setPedido({ ...opcoes, resolver })), []);
  const responder = useCallback((resposta) => {
    setPedido((atual) => {
      atual?.resolver(resposta);
      return null;
    });
  }, []);

  return (
    <Contexto.Provider value={{ avisar, confirmar }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96" aria-live="polite">
        {avisos.map(({ id, texto, tom }) => {
          const Icone = icones[tom];
          return (
            <div key={id} role={tom === 'perigo' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full animate-surgir items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-flutuante">
              <Icone className={`mt-0.5 h-5 w-5 shrink-0 ${cores[tom]}`} aria-hidden="true" />
              <p className="flex-1 text-slate-700">{texto}</p>
              <button type="button" onClick={() => fechar(id)} className="rounded text-slate-400 hover:text-slate-600" aria-label="Fechar aviso">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      {pedido && <JanelaConfirmacao pedido={pedido} aoResponder={responder} />}
    </Contexto.Provider>
  );
}

export function useAvisos() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('useAvisos precisa estar dentro de <ProvedorAvisos>.');
  return contexto;
}
