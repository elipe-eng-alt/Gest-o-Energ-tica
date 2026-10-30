# EnergiaViva

Sistema web em React + TypeScript para gestão de desperdício e potenciais de economia de energia em empresas, com API em Node/Express e SQLite.

## Funcionalidades

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

Sem `SMTP_USER`/`SMTP_PASS`, o envio de e-mail é simulado e registrado no console. O banco fica em `data/` (ou em `DATA_DIR`, se definido).

## Estrutura

```
server/index.js        API Express + SQLite
src/App.tsx            Shell, navegação e estado global
src/sections/          Telas (carregadas sob demanda)
src/components/        Componentes reutilizáveis (listas, gráficos, controles)
src/lib/               Cálculos de energia, formatação, relatórios PDF/CSV
src/data/demo.ts       Dados demonstrativos
```

## Observações

Os dados de consumo são demonstrativos e podem ser substituídos pela fonte real da empresa (medidores, faturas ou ERP).
