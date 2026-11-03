// Lista mayorista Oasis: lee los productos visibles de Tienda Nube y devuelve
// [código, descripción, categoría, marca, precio sin IVA, pack] para la página.
// Variables en Netlify: TN_TOKEN (obligatoria) y TN_STORE_ID (opcional).
const STORE = process.env.TN_STORE_ID || '1127331';
const TOKEN = process.env.TN_TOKEN;
const UA = 'Oasis Mayorista (https://oasislibrerias.com.ar)';
const FIELDS = 'id,name,brand,categories,variants,published';
const PER = 200;

const by = (...steps) => p => { for (const [lim, pk] of steps) if (lim === null || p < lim) return pk; };
const RULES = [
  [/\b(AGENDA|CALENDARIO|PLANNER)/, by([null,1])],
  [/\bCALCULADORA/, by([15000,5],[null,1])],
  [/\bCARTUCHO/, by([null,1])],
  [/\b(ABROCHADORA|PERFORADORA)/, by([null,1])],
  [/\bCOMPAS/, by([null,6])],
  [/^(BROCHE|CLIPS?|CHINCHE|BANDAS ELASTICAS)|\bCLIP\b/, by([5000,10],[null,2])],
  [/\bRESMA/, by([null,10])],
  [/^REPUESTO.*\b480\b/, by([null,8])],
  [/^REPUESTO/, by([null,10])],
  [/\bCUADERNO.*\bGLORIA/, by([null,10])],
  [/\bCUADERNO/, by([15000,8],[null,3])],
  [/\bGOMA(S)? (DE BORRAR|BORRAR|LAPIZ|TINTA|MIGA)|\bGOMA (STAEDTLER|MAPED|PELIKAN|FABER|PIZZINI|MILAN|FILGO)/, by([1500,36],[null,12])],
  [/\bGOMA EVA|\bFOAMY/, by([null,10])],
  [/\bBIC\b.*(BOLIGRAFO|CRISTAL|BIROME)|(BOLIGRAFO|BIROME).*\bBIC\b/, by([1500,50],[null,12])],
  [/\b(BOLIGRAFO|BIROME|LAPICERA)/, by([1500,50],[5000,12],[null,1])],
  [/\b(ROLLER|MICROFIBRA|FIBRA|SIGNO)\b/, by([5000,12],[null,3])],
  [/\bRESALTADOR/, by([null,10])],
  [/\b(LAPICES DE COLORES|LAPICES|PINTURITAS|CRAYON|CRAYONES|MARCADORES|FIBRAS)\b/, by([null,6])],
  [/\bLAPIZ/, by([null,12])],
  [/\b(PORTAMINAS|MINAS)\b/, by([null,12])],
  [/\bSACAPUNTA/, by([700,24],[null,12])],
  [/\b(MARCADOR|UNI POSCA|POSCA)\b/, by([3000,12],[null,6])],
  [/\bTEMPERA.*\bPOMO|\bPOMO.*TEMPERA/, by([null,10])],
  [/\bTEMPERA/, by([null,6])],
  [/\b(ACRILICO|PINTURA|PINT|BASE ACRILICA|LACA|BARNIZ|ACUARELA|OLEO|TINTA)\b/, by([null,6])],
  [/\bPINCEL/, by([null,12])],
  [/\b(PLASTICOLA|VOLIGOMA|BOLIGOMA|ADHESIVO|PEGAMENTO|PEGASOLA|SILICONA|COLA)\b/, by([3000,12],[null,6])],
  [/\bCINTA/, by([3000,12],[null,6])],
  [/\b(AFICHE|CARTULINA|CREPE|BARRILETE|GLASE|PAPEL)\b/, by([3000,10],[null,3])],
  [/\bBRILLANTINA/, by([null,12])],
  [/\b(PLASTILINA|MASA)\b/, by([null,12])],
  [/\bCORRECTOR/, by([null,12])],
  [/\b(CARPETA|CARATULA|FOLIO)/, by([5000,10],[null,3])],
  [/^SOBRE/, by([500,50],[5000,10],[null,1])],
  [/\b(NOTAS ADHESIVAS|BANDERITAS|POST-?IT)/, by([3000,12],[null,6])],
  [/\b(BLOCK|LIBRETA|ANOTADOR)/, by([3000,10],[null,5])],
  [/\b(ETIQUETA|AUTOADHESIVO)/, by([2000,10],[null,3])],
  [/\b(REGLA|ESCUADRA|TRANSPORTADOR|PLANTILLA|LETROGRAFO)/, by([3000,12],[null,6])],
  [/\bTIJERA/, by([3000,12],[null,3])],
  [/\bBASTIDOR/, by([5000,5],[null,1])],
  [/\b(PIZARRA|PIZARRON|GLOBO|KIT|SET|BANDEJA|TABLERO|FICHERO|BANDERA|CUENTOS|LIBRO|MOCHILA|CARTUCHERA|PORTA)/, by([null,1])],
];
export function packFor(desc, price) {
  const d = desc.toUpperCase();
  for (const [rx, f] of RULES) if (rx.test(d)) return f(price);
  return price < 1000 ? 12 : price < 5000 ? 6 : price < 20000 ? 3 : 1;
}

const L = o => o == null ? '' : typeof o === 'string' ? o : (o.es ?? Object.values(o)[0] ?? '');
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };

export function build(products) {
  const out = [], seen = new Set();
  for (const p of products) {
    if (p.published === false) continue;               // ocultos afuera
    const name = String(L(p.name)).trim(); if (!name) continue;
    const cats = p.categories || [];
    const top = cats.find(c => !c.parent) || cats[0];
    const cat = (top ? String(L(top.name)).trim() : '') || 'OTROS';
    const brand = String(L(p.brand) || '').trim();
    for (const v of p.variants || []) {                 // stock no importa: van todos
      const price = num(v.promotional_price) > 0 ? num(v.promotional_price) : num(v.price);
      if (!(price > 0)) continue;
      const vals = (v.values || []).map(L).filter(Boolean);
      const desc = name + (vals.length ? ' - ' + vals.join(' / ') : '');
      const cod = String(v.barcode || '').trim() || String(v.sku || '').trim();
      const k = desc + '|' + cod; if (seen.has(k)) continue; seen.add(k);
      const sin = Math.round(price / 1.21 * 100) / 100;
      out.push([cod, desc, cat, brand, sin, packFor(desc, sin)]);
    }
  }
  out.sort((a, b) => a[2].localeCompare(b[2], 'es') || a[1].localeCompare(b[1], 'es'));
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function page(n) {
  const url = `https://api.tiendanube.com/v1/${STORE}/products?published=true&per_page=${PER}&page=${n}&fields=${FIELDS}`;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'Authentication': 'bearer ' + TOKEN, 'User-Agent': UA, 'Content-Type': 'application/json' } });
    if (r.status === 404) return { list: [], total: null };          // pasamos la última página
    if (r.status === 429) { await sleep(1200 * (i + 1)); continue; }
    if (!r.ok) throw new Error(`Tienda Nube respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return { list: await r.json(), total: Number(r.headers.get('x-total-count')) || null };
  }
  throw new Error('Tienda Nube está limitando las consultas, probá en un minuto');
}
async function fetchAll() {
  const first = await page(1);
  let all = first.list; const size = first.list.length;
  if (!size) return all;
  if (first.total) {
    const pages = Math.ceil(first.total / size);
    for (let n = 2; n <= pages; n += 5) {
      const chunk = await Promise.all(Array.from({ length: Math.min(5, pages - n + 1) }, (_, k) => page(n + k)));
      chunk.forEach(c => { all = all.concat(c.list); });
    }
    return all;
  }
  for (let n = 2; n < 200; n++) { const p = await page(n); all = all.concat(p.list); if (p.list.length < size) break; }
  return all;
}

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

export default async () => {
  if (!TOKEN) return json({ error: 'Falta configurar TN_TOKEN en Netlify' }, 500);
  try {
    const items = build(await fetchAll());
    return json({ actualizado: new Date().toISOString(), items }, 200, {
      'cache-control': 'public, max-age=0, must-revalidate',
      'netlify-cdn-cache-control': 'public, durable, s-maxage=600, stale-while-revalidate=86400',
    });
  } catch (e) {
    return json({ error: String(e.message || e) }, 502);
  }
};
export const config = { path: '/api/productos' };
