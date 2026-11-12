import { useId } from 'react';
import { campo, rotulo } from './estilos';

/** Campo de texto/número/data com rótulo. Repasse qualquer atributo nativo do <input>. */
export function Campo({ label, ajuda, className = '', ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={rotulo}>{label}</label>
      <input id={id} className={campo} {...props} />
      {ajuda && <p className="mt-1 text-xs text-slate-500">{ajuda}</p>}
    </div>
  );
}

/** Lista de seleção com rótulo. `opcoes` = [{ value, label }]. */
export function Selecao({ label, opcoes, vazio, className = '', ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={rotulo}>{label}</label>
      <select id={id} className={campo} {...props}>
        {vazio !== undefined && <option value="">{vazio}</option>}
        {opcoes.map(({ value, label: texto }) => <option key={value} value={value}>{texto}</option>)}
      </select>
    </div>
  );
}

export function AreaTexto({ label, className = '', ...props }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={rotulo}>{label}</label>
      <textarea id={id} className={campo + ' min-h-20'} {...props} />
    </div>
  );
}
