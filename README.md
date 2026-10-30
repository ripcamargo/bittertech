# Bitter Tech Store

Vitrine digital (React + TypeScript + Vite). Sem backend, sem checkout: todos os botões levam ao WhatsApp **5515998110938**.

## Rodar
```
npm install
npm run dev       # desenvolvimento (http://localhost:5173)
npm run build     # gera a pasta dist/ para publicar
npm run preview   # testa o build
```

## O que editar
| O quê | Onde |
|---|---|
| **Produtos, preços, fotos, vídeo, ficha técnica** | `src/data/products.ts` (instruções no topo do arquivo) |
| Fotos dos produtos | coloque em `public/images/products/` e referencie como `/images/products/arquivo.webp` |
| Textos (hero, sobre, diferenciais, FAQ, contato) e número do WhatsApp | `src/data/content.ts` |
| Cores | variáveis `:root` em `src/styles/global.css` |
| Domínio final (Open Graph) | `index.html` |

Os produtos atuais são **exemplos fictícios**. As fotos vêm do Unsplash (licença gratuita) e ficam salvas localmente.
Para publicar: envie a pasta `dist/` para Netlify, Vercel, Cloudflare Pages etc.

## Páginas
- `/` — landing page (a vitrine mostra os produtos com `featured: true`).
- `/produtos` — catálogo completo com busca, categorias, condição e ordenação.
- Clique em um produto para abrir o modal (galeria, vídeo, descrição, ficha técnica). Cada produto tem link próprio: `/produtos?p=ID-DO-PRODUTO`.
- Ao publicar, o servidor precisa devolver `index.html` para qualquer rota (já configurado em `vercel.json` e `public/_redirects`).
