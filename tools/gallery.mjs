import sharp from 'sharp'
// Gera fotos extras de demonstração (recortes diferentes da mesma foto).
const crops = { 'iphone-15-pro': [[0.1,0.15,0.8,0.7],[0.35,0.2,0.45,0.55]], 'galaxy-s21-ultra': [[0.1,0.1,0.8,0.8],[0.45,0.25,0.4,0.5]], 'headphone-anc': [[0.15,0.1,0.7,0.8],[0.3,0.15,0.4,0.5]] }
for (const [n, list] of Object.entries(crops)) {
  const { width: W, height: H } = await sharp(`tools/cand/${n}.jpg`).metadata()
  for (let i = 0; i < list.length; i++) {
    const [x, y, w, h] = list[i]
    await sharp(`tools/cand/${n}.jpg`).extract({ left: Math.round(W*x), top: Math.round(H*y), width: Math.round(W*w), height: Math.round(H*h) })
      .resize(900, 1100, { fit: 'cover' }).webp({ quality: 78 }).toFile(`public/images/products/${n}-${i + 2}.webp`)
  }
}
const files = Object.keys(crops).flatMap(n => [2,3].map(i => `public/images/products/${n}-${i}.webp`))
const tiles = await Promise.all(files.map(f => sharp(f).resize(220, 270).toBuffer()))
await sharp({ create: { width: 220*6, height: 270, channels: 3, background: '#222' } }).composite(tiles.map((t,i)=>({input:t,left:i*220,top:0}))).jpeg().toFile('tools/gal.jpg')
