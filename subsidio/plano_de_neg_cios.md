# STOCKFLOW - Plano de Negócios
**Sistema web de gestão inteligente e preditiva de estoque para pequenos negócios**
**Versão 1.0** | 20 de agosto de 2026 | Brasília - DF

---

## 1. Resumo executivo

O StockFlow é um sistema web de gestão inteligente de estoque destinado a pequenos lojistas, microempreendedores, microempresas e empresas de pequeno porte. A plataforma registra produtos, compras, vendas, clientes, fornecedores e movimentações, atualizando automaticamente as quantidades disponíveis.

Seu diferencial é transformar o histórico operacional em alertas sobre variações nas vendas e, progressivamente, em previsões de demanda e recomendações de reposição.

* **Missão:** Tornar a gestão preditiva de estoque acessível aos pequenos negócios.
* **Visão:** Ser uma plataforma de referência para pequenos lojistas que desejam tomar decisões de compra e reposição orientadas por dados.
* **Slogan:** StockFlow - estoque inteligente, decisões no tempo certo.

---

## 2. Problema e oportunidade

Pequenos comerciantes frequentemente realizam compras e reposições com base em controles manuais, planilhas, observação visual ou experiência pessoal. O resultado pode ser uma decisão tardia ou pouco fundamentada:
* Falta de produtos em períodos de alta demanda e perda de vendas.
* Acúmulo de mercadorias com baixa saída e capital imobilizado.
* Compras realizadas em quantidades inadequadas.
* Dificuldade para perceber mudanças no comportamento dos clientes.
* Perdas com produtos perecíveis, sazonais ou sujeitos à obsolescência.
* Ausência de rastreabilidade sobre usuários e operações realizadas.

**Problema central:** O pequeno lojista possui dados de vendas, mas normalmente não dispõe de uma ferramenta simples e acessível para convertê-los em alertas, previsões e recomendações.

**A oportunidade:** O StockFlow poderá ocupar o espaço entre o controle manual e os sistemas empresariais complexos, oferecendo simplicidade operacional e inteligência aplicada à gestão do estoque.

---

## 3. Solução proposta

A plataforma centraliza as operações da loja e analisa o histórico para apoiar a tomada de decisão. A decisão final permanece com o comerciante; a tecnologia atua como instrumento de apoio.

| 1. Coleta | 2. Análise | 3. Alerta | 4. Decisão |
| :--- | :--- | :--- | :--- |
| Compras, vendas, estoque e prazos | Comparação de períodos e previsão | Risco, oportunidade e prioridade | Reposição, promoção ou ajuste |

**Exemplos de alertas:**
* As vendas desta categoria caíram 20% em relação ao período anterior.
* As vendas do produto aumentaram e o estoque pode se esgotar em poucos dias.
* O produto apresenta baixa saída e risco de acúmulo.
* A reposição sugerida é de 20 unidades para atender à demanda prevista.
* O fornecedor ultrapassou a data prevista de entrega.

---

## 4. Público-alvo

O mercado inicial é formado por pequenos negócios varejistas que necessitam de controle de estoque, mas não possuem estrutura ou orçamento para adotar um ERP complexo.

| Segmento | Características e necessidades |
| :--- | :--- |
| MEI | Poucos usuários, orçamento limitado e preferência por uma solução simples. |
| Microempresa | Necessidade de controlar produtos, compras, vendas e mais de um usuário. |
| Empresa de pequeno porte | Maior volume de dados, demanda por relatórios, integrações e permissões. |
| Pequeno varejo | Uso de cadernos ou planilhas, risco de ruptura e excesso de mercadorias. |

**Recorte recomendado:** Para validar a primeira versão, recomenda-se escolher um segmento varejista específico. Lojas de roupas, papelarias e pequenos mercados possuem comportamentos sazonais distintos; a especialização inicial facilita a coleta de dados e a avaliação dos alertas.

---

## 5. Proposta de valor

O StockFlow ajuda pequenos lojistas a evitar falta e excesso de mercadorias, analisando variações nas vendas e evoluindo para previsões de demanda e recomendações de reposição.

| Necessidade | Resposta do StockFlow |
| :--- | :--- |
| Saber o que existe | Estoque atualizado a partir das compras, vendas e ajustes. |
| Entender o que mudou | Comparação das vendas entre produtos, categorias e períodos. |
| Agir antes do problema | Alertas visuais priorizados por risco ou oportunidade. |
| Decidir quanto comprar | Previsão e recomendação progressiva de reposição. |
| Saber quem fez | Registro auditável de usuário, data, horário e operação. |

---

## 6. Funcionalidades do produto

| Módulo | Principais funcionalidades |
| :--- | :--- |
| Cadastros | Produtos, categorias, clientes, fornecedores e usuários. |
| Estoque | Quantidade disponível, estoque mínimo, entradas, saídas e ajustes. |
| Compras | Fornecedor, itens, quantidades, valores, previsão e recebimento. |
| Vendas | Cliente, itens, quantidades, valores e atualização automática. |
| Auditoria | Data, horário, usuário, operação, quantidade anterior e posterior. |
| Inteligência | Variação das vendas, alertas, tendências e previsão de demanda. |
| Acesso | Aplicação web responsiva, adequada a computador e celular. |

**Registro de auditoria**
Embora o projeto preveja um arquivo de log, recomenda-se armazenar os eventos também em uma tabela de auditoria no banco de dados, permitindo busca, filtro e exportação.

| Campo | Exemplo |
| :--- | :--- |
| Data e horário | 20/08/2026, 16h30 |
| Usuário | Maria operadora de caixa |
| Ação | Venda registrada |
| Produto e quantidade | Camiseta básica - 3 unidades |
| Cliente | João da Silva |
| Estoque | 20 unidades antes; 17 depois |

---

## 7. Alertas inteligentes

| Prioridade | Alerta | Lógica inicial |
| :--- | :--- | :--- |
| Crítica | Risco de falta | Estoque atual comparado à média de vendas. |
| Atenção | Produto parado | Número de dias sem venda ou baixa rotatividade. |
| Observação | Queda de vendas | Comparação entre períodos equivalentes. |
| Oportunidade| Aumento de demanda | Crescimento recente e necessidade de reposição. |
| Fornecedor | Atraso de entrega | Data prevista comparada ao recebimento efetivo. |

---

## 8. Estratégia de dados e inteligência artificial

A inteligência do sistema deve evoluir conforme a quantidade e a qualidade dos dados. Na primeira versão, cálculos estatísticos e regras transparentes oferecem valor e criam a base para modelos preditivos posteriores.

| Dados internos | Dados externos potenciais |
| :--- | :--- |
| Quantidade vendida, data e horário | Feriados e datas comemorativas |
| Produto, categoria e preço | Estação do ano e clima |
| Promoções e devoluções | Eventos regionais |
| Estoque disponível e ruptura | Tendências do setor |
| Prazo e desempenho do fornecedor| Indicadores econômicos |

**Evolução analítica**

| Nível | Capacidade | Exemplo |
| :--- | :--- | :--- |
| Descritivo | Explica o que aconteceu | Vendas caíram 20%. |
| Diagnóstico | Indica fatores relacionados | Queda ocorreu após aumento de preço. |
| Preditivo | Estima o que pode acontecer | Demanda esperada para a próxima semana. |
| Prescritivo | Recomenda uma ação | Repor 20 unidades até sexta-feira. |

**Limitações que devem ser assumidas:**
* Uma loja recém-cadastrada não possui histórico suficiente para previsões personalizadas.
* Dados incorretos ou incompletos reduzem a qualidade das recomendações.
* Mercados diferentes exigem variáveis e padrões distintos.
* Toda previsão possui incerteza e deve ser apresentada como apoio à decisão.

---

## 9. MVP e roteiro de evolução

| Fase | Entregas | Valor demonstrado |
| :--- | :--- | :--- |
| **1. Operacional** | Cadastros, compras, vendas, estoque e log. | Controle centralizado e rastreável. |
| **2. Analítica** | Comparação de períodos, variação percentual, painel e alertas. | Identificação de quedas e oportunidades. |
| **3. Preditiva** | Sazonalidade, previsão de demanda e reposição sugerida. | Antecipação de falta e excesso. |
| **4. Mercado** | Dados externos, integrações e modelos segmentados. | Resposta a eventos e tendências externas. |

**Cálculo principal do MVP**
> Variação (%) = [(vendas atuais - vendas anteriores) / vendas anteriores] x 100

Exemplo: se um produto vendeu 100 unidades no período anterior e 80 no período atual, a variação é de -20%. O sistema deverá comunicar a queda e oferecer contexto para a decisão.

---

## 10. Modelo de receita

O modelo sugerido é Software como Serviço (SaaS), com acesso pela internet mediante assinatura. A definição de preços dependerá de pesquisa com potenciais clientes e análise dos concorrentes.

| Plano | Proposta de oferta |
| :--- | :--- |
| **Demonstração** | Período de teste ou limite de produtos e usuários. |
| **Básico** | Cadastros, estoque, compras, vendas e relatórios essenciais. |
| **Inteligente** | Alertas avançados, tendências e previsões. |
| **Profissional** | Mais usuários, filiais, integrações e suporte ampliado. |

**Receitas complementares:**
* Taxa opcional de implantação.
* Treinamento dos usuários.
* Integrações contratadas separadamente.
* Planos anuais com desconto.

---

## 11. Canais, relacionamento e parceiros

| Elemento | Estratégia |
| :--- | :--- |
| **Aquisição** | Redes sociais, demonstrações locais, marketing de conteúdo e indicação. |
| **Parcerias** | Contadores, associações comerciais, Sebrae e fornecedores do varejo. |
| **Conversão** | Teste gratuito, implantação simples e demonstração dos alertas. |
| **Relacionamento** | Suporte digital, tutoriais, onboarding e acompanhamento do uso. |
| **Retenção** | Relatórios de resultado, alertas úteis e evolução contínua do produto. |

---

## 12. Recursos, atividades e custos

| Categoria | Itens principais |
| :--- | :--- |
| **Pessoas** | Desenvolvimento, interface, banco de dados, análise de dados e negócios. |
| **Tecnologia** | Aplicação web, banco de dados, hospedagem, backups e monitoramento. |
| **Operação** | Suporte, manutenção, documentação e treinamento. |
| **Aquisição** | Divulgação, demonstrações, parcerias e pesquisa de mercado. |
| **Conformidade** | Segurança, privacidade, LGPD e gestão de acessos. |

---

## 13. Indicadores de sucesso

| Dimensão | Indicadores |
| :--- | :--- |
| **Adoção** | Empresas cadastradas, usuários ativos e produtos gerenciados. |
| **Uso** | Compras e vendas registradas, alertas visualizados e ações realizadas. |
| **Resultado** | Redução de ruptura, estoque parado e capital imobilizado. |
| **Produto** | Precisão das previsões, tempo de resposta e falhas operacionais. |
| **Negócio** | Conversão, receita recorrente, retenção e cancelamento. |

**Métrica central sugerida:** Redução percentual das ocorrências de falta e excesso de estoque após a adoção do StockFlow.

---

## 14. Riscos e respostas

| Risco | Resposta planejada |
| :--- | :--- |
| Pouco histórico | Começar com regras, médias e alertas simples. |
| Dados incorretos | Validar entradas e permitir correções auditáveis. |
| Previsão imprecisa | Exibir incerteza e manter decisão humana. |
| Complexidade | Interface simples, linguagem clara e treinamento. |
| Baixa disposição a pagar | Teste gratuito e plano de entrada acessível. |
| Dependência externa | Gerar valor primeiro com dados internos. |
| Exposição de dados | Controle de acesso, criptografia, backups e LGPD. |
| Alerta excessivo | Priorizar, agrupar e permitir configuração. |

---

## 15. Conclusão e próximos passos

O StockFlow apresenta uma proposta coerente para pequenos lojistas: reunir gestão operacional, rastreabilidade e inteligência de negócio em uma plataforma simples. Seu diferencial não deve ser apenas o uso do termo inteligência artificial, mas a capacidade de gerar alertas compreensíveis e recomendações úteis a partir de dados confiáveis.

**Próximas decisões do grupo:**
* Selecionar o primeiro segmento varejista atendido.
* Entrevistar potenciais usuários e validar problemas prioritários.
* Definir requisitos funcionais e não funcionais do MVP.
* Modelar banco de dados e perfis de acesso.
* Construir o fluxo de compras, vendas e atualização de estoque.
* Implementar o alerta de variação das vendas.
* Testar a solução com dados simulados e, depois, com dados reais autorizados.
* Mensurar o impacto sobre falta e excesso de mercadorias.

**Posicionamento final:** StockFlow - gestão inteligente que transforma movimentações de estoque em decisões antecipadas.