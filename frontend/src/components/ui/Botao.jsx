import { Loader2 } from 'lucide-react';
import { variantesBotao } from './estilos';

/**
 * variante: primario (uma por área) | secundario | discreto | perigo | perigoDiscreto
 * icone: componente do lucide-react exibido à esquerda.
 */
export default function Botao({
  variante = 'primario', icone: Icone, carregando = false, type = 'button', className = '', children, disabled, ...props
}) {
  return (
    <button type={type} className={`${variantesBotao[variante]} ${className}`} disabled={disabled || carregando}
      aria-busy={carregando || undefined} {...props}>
      {carregando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        : Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}
