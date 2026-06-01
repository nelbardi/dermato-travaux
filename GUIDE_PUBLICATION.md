# Guide — Publication sur Play Store & App Store
## Application : Dermatologie — Travaux Scientifiques

---

## ÉTAPE 1 — Préparer GitHub Pages

Uploadez ces fichiers dans votre dépôt `dermato-travaux` sur GitHub :
- `manifest.json` (nouveau, remplace l'ancien)
- `sw.js` (nouveau service worker)
- Dossier `icons/` avec tous les PNG

Vérifiez que votre `index.html` contient bien :
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#0d2240">
```

---

## ÉTAPE 2 — Tester la PWA avec PWABuilder

1. Allez sur **pwabuilder.com**
2. Entrez l'URL : `https://nelbardi.github.io/dermato-travaux`
3. Cliquez **Start**
4. Attendez l'analyse — vous verrez un score PWA
5. Si score > 70 → vous pouvez générer les packages stores

---

## ÉTAPE 3 — Play Store Android

### Créer un compte développeur
1. Allez sur **play.google.com/console**
2. Créez un compte développeur → **25$** (une seule fois)
3. Acceptez les conditions

### Générer le package Android
1. Sur PWABuilder → cliquez **Package for stores** → **Android**
2. Remplissez :
   - Package name : `com.dermatologie.travaux`
   - App name : `Dermatologie Travaux`
   - Version : `1.0.0`
   - URL : `https://nelbardi.github.io/dermato-travaux`
3. Téléchargez le fichier `.aab` généré

### Soumettre sur Play Store
1. Dans Google Play Console → **Créer une application**
2. Nom : `Dermatologie — Travaux Scientifiques`
3. Langue : Français
4. Application / Gratuite
5. Remplissez la **fiche Play Store** :
   - **Titre** : Dermatologie — Travaux Scientifiques
   - **Description courte** : Gestion des travaux scientifiques du Service de Dermatologie
   - **Description longue** : Application dédiée au Service de Dermatologie du CHU pour la gestion et le suivi des travaux scientifiques des résidents. Permet l'ajout, la modification et le suivi des travaux avec synchronisation Google Sheets.
   - **Catégorie** : Médecine
   - **Email de contact** : votre email
6. Uploadez les **captures d'écran** (utilisez `screenshots/splash.png`)
7. Uploadez le **feature graphic** (`screenshots/feature_graphic.png`) 1024x500
8. Uploadez l'**icône** (`icons/icon-512.png`) 512x512
9. Version finale → uploadez le fichier `.aab`
10. Soumettez pour examen → **2-7 jours**

---

## ÉTAPE 4 — App Store iPhone

### Prérequis
- **Mac obligatoire** pour compiler
- Compte développeur Apple → **99$/an** sur developer.apple.com

### Générer le package iOS
1. Sur PWABuilder → **Package for stores** → **iOS**
2. Téléchargez le projet Xcode généré
3. Ouvrez sur Mac avec Xcode
4. Signez avec votre compte développeur Apple
5. Archivez et uploadez via Xcode

### Informations App Store Connect
- **Nom** : Dermatologie Travaux
- **Sous-titre** : Gestion travaux scientifiques
- **Catégorie** : Médecine
- **Prix** : Gratuit

---

## INFORMATIONS DE L'APPLICATION

| Champ | Valeur |
|-------|--------|
| URL | https://nelbardi.github.io/dermato-travaux |
| Package Android | com.dermatologie.travaux |
| Version | 1.0.0 |
| Catégorie | Médecine / Productivité |
| Langue | Français |
| Prix | Gratuit |
| Audience | Professionnels de santé |

---

## DESCRIPTION POUR LES STORES

**Français :**
Application professionnelle dédiée au Service de Dermatologie du CHU pour la gestion et le suivi des travaux scientifiques.

Fonctionnalités :
• Gestion des travaux scientifiques des résidents
• Suivi du roulement des superviseurs
• Upload des résumés (PDF, DOCX)
• Synchronisation en temps réel via Google Sheets
• Accès multi-utilisateurs (Admin, Professeur, Résident)
• Export PDF, Word et Excel
• Interface sécurisée avec authentification

---

## NOTES IMPORTANTES

⚠️ Le Play Store et l'App Store examinent toutes les applications médicales avec attention.
Mentionnez que l'app est réservée aux professionnels de santé du CHU.

⚠️ Temps d'examen : 2-7 jours (Play Store) / 1-3 jours (App Store)

⚠️ Si refus : PWABuilder propose aussi de publier directement sur le **Microsoft Store** (Windows) sans examen, gratuitement.
