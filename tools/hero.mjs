import sharp from 'sharp'
await sharp('tools/hero-src.jpg').flop().resize(2000,1333).webp({quality:80}).toFile('public/images/hero.webp')
await sharp('tools/hero-src.jpg').flop().resize(1200,900,{fit:'cover',position:'centre'}).webp({quality:78}).toFile('public/images/hero-mobile.webp')
