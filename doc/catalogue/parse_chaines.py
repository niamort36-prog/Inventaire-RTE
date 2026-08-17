"""
Extrait la composition des chaines isolantes du catalogue RTE (pages 10-99).

Le texte lineaire d'une planche melange les colonnes voisines : on travaille
donc sur les positions des mots pour reconstituer chaque bloc separement.

Deux mises en page coexistent :

  Format A (63 / 90 kV) — une seule colonne de quantites, les trois variantes
  de pollution sont empilees autour du « Rep » et partagent la composition :
        4U1X1N10D
    Rep 4U1X1M10D Qt
        4U1X1F10D
    1  RL 15 600  1

  Format B (225 / 400 kV) — trois colonnes de quantites, la composition
  differe selon la pollution ; « - » signifie absent de cette variante :
                  N   M   F
    Rep 6U4H2*10  Qt  Qt  Qt
    4  C 25 N1    1   -   -
    4  C 25 NE1   -   1   1
"""
import json
import re
import sys

import pdfplumber

PDF = 'C:/Users/Cardiologue/Downloads/catalogue materiel ligne .pdf'
PAGES = list(range(30, 100))          # perimetre indique : chaines et explications

RE_DESIGN = re.compile(r'^[34567][UDTQ][0-9][A-Za-z][0-9][NMFE][0-9]{1,2}[A-Z]?$')
RE_STAR = re.compile(r'^[34567][UDTQ][0-9][A-Za-z][0-9]\*[0-9]{1,2}[A-Z]?$')
POLLUTIONS = ['N', 'M', 'F']
STOP = ('Longueur', 'Masse', 'Charge', 'Planche', 'Copyright', 'Nota', 'Gestionnaire',
        'Particularité', 'Pour', 'Les', 'Si')


def lignes_de(mots, tol=2.5):
    out = []
    for m in sorted(mots, key=lambda w: (round(w['top'], 1), w['x0'])):
        if out and abs(out[-1][0]['top'] - m['top']) <= tol:
            out[-1].append(m)
        else:
            out.append([m])
    return [sorted(l, key=lambda w: w['x0']) for l in out]


def sections(ancres, ecart=40):
    """Une planche empile parfois ANCRAGE puis SUSPENSION : on separe d'abord
    les bandes horizontales, sinon les colonnes des deux se melangeraient."""
    out = []
    for a in sorted(ancres, key=lambda m: m['top']):
        if out and abs(out[-1][-1]['top'] - a['top']) <= ecart:
            out[-1].append(a)
        else:
            out.append([a])
    return out


def parse_page(page, numero):
    mots = page.extract_words(keep_blank_chars=False)
    if not mots:
        return []
    ancres = [m for m in mots if m['text'] == 'Rep']
    if not ancres:
        return []

    chaines = []
    for bande in sections(ancres):
        bande = sorted(bande, key=lambda m: m['x0'])
        y_rep = min(a['top'] for a in bande)
        bas = page.height
        for autre in ancres:                       # limite basse : bande suivante
            if autre['top'] > y_rep + 40:
                bas = min(bas, autre['top'] - 12)

        for i, a in enumerate(bande):
            gauche = a['x0'] - 6
            droite = bande[i + 1]['x0'] - 6 if i + 1 < len(bande) else page.width
            bloc = [m for m in mots if gauche <= m['x0'] < droite and m['top'] < bas]

            # Combien de colonnes de quantites ? (nombre de « Qt » sur la bande)
            nb_qt = len([m for m in bloc if m['text'] == 'Qt' and abs(m['top'] - a['top']) <= 20])
            nb_qt = max(1, nb_qt)

            noms, generique = [], None
            for m in bloc:
                t = m['text'].strip()
                if RE_DESIGN.match(t) and abs(m['top'] - a['top']) <= 22:
                    noms.append((m['top'], t))
                elif RE_STAR.match(t) and abs(m['top'] - a['top']) <= 22:
                    generique = t
            noms = [t for _, t in sorted(noms)]

            lignes = []
            for ligne in lignes_de([m for m in bloc if m['top'] > a['top'] + 4]):
                txts = [w['text'] for w in ligne]
                if not txts:
                    continue
                if any(txts[0].startswith(s) for s in STOP):
                    break
                if not re.fullmatch(r'\d{1,2}', txts[0]) or len(txts) < 1 + nb_qt + 1:
                    continue
                quantites = txts[-nb_qt:]
                if not all(re.fullmatch(r'\d{1,3}|-|–|—', q) for q in quantites):
                    continue
                ref = ' '.join(txts[1:-nb_qt]).strip()
                if not ref or RE_DESIGN.match(ref) or RE_STAR.match(ref):
                    continue
                lignes.append((ref, quantites))

            if not lignes:
                continue

            if nb_qt == 1:
                # Format A : une composition commune aux variantes citees.
                comps = [{'ref': r, 'qty': int(q[0])} for r, q in lignes if q[0].isdigit()]
                if comps and (noms or generique):
                    chaines.append({'page': numero, 'generique': generique,
                                    'designations': noms or [generique],
                                    'variantes': {'*': comps}})
            else:
                # Format B : une composition par degre de pollution.
                variantes = {}
                for k in range(nb_qt):
                    pol = POLLUTIONS[k] if k < len(POLLUTIONS) else str(k)
                    comps = [{'ref': r, 'qty': int(q[k])} for r, q in lignes if q[k].isdigit()]
                    if comps:
                        variantes[pol] = comps
                if variantes and generique:
                    chaines.append({'page': numero, 'generique': generique,
                                    'designations': [generique.replace('*', p) for p in variantes],
                                    'variantes': variantes})
    return chaines


def main():
    res = []
    with pdfplumber.open(PDF) as pdf:
        for n in PAGES:
            if n - 1 >= len(pdf.pages):
                continue
            try:
                res.extend(parse_page(pdf.pages[n - 1], n))
            except Exception as e:
                print(f'  page {n}: {e}', file=sys.stderr)

    json.dump(res, open('chaines_brut.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    refs = {}
    for c in res:
        for comps in c['variantes'].values():
            for x in comps:
                refs[x['ref']] = refs.get(x['ref'], 0) + 1
    print(f'{len(res)} chaines extraites, {len(refs)} references distinctes')
    pages = sorted({c['page'] for c in res})
    print(f'pages exploitees : {pages}')


if __name__ == '__main__':
    main()
