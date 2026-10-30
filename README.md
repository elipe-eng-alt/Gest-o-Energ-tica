# EnergiaViva

Sistema web em React + TypeScript para gestão de desperdício e potenciais de economia de energia em empresas, com API em Node/Express e SQLite.

## Funcionalidades

- **Área da empresa com login**: o cadastro cria a conta e já entra; cada empresa vê só os próprios dados
- **Lançamentos**: cadastro de unidades e lançamento mensal por unidade com os dados da fatura (consumo kWh, valor R$, consumo na ponta, demanda máxima e consumo fora do expediente/standby)
- **Importação de histórico por planilha (CSV)**: modelo para o Excel, prévia antes de gravar, erros por linha, unidades novas criadas automaticamente; aceita formatos brasileiros (`1.234,56`, `08/2026`, `ago/26`) e arquivos salvos pelo Excel em Windows-1252
- **Recuperação de senha** por e-mail: link de uso único válido por 1 hora; trocar a senha encerra as outras sessões
- Alertas automáticos a partir dos lançamentos: desperdício acima de 20%, consumo 10% acima do mês anterior e uso alto no horário de ponta
- Sem login, o sistema mostra dados de demonstração
- Dashboard executivo com indicadores de consumo, custo e desperdício, filtráveis por período e unidade
- Plano de ação: criar, remover e avançar o status de oportunidades de eficiência, com filtros por status, prioridade e busca
- Desempenho por unidade com índice de eficiência e economia potencial por unidade
- Relatório executivo em PDF e exportação das oportunidades em CSV (abre direto no Excel)
- Cadastro de clientes com validação, máscara de CPF/CNPJ e telefone e notificação por e-mail ao responsável
- Persistência local no navegador para as oportunidades (botão "Restaurar demo" volta aos dados iniciais)
- Navegação por URL (`#dashboard`, `#oportunidades`, ...), permitindo recarregar ou compartilhar a tela atual

## Requisitos

- Node.js **22.13 ou superior** (o banco usa o módulo nativo `node:sqlite`, sem compilação de dependências)

## Como executar

1. Instale as dependências:
   `npm install`
2. (Opcional) Copie `.env.example` para `.env` e ajuste SMTP, e-mail do responsável e `ADMIN_TOKEN`.
3. Inicie API + frontend com recarga automática:
   `npm run dev`
4. Acesse http://localhost:5173 (a API roda em http://localhost:3001 e é acessada via proxy do Vite).

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | API (`node --watch`) e Vite em paralelo |
| `npm run typecheck` | Verificação de tipos sem gerar arquivos |
| `npm run build` | Typecheck + build de produção em `dist/` |
| `npm start` | Servidor de produção: API + frontend de `dist/` na porta `PORT` (padrão 3001) |

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/api/health` | Status da API |
| POST | `/api/customers` | Cadastra cliente e notifica o responsável |
| GET | `/api/customers` | Lista clientes. Exige `Authorization: Bearer <ADMIN_TOKEN>` |
| POST | `/api/auth/login` | Entra (cookie de sessão HttpOnly, 30 dias); limite de 10 tentativas a cada 15 min |
| POST | `/api/auth/forgot` | Envia link de redefinição de senha (resposta igual exista ou não a conta) |
| POST | `/api/auth/reset` | Define nova senha com o token do link e entra na conta |
| POST | `/api/auth/logout` | Sai |
| GET | `/api/auth/me` | Usuário da sessão atual (ou `null`) |
| GET | `/api/company/data` | Unidades, lançamentos e oportunidades da empresa logada |
| POST/PUT/DELETE | `/api/company/units` | Unidades da empresa |
| PUT | `/api/company/readings` | Cria ou atualiza o lançamento de uma unidade em um mês |
| POST | `/api/company/readings/import` | Importa lançamentos em lote (tudo ou nada; até 2000 linhas) |
| DELETE | `/api/company/readings/:id` | Exclui um lançamento |
| POST/PATCH/DELETE | `/api/company/opportunities` | Oportunidades da empresa |

O aviso de novo cadastro é enviado em segundo plano pelo Resend (`RESEND_API_KEY`, por HTTPS) ou, sem ele, por SMTP (`SMTP_USER`/`SMTP_PASS`). Sem nenhum dos dois, o envio é simulado e registrado no console. No Railway (planos Free/Hobby) o SMTP é bloqueado: use o Resend. O banco fica em `data/` (ou em `DATA_DIR`, se definido).

## Estrutura

```
server/index.js        API Express: cadastro, login e arquivos do frontend
server/db.js           Esquema do banco SQLite
server/auth.js         Sessões e limite de tentativas
server/company.js      Rotas da área logada (dados isolados por empresa)
server/mail.js         Aviso de novo cadastro (Resend ou SMTP)
src/App.tsx            Shell, navegação e estado global
src/sections/          Telas (carregadas sob demanda)
src/components/        Componentes reutilizáveis (listas, gráficos, controles)
src/lib/               Cálculos de energia, formatação, relatórios PDF/CSV
src/data/demo.ts       Dados demonstrativos
```

## Observações

Os dados de consumo são demonstrativos e podem ser substituídos pela fonte real da empresa (medidores, faturas ou ERP).
