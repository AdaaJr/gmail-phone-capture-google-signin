# Gmail Phone Capture — **Google Sign-In (Sheets)** — Chrome Extension (MV3)

Extension qui lit les emails ouverts sur **Gmail** → extrait les **numéros de téléphone** → se **connecte à Google** (OAuth) → **écrit directement** dans **Google Sheets**.  
✅ **Aucun serveur / webhook** à héberger. Tout passe par ton **compte Google** via *Sign in with Google*.

## ✨ Fonctionnalités
- **Sign in with Google** (OAuth) via l’extension : stockage du token (temporaire) en local.
- **Google Sheets API** : crée ou met à jour une feuille, écrit dans l’onglet `phones`.
- **Filtres** : sujet (mots-clés & regex), expéditeur (emails/domaines), corps (mots-clés & regex), ignorer Re/Fwd.
- **UX intégrée** : Popup (Activer / Sign-in / Créer Sheet / Test), Options (OAuth, Sheet, Filtres).
- **Aucune API externe** : uniquement les APIs Google accessibles via ton compte.

---

## 🧰 Prérequis Google Cloud (4 min)
1. Va sur **Google Cloud Console** → **APIs & Services** → **Enable APIs** : active **Google Sheets API**.
2. **Credentials** → **Create credentials** → **OAuth client ID** → type **Web application**.
3. Dans **Authorized redirect URIs**, ajoute :  
   `https://<extension-id>.chromiumapp.org/`  
   *(tu récupères `<extension-id>` dans chrome://extensions après avoir chargé l’extension)*
4. Récupère le **Client ID** (`...apps.googleusercontent.com`). Tu le colleras dans **Options → Google OAuth**.

Scopes nécessaires (par défaut) :  
`https://www.googleapis.com/auth/spreadsheets`

---

## 🚀 Installation
1. Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → dossier `chrome-extension/`.
2. Clique l’icône → **Options** :
   - **Google OAuth Client ID** : colle le client ID (étape ci-dessus).
   - Vérifie le scope (par défaut Sheets).
   - **Spreadsheet ID** : laisse vide pour le moment (tu peux créer un Sheet depuis le Popup).
   - **Enregistrer**.
3. Dans le **Popup** :
   - **Se connecter Google** → valide les consentements.
   - **Créer Sheet** → donne un titre → copie l’ID affiché (ou va dans l’URL du Sheet) et colle-le dans **Options → Spreadsheet ID** (ou laisse-le enregistré automatiquement si retour OK).
4. Ouvre Gmail, clique un email, assure-toi que **Activer** est coché.

---

## 🧪 Tester
- **Popup → Tester** : sur un email ouvert, tu vois `match`, `phones` et les méta (subject/from).
- À chaque détection, l’extension envoie des lignes dans **phones!A:E** :  
  `timestamp | from | subject | phone | threadUrl`.

---

## 🔧 Personnalisation
- Normalisation FR `+33` : `contentScript.js` → `normalize()`.
- Regex des numéros : `PHONE_REGEX`.
- Filtres complets dans **Options** : mots-clés / regex / domaines autorisés / ignorer Re/Fwd.

---

## 🛡️ Confidentialité
- L’extension ne lit que `mail.google.com`.
- Les données partent **uniquement vers l’API Google Sheets** avec **ton compte**.
- Le token est stocké localement et expire (OAuth standard). Relance *Sign in* au besoin.

---

## 📂 Arborescence
```
chrome-extension/
  manifest.json
  serviceWorker.js
  contentScript.js
  popup.html
  options.html
  icons/
README.md
```

---

**Auteur : Wali Diabi — 2025**