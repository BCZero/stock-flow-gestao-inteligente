import { useEffect, useState } from 'react';
import api from './api';

export const campo = 'mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm';
export const botao = 'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50';
export const painel = 'rounded-xl border border-gray-200 bg-white p-5 shadow-sm';

export function mensagemErro(erro) {
  const detalhe = erro.response?.data?.detail;
  if (typeof detalhe === 'string') return detalhe;
  if (Array.isArray(detalhe)) return 'Verifique os campos obrigatórios e a precisão dos valores.';
  return 'Falha na comunicação com o StockFlow. Tente novamente.';
}

export function useCadastrosEstoque(incluirPessoas = false) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    let ativo = true;
    const consultas = [api.get('/produtos/?incluir_inativos=true'), api.get('/locais/')];
    if (incluirPessoas) consultas.push(api.get('/pessoas/'));
    Promise.all(consultas).then(([produtos, locais, pessoas]) => {
      if (ativo) setDados({ produtos: produtos.data, locais: locais.data, pessoas: pessoas?.data ?? [] });
    }).catch((falha) => {
      if (ativo) setErro(mensagemErro(falha));
    });
    return () => { ativo = false; };
  }, [incluirPessoas]);
  return { dados, erro };
}

export function nomeRegistro(registros, id) {
  return registros.find((registro) => registro.id === Number(id))?.nome ?? '#' + id;
}

export function dataLocal(data) {
  if (!data) return '—';
  const comFuso = /Z$|[+-]\d\d:\d\d$/.test(data) ? data : data + 'Z';
  return new Date(comFuso).toLocaleString('pt-BR');
}

export const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
