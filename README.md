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

## Painel administrativo (`/admin`)

Gerencia os produtos pelo navegador (Firestore). O site público lê a coleção `bt_products`; enquanto o painel nunca for usado, ele mostra o catálogo de `src/data/products.ts`.

**Configuração única (Firebase Console, projeto `rifa-emoaranha`):**
1. **Authentication → Sign-in method**: ative *E-mail/senha*. Em *Users*, crie o usuário administrador.
2. **Firestore Database**: crie o banco (se ainda não existir) e *adicione* as regras `bt_` de [firebase/firestore.rules](firebase/firestore.rules) às regras atuais (trocando o e-mail). Não substitua as regras do outro app.
3. Acesse `https://SEU-SITE/admin`, entre e use **Importar catálogo de exemplo** ou **+ Novo produto**.

Recursos: cadastro/edição completos (fotos com upload otimizado, vídeo, ficha técnica, destaques), ocultar, marcar vendido/destaque, reordenar, duplicar, excluir, busca e filtros, backup em JSON.

## Rifa

No painel (`/admin` → aba **🎟️ Rifa**) você configura: prêmio e foto, quantidade de números (até 1000), valor da cota, máximo por compra, prazo da reserva (padrão 24 h), data do sorteio, regras extras e a **chave PIX**. O site gera sozinho o QR Code e o "copia e cola" com o valor exato de cada reserva.

- **Ativar/desativar:** chave no topo da aba. Ativa = modal na entrada do site (1x por visita; na primeira visita do dia, versão "novidade"), botão flutuante "Rifa no ar" e link no menu. Página pública: `/rifa`.
- **Fluxo do comprador:** escolhe números → informa nome e WhatsApp → recebe o PIX → paga → envia o comprovante pelo WhatsApp. A reserva vence sozinha no prazo definido.
- **Você:** em **Vendas e reservas** confirma o pagamento (ou libera, cobra no WhatsApp, lança venda manual). Em **Sorteio** sorteia entre os números pagos e publica o resultado no site.
- **Regras do Firestore:** use o arquivo [firebase/firestore.rules](firebase/firestore.rules) (inclui as coleções `bt_raffle`, `bt_raffle_tickets` e `bt_raffle_orders`). Os dados pessoais dos compradores só podem ser lidos pelo admin.
