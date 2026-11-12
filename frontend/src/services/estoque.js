import { useEffect, useState } from 'react';
import api from './api';

// Classes de estilo vêm da identidade visual (components/ui/estilos.js).
export { campo, botao, painel } from '../components/ui/estilos';

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
