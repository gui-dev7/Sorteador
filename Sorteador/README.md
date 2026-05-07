# Sorteador FIAP

Projeto preparado para deploy direto na Vercel.

## Stack

- React
- TypeScript
- Vite
- Vercel Functions em `/api`
- Framer Motion
- Canvas Confetti

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra:

```txt
http://localhost:5173
```

## Como testar com ambiente Vercel local

```bash
npm install
npm run dev:vercel
```

## Como publicar na Vercel

1. Envie o projeto para um repositório no GitHub.
2. Importe o repositório na Vercel.
3. Use a raiz do projeto como Root Directory.
4. A Vercel detectará o Vite pelo `vercel.json`.

Configuração já preparada:

```txt
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

## Observação importante

Esta versão não usa workspaces. A estrutura foi simplificada para evitar erro de build na Vercel como:

```txt
No workspaces found: --workspace=apps/web
```

Agora o `package.json`, o `src`, o `public`, o `index.html`, o `vite.config.ts` e a pasta `api` ficam na raiz.
