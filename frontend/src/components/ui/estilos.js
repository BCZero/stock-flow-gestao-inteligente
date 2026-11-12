/*
 * Classes base da identidade StockFlow. Use os componentes de ./index.js sempre que possível;
 * estas strings existem para elementos nativos (input, select, textarea) e casos pontuais.
 */

export const rotulo = 'block text-sm font-medium text-slate-700';

export const campo = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 '
  + 'shadow-xs placeholder:text-slate-400 transition-colors '
  + 'hover:border-slate-400 focus:border-marca-500 focus:outline-none focus:ring-3 focus:ring-marca-500/20 '
  + 'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const botaoBase = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold '
  + 'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 '
  + 'disabled:cursor-not-allowed disabled:opacity-50';

export const variantesBotao = {
  primario: botaoBase + ' bg-marca-600 text-white shadow-xs hover:bg-marca-700 focus-visible:outline-marca-500',
  secundario: botaoBase + ' border border-slate-300 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-marca-500',
  discreto: botaoBase + ' px-2.5 text-marca-700 hover:bg-marca-50 hover:text-marca-800 focus-visible:outline-marca-500',
  perigo: botaoBase + ' bg-rose-600 text-white shadow-xs hover:bg-rose-700 focus-visible:outline-rose-500',
  perigoDiscreto: botaoBase + ' px-2.5 text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-500',
};

export const botao = variantesBotao.primario;

export const painel = 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-cartao';

export const tonsEtiqueta = {
  marca: 'bg-marca-50 text-marca-800 ring-marca-600/20',
  destaque: 'bg-destaque-50 text-destaque-800 ring-destaque-500/30',
  sucesso: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  atencao: 'bg-destaque-50 text-destaque-800 ring-destaque-500/30',
  perigo: 'bg-rose-50 text-rose-800 ring-rose-600/20',
  info: 'bg-sky-50 text-sky-800 ring-sky-600/20',
  neutro: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};
