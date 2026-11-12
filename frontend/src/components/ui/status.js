/* Rótulo e tom de etiqueta para cada estado vindo da API. Mantenha um único lugar para essas cores. */

export const statusDocumento = {
  RASCUNHO: { rotulo: 'Rascunho', tom: 'neutro' },
  CONFIRMADA: { rotulo: 'Confirmada', tom: 'marca' },
  PARCIAL: { rotulo: 'Recebida em parte', tom: 'atencao' },
  RECEBIDA: { rotulo: 'Recebida', tom: 'sucesso' },
};

export const tipoMovimento = {
  ENTRADA: { rotulo: 'Entrada', tom: 'sucesso' },
  SAIDA: { rotulo: 'Saída', tom: 'info' },
  AJUSTE: { rotulo: 'Ajuste', tom: 'atencao' },
};

export const prioridadeAlerta = {
  1: { rotulo: 'Crítica', tom: 'perigo', barra: 'bg-rose-500' },
  2: { rotulo: 'Atenção', tom: 'atencao', barra: 'bg-destaque-400' },
  3: { rotulo: 'Observação', tom: 'info', barra: 'bg-sky-500' },
  4: { rotulo: 'Oportunidade', tom: 'sucesso', barra: 'bg-emerald-500' },
};

export const estadoAlerta = {
  NOVO: 'Novo', LIDO: 'Lido', EM_TRATAMENTO: 'Em tratamento', RESOLVIDO: 'Resolvido', DESCARTADO: 'Descartado',
};
