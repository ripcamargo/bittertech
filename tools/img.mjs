import sharp from 'sharp'; import fs from 'fs';
const map={
 'iphone-15-pro':'1695048133142-1a20484d2569','galaxy-s21-ultra':'1610945415295-d9bbf067e59c','iphone-13':'1678652197831-2d180705cd2c',
 'iphone-11':'1567581935884-3349723552ca','iphone-12-pro':'1592899677977-9c10ca588bbd','airpods-pro':'1572569511254-d8f925fe2cbb',
 'headphone-anc':'1546435770-a3e426bf472b','headphone-max':'1609081219090-a6d81d3085bf','caixa-bluetooth':'1608043152269-423dbba4e7e1',
 'carregador':'1583863788434-e58a36330cf0','capa':'1601972599720-36938d4ecd31','case-fone':'1590658268037-6bf12165a8df',
 'smartwatch':'1546868871-7041f2a55e12','relogio-branco':'1523275335684-37898b6baf30','smart-speaker':'1558089687-f282ffcbc126'};
for(const [n,id] of Object.entries(map)) await sharp(`tools/cand/${id}.jpg`).resize(900,1100,{fit:'cover'}).webp({quality:78}).toFile(`public/images/products/${n}.webp`);
await sharp('tools/hero-src.jpg').resize(2000,1400,{fit:'cover',position:'centre'}).webp({quality:80}).toFile('public/images/hero.webp');
await sharp('tools/hero-src.jpg').resize(900,1200,{fit:'cover',position:'centre'}).webp({quality:78}).toFile('public/images/hero-mobile.webp');
// logo para uso
const lw=await sharp('public/images/logo-white.png').resize({width:600}).png().toBuffer();
await sharp('public/images/logo-white.png').resize({width:700}).png({compressionLevel:9}).toFile('public/images/logo-white.png.tmp').catch(()=>{});
fs.existsSync('public/images/logo-white.png.tmp')&&fs.unlinkSync('public/images/logo-white.png.tmp');
// Favicon: "B" do logo sobre quadrado verde-petróleo
const {width,height}=await sharp('public/images/logo-white.png').metadata();
const B=await sharp('public/images/logo-white.png').extract({left:0,top:0,width:Math.round(width*0.16),height:Math.round(height*0.62)}).trim().png().toBuffer();
const Bs=await sharp(B).resize({height:300}).png().toBuffer();
const bg=Buffer.from('<svg width="512" height="512"><rect width="512" height="512" rx="112" fill="#0b2f37"/></svg>');
await sharp(bg).composite([{input:Bs,gravity:'center'}]).png().toFile('public/favicon.png');
await sharp('public/favicon.png').resize(180).png().toFile('public/apple-touch-icon.png');
// OG 1200x630
const lg=await sharp('public/images/logo-white.png').resize({width:520}).png().toBuffer();
const ph=await sharp('tools/hero-src.jpg').resize(600,630,{fit:'cover',position:'right'}).toBuffer();
const base=Buffer.from('<svg width="1200" height="630"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#06242a"/><stop offset="1" stop-color="#0e333a"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>');
const fade=Buffer.from('<svg width="600" height="630"><defs><linearGradient id="f" x1="0" x2="1"><stop offset="0" stop-color="#06242a" stop-opacity="1"/><stop offset=".5" stop-color="#06242a" stop-opacity="0"/></linearGradient></defs><rect width="600" height="630" fill="url(#f)"/></svg>');
const tag=Buffer.from('<svg width="560" height="90"><text x="0" y="30" font-family="Arial" font-size="28" fill="#9fc3c8">Smartphones, áudio e acessórios</text><text x="0" y="70" font-family="Arial" font-size="28" fill="#9fc3c8">em Sorocaba/SP</text></svg>');
await sharp(base).composite([{input:ph,left:600,top:0},{input:fade,left:600,top:0},{input:lg,left:70,top:200},{input:tag,left:72,top:420}]).jpeg({quality:85}).toFile('public/og-image.jpg');
