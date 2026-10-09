/* Jeu de démonstration pour le guide d'utilisation.
 *
 * Tout est fictif et créé dans l'équipe vide « EL Aurillac » : le guide est
 * publié sur un dépôt public, aucune donnée réelle d'inventaire ne doit y
 * apparaître. Le jeu est entièrement supprimé à la fin des captures.
 */
export const FAMILLES = [
    { name: 'Outillage de levage', color: 'blue',   desc: 'Poulies, palans, élingues' },
    { name: 'Connectique',         color: 'orange', desc: 'Manchons et raccords' },
    { name: 'Isolateurs',          color: 'purple', desc: 'Chaînes et éléments isolants' },
    { name: 'Sécurité',            color: 'red',    desc: 'EPI et matériel de mise à la terre' },
    { name: 'Câbles',              color: 'green',  desc: 'Conducteurs et cordages' },
];

export const ZONES = [
    { name: 'Magasin outillage', x: 27, y: 33, desc: 'Rayonnages A à C' },
    { name: 'Aire de stockage',  x: 68, y: 30, desc: 'Bobines et tourets' },
    { name: 'Atelier',           x: 30, y: 70, desc: 'Établis et petit outillage' },
    { name: 'Local sécurité',    x: 72, y: 72, desc: 'EPI et perches' },
];

// [ nom, famille, zone, quantité, seuil d'alerte, câble, avertissement de poids ]
export const PIECES = [
    ['Poulie de levage 200',      'Outillage de levage', 'Magasin outillage', 12, 4, false, 'leger'],
    ['Palan à chaîne 1,5 t',      'Outillage de levage', 'Magasin outillage',  6, 2, false, 'lourd'],
    ['Treuil de déroulage 3 t',   'Outillage de levage', 'Aire de stockage',   2, 1, false, 'treslourd'],
    ['Élingue 4 m',               'Outillage de levage', 'Magasin outillage', 18, 6],
    ['Pince à sertir 240',        'Connectique',         'Atelier',            4, 2, false, 'leger'],
    ['Perche de terre 63/90 kV',  'Sécurité',            'Local sécurité',     5, 2],
    ['Harnais antichute',         'Sécurité',            'Local sécurité',    11, 4],
    ['Gants isolants classe 2',   'Sécurité',            'Local sécurité',     2, 6],
    ['Cordage 12 mm (50 m)',      'Câbles',              'Aire de stockage',   7, 3, false, 'lourd'],
    ['ASTER 228',                 'Câbles',              'Aire de stockage', 1983, 500, true],
    ['CANNA 181',                 'Câbles',              'Aire de stockage',  240, 400, true],
    ['PHLOX 228',                 'Câbles',              'Aire de stockage',  860, 300, true],

    // Références du catalogue RTE : elles permettent de montrer la
    // correspondance qui s'opère quand une chaîne est ajoutée à un pylône.
    ['RL 15 900',                 'Connectique',         'Magasin outillage', 14, 4],
    ['CC 15 A',                   'Connectique',         'Magasin outillage', 30, 8],
    ['PT 15 400',                 'Connectique',         'Magasin outillage', 26, 8],
    ['OE 100',                    'Connectique',         'Magasin outillage', 48, 12],
    ['BS 100',                    'Connectique',         'Magasin outillage', 44, 12],
    ['C 25 N1',                   'Isolateurs',          'Aire de stockage',  12, 4],
    ['AP 60 C1',                  'Isolateurs',          'Aire de stockage',   9, 3],
    ['F 100',                     'Isolateurs',          'Aire de stockage', 240, 60],
    ['MA ASTER 570',              'Connectique',         'Atelier',            8, 2],
    ['P4HT',                      'Connectique',         'Magasin outillage', 10, 4],
    ['GC 228 412 D',              'Connectique',         'Magasin outillage',  6, 2],
];

/** Rattachement au catalogue des achats, pour la génération d'une EB.
 *
 *  Références et prix **inventés** : ce dépôt est public, et les tarifs
 *  fournisseurs du catalogue RTE n'ont pas à y figurer. Seule la forme compte
 *  pour les captures du guide.
 *
 *  [ référence, désignation au catalogue, prix unitaire ]
 */
export const REFS_EB = {
    'RL 15 900':  ['990118', 'RALLONGE RL 15/900',             74.50],
    'CC 15 A':    ['990226', 'CONNECTEUR CHANTOURNE CC 15A',   18.20],
    'PT 15 400':  ['990304', 'PALONNIER TRIANGUL. PT 15/400',  61.90],
    'OE 100':     ['990412', 'OEILLET OE 100',                  4.50],
    'BS 100':     ['990530', 'BALL-SOCKET BS 100',             22.00],
    'C 25 N1':    ['990647', 'CORNE C 25 N1',                  29.80],
    'AP 60 C1':   ['990755', 'ANNEAU DE PROTECTION AP 60 C1',  15.40],
    'F 100':      ['990863', 'ISO ANTIPOL BAGUE ANTICOR F100', 12.30],
    'MA ASTER 570': ['990971', "MANCHON D'ANCRAGE MA ASTER 570", 193.60],
};

/** Plan d'atelier schématique, dessiné dans le navigateur (aucun plan réel). */
export const PLAN_SCRIPT = () => {
    const c = document.createElement('canvas');
    c.width = 1200; c.height = 850;
    const x = c.getContext('2d');

    x.fillStyle = '#F8FAFC'; x.fillRect(0, 0, 1200, 850);
    x.strokeStyle = '#94A3B8'; x.lineWidth = 6;
    x.strokeRect(40, 40, 1120, 770);

    const salle = (px, py, w, h, titre, fond) => {
        x.fillStyle = fond; x.fillRect(px, py, w, h);
        x.strokeStyle = '#64748B'; x.lineWidth = 3; x.strokeRect(px, py, w, h);
        x.fillStyle = '#334155'; x.font = 'bold 26px Segoe UI, sans-serif';
        x.fillText(titre, px + 18, py + 40);
    };

    salle(90,  90,  460, 300, 'Magasin outillage', '#E0E7FF');
    salle(620, 90,  460, 300, 'Aire de stockage',  '#DCFCE7');
    salle(90,  450, 460, 300, 'Atelier',           '#FEF3C7');
    salle(620, 450, 460, 300, 'Local sécurité',    '#FEE2E2');

    x.fillStyle = '#94A3B8'; x.font = 'italic 22px Segoe UI, sans-serif';
    x.fillText('Plan de démonstration', 90, 800);
    return c.toDataURL('image/jpeg', 0.85);
};
