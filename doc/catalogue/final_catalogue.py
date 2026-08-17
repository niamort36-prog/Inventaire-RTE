"""
Produit le catalogue livre a l'application.

Les references du catalogue et les noms de l'inventaire s'ecrivent
differemment (« BS 100 » / « BS100 », « PM 30 400 » / « PM 30/400 ») : la
comparaison se fait donc sur une forme normalisee. Quelques equivalences ne
peuvent pas etre deduites automatiquement et sont posees explicitement.
"""
import json
import re

# Equivalences verifiees a la main : la reference du catalogue et la piece de
# l'inventaire designent le meme materiel malgre des libelles differents.
EQUIVALENCES = {
    'F 100': 'F100 DC',     # isolateur 100 kN
    'F 160': 'F160 DC',     # isolateur 160 kN
    'CC 15 A': 'CC15',
    'CD 15 A': 'CD15',
}

# Famille probable, d'apres le prefixe de la reference. Sert uniquement a
# ranger les pieces creees automatiquement ; reste corrigeable ensuite.
FAMILLE_PAR_PREFIXE = [
    (('F ',), 'isolateurs'),
    (('C 18', 'C 25', 'AP '), 'cornes'),
    (('BS ', 'OE ', 'RL ', 'PT ', 'PR ', 'PM ', 'CC ', 'CD ', 'JU', 'PMD', 'ECL'), 'intermediaires'),
]


def norm(s):
    return re.sub(r'[^A-Z0-9]', '', (s or '').upper())


def famille_de(ref):
    for prefixes, cle in FAMILLE_PAR_PREFIXE:
        if any(ref.startswith(p) for p in prefixes):
            return cle
    return 'intermediaires'


def main():
    chaines = json.load(open('catalogue_chaines.json', encoding='utf-8'))

    refs = sorted({c['ref'] for ch in chaines for c in ch['composants']})
    composants = [{'ref': r, 'equivalent': EQUIVALENCES.get(r), 'famille': famille_de(r)}
                  for r in refs]

    # Allege : on ne garde que ce dont l'application a besoin.
    sortie = {
        'source': 'Catalogue des matériels d\'équipement de lignes aériennes '
                  'NT-ING-CNER-DL-ML-11-00021 indice 3 — chaînes en verre (pages 30 à 99)',
        'tensions': [63, 90, 150, 225, 400],
        'composants': composants,
        'chaines': [{
            'd': c['designation'],
            't': c['tensions'],
            'ty': c['type'],
            'fo': c['forme'],
            'fi': c['files'],
            'ch': c['chaine'],
            'fa': c['faisceau'],
            'po': c['pollution'],
            'kn': c['charge'],
            'ab': c['antibruit'],
            'c': [[x['ref'], x['qty']] for x in c['composants']],
        } for c in chaines],
    }

    json.dump(sortie, open('catalogue-chaines.json', 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))

    import os
    ko = os.path.getsize('catalogue-chaines.json') / 1024
    print(f'{len(chaines)} chaines, {len(refs)} composants -> catalogue-chaines.json ({ko:.0f} Ko)')

    # Verification : couverture des combinaisons demandees
    print('\nCouverture par tension :')
    for t in [63, 90, 150, 225, 400]:
        n = sum(1 for c in chaines if t in c['tensions'])
        etat = f'{n:>3} chaines' if n else '  aucune chaine au catalogue'
        print(f'  {t:>3} kV : {etat}')

    print('\nEquivalences posees a la main :')
    for k, v in EQUIVALENCES.items():
        print(f'  {k:<10} -> {v}')


if __name__ == '__main__':
    main()
