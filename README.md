# 🪖 SIGMIL — Sistema de Gestão Militar
### Backend Node.js + Express + MongoDB Atlas | Frontend React + Vite

---

## 🚀 Início Rápido

### 1. Instalar dependências
```bash
npm run install:all
```

### 2. Configurar o `.env` na raiz
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/sigmil?retryWrites=true&w=majority
JWT_SECRET=sua_chave_secreta_muito_segura
FRONTEND_URL=http://localhost:5173
```

### 3. Rodar (frontend + backend juntos)
```bash
npm run dev
```
- Frontend → http://localhost:5173
- Backend  → http://localhost:5000

---

## 🍃 Configurar MongoDB Atlas (passo a passo)

1. Acesse https://cloud.mongodb.com e crie uma conta gratuita
2. Crie um **Cluster** (M0 Free Tier é suficiente)
3. Em **Database Access** → Add User → defina usuário e senha
4. Em **Network Access** → Add IP Address → `0.0.0.0/0` (permite qualquer IP)
5. Em **Database** → Connect → **Drivers** → copie a connection string
6. Cole no `.env` substituindo `<usuario>`, `<senha>` e o nome do banco (`sigmil`)

Exemplo de URI:
```
mongodb+srv://joao:minhasenha123@cluster0.abcde.mongodb.net/sigmil?retryWrites=true&w=majority
```

---

## 🔐 Credenciais Padrão

O admin é criado automaticamente na primeira inicialização:

| Campo            | Valor        |
|-----------------|--------------|
| Número de Guerra | `ADM001`     |
| Senha            | `admin@2024` |

> ⚠️ Altere a senha e o `JWT_SECRET` antes de ir para produção!

---

## 📦 Deploy no Render

### Opção A — Full Stack (um único Web Service)
- **Build Command**: `npm run install:all && npm run build`
- **Start Command**: `npm start`
- **Variáveis de ambiente**: adicione `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`

### Opção B — Separado
**Backend (Web Service)**
- Build: `cd backend && npm install`
- Start: `cd backend && npm start`

**Frontend (Static Site)**
- Build: `cd frontend && npm install && npm run build`
- Publish dir: `frontend/dist`
- Adicione `VITE_API_URL` com a URL do backend

---

## 🗂️ Estrutura

```
military-system/
├── .env                        ← MONGODB_URI e JWT_SECRET aqui
├── package.json                ← scripts raiz + concurrently
├── backend/
│   ├── server.js               ← Express + conecta ao MongoDB
│   ├── config/database.js      ← mongoose.connect + seed admin
│   ├── middleware/auth.js      ← JWT guard
│   ├── models/
│   │   ├── User.js             ← Schema do usuário/soldado
│   │   └── LoginLog.js         ← Schema de log de acessos
│   └── routes/
│       ├── auth.js             ← login, primeiro acesso, /me
│       └── users.js            ← CRUD soldados + logs
└── frontend/
    └── src/
        ├── App.jsx             ← Roteamento
        ├── pages/              ← Login, FirstAccess, Dashboard, Soldiers
        ├── components/         ← Layout, Modais, Toast
        ├── context/            ← AuthContext
        └── utils/              ← api.js (axios), constants.js (patentes)
```

---

## ✨ Funcionalidades

- ✅ Login com número de guerra + senha (JWT 8h)
- ✅ Primeiro acesso — soldado define a própria senha
- ✅ Painel com estatísticas do efetivo em tempo real
- ✅ CRUD completo de soldados com todas as patentes
- ✅ Campos: nº guerra, nome guerra, nome civil, patente, esquadrão, pelotão, e-mail, telefone, endereço
- ✅ Ativar / Desativar / Excluir contas
- ✅ Log de acessos (IP, user-agent, sucesso/falha)
- ✅ Último login, data de criação, onde acessou
- ✅ Busca full-text + filtros + ordenação
- ✅ Tema militar neutro branco camuflado
- ✅ Responsivo mobile + desktop
- ✅ MongoDB Atlas — sem banco local
