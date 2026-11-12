import { Loader2 } from 'lucide-react';
import { painel, tonsEtiqueta } from './estilos';

/** Título da página com ícone, descrição e ações à direita. */
export function CabecalhoPagina({ titulo, descricao, icone: Icone, children }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icone && (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-marca-600 text-white shadow-cartao">
            <Icone className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Cartão branco. `titulo`/`acoes` desenham um cabeçalho; `semPadding` para tabelas de borda a borda. */
export function Cartao({ titulo, descricao, acoes, semPadding = false, className = '', children, as: Tag = 'section' }) {
  const cabecalho = (titulo || acoes) && (
    <div className={`flex flex-wrap items-start justify-between gap-3 ${semPadding ? 'border-b border-slate-100 px-5 py-4' : 'mb-4'}`}>
      <div>
        {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
        {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
  return (
    <Tag className={`${painel} ${semPadding ? 'overflow-hidden p-0' : ''} ${className}`}>
      {cabecalho}
      {children}
    </Tag>
  );
}

/** Etiqueta de status. tom: marca | destaque | sucesso | atencao | perigo | info | neutro */
export function Etiqueta({ tom = 'neutro', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tonsEtiqueta[tom]} ${className}`}>
      {children}
    </span>
  );
}

/** Estado vazio: convida à próxima ação em vez de só dizer que não há nada. */
export function EstadoVazio({ icone: Icone, titulo, texto, children }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icone && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-marca-50 text-marca-600">
          <Icone className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-display font-semibold text-slate-900">{titulo}</p>
      {texto && <p className="mt-1 max-w-sm text-sm text-slate-500">{texto}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-marca-500" aria-hidden="true" /> {texto}
    </div>
  );
}

/** Mensagem fixa na página (erro de carregamento etc.). Para retorno de ações, prefira useAvisos(). */
export function Mensagem({ tom = 'perigo', children }) {
  const cores = {
    perigo: 'border-rose-200 bg-rose-50 text-rose-800',
    sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  };
  return (
    <p role={tom === 'perigo' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${cores[tom]}`}>
      {children}
    </p>
  );
}

/** Cartão de indicador do painel. tom define a cor do ícone. */
export function Indicador({ titulo, valor, detalhe, icone: Icone, tom = 'marca', tendencia }) {
  const tons = {
    marca: 'bg-marca-50 text-marca-700',
    destaque: 'bg-destaque-50 text-destaque-600',
    sucesso: 'bg-emerald-50 text-emerald-700',
    perigo: 'bg-rose-50 text-rose-700',
  };
  return (
    <article className={painel + ' flex flex-col gap-3'}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-sans text-sm font-medium text-slate-500">{titulo}</h2>
        {Icone && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tons[tom]}`}>
            <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="numero font-display text-2xl font-bold tracking-tight text-slate-900">{valor}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {tendencia}
        <span>{detalhe}</span>
      </div>
    </article>
  );
}
