import { useId } from 'react';
import { campo } from '../services/estoque';

export function Seletor({ label, registros, value, onChange, required = true }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      <select id={id} className={campo} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">{required ? 'Selecione' : 'Sem identificação'}</option>
        {registros.map(({ id: registroId, nome }) => (
          <option value={registroId} key={registroId}>{nome}</option>
        ))}
      </select>
    </div>
  );
}
