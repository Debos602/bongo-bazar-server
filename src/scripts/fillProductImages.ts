/* Finds products with a placeholder or broken photo and picks a matching one from Wikimedia Commons.
     npm run images:fill             Only looks: writes a preview and a plan, changes nothing.
     npm run images:fill -- --apply  Saves the photos listed in the plan to the database.
   Delete any line you dislike from product-image-plan.json before applying. */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import prisma from '../shared/prisma';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const USER_AGENT = 'BongoBazarImageFill/1.0 (product photo helper)';
const PLAN = path.join(process.cwd(), 'product-image-plan.json');
const PREVIEW = path.join(process.cwd(), 'product-image-preview.html');
const CREDITS = path.join(process.cwd(), 'product-image-credits.csv');

const PLACEHOLDERS = new Set(['', 'null', 'undefined', '/logo.png', '/logo.jpg']);
const ALLOWED_LICENCE = /^(cc0|public domain|pd\b|cc[ -]by)/i;
const FILLER_WORDS = /\b(premium|best|new|original|authentic|pure|fresh|hand-?stitched|hand-?made|handwoven)\b/gi;
const SIZES = /\b\d+(\.\d+)?\s*(g|gm|kg|ml|l|ltr|pcs?|pack)\b/gi;

type Pick = {
    id: number; name: string; oldImage: string; image: string; pageUrl: string;
    licence: string; artist: string; searchedFor: string;
};

const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const csvCell = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;

// Only a definite "not there" counts as broken; a slow or refusing server is left alone.
const isBroken = async (url: string) => {
    if (!/^https?:\/\//.test(url)) return false;
    try {
        const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000), headers: { 'User-Agent': USER_AGENT } });
        return res.status === 404 || res.status === 410;
    } catch (err: any) {
        return err?.cause?.code === 'ENOTFOUND';
    }
};

const searchTerms = (name: string) => {
    const clean = name.replace(SIZES, ' ').replace(FILLER_WORDS, ' ').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ');
    return [...new Set([clean, words.slice(-2).join(' ')])].filter(Boolean);
};

const searchCommons = async (term: string) => {
    const params = new URLSearchParams({
        action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '10',
        gsrsearch: `${term} filetype:bitmap`, prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '960',
    });
    const res = await fetch(`${COMMONS_API}?${params}`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Wikimedia Commons replied with status ${res.status}`);
    const json: any = await res.json();
    return Object.values<any>(json.query?.pages ?? {}).sort((a, b) => a.index - b.index);
};

const findPhoto = async (name: string) => {
    for (const term of searchTerms(name)) {
        for (const page of await searchCommons(term)) {
            const info = page.imageinfo?.[0];
            const licence = info?.extmetadata?.LicenseShortName?.value ?? '';
            if (!info?.thumburl || !/image\/(jpeg|png|webp)/.test(info.mime ?? '') || info.width < 500 || !ALLOWED_LICENCE.test(licence)) continue;
            return { image: info.thumburl, pageUrl: info.descriptionurl, licence, artist: stripHtml(info.extmetadata?.Artist?.value), searchedFor: term };
        }
    }
    return null;
};

const buildPlan = async () => {
    await searchCommons('saree'); // stops here, before marking anything, if Commons cannot be reached

    const products = await prisma.product.findMany({ select: { id: true, name: true, image: true }, orderBy: { id: 'asc' } });
    const needPhoto = [];
    for (const p of products) {
        if (PLACEHOLDERS.has(p.image.trim()) || (await isBroken(p.image))) needPhoto.push(p);
    }
    console.log(`${products.length} products checked, ${needPhoto.length} need a photo.`);

    const picks: Pick[] = [];
    const missed: string[] = [];
    for (const p of needPhoto) {
        const photo = await findPhoto(p.name);
        if (photo) picks.push({ id: p.id, name: p.name, oldImage: p.image, ...photo });
        else missed.push(p.name);
    }

    fs.writeFileSync(PLAN, JSON.stringify(picks, null, 2));
    fs.writeFileSync(PREVIEW, `<!doctype html><meta charset="utf-8"><title>Product photo preview</title>
<style>body{font:15px system-ui;margin:24px}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}img{width:100%;height:200px;object-fit:cover;background:#eee}small{color:#555;display:block}</style>
<h1>${picks.length} photos found, ${missed.length} not found</h1>
<p>Remove any wrong match from product-image-plan.json, then run: npm run images:fill -- --apply</p>
<ul>${picks.map((p) => `<li><img src="${escapeHtml(p.image)}" alt=""><b>${escapeHtml(p.name)}</b><small>Searched: ${escapeHtml(p.searchedFor)}</small><small>${escapeHtml(p.licence)}, ${escapeHtml(p.artist)}</small></li>`).join('')}</ul>
${missed.length ? `<h2>No photo found</h2><ul>${missed.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : ''}`);

    console.log(`${picks.length} photos found. Nothing was changed.`);
    if (missed.length) console.log(`No photo found for: ${missed.join(', ')}`);
    console.log(`Check ${path.basename(PREVIEW)} in your browser, then run: npm run images:fill -- --apply`);
};

const applyPlan = async () => {
    if (!fs.existsSync(PLAN)) throw new Error('No plan yet. Run npm run images:fill first and check the preview.');
    const picks: Pick[] = JSON.parse(fs.readFileSync(PLAN, 'utf8'));

    const applied: Pick[] = [];
    for (const pick of picks) {
        // Skips a product whose photo was changed after the plan was made.
        const { count } = await prisma.product.updateMany({ where: { id: pick.id, image: pick.oldImage }, data: { image: pick.image } });
        if (count) applied.push(pick);
    }

    const header = 'productId,product,licence,author,source,image';
    const rows = applied.map((p) => [p.id, p.name, p.licence, p.artist, p.pageUrl, p.image].map(csvCell).join(','));
    if (rows.length) {
        const existing = fs.existsSync(CREDITS);
        fs.appendFileSync(CREDITS, `${existing ? '' : `${header}\n`}${rows.join('\n')}\n`);
    }
    console.log(`Updated ${applied.length} of ${picks.length} products. Credits are in ${path.basename(CREDITS)}.`);
};

(process.argv.includes('--apply') ? applyPlan() : buildPlan())
    .catch((err) => {
        console.error(err.message ?? err);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
