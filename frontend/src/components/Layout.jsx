import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Boxes, ChevronRight, LayoutDashboard, LogOut, MapPin, Menu, Package, Receipt, ShoppingCart, Tags, Users, X,
} from 'lucide-react';
import { Logo, MarcaIcone } from './ui';

const grupos = [
  { titulo: 'Visão geral', itens: [{ icone: LayoutDashboard, rotulo: 'Painel', caminho: '/dashboard' }] },
  {
    titulo: 'Operações',
    itens: [
      { icone: Boxes, rotulo: 'Estoque', caminho: '/estoque' },
      { icone: ShoppingCart, rotulo: 'Compras', caminho: '/compras' },
      { icone: Receipt, rotulo: 'Vendas', caminho: '/vendas' },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { icone: Package, rotulo: 'Produtos', caminho: '/produtos' },
      { icone: Tags, rotulo: 'Categorias', caminho: '/categorias' },
      { icone: MapPin, rotulo: 'Locais de estoque', caminho: '/locais' },
      { icone: Users, rotulo: 'Clientes e fornecedores', caminho: '/pessoas' },
    ],
  },
];

const dataHoje = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

function sair() {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

function ItemMenu({ icone: Icone, rotulo, caminho, aoNavegar }) {
  return (
    <NavLink to={caminho} onClick={aoNavegar} className={({ isActive }) => `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-marca-600 text-white shadow-cartao' : 'text-marca-100/80 hover:bg-white/5 hover:text-white'
    }`}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-y-2 -left-3 w-1 rounded-r-full bg-destaque-400" aria-hidden="true" />}
          <Icone className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-white' : 'text-marca-300 group-hover:text-white'}`} aria-hidden="true" />
          <span>{rotulo}</span>
        </>
      )}
    </NavLink>
  );
}

function BarraLateral({ aoFechar }) {
  return (
    <div className="flex h-full flex-col bg-marca-950">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo tema="escuro" comSlogan />
        {aoFechar && (
          <button type="button" onClick={aoFechar} className="rounded-lg p-1.5 text-marca-200 hover:bg-white/10 md:hidden" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Menu principal">
        {grupos.map(({ titulo, itens }) => (
          <div key={titulo}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-marca-400">{titulo}</p>
            <div className="space-y-1">{itens.map((item) => <ItemMenu key={item.caminho} {...item} aoNavegar={aoFechar} />)}</div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button type="button" onClick={sair}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-marca-100/80 transition-colors hover:bg-white/5 hover:text-white">
          <LogOut className="h-[18px] w-[18px] text-marca-300" aria-hidden="true" /> Sair
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const grupoAtual = grupos.find(({ itens }) => itens.some((i) => i.caminho === pathname));
  const itemAtual = grupoAtual?.itens.find((i) => i.caminho === pathname);

  const [hoje] = useState(() => dataHoje.format(new Date()));

  return (
    <div className="flex h-dvh bg-fundo">
      <aside className="hidden w-64 shrink-0 md:block">
        <BarraLateral />
      </aside>

      {menuAberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-marca-950/60" onClick={() => setMenuAberto(false)} aria-hidden="true" />
          <aside className="relative h-full w-72 max-w-[85%] animate-surgir shadow-flutuante">
            <BarraLateral aoFechar={() => setMenuAberto(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <button type="button" onClick={() => setMenuAberto(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
          <MarcaIcone tamanho={26} className="md:hidden" />
          <nav aria-label="Você está em" className="flex min-w-0 items-center gap-1.5 text-sm">
            {grupoAtual && <span className="hidden text-slate-400 sm:inline">{grupoAtual.titulo}</span>}
            {grupoAtual && <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:inline" aria-hidden="true" />}
            <span className="truncate font-semibold text-slate-800">{itemAtual?.rotulo ?? 'StockFlow'}</span>
          </nav>
          <p className="ml-auto hidden text-sm text-slate-500 first-letter:uppercase lg:block">{hoje}</p>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
