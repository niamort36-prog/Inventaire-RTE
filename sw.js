/* Service worker Invent'RTE
 *
 * Objectif : que l'application se lance en atelier ou en chantier même sans
 * réseau. Les données, elles, viennent du cache localStorage géré par la page.
 *
 * Stratégie volontairement prudente :
 *  - la page et les scripts de l'app : réseau d'abord (jamais de version
 *    périmée servie à un utilisateur en ligne), cache en secours ;
 *  - les bibliothèques externes (Tailwind, Firebase, FontAwesome...) :
 *    cache d'abord, car leurs URL sont versionnées ;
 *  - Firebase (base de données) : jamais interceptée.
 */
const CACHE = 'inventrte-v1';

const APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './RTELogo.png',
    './LogoAcceuil.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE)
            // addAll échoue en bloc si une seule ressource manque : on tolère les absences.
            .then(c => Promise.allSettled(APP_SHELL.map(u => c.add(u))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // La base de données et l'authentification doivent toujours passer par le réseau.
    if (/firebasedatabase\.app|firebaseio\.com|googleapis\.com|identitytoolkit/.test(url.hostname + url.pathname)) return;

    const isExternal = url.origin !== self.location.origin;

    if (isExternal) {
        // Bibliothèques CDN : cache d'abord.
        event.respondWith(
            caches.match(req).then(hit => hit || fetch(req).then(res => {
                if (res && res.status === 200) {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                }
                return res;
            }).catch(() => hit || Response.error()))
        );
        return;
    }

    // Fichiers de l'application : réseau d'abord, cache en secours hors ligne.
    event.respondWith(
        fetch(req).then(res => {
            if (res && res.status === 200) {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
        }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
});
