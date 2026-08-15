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

export const PIECES = [
    ['Poulie de levage 200',      'Outillage de levage', 'Magasin outillage', 12, 4],
    ['Palan à chaîne 1,5 t',      'Outillage de levage', 'Magasin outillage',  6, 2],
    ['Élingue 4 m',               'Outillage de levage', 'Magasin outillage', 18, 6],
    ['Pince à sertir 240',        'Connectique',         'Atelier',            4, 2],
    ['Manchon de jonction 228',   'Connectique',         'Atelier',           25, 10],
    ['Raccord bimétal 148',       'Connectique',         'Atelier',            3, 8],
    ['Chaîne isolante 63 kV',     'Isolateurs',          'Aire de stockage',   9, 3],
    ['Isolateur capot-tige',      'Isolateurs',          'Aire de stockage',  40, 12],
    ['Perche de terre 63/90 kV',  'Sécurité',            'Local sécurité',     5, 2],
    ['Harnais antichute',         'Sécurité',            'Local sécurité',    11, 4],
    ['Gants isolants classe 2',   'Sécurité',            'Local sécurité',     2, 6],
    ['Cordage 12 mm (50 m)',      'Câbles',              'Aire de stockage',   7, 3],
    ['Conducteur ASTER 228',      'Câbles',              'Aire de stockage', 320, 100],
    ['Câble de garde 59,7',       'Câbles',              'Aire de stockage', 150, 50],
];

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
