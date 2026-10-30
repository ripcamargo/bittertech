import sharp from 'sharp'; import fs from 'fs';
const d='tools/cand/'; const fl=fs.readdirSync(d).filter(f=>f.endsWith('.jpg'));
const W=300,H=300,C=6; const comps=[];
for(let i=0;i<fl.length;i++){ try{ const b=await sharp(d+fl[i]).resize(W,H,{fit:'cover'}).toBuffer();
 const lbl=Buffer.from(`<svg width="${W}" height="24"><rect width="${W}" height="24" fill="#000"/><text x="4" y="17" fill="#fff" font-size="13">${i}:${fl[i].slice(0,18)}</text></svg>`);
 comps.push({input:b,left:(i%C)*W,top:Math.floor(i/C)*(H+24)},{input:lbl,left:(i%C)*W,top:Math.floor(i/C)*(H+24)+H});}catch(e){console.log('bad',fl[i])}}
await sharp({create:{width:W*C,height:(H+24)*Math.ceil(fl.length/C),channels:3,background:'#222'}}).composite(comps).jpeg({quality:70}).toFile('tools/sheet.jpg');
