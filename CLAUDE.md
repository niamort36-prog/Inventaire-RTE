# ⚠️ DIRECTIVES STRICTES D'ÉCONOMIE DE TOKENS (NE PAS IGNORER)

## 1. Format de Sortie et Communication
- AUCUNE introduction, conclusion, ou phrase de politesse (ex: "Voici le code", "C'est compris").
- Ne résume pas et ne reformule pas ma demande.
- Fournis l'explication technique la plus courte possible (3 phrases maximum, en puces) uniquement si cela justifie un choix critique.

## 2. Édition de Code (Diff Strictly)
- NE RÉÉCRIS JAMAIS un fichier dans son intégralité.
- Affiche EXCLUSIVEMENT les blocs de code modifiés, en encadrant la modification de 2 lignes de contexte maximum.
- Utilise toujours des commentaires type `// ... code existant ...` pour remplacer les sections inchangées.
- Omets les imports standards (React, Node, modules Firebase) si la tâche ne concerne que la logique interne d'une fonction.

## 3. Lecture du Système de Fichiers (Recherche Ciblée)
- Ne lis JAMAIS un fichier complet à l'aveugle, surtout s'il dépasse 100 lignes.
- Privilégie systématiquement `grep -n`, `ripgrep` ou `sed` pour cibler une définition de fonction, une requête de base de données ou une classe spécifique avant de lire le code.
- Pour comprendre l'arborescence, exécute `tree -I 'node_modules|dist|build|.git|.firebase' -L 2`. Ne parcours jamais ces dossiers ignorés.
- Lors du débogage (ex: Vite ou logs serveur), extrais uniquement la première stack trace de l'erreur. Ne copie/colle pas l'intégralité du terminal.

## 4. Gestion de l'État
- Consulte le fichier `progress.md` (s'il existe) pour connaître l'objectif immédiat. Ne tente pas de déduire le contexte en relisant l'historique complet de la session ou les anciens commits.