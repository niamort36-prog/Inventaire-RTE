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
TYPES = {'I': 'suspension', 'K': 'suspension', 'V': 'suspension', 'W': 'suspension',
         'X': 'ancrage', 'H': 'ancrage'}
SOUS_TYPES = {'I': 'verticale', 'K': 'verticale allégée', 'V': 'en V à 60°',
              'W': 'en V à 90°', 'X': 'horizontale', 'H': 'horizontale allégée'}
POLLUTIONS = {'N': 'normale', 'M': 'moyenne', 'F': 'forte', 'E': 'exceptionnelle'}
FILES = {1: 'simple', 2: 'double', 3: 'triple', 4: 'quadruple'}

RE = re.compile(r'^([AZ]?)([34567])([UDTQ])([0-9])([IKVWXHilkvwxh])([0-9])([NMFE])([0-9]{1,2})([A-Z]?)$')


def decode(d):
    m = RE.match(d)
    if not m:
        return None
    _part, tens, cond, ecart, typ, files, pol, charge, suffixe = m.groups()
    typ = typ.upper()
    if typ not in TYPES:
        return None
    return {
        'designation': d,
        'tensions': TENSIONS[tens],
        'faisceau': FAISCEAUX[cond],
        'type': TYPES[typ],
        'forme': SOUS_TYPES[typ],
        'files': int(files),
        'chaine': FILES.get(int(files), f'{files} files'),
        'pollution': POLLUTIONS[pol],
        'pollutionCode': pol,
        'charge': int(charge) * 10,
        'antibruit': _part == 'A',
    }


def nettoyer(ref):
    """Retire les appels de note collés à la référence : « (1) JUL B », et
    ne garde que la première branche des alternatives « X ou Y »."""
    ref = re.sub(r'^\(\d+\)\s*', '', ref).strip()
    ref = re.split(r'\s+ou\s+', ref)[0].strip()
    return ref


def main():
    brut = json.load(open('chaines_brut.json', encoding='utf-8'))
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
