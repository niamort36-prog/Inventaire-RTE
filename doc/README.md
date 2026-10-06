# Sources du guide d'utilisation

Le guide publié est [`Guide-Invent-RTE.pdf`](../Guide-Invent-RTE.pdf), à la racine du dépôt.
Ce dossier contient de quoi le régénérer entièrement.

| Fichier | Rôle |
|---|---|
| `guide.html` | Le texte et la mise en page du guide |
| `captures/` | Les 21 captures d'écran utilisées |
| `demo.mjs` | Le jeu de données fictif servant aux captures |
| `shots.mjs` | Crée le jeu de démonstration, prend les captures, puis efface tout |
| `pdf.mjs` | Convertit `guide.html` en PDF A4 paginé, écrit à la racine du dépôt |

## Régénérer le guide

Prérequis : Node.js et Microsoft Edge (ou Chrome, en adaptant `channel`).

```bash
npm install playwright-core
```

Servir l'application en local, dans une autre console :

```bash
python -m http.server 8777
```

Puis, depuis ce dossier :

```bash
node shots.mjs && node pdf.mjs
```

`shots.mjs` fabrique un jeu de démonstration dans l'équipe `EL Aurillac` — la clé technique de
**EEL Aurillac** —, prend les captures, puis supprime tout ce qu'il a créé. Il affiche le contenu
restant en fin d'exécution : **il doit être à zéro**.

Si l'exécution s'interrompt en cours de route, le ménage n'a pas lieu : relancer le script tel quel
ajouterait un second jeu au premier, et les captures montreraient chaque pièce en double. Vider
l'équipe avant de relancer.

Les captures sont renumérotées à chaque exécution, dans l'ordre où elles sont prises. Après avoir
inséré ou retiré une capture, vérifier les chemins `captures/NN-nom.png` cités dans `guide.html`.

## Deux règles à respecter

**Aucune donnée réelle dans le guide.** Ce dépôt est public. Les captures doivent être prises sur
le jeu fictif de `demo.mjs`, jamais sur l'inventaire d'une équipe en service : elles y exposeraient
le matériel, les quantités et parfois des noms de personnes.

**Travailler dans une équipe vide.** `shots.mjs` écrit dans la vraie base. Il vise `EL Aurillac`
parce qu'elle ne sert pas ; le pointer sur une équipe en activité y créerait puis y supprimerait
du matériel.

## Un détail sur les avertissements de poids

`shots.mjs` n'enregistre pas le champ `poids` des pièces de démonstration : il le pose à
l'affichage, juste avant chaque capture. Le jeu est effacé ensuite, rien ne sert de l'écrire — et
cela rend le script indépendant des règles publiées sur la base.

## Quand mettre le guide à jour

À chaque évolution visible de l'application : nouvel écran, nouveau bouton, vocabulaire modifié.
Mettre à jour `guide.html`, refaire les captures concernées, régénérer le PDF, et corriger la date
de version sur la page de couverture.
