# Portfolio

Site portfolio statique : HTML, CSS et JavaScript purs. Aucune dépendance, aucun outil de compilation, aucune ressource externe (fonctionne hors ligne, sans cookies ni traceurs).

## Voir le site

Ouvrir `index.html` dans le navigateur (double-clic), ou lancer un petit serveur local :

```bash
python -m http.server 8090
# puis http://127.0.0.1:8090
```

## Modifier le contenu

| Je veux changer… | Où |
|---|---|
| Nom, prénom, e-mail, lien GitHub | `js/profile.js` (un seul fichier) |
| Titre, textes, projets, compétences | `index.html` |
| Couleurs, tailles, animations | `css/style.css` (variables en haut du fichier) |
| Mots qui défilent dans le titre | `js/main.js` (tableau `words`) |
| Captures d'écran | `assets/img/` (format WebP conseillé) |
| Image de partage (réseaux sociaux) | `assets/img/og.jpg` (1200 x 630) |

### Ajouter un projet

Dupliquer un bloc `<article class="project card reveal" data-tags="...">` dans `index.html`, puis adapter le titre, le texte, les technologies et les liens. L'attribut `data-tags` alimente les filtres (`web`, `pwa`, `temps-reel`, `windows`).

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
