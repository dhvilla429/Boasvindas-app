# 🏢 Pesquisa de Avaliação Pós-Tour — TP Boas-Vindas

Sistema completo de pesquisa de satisfação pós-tour com formulário de avaliação, painel de indicadores em tempo real, banco de dados local, agenda de tours e módulo de gestão multi-unidade.

---

## 📱 Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ iPhone (Safari iOS)
- ✅ Android (Chrome, Samsung Browser)
- ✅ Tablets

---

## 🔐 Credenciais de Acesso

| Unidade | Usuário | Senha |
|---|---|---|
| Gestão Geral (todas) | Diogo Villa | `gestor123` |
| LAPA | Joshua Carlucci / Beatriz Reis / Beatriz Vital | `lapa123` |
| Vila Prudente | Gustavo de Assis / Catherine Dias | `vila123` |
| PRN | Vinicius Lima / Rafaela Alessandra | `prn123` |
| SGA | Ester Lucas | `sga123` |

> Cada colaborador pode alterar sua própria senha após login pelo ícone de chave no header.

### 🔗 Acesso Direto por QR Code (Participantes)
Acesse sem login adicionando `?unidade=NOME` na URL:
- `?unidade=LAPA`
- `?unidade=PRN`
- `?unidade=Vila Prudente`
- `?unidade=SGA`

---

## 🚀 Deploy no GitHub + Cloudflare Pages

### Passo 1 — Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Defina o nome (ex: `pesquisa-pos-tour`)
3. Marque como **Private** (recomendado)
4. Clique em **Create repository**

### Passo 2 — Enviar o código ao GitHub

Abra o terminal na pasta do projeto e execute:

```bash
git init
git add .
git commit -m "feat: initial deploy - pesquisa pós-tour TP"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pesquisa-pos-tour.git
git push -u origin main
```

> Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub.

### Passo 3 — Criar projeto no Cloudflare Pages

1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. No menu lateral, clique em **Workers & Pages**
3. Clique em **Create application** → **Pages** → **Connect to Git**
4. Autorize o acesso ao GitHub e selecione o repositório `pesquisa-pos-tour`
5. Configure o build:

| Campo | Valor |
|---|---|
| **Framework preset** | `None` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Node.js version** | `20` |

6. Clique em **Save and Deploy**

> O Cloudflare irá instalar as dependências, buildar e publicar automaticamente. ⏱ ~2 minutos.

### Passo 4 — URL pronta!

Após o deploy, você receberá uma URL no formato:
```
https://pesquisa-pos-tour.pages.dev
```

A cada `git push`, o Cloudflare Pages realiza um novo deploy automaticamente.

---

## 💻 Rodar Localmente

**Pré-requisitos:** Node.js 18+

```bash
npm install
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Estrutura do Projeto

```
pesquisa-pos-tour/
├── public/
│   └── _redirects          # Roteamento SPA no Cloudflare Pages
├── src/
│   ├── components/
│   │   ├── FormSurvey.tsx           # Formulário de avaliação
│   │   ├── DashboardStatsPanel.tsx  # Painel de indicadores
│   │   ├── DatabaseGrid.tsx         # Banco de dados coletado
│   │   ├── LoginScreen.tsx          # Tela de login + QR Codes
│   │   ├── ManagerCredentialsPanel.tsx  # Gestão de credenciais
│   │   ├── ManagerWarningsPanel.tsx     # Avisos e alertas
│   │   └── RoutinesAgendaPanel.tsx      # Agenda de tours
│   ├── utils/
│   │   └── auth.ts          # Autenticação local
│   ├── App.tsx              # Componente raiz
│   ├── data.ts              # Dados iniciais
│   ├── index.css            # Estilos globais (Tailwind v4)
│   ├── main.tsx             # Entry point
│   ├── types.ts             # Interfaces TypeScript
│   └── utils.ts             # Utilitários (CSV, estatísticas)
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 💡 Tecnologias

- **React 19** + **TypeScript**
- **Tailwind CSS v4** (via Vite plugin)
- **Recharts** — gráficos do dashboard
- **jsPDF** + **PptxGenJS** — exportação de relatórios
- **Lucide React** — ícones
- **Motion** — animações
- **localStorage** — persistência de dados no navegador

---

## ⚠️ Observação sobre dados

Todos os dados são salvos no **localStorage do navegador** de cada dispositivo. Não há banco de dados externo. Para uso em produção com dados compartilhados entre dispositivos, seria necessário integrar um backend/banco de dados.
