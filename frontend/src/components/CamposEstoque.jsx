import { Selecao } from './ui';

export function Seletor({ label, registros, value, onChange, required = true }) {
  return (
    <Selecao label={label} value={value} onChange={(e) => onChange(e.target.value)} required={required}
      vazio={required ? 'Selecione' : 'Sem identificação'}
      opcoes={registros.map(({ id, nome }) => ({ value: id, label: nome }))} />
  );
}
