
![Build](https://img.shields.io/github/actions/workflow/status/AdaaJr/gmail-phone-capture-google-signin/release.yml?branch=main&label=Build)
![Release](https://img.shields.io/github/v/release/AdaaJr/gmail-phone-capture-google-signin?display_name=tag&label=Extension)

# Gmail Phone Capture — Google Sign-In (Sheets) **PRO** — Chrome MV3

Gmail → extraction de **numéros de téléphone** → **Sign in with Google** → **Google Sheets**.  
Dédup automatique : l’extension écrit dans **raw!A:E** et l’onglet **phones** affiche **=UNIQUE(raw!A:E)**.

## ✨ Nouveautés (PRO)
- **Dédup** automatique (raw → phones=UNIQUE)
- **Presets** de filtres (Devis/Facture, RDV, Support)
- **Normalisation multi-pays** (FR +33, BE +32, CH +41 — heuristiques)
- UX complète : **Popup** (Sign-in, Create Sheet, Test) + **Options** (OAuth, Sheets, Filtres)

## ⚡ Installation rapide
1) `chrome://extensions` → Developer mode → **Load unpacked** → `chrome-extension/`
2) Google Cloud Console → activer **Google Sheets API**
3) Créer **OAuth client ID** (type *Web application*), ajouter redirect URI :
   ```
   https://<extension-id>.chromiumapp.org/
   ```
4) Dans **Options → Google OAuth** : coller le **Client ID**
5) **Popup** : bouton **Se connecter Google** puis **Créer Sheet** (crée `raw` + `phones`)
6) **Options → Filtres** : configure et **Enregistrer**
7) Ouvre un mail → **Popup → Tester** (match + phones) → lignes ajoutées dans **raw**

## 🧠 Comment ça marche (dédup)
- L’extension **append** dans `raw!A:E` : `timestamp | from | subject | phone | threadUrl`
- L’onglet `phones` a `A1:E1` en entêtes et en `A2`: `=UNIQUE(raw!A:E)`
- Tu peux filtrer/classer/partager l’onglet `phones` sans toucher aux données brutes

## 🔐 Scopes OAuth
- `https://www.googleapis.com/auth/spreadsheets`

## 🛠️ Personnalisation
- Regex numéros : `contentScript.js` → `PHONE_REGEX`
- Normalisation : `normalizeIntl()`
- Filtres : Options (mots-clés / regex / domaines) + **presets**

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

**Auteur : Wali Diabi — 2025**