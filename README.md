# Invent'RTE

Application web d'inventaire d'atelier multi-équipes : pièces, familles, plan de
l'atelier, paniers de chantier et scan de QR codes. Les données sont partagées en
temps réel via Firebase Realtime Database.

L'application tient dans `index.html` : il suffit de l'ouvrir, il n'y a rien à
installer ni à compiler.

## À FAIRE — sécuriser la base de données

La connexion anonyme est activée : l'application s'authentifie toute seule et
attend d'être connectée avant de lire quoi que ce soit. Les utilisateurs n'ont
ni compte ni mot de passe à saisir.

**Il reste une étape.** Tant qu'elle n'est pas faite, la base est ouverte à tout
Internet : n'importe qui connaissant l'adresse peut lire l'inventaire complet ou
l'effacer en une seule requête.

Console Firebase → *Realtime Database* → onglet **Règles** → coller le contenu de
[`firebase-rules.json`](firebase-rules.json) → *Publier*.

Ces règles ont été validées sur l'émulateur Firebase (48 cas) : un visiteur non
authentifié est bloqué sur toute la base, l'application conserve exactement les
accès dont elle a besoin, les données incohérentes (stock négatif, photo replacée
au milieu des données, statut de chantier inconnu) sont rejetées, aucune
collection ne peut être effacée d'un bloc, et le journal est en ajout seul.

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

## Fonctionnement hors ligne

Les dernières données consultées sont conservées dans le navigateur : l'app
s'ouvre et reste consultable sans réseau, ce qui est utile en chantier. Les
modifications, elles, nécessitent une connexion — l'indicateur à côté du nom de
l'équipe passe au rouge quand la liaison est perdue, et un message signale toute
modification non enregistrée.

L'application est installable sur le téléphone (« Ajouter à l'écran d'accueil »).

## Sauvegarde

Pour récupérer une copie complète de la base à un instant donné :

```bash
curl -s "https://inventaire-rte-default-rtdb.europe-west1.firebasedatabase.app/.json" -o sauvegarde.json
```

Une fois les règles de sécurité publiées, cette commande ne fonctionnera plus
telle quelle (c'est le but) : passez alors par la console Firebase,
*Realtime Database* → menu ⋮ → *Exporter le JSON*.
