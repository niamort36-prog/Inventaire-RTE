/* Captures d'écran pour le guide d'utilisation.
 *
 * Tout est pris sur un jeu de démonstration fictif créé dans « EL Aurillac »
 * (équipe vide), puis entièrement supprimé : le guide est publié sur un dépôt
 * public, aucune donnée réelle d'inventaire ne doit y figurer.
 */
import { chromium } from 'playwright-core';
import fs from 'fs';
import { FAMILLES, ZONES, PIECES, PLAN_SCRIPT } from './demo.mjs';

const URL = 'http://localhost:8777';
const OUT = 'captures';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
page.on('console', m => { if (m.type() === 'error') console.log('  [page]', m.text().slice(0, 120)); });

const wait = ms => new Promise(r => setTimeout(r, ms));
let n = 0;

async function shot(name, opts = {}) {
    n++;
    const f = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`;
    await page.screenshot({ path: f, ...opts });
    console.log('  ->', f);
}
async function shotEl(name, selector, target = page) {
    const el = await target.$(selector);
    if (!el) { console.log('  !! introuvable :', selector); return; }
    n++;
    const f = `${OUT}/${String(n).padStart(2, '0')}-${name}.png`;
    await el.screenshot({ path: f });
    console.log('  ->', f);
}

console.log('Chargement...');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof parts !== 'undefined', { timeout: 60000 });
await wait(2000);

// ---------------------------------------------------------------- Jeu de démo
console.log('Création du jeu de démonstration (EL Aurillac)...');
await page.evaluate(async ({ FAMILLES, ZONES, PIECES, planSrc }) => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    switchTeam('EL Aurillac'); await w(3500);

    const famIds = {};
    for (const f of FAMILLES) {
        const id = Date.now() + Math.floor(Math.random() * 100000);
        famIds[f.name] = id;
        await write('families/f' + id, { id, name: f.name, desc: f.desc, color: f.color });
        await w(120);
    }
    for (const z of ZONES) {
        const id = Date.now() + Math.floor(Math.random() * 100000);
        await write('map/markers/m' + id, { id, x: z.x, y: z.y, name: z.name, desc: z.desc });
        await w(120);
    }
    const plan = eval('(' + planSrc + ')')();
    await write('map/image', plan);

    const ids = {};
    for (const [nom, fam, zone, qty, seuil, cable, poids] of PIECES) {
        const id = Date.now() + Math.floor(Math.random() * 100000);
        ids[nom] = id;
        const piece = {
            id, name: nom, qty, alertQty: seuil, familyId: famIds[fam],
            location: zone, desc: '', hasImage: false, hasDoc: false
        };
        if (cable) piece.cable = true;      // quantité comptée en mètres
        // Le poids n'est pas enregistré : il est posé à l'affichage, juste
        // avant chaque capture (voir __majPoids plus bas). Le jeu de
        // démonstration est effacé ensuite, rien ne sert de le stocker.
        await write('parts/p' + id, piece);
        await w(120);
    }
    window.__ids = ids;

    // Le champ poids n'est accepté qu'une fois les règles publiées. Pour que
    // les captures montrent les pictogrammes dans tous les cas, on garde la
    // correspondance de côté et on la réapplique avant chaque capture : un
    // rechargement de la liste des pièces la ferait sinon disparaître.
    window.__poids = Object.fromEntries(
        PIECES.filter(l => l[6]).map(l => [l[0], l[6]]));
    window.__majPoids = () => {
        parts.forEach(p => { if (window.__poids[p.name]) p.poids = window.__poids[p.name]; });
    };
    await w(2500);
}, { FAMILLES, ZONES, PIECES, planSrc: PLAN_SCRIPT.toString() });
await wait(3000);

// Le plan est chargé une fois par session : on recharge pour qu'il apparaisse.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForFunction(() => typeof parts !== 'undefined' && parts.length > 0, { timeout: 60000 });
await wait(3000);

await page.evaluate(PIECES => {
    window.__poids = Object.fromEntries(PIECES.filter(l => l[6]).map(l => [l[0], l[6]]));
    window.__majPoids = () => {
        parts.forEach(p => { if (window.__poids[p.name]) p.poids = window.__poids[p.name]; });
    };
}, PIECES);

// ------------------------------------------------------------------- Écrans
await page.evaluate(() => showPage('dashboard'));
await wait(2000);
await shot('accueil');

await page.evaluate(() => { __majPoids(); showPage('pieces'); renderPartsGrid(); });
await wait(1800);
await shot('pieces');

await page.evaluate(() => { __majPoids(); openQuickView(parts.find(p => p.name.startsWith('Poulie')).id); });
await wait(1500);
await shotEl('fiche-piece', '#modal-quick-view .inline-block');

await page.evaluate(() => { closeModal('modal-quick-view'); openPartModal(); });
await wait(1200);
await shotEl('ajouter-piece', '#modal-part .bg-white');

// Formulaire d'une pièce en mode câble : la quantité passe en mètres
await page.evaluate(() => {
    closeModal('modal-part');
    openPartModal(parts.find(p => p.name === 'ASTER 228').id);
});
await wait(1200);
await shotEl('piece-cable', '#modal-part .bg-white');

// Les trois avertissements de poids, reunis sur une seule image
await page.evaluate(() => {
    closeModal('modal-part');
    const d = document.createElement('div');
    d.id = 'planche-poids';
    // Ajusté au contenu : un cadre plein écran laisserait une capture
    // aux trois quarts vide.
    d.style.cssText = 'position:fixed;top:0;left:0;z-index:999;background:#fff;' +
                      'width:max-content;display:flex;gap:26px;padding:24px;align-items:flex-start';
    d.innerHTML = Object.keys(POIDS).map(c =>
        `<div style="width:240px">${pictoPoidsGrand(c)}</div>`).join('');
    document.body.appendChild(d);
});
await wait(900);
await shotEl('avertissements-poids', '#planche-poids');
await page.evaluate(() => document.getElementById('planche-poids').remove());

await page.evaluate(() => { showPage('familles'); });
await wait(1500);
await page.setViewportSize({ width: 1280, height: 620 });   // cadrage serre : evite une capture a moitie vide
await wait(600);
await shot('familles');
await page.setViewportSize({ width: 1280, height: 900 });
await wait(600);

await page.evaluate(() => showPage('plan'));
await wait(4000);
await shot('plan');

await page.evaluate(() => { showPage('dashboard'); openTeamModal(); });
await wait(1000);
await shotEl('equipes', '#modal-team .bg-white');
await page.evaluate(() => closeModal('modal-team'));

// ------------------------------------------------------- Chantier de chargement
console.log('Chantier de démonstration...');

// Fenêtre de création, avec le domaine de tension
await page.evaluate(() => { showPage('paniers'); createBasket(); });
await wait(800);
await page.evaluate(() => {
    document.getElementById('input-basket-name').value = 'Ligne 225 kV — Travée 12';
    pickOption('basket-tension-picker', 'tension', '225');
});
await wait(400);
await shotEl('creer-chantier', '#modal-new-basket .bg-white');

await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    await handleNewBasket(new Event('submit'));
    await w(2500);
    window.__bid = baskets.find(b => b.name.startsWith('Ligne 225')).id;
});
await wait(2000);

await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openGroupModal();
    await w(2200);                       // laisse le catalogue se charger
    selectGroupKind('pylone');
    document.getElementById('input-group-name').value = '1';
    pickOption('group-fonction-picker', 'fonction', 'ancrage');
    pickOption('group-chaine-picker', 'chaine', 'double');
    pickOption('group-faisceau-picker', 'faisceau', 'simple');
    remplirChoixChaines();
    remplirChoixCables();
    await w(600);
    document.getElementById('input-cable').value = 'ASTER 570';
    majChoixCable();
    document.getElementById('input-chain').value = '6U4H2N10';
    document.getElementById('input-chain-qty').value = '2';
    apercuChaine();
});
await wait(1200);
await shotEl('creer-pylone', '#modal-group .bg-white');

// Validation du pylône 1 : la chaîne et le câble alimentent le chantier
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.alert = () => {};
    handleGroupSubmit(new Event('submit'));
    await w(11000);
});
await wait(1500);

// Un second pylône identique : c'est ce qui rend le total utile
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    openGroupModal(); await w(1600);
    selectGroupKind('pylone');
    document.getElementById('input-group-name').value = '2';
    pickOption('group-fonction-picker', 'fonction', 'ancrage');
    pickOption('group-chaine-picker', 'chaine', 'double');
    pickOption('group-faisceau-picker', 'faisceau', 'simple');
    remplirChoixChaines(); remplirChoixCables(); await w(600);
    document.getElementById('input-cable').value = 'ASTER 570';
    majChoixCable();
    document.getElementById('input-chain').value = '6U4H2N10';
    document.getElementById('input-chain-qty').value = '1';
    handleGroupSubmit(new Event('submit'));
    await w(11000);
});
await wait(1500);

// Pylone d'alignement : la pince retenue reclame une garniture de cable
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeModal('modal-group');
    openGroupModal(); await w(1800);
    selectGroupKind('pylone');
    document.getElementById('input-group-name').value = '3';
    pickOption('group-fonction-picker', 'fonction', 'alignement');
    pickOption('group-chaine-picker', 'chaine', 'simple');
    pickOption('group-faisceau-picker', 'faisceau', 'simple');
    remplirChoixChaines(); remplirChoixCables(); await w(600);
    document.getElementById('input-cable').value = 'PHLOX 228';
    majChoixCable(); await w(300);
    document.getElementById('input-cable-piece').value = 'P4HT';
    majGarniture();
    document.getElementById('input-cable').parentElement.id = 'bloc-cable';
});
await wait(900);
await shotEl('pylone-garniture', '#bloc-cable');
await page.evaluate(() => closeModal('modal-group'));
await wait(500);

// Une portée, et de l'outillage non affecté
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const nom = n => parts.find(p => p.name.startsWith(n)).id;
    openGroupModal(); await w(1200);
    selectGroupKind('portee');
    document.getElementById('input-group-name').value = '1-2';
    pickOption('group-faisceau-picker', 'faisceau', 'double');
    document.getElementById('input-chain').value = '';
    document.getElementById('input-cable').value = '';
    handleGroupSubmit(new Event('submit')); await w(2500);
    for (const [p, q] of [['Poulie', 2], ['Cordage', 2]]) {
        openConfirmAddModal(nom(p));
        document.getElementById('confirm-add-qty').value = String(q);
        finalizeAddToBasket(); await w(900);
    }
    activeGroupId = null; await w(600);
    openConfirmAddModal(nom('Perche'));
    document.getElementById('confirm-add-qty').value = '2';
    // Sans déduction du stock : c'est ce cas qui fait apparaître la mention
    // « déjà prévu sur un chantier » sur la pièce.
    document.getElementById('confirm-add-deduct').checked = false;
    finalizeAddToBasket(); await w(1800);
    __majPoids();
    openBasketDetail(window.__bid);
});
await wait(2500);
await shotEl('chantier-prepare', '#modal-basket-detail .bg-white');

// Le total à charger, tous ouvrages confondus
await page.evaluate(() => {
    document.getElementById('basket-total-body').classList.remove('hidden');
    document.getElementById('basket-total').scrollIntoView({ block: 'end' });
});
await wait(800);
await shotEl('total-a-charger', '#basket-total');

await page.evaluate(() => {
    openConfirmAddModal(parts.find(p => p.name.startsWith('Harnais')).id);
    document.getElementById('confirm-add-qty').value = '3';
    const cases = [...document.querySelectorAll('#confirm-add-groups [data-ouvrage]')];
    [0, 1].forEach(i => { if (cases[i]) cases[i].checked = true; });
    majTotalAjout();
});
await wait(900);
await shotEl('ajouter-materiel', '#modal-confirm-add-basket .bg-white');
await page.evaluate(() => closeModal('modal-confirm-add-basket'));

await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    window.confirm = () => true;
    validateBasketDraft(); await w(2500);
    const b = baskets.find(x => x.id === window.__bid);
    const its = itemsOf(b);
    toggleItemLoad(its[0].uid, true); await w(700);
    toggleItemLoad(its[1].uid, true); await w(700);
    toggleItemLoad(its[2].uid, true); await w(700);
    updateLoadQty(its[3].uid, '0'); await w(700);
    updateLoadComment(its[3].uid, 'reste au magasin'); await w(900);
    __majPoids();
    openBasketDetail(window.__bid);
});
await wait(2500);
await shotEl('chantier-chargement', '#modal-basket-detail .bg-white');

// Bon imprimable
const printHtml = await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    const real = window.open;
    let cap = '';
    window.open = () => ({ document: { write: h => { cap = h; }, close: () => {} } });
    printBasket(); await w(700);
    window.open = real;
    return cap;
});
const p2 = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 });
await p2.setContent(printHtml, { waitUntil: 'load' });
await p2.evaluate(() => document.querySelector('.barre')?.remove());
await wait(600);
n++;
await p2.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-bon-imprime.png`, fullPage: true });
console.log('  ->', `${OUT}/${String(n).padStart(2, '0')}-bon-imprime.png`);
await p2.close();

// Un second chantier, en preparation, pour montrer les deux etats cote a cote.
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    closeModal('modal-basket-detail');
    const id = Date.now();
    await write('baskets/b' + id, { id, name: 'Renforcement massifs — S36', status: 'draft', createdAt: id });
    await w(1500);
    const uid = newItemUid();
    await write('baskets/b' + id + '/items/' + uid, {
        uid, partId: parts.find(p => p.name.startsWith('Harnais')).id, qty: 3, deduct: true, comment: ''
    });
    await w(1500);
    showPage('paniers');
});
await wait(2000);
await page.setViewportSize({ width: 1280, height: 560 });
await wait(600);
await shot('chantiers');

// Mention d'engagement : une pièce promise à un chantier, non déduite du stock
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    __majPoids();
    showPage('pieces');
    document.getElementById('search-input-parts').value = 'perche';
    renderPartsGrid(); await w(400);
});
await wait(1200);
await shotEl('engagement', '#all-parts-grid > div');
await page.evaluate(() => {
    document.getElementById('search-input-parts').value = '';
    renderPartsGrid();
});

await page.evaluate(() => showPage('scanner'));
await wait(2500);
await page.setViewportSize({ width: 1280, height: 640 });
await wait(800);
await shot('scan');
await page.setViewportSize({ width: 1280, height: 900 });
await wait(500);

// ------------------------------------------------------------------- Mobile
const mob = await browser.newPage({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true
});
await mob.goto(URL, { waitUntil: 'networkidle' });
await mob.waitForFunction(() => typeof parts !== 'undefined', { timeout: 60000 });
await mob.evaluate(async (POIDS_DEMO) => {
    if (teamKey !== 'EL Aurillac') { switchTeam('EL Aurillac'); await new Promise(r => setTimeout(r, 4000)); }
    parts.forEach(p => { if (POIDS_DEMO[p.name]) p.poids = POIDS_DEMO[p.name]; });
    showPage('pieces'); renderPartsGrid();
}, Object.fromEntries(PIECES.filter(l => l[6]).map(l => [l[0], l[6]])));
await wait(4000);
n++;
await mob.screenshot({ path: `${OUT}/${String(n).padStart(2, '0')}-mobile.png` });
console.log('  ->', `${OUT}/${String(n).padStart(2, '0')}-mobile.png`);
await mob.close();

// ------------------------------------------------------------------- Ménage
console.log('Suppression du jeu de démonstration...');
await page.evaluate(async () => {
    const w = ms => new Promise(r => setTimeout(r, ms));
    switchTeam('EL Aurillac'); await w(3000);
    for (const b of [...baskets]) {
        for (const it of itemsOf(b)) await write(itemRef(b.id, it.uid), null);
        for (const g of groupsOf(b)) await write('baskets/b' + b.id + '/groups/' + g.gid, null);
        await write('baskets/b' + b.id, null);
    }
    for (const p of [...parts]) await write('parts/p' + p.id, null);
    for (const f of [...families]) await write('families/f' + f.id, null);
    for (const m of [...markers]) await write('map/markers/m' + m.id, null);
    await write('map/image', null);
    await w(3000);
});
await wait(2500);
const reste = await page.evaluate(() => ({
    pieces: parts.length, familles: families.length, zones: markers.length, paniers: baskets.length
}));
console.log('  EL Aurillac après ménage :', JSON.stringify(reste));

await browser.close();
console.log(`\n${n} captures dans ${OUT}/`);
