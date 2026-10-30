p='src/data/products.ts'
lines=open(p,encoding='utf8').read().split('\n')
out=[];buf=None
for ln in lines:
    if buf is not None:
        buf.append(ln)
        if ln.rstrip().endswith("',"):
            out.append("\n".join(buf)); buf=None
        continue
    out.append(ln)
    if ln.strip()=="longDescription:": pass
    # start collecting when previous line is longDescription: and current starts a string without closing
    if len(out)>=2 and out[-2].strip()=="longDescription:" and not ln.rstrip().endswith("',"):
        out.pop(); buf=[ln]
open(p,'w',encoding='utf8',newline='').write('\n'.join(out))
