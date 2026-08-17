# Extraction du catalogue des chaînes isolantes

Produit [`catalogue-chaines.json`](../../catalogue-chaines.json) à partir du
*Catalogue des matériels d'équipement de lignes aériennes* de RTE
(NT-ING-CNER-DL-ML-11-00021 indice 3), pages 30 à 99 — chaînes en verre.

Le PDF source n'est pas versionné : c'est un document interne RTE, et ce dépôt
est public.

## Enchaînement

```bash
python parse_chaines.py     # lit le PDF          -> chaines_brut.json
python build_catalogue.py   # décode les désignations -> catalogue_chaines.json
python final_catalogue.py   # allège et publie    -> catalogue-chaines.json
```

Adapter le chemin `PDF` en tête de `parse_chaines.py`.

## Ce que fait chaque étape

`parse_chaines.py` reconstitue les nomenclatures. Le texte d'une planche mélange
les colonnes voisines : l'extraction s'appuie donc sur la position des mots. Deux
mises en page coexistent — une seule colonne de quantités en 63/90 kV (les trois
degrés de pollution partagent la composition), trois colonnes en 225/400 kV (la
composition diffère selon la pollution).

`build_catalogue.py` décode la désignation caractère par caractère selon les
règles de la page 10 : tension, nombre de conducteurs, type de chaîne
(suspension ou ancrage), nombre de files, pollution, charge de rupture.

`final_catalogue.py` réduit le fichier à ce dont l'application a besoin et y
inscrit les équivalences de libellé vérifiées à la main.

## À vérifier en cas de nouvelle édition du catalogue

Le nombre de chaînes retenues et la répartition par tension sont affichés à
chaque exécution : une baisse brutale signale une mise en page qui a changé.
