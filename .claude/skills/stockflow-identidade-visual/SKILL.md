---
name: stockflow-identidade-visual
description: Identidade visual e padrões de interface do StockFlow (frontend React + Tailwind 4). Use sempre que criar ou alterar telas, componentes, cores, ícones, textos de interface ou qualquer arquivo em frontend/src — inclusive "nova página", "novo formulário", "deixar mais bonito", "ajustar o layout" ou "mudar a cor".
---

# Identidade visual StockFlow

Direção **Petróleo + âmbar**: petróleo transmite logística, confiança e fluxo; âmbar dá energia e sinaliza atenção.
O objetivo é que toda tela pareça parte de um sistema de gestão completo — nunca um formulário solto.

Antes de mexer em qualquer tela, leia os arquivos de referência abaixo. Eles são a fonte da verdade; esta skill explica como usá-los.

| O quê | Onde |
| --- | --- |
| Cores, fontes, sombras, animação | `frontend/src/index.css` (bloco `@theme`) |
| Componentes prontos | `frontend/src/components/ui/` (importe de `../components/ui`) |
| Classes para elementos nativos | `frontend/src/components/ui/estilos.js` |
| Rótulo e cor de cada status da API | `frontend/src/components/ui/status.js` |
| Logo e ícone | `frontend/src/components/ui/Logo.jsx` e `frontend/public/favicon.svg` |
| Estrutura do app (menu, barra superior) | `frontend/src/components/Layout.jsx` |
| Telas públicas (login, 2FA) | `frontend/src/components/TelaAcesso.jsx` |

## Cores

Use sempre os tokens — nunca hex solto no JSX nem `blue-*`/`gray-*` do Tailwind.

| Papel | Token Tailwind | Uso |
| --- | --- | --- |
| Marca (petróleo) | `marca-50 … marca-950` | Ação principal (`marca-600`, hover `marca-700`), links, foco, item ativo do menu, série "Vendas" |
| Fundo de navegação | `marca-950` | Barra lateral, painel da marca no login, cartões de destaque escuros |
| Destaque (âmbar) | `destaque-50 … destaque-900` | "Flow" do logo, indicador do item ativo, atenção, série "Compras", CTA de IA sobre fundo escuro |
| Neutros | `slate-*` | Textos (`slate-900` títulos, `slate-700` corpo, `slate-500` apoio, `slate-400` metadados), bordas `slate-200` |
| Fundo da página | `bg-fundo` | Já aplicado no `body` e no layout |
| Sucesso / perigo / info | `emerald-*` / `rose-*` / `sky-*` | Somente para significado (status, erro, informação) |

Regras:
- **Um botão primário (`marca-600`) por área.** Os demais são `secundario` ou `discreto`.
- Âmbar **nunca** é botão principal sobre fundo claro. Ele aparece em detalhes e na sinalização de atenção.
- Texto sobre fundo colorido usa o tom 700–800 da mesma família (ex.: `bg-rose-50 text-rose-800`).
- Cor sempre acompanha texto ou ícone — nunca é o único sinal (acessibilidade).

## Tipografia

- `font-sans` = **Inter** (corpo, tabelas, formulários). `font-display` = **Plus Jakarta Sans** (títulos, logo, números grandes).
- `h1`, `h2`, `h3` já usam `font-display` e `slate-900` (camada base em `index.css`).
- Valores monetários e quantidades: classe `numero` (algarismos tabulares) e alinhados à direita em tabelas (`<Celula numero>`).
- SKU e códigos: `font-mono text-xs text-slate-500`.

## Componentes

Importe de `../components/ui`. Não recrie estilos que já existem.

| Componente | Quando usar |
| --- | --- |
| `CabecalhoPagina` | Topo de **toda** página: `titulo`, `icone` (lucide), `descricao` de uma linha, ações como `children` |
| `Cartao` | Toda seção de conteúdo. `titulo`, `descricao`, `acoes`; `semPadding` quando o conteúdo é uma `Tabela` |
| `Botao` | `variante`: `primario`, `secundario`, `discreto`, `perigo`, `perigoDiscreto`; `icone`; `carregando` |
| `Campo`, `Selecao`, `AreaTexto` | Campos com rótulo. `Selecao` recebe `opcoes=[{value,label}]` e `vazio` opcional |
| `Tabela`, `Linha`, `Celula` | Listagens. `colunas=[{titulo, className}]`; cabeçalho em caixa alta pequena |
| `Etiqueta` | Status e categorias. `tom`: `marca`, `destaque`, `sucesso`, `atencao`, `perigo`, `info`, `neutro` |
| `Indicador` | Cartões de número do painel (título, valor, ícone, `tom`, `tendencia`) |
| `EstadoVazio` | Lista sem itens: ícone + título convidativo + texto que diz o próximo passo |
| `Carregando` | Enquanto busca dados |
| `Mensagem` | Erro de carregamento fixo na página |
| `useAvisos()` | `avisar(texto, tom)` para retorno de ações; `await confirmar({titulo, texto, acao})` antes de excluir |
| `Logo`, `MarcaIcone` | Marca. `tema="escuro"` sobre petróleo, `tema="claro"` sobre branco |

Status vindos da API (documentos, movimentações, alertas) sempre passam por `status.js`. Novo status = nova entrada lá, não um `if` na página.

## Estrutura de uma página

```jsx
<div className="space-y-6">
  <CabecalhoPagina titulo="Produtos" icone={Package} descricao="Catálogo de itens controlados no estoque." />
  <Cartao titulo="Novo produto">{/* formulário em grid responsivo */}</Cartao>
  <Cartao titulo="Produtos cadastrados" semPadding>
    {carregando ? <Carregando /> : itens.length === 0 ? <EstadoVazio … /> : <Tabela …>…</Tabela>}
  </Cartao>
</div>
```

- Espaçamento entre seções: `space-y-6`; dentro de formulários: `gap-4`.
- Formulários: `grid gap-4 md:grid-cols-2` e colunas extras só em `xl:`. Botão de envio alinhado com `items-end`.
- Nova rota: adicione em `App.jsx` **e** no grupo certo de `Layout.jsx` (`Visão geral`, `Operações` ou `Cadastros`), com ícone do lucide.
- Ícones: somente `lucide-react`, 16px em botões (`h-4 w-4`), 18–20px no menu e cabeçalhos.
- Teste em 375px de largura: nada pode estourar a página; tabelas rolam dentro do cartão.

## Retorno ao usuário

- **Nunca** use `alert()`, `confirm()` ou `console.error` como único retorno. Use `avisar()` e `confirmar()`.
- Sucesso: `avisar('Produto cadastrado.')`. Erro: `avisar(mensagemErro(e), 'perigo')`.
- Exclusão sempre passa por `confirmar()` dizendo **o que** será removido.

## Textos (pt-BR)

- Frases curtas, voz ativa, verbo no início nos botões: "Salvar produto", "Registrar ajuste", "Receber itens".
- Só a primeira letra maiúscula (exceto nomes próprios): "Locais de estoque", não "Locais De Estoque".
- Erros dizem o que houve e o que fazer: "Não foi possível conectar ao StockFlow. Verifique se a API está ativa."
- Estados vazios convidam: "Cadastre seu primeiro local" + por que isso importa.
- Placeholders são exemplos reais ("CAFE-250", "Distribuidora Exemplo Ltda."), sem "Ex.:".
- Sem "com sucesso", sem exclamação, sem "por favor".

## Checklist antes de concluir uma tela

1. Usa `CabecalhoPagina` e `Cartao`; nenhum `bg-blue-*`, `text-gray-*` ou hex no JSX.
2. Um único botão primário por área.
3. Listas têm `Carregando` e `EstadoVazio`.
4. Ações dão retorno por `useAvisos()`; exclusões pedem confirmação.
5. Números com `numero` e alinhados à direita.
6. Funciona em 375px e em desktop.
7. `npx oxlint` e `npm run build` em `frontend/` passam.
