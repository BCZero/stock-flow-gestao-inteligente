/**
 * Marca StockFlow: caixas empilhadas (o estoque) + seta âmbar (o fluxo).
 * tema="escuro" para fundos petróleo (barra lateral, login); tema="claro" para fundos brancos.
 */
export function MarcaIcone({ tamanho = 32, className = '' }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0E727A" />
      <rect x="10.75" y="3.5" width="9.5" height="9.5" rx="1.8" fill="#FFFFFF" />
      <rect x="5.75" y="13.5" width="9.5" height="9.5" rx="1.8" fill="#FFFFFF" />
      <rect x="15.75" y="13.5" width="9.5" height="9.5" rx="1.8" fill="#A9DCDC" />
      <path d="M6 27H23.5" stroke="#F5A524" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M21 24L24.5 27L21 30" stroke="#F5A524" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ tema = 'escuro', tamanho = 32, comSlogan = false }) {
  const escuro = tema === 'escuro';
  return (
    <div className="flex items-center gap-2.5">
      <MarcaIcone tamanho={tamanho} />
      <div className="leading-none">
        <span className={`font-display text-lg font-bold tracking-tight ${escuro ? 'text-white' : 'text-marca-950'}`}>
          Stock<span className="text-destaque-400">Flow</span>
        </span>
        {comSlogan && (
          <span className={`mt-1 block text-[11px] font-medium ${escuro ? 'text-marca-200' : 'text-slate-500'}`}>
            Gestão inteligente de estoque
          </span>
        )}
      </div>
    </div>
  );
}
