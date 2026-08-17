# Invent'RTE

Application web d'inventaire d'atelier multi-équipes : pièces, familles, plan de
l'atelier, paniers de chantier et scan de QR codes. Les données sont partagées en
temps réel via Firebase Realtime Database.

L'application tient dans `index.html` : il suffit de l'ouvrir, il n'y a rien à
installer ni à compiler.

## Guide d'utilisation

**[Guide-Invent-RTE.pdf](Guide-Invent-RTE.pdf)** — 25 pages illustrées, destinées à
quelqu'un qui découvre l'application : chaque écran, chaque bouton, et les
situations courantes en fin de document.

Ses sources sont dans [`doc/`](doc/), avec la marche à suivre pour le régénérer.
Les captures sont prises sur un jeu de données fictif, jamais sur un inventaire
réel : ce dépôt est public.

## Sécurité

La base est fermée. Deux protections sont en place :

- **Connexion anonyme** : l'application s'authentifie toute seule et attend
  d'être connectée avant de lire quoi que ce soit. Les utilisateurs n'ont ni
  compte ni mot de passe à saisir.
- **Règles de sécurité** ([`firebase-rules.json`](firebase-rules.json), publiées
  le 14/08/2026) : sans authentification, toute lecture et toute écriture sont
  refusées, sur l'ensemble de la base.

Les règles ont été validées sur l'émulateur Firebase (46 cas) puis vérifiées en
conditions réelles : visiteur anonyme bloqué partout, application conservant
exactement les accès dont elle a besoin, données incohérentes rejetées (stock
négatif, photo replacée au milieu des données, statut de chantier inconnu),
aucune collection effaçable d'un bloc, journal en ajout seul.

Si vous modifiez `firebase-rules.json`, republiez-le depuis la console Firebase :
*Realtime Database* → onglet **Règles** → coller → *Publier*. Le fichier contient
des commentaires `//`, que le moteur de règles accepte — mais **pas** de clés
supplémentaires en dehors de `rules`, que Firebase rejetterait.

## Organisation des données

Chaque équipe possède son propre espace, totalement séparé des autres :

```
teams/<équipe>                  index léger (liste des équipes)
profiles/<équipe>/
    meta                        { name, createdAt }
    families/f<id>              familles de rangement
    parts/p<id>                 pièces (sans photo)
    thumbs/p<id>                vignette 220 px, chargée une fois par session
    media/p<id>                 photo pleine taille + notice PDF, à la demande
    map/image                   plan de l'atelier, à la demande
    map/markers/m<id>           zones positionnées sur le plan
    baskets/b<id>               chantiers
    baskets/b<id>/groups/<gid>  pylônes et portées (facultatif)
    baskets/b<id>/items/<uid>   articles, un nœud par article
    history/<id>                journal des mouvements
```

Le principe : **les images ne circulent jamais dans le flux temps réel**. Seul le
« cœur » (~40 Ko) est synchronisé en continu, et chaque modification n'écrit que
le nœud concerné au lieu de réécrire la base entière.

Concrètement, une modification de quantité coûte quelques centaines d'octets au
lieu des 16,7 Mo que représentait l'ancienne structure.

Corollaire important : **rien n'est jamais réécrit en bloc**. Deux personnes qui
ajoutent un article au même chantier au même moment écrivent chacune son propre
nœud, donc aucune ne peut effacer le travail de l'autre. C'est pour cette raison
que les articles sont indexés par identifiant plutôt que rangés dans une liste.

`profilesData` est l'ancienne structure, conservée intacte en lecture seule comme
filet de sécurité. Elle n'est plus utilisée par l'application et peut être
supprimée une fois que tout aura été validé en conditions réelles.

## Organiser un chantier par pylône et par portée

Dans un chantier, le bouton **Pylône / Portée** permet de déclarer les ouvrages
puis d'y rattacher le matériel.

- **Pylône** : numéro, fonction (ancrage ou alignement), chaîne (simple, double
  ou triple) et faisceau (simple ou double).
- **Portée** : numéro et faisceau (simple ou double) — une portée n'a ni
  fonction ni type de chaîne, ces champs disparaissent.

L'ouvrage qui vient d'être créé devient celui auquel les ajouts se rattachent :
on déclare le pylône 1, on ajoute son outillage, puis on passe au suivant. Le
bouton **Ajouter ici** d'un intertitre permet de revenir sur un ouvrage précédent,
et le menu sous chaque article de le déplacer.

**C'est facultatif.** Sans ouvrage déclaré, le chantier fonctionne exactement
comme avant. Le matériel non rattaché reste regroupé sous « Non affecté », jamais
perdu — y compris après la suppression d'un ouvrage, qui détache ses articles
sans les supprimer.

### Chaînes isolantes

Un chantier porte un **domaine de tension** (63, 90, 150, 225 ou 400 kV), choisi
à sa création. En déclarant un pylône, on peut alors retenir une **chaîne
isolante** dans une liste restreinte à ce qui correspond réellement : la tension
du chantier, l'ancrage ou la suspension, le nombre de files et le faisceau.

Une fois la chaîne et le nombre d'exemplaires indiqués, tout le matériel qui la
compose est ajouté au chantier, rattaché à l'ouvrage, quantités multipliées.

Le catalogue [`catalogue-chaines.json`](catalogue-chaines.json) contient
**249 chaînes** — 234 en verre et 15 à isolateurs composites — et
**81 références**, extraites du *Catalogue des matériels d'équipement de lignes
aériennes* (NT-ING-CNER-DL-ML-11-00021 indice 3, pages 30 à 110). Il est chargé
à la demande, jamais au démarrage.

Verre et composites sont présentés séparément dans la liste. Les composites
relèvent d'un usage particulier (pollution sévère, montagne, vandalisme) et
imposent des dispositifs de protection dédiés : l'aperçu le rappelle, avec la
géométrie d'assemblage de la chaîne.

Les libellés du catalogue et ceux de l'atelier diffèrent (« BS 100 » contre
« BS100 », « PM 30 400 » contre « PM 30/400 ») : la correspondance se fait sans
tenir compte des espaces ni des séparateurs. Quatre équivalences que cette règle
ne couvre pas sont inscrites dans le catalogue (`F 100` → `F100 DC`,
`F 160` → `F160 DC`, `CC 15 A` → `CC15`, `CD 15 A` → `CD15`).

Une référence sans correspondance est **créée avec une quantité de 0**, signalée
à l'écran, et à compléter depuis l'onglet Pièces.

**Une limite :** le catalogue ne contient aucune chaîne en **150 kV** — le code
existe dans les règles de désignation, mais aucune planche ne l'utilise. Ce
domaine reste sélectionnable pour nommer les chantiers, sans proposer de chaîne.

## Bon de chantier imprimable

Dans un chantier, la liste peut être triée par zone de rangement, par nom, par
famille, ou laissée dans l'ordre d'ajout. Le bouton **Imprimer** produit un bon
de chantier qui reprend exactement le tri et les filtres affichés à l'écran.

Sur un tri par zone ou par famille, les articles sont regroupés sous un
intertitre : sur le papier, on suit l'atelier zone par zone. Le bon comprend une
case à cocher par ligne, les quantités prévues et chargées (avec les écarts en
rouge), les observations et un emplacement pour le visa.

Pour obtenir un PDF, choisir « Enregistrer au format PDF » comme destination dans
la fenêtre d'impression. Si le navigateur bloque les fenêtres pop-up — courant
sur mobile — l'impression est déclenchée directement, sans nouvel onglet.

## Fonctionnement hors ligne

Les dernières données consultées sont conservées dans le navigateur : l'app
s'ouvre et reste consultable sans réseau, ce qui est utile en chantier. Les
modifications, elles, nécessitent une connexion — l'indicateur à côté du nom de
l'équipe passe au rouge quand la liaison est perdue, et un message signale toute
modification non enregistrée.

L'application est installable sur le téléphone (« Ajouter à l'écran d'accueil »).

## Sauvegarde

Console Firebase → *Realtime Database* → menu ⋮ → **Exporter le JSON**.

C'est désormais le seul moyen : les règles de sécurité empêchent de récupérer la
base par une simple URL, ce qui est précisément leur but.

Une sauvegarde d'avant la migration est conservée hors dépôt dans `_backups/`,
avec `restore.py` qui reconstruit l'intégralité de la base à partir d'elle
(structure d'origine, structure migrée, vignettes, plan et index des équipes).
