import sharp from 'sharp';
const src='tools/logo-original.jpg';
for (const [n,x,y] of [['tl',20,20],['c',60,380],['center',375,200],['br',700,730],['mid',100,600],['top',380,60]]) {
 const {data}=await sharp(src).extract({left:x,top:y,width:30,height:30}).raw().toBuffer({resolveWithObject:true});
 let r=0,g=0,b=0;for(let i=0;i<data.length;i+=3){r+=data[i];g+=data[i+1];b+=data[i+2]}const k=data.length/3;
 console.log(n,'#'+[r,g,b].map(v=>Math.round(v/k).toString(16).padStart(2,'0')).join(''));
}
// Transparent white wordmark
const crop={left:120,top:285,width:510,height:200};
const {data,info}=await sharp(src).extract(crop).raw().toBuffer({resolveWithObject:true});
const out=Buffer.alloc(info.width*info.height*4);
for(let i=0;i<info.width*info.height;i++){const r=data[i*3],g=data[i*3+1],b=data[i*3+2];const l=(r+g+b)/3;
 const a=Math.max(0,Math.min(1,(l-110)/(190-110)));out[i*4]=255;out[i*4+1]=255;out[i*4+2]=255;out[i*4+3]=Math.round(a*255);}
await sharp(out,{raw:{width:info.width,height:info.height,channels:4}}).trim().png().toFile('public/images/logo-white.png');
const m=await sharp('public/images/logo-white.png').metadata();console.log(m.width,m.height);
await sharp('public/images/logo-white.png').flatten({background:'#0b2f33'}).toFile('tools/logo-check.png');
