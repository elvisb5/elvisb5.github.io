# Portfolio de BIRBA Signon Yann Elvis

Site portfolio statique : HTML, CSS et JavaScript, avec des scènes 3D en **Three.js** (copié dans `vendor/`, donc aucune ressource externe, aucun cookie, aucun traceur). Fonctionne hors ligne.

## Ce que fait le site

- **Carte électronique 3D** en fond : une puce, des pistes, des LED et un écran « application web ». Des signaux circulent en continu. **Cliquer la puce** envoie un signal sur toutes les pistes, **cliquer une LED** l'allume ou l'éteint. La carte tourne avec la souris et le défilement.
- **Sphère 3D des compétences** : on la fait tourner en glissant, on survole un mot pour le mettre en avant.
- Particules qui fuient le curseur, halo du curseur, cartes qui s'inclinent avec reflet, ondulation des boutons, apparition au défilement, compteurs, machine à écrire, bandeau défilant, ligne du parcours qui se dessine.
- Trois projets avec galeries de captures et agrandissement : Gestion de Stock, RestoFlow, Suivi d'objectifs.
- Tout est désactivé si le système demande de « réduire les animations ». Sans WebGL, un fond de particules 2D remplace la 3D.

## Voir le site

Les modules JavaScript exigent un petit serveur (l'ouverture directe du fichier ne suffit pas) :

```bash
python -m http.server 8090
# puis http://127.0.0.1:8090
```

## Modifier le contenu

| Je veux changer… | Où |
|---|---|
| Nom, téléphones, e-mail, lien GitHub | `js/profile.js` (les numéros affichés dans le contact et l'e-mail y sont lus) |
| Textes du parcours, projets, compétences | `index.html` |
| Mots qui défilent sous le nom | attribut `data-words` de `#typed` dans `index.html` |
| Mots de la sphère 3D | tableau `words` dans `js/scene.js` (fonction `skillsSphere`) |
| Couleurs, tailles, animations | `css/style.css` (variables en haut du fichier) |
| Captures d'écran | `assets/img/` (WebP conseillé) |
| Image de partage (réseaux sociaux) | `assets/img/og.jpg` (1200 x 630) |

> Le parcours (électronique, informatique industrielle) est décrit en termes généraux : adapter les textes de la section « Parcours » et les compétences « Électronique et industrie » à la formation réelle (diplôme, établissement, dates, outils).

### Ajouter un projet

Dupliquer un bloc `<article class="project ...">` dans `index.html`, puis adapter le titre, le texte, les technologies et les liens. Pour une galerie, chaque miniature `.thumb` porte `data-src`, `data-alt` et `data-cap`. L'attribut `data-tags` alimente les filtres (`web`, `pwa`, `temps-reel`, `windows`).

### Three.js

`vendor/three.module.min.js` et `vendor/three.core.js` sont le build minifié de `three@0.186.0` (licence MIT, voir `vendor/LICENSE-three.txt`). `three.core.js` doit rester à côté du module. Un import map dans `index.html` associe le nom `three` à ce fichier.

## Publier gratuitement avec GitHub Pages

Le plus simple est un dépôt nommé exactement comme le compte, suivi de `.github.io` : le site sera alors à l'adresse `https://NOM.github.io`.

```bash
gh repo create NOM.github.io --public --source=. --remote=origin --push
```

Puis, dans le dépôt sur GitHub : **Settings, Pages, Source : Deploy from a branch, branche `main`, dossier `/ (root)`**. La mise en ligne prend environ une minute. Chaque `git push` met le site à jour.

Après publication, vérifier que l'adresse de l'image de partage dans `index.html` (balise `og:image`) correspond bien à l'adresse réelle du site.

## Structure

```
portfolio/
├── index.html          Page unique (sections : accueil, projets, compétences, à propos, contact)
├── css/style.css       Styles, thème sombre et clair
├── js/profile.js       Informations personnelles
├── js/main.js          Interactions (thème, filtres, galerie, animations)
└── assets/             Images et icône
```

## Fonctionnalités

- Thème sombre et clair (choix mémorisé), adapté au thème du système
- Mise en page adaptée téléphone, tablette et ordinateur
- Filtres de projets, galerie de captures avec agrandissement (clavier : flèches et Échap)
- Animations à l'apparition, compteurs, barre de progression
- Respect de la préférence « réduire les animations » et navigation au clavier
