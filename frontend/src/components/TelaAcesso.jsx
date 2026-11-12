import { BellRing, Boxes, ShieldCheck } from 'lucide-react';
import { Logo } from './ui';

const destaques = [
  { icone: Boxes, titulo: 'Estoque em tempo real', texto: 'Saldos por produto e local, com histórico de cada movimentação.' },
  { icone: BellRing, titulo: 'Alertas inteligentes', texto: 'Estoque crítico, produto parado e fornecedor em atraso antes de virar problema.' },
  { icone: ShieldCheck, titulo: 'Seguro e auditável', texto: 'Verificação em duas etapas e trilha de auditoria completa.' },
];

/** Moldura das telas públicas (login, 2FA): painel da marca à esquerda, conteúdo à direita. */
export default function TelaAcesso({ children }) {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-marca-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-marca-600/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-destaque-400/10 blur-3xl" aria-hidden="true" />
        <Logo tema="escuro" tamanho={40} comSlogan />
        <div className="relative mt-auto max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight text-white">
            Seu estoque sob controle, <span className="text-destaque-400">do pedido à prateleira.</span>
          </h1>
          <ul className="mt-10 space-y-6">
            {destaques.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-destaque-300 ring-1 ring-white/10">
                  <Icone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-white">{titulo}</p>
                  <p className="mt-0.5 text-sm text-marca-100/75">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-auto pt-12 text-xs text-marca-300">Projeto acadêmico · SENAC DF</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo tema="claro" tamanho={36} comSlogan /></div>
          {children}
        </div>
      </section>
    </div>
  );
}
