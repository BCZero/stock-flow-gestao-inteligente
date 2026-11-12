/**
 * Tabela padrão. `colunas` = [{ titulo, className? }]; o corpo vem em `children` (<tr><td>…).
 * Use <Celula> para manter o espaçamento; `numero` alinha valores à direita com algarismos tabulares.
 */
export function Tabela({ colunas, children, className = '' }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {colunas.map(({ titulo, className: classe = '' }) => (
              <th key={titulo} scope="col"
                className={`whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${classe}`}>
                {titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Linha({ children, className = '' }) {
  return <tr className={`transition-colors hover:bg-marca-50/40 ${className}`}>{children}</tr>;
}

export function Celula({ children, numero = false, className = '' }) {
  return <td className={`px-5 py-3 text-slate-700 ${numero ? 'numero text-right' : ''} ${className}`}>{children}</td>;
}
