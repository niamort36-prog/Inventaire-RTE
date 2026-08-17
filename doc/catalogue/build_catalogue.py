"""
Construit le catalogue exploitable par l'application a partir des chaines
extraites, en decodant la designation (regles page 10 du catalogue RTE).

Designation d'une chaine en verre, caractere par caractere :
  2. tension      3=63  4=90  5=150  6=225  7=400   (les planches « HT » en 4
                                                     valent pour 63 et 90 kV)
  3. conducteurs  U=1  D=2  T=3  Q=4        -> faisceau simple / double / ...
  4. ecartement des files (dm)
  5. type         I,K,V,W = suspension | X,H = ancrage
  6. nombre de files d'isolateurs           -> chaine simple / double / triple
  7. pollution    N=normale M=moyenne F=forte E=exceptionnelle
  8. charge de rupture des isolateurs (x10 kN)
"""
import json
import re
from collections import Counter

TENSIONS = {'3': [63], '4': [63, 90], '5': [150], '6': [225], '7': [400]}
FAISCEAUX = {'U': 'simple', 'D': 'double', 'T': 'triple', 'Q': 'quadruple'}
POLLUTIONS = {'N': 'normale', 'M': 'moyenne', 'F': 'forte', 'E': 'exceptionnelle'}
FILES = {1: 'simple', 2: 'double', 3: 'triple', 4: 'quadruple'}

# Le code du type de chaine ne se lit pas de la meme facon selon la technologie.
# Verre (planche L105823) : I K V W = suspension, X H = ancrage.
# Composite (planche L141251) : S K = suspension, A H = ancrage.
TYPES_VERRE = {'I': 'suspension', 'K': 'suspension', 'V': 'suspension',
               'W': 'suspension', 'X': 'ancrage', 'H': 'ancrage'}
FORMES_VERRE = {'I': 'verticale', 'K': 'verticale allégée', 'V': 'en V à 60°',
                'W': 'en V à 90°', 'X': 'horizontale', 'H': 'horizontale allégée'}
TYPES_COMPO = {'S': 'suspension', 'K': 'suspension', 'A': 'ancrage', 'H': 'ancrage'}
FORMES_COMPO = {'S': 'suspension', 'K': 'suspension allégée',
                'A': 'ancrage', 'H': 'ancrage allégé'}

# Geometries d'assemblage, propres aux chaines composites : cote charpente
# puis cote conducteur.
GEOMETRIES = {'T': 'tenon', 'C': 'chape', 'B': 'rotule', 'S': 'logement de rotule'}

RE = re.compile(r'^([AZ]?)([34567])([UDTQ])([0-9])([A-Za-z])([0-9])([NMFE])([0-9]{1,2})([A-Z]{0,2})$')


def decode(d):
    m = RE.match(d)
    if not m:
        return None
    prefixe, tens, cond, ecart, typ, files, pol, charge, suffixe = m.groups()
    typ = typ.upper()

    # Deux lettres finales = geometries d'assemblage, donc chaine composite.
    composite = len(suffixe) == 2 and all(c in GEOMETRIES for c in suffixe)
    table, formes = (TYPES_COMPO, FORMES_COMPO) if composite else (TYPES_VERRE, FORMES_VERRE)
    if typ not in table:
        return None

    info = {
        'designation': d,
        'tensions': TENSIONS[tens],
        'faisceau': FAISCEAUX[cond],
        'type': table[typ],
        'forme': formes[typ],
        'files': int(files),
        'chaine': FILES.get(int(files), f'{files} files'),
        'pollution': POLLUTIONS[pol],
        'pollutionCode': pol,
        'charge': int(charge) * 10,
        'antibruit': prefixe == 'A',
        'isolateur': 'composite' if composite else 'verre',
    }
    if composite:
        info['assemblage'] = f'{GEOMETRIES[suffixe[0]]} / {GEOMETRIES[suffixe[1]]}'
    return info


def nettoyer(ref):
    """Retire les appels de note collés à la référence : « (1) JUL B », et
    ne garde que la première branche des alternatives « X ou Y »."""
    ref = re.sub(r'^\(\d+\)\s*', '', ref).strip()
    ref = re.split(r'\s+ou\s+', ref)[0].strip()
    return ref


def main():
    brut = json.load(open('chaines_brut.json', encoding='utf-8'))

    # Nomenclatures relevees a la main, hors de portee du parseur (voir
    # complement.json pour le detail).
    try:
        comp = json.load(open('complement.json', encoding='utf-8'))
        for c in comp['chaines']:
            brut.append({
                'page': c['page'],
                'generique': None,
                'designations': c['designations'],
                'variantes': {'*': [{'ref': r, 'qty': q} for r, q in c['composants']]},
            })
        print(f"{len(comp['chaines'])} nomenclatures ajoutees depuis complement.json")
    except FileNotFoundError:
        pass

    for bloc in brut:
        for comps in bloc['variantes'].values():
            for c in comps:
                c['ref'] = nettoyer(c['ref'])

    catalogue, ignorees = {}, Counter()
    for bloc in brut:
        for pol_cle, comps in bloc['variantes'].items():
            for design in bloc['designations']:
                info = decode(design)
                if not info:
                    ignorees[design] += 1
                    continue
                # Format B : chaque colonne correspond a une pollution precise.
                if pol_cle != '*' and info['pollutionCode'] != pol_cle:
                    continue
                cle = design
                if cle in catalogue:
                    continue
                info['composants'] = comps
                info['page'] = bloc['page']
                catalogue[cle] = info

    chaines = sorted(catalogue.values(),
                     key=lambda c: (c['tensions'][0], c['type'], c['files'], c['designation']))
    json.dump(chaines, open('catalogue_chaines.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    print(f'{len(chaines)} chaines retenues')
    if ignorees:
        print(f'{sum(ignorees.values())} designations non decodees :',
              ', '.join(list(ignorees)[:8]))

    print('\nRepartition :')
    par = Counter()
    for c in chaines:
        for t in c['tensions']:
            par[(t, c['type'])] += 1
    for (t, ty), n in sorted(par.items()):
        print(f'  {t:>3} kV  {ty:<11} {n:>3}')

    print('\nCombinaisons disponibles (tension / type / chaine / faisceau) :')
    combos = Counter((t, c['type'], c['chaine'], c['faisceau'])
                     for c in chaines for t in c['tensions'])
    for (t, ty, ch, fa), n in sorted(combos.items()):
        print(f'  {t:>3} kV | {ty:<11} | chaine {ch:<9} | faisceau {fa:<9} : {n}')

    refs = Counter()
    for c in chaines:
        for x in c['composants']:
            refs[x['ref']] += 1
    print(f'\n{len(refs)} references de composants :')
    print('  ' + ', '.join(sorted(refs)))


if __name__ == '__main__':
    main()
