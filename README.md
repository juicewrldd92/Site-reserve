# Réserve

> Scanne, range, commande. Ta réserve enfin claire.

SaaS d'inventaire pour restaurateurs — PWA mobile-first, pensée pour être utilisée
d'une main, en cuisine, parfois sans réseau.

## Les 4 différenciateurs (à ne jamais sacrifier)

1. **Produits sans code-barre = citoyens de première classe.** En resto, la majorité
   du stock n'a pas de code-barre.
2. **Alertes DLC / DLUO.** Vrai pain point HACCP + anti-gaspi.
3. **Fonctionne hors-ligne.** Réserves, chambres froides et caves n'ont pas de réseau.
4. **Le scan marche vraiment sur iPhone.** Donc ZXing, jamais `BarcodeDetector` seul
   (non supporté par WebKit → échec silencieux sur tous les navigateurs iOS).

## Stack

| Domaine | Choix |
| --- | --- |
| Front | React 19 + Vite + TypeScript strict |
| Styles | Tailwind CSS v4 (tokens dans `src/index.css`) |
| PWA | `vite-plugin-pwa` (manifest, service worker, installable, offline) |
| Backend | Supabase (Postgres + Auth + Storage + RLS + Realtime) |
| Données | TanStack Query + client Supabase |
| Scan | `@zxing/browser` (Phase 3) |
| Produits | Open Food Facts API v2 (Phase 2) |
| Offline | Dexie.js / IndexedDB (Phase 8) |

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis renseigne tes clés Supabase
npm run dev
```

L'app tourne sur <http://localhost:5173>. Elle démarre **même sans Supabase configuré** :
un écran explique alors précisément ce qui reste à brancher.

### Brancher Supabase

1. Crée un projet sur [supabase.com](https://supabase.com) (le free tier suffit).
2. Project settings → API : copie l'URL du projet et la clé **anon public** dans
   `.env.local`.
3. SQL editor → colle et exécute **toutes** les migrations de
   `supabase/migrations/`, dans l'ordre numérique (`0001` → `0006`).
4. Authentication → Providers : garde **Email** activé. En dev, désactive
   « Confirm email » pour pouvoir te connecter sans passer par la boîte mail.

### Vérifier que la RLS tient

Colle `supabase/tests/rls_isolation.sql` dans le SQL editor et exécute-le. Il crée
deux organisations avec des utilisateurs fictifs, tente des fuites dans les deux
sens, et se termine par un `ROLLBACK` — il ne laisse rien derrière lui.

Attendu : `✅ TOUS LES TESTS RLS PASSENT`. Toute fuite lève une exception nommée.

### Caméra : HTTPS obligatoire

`getUserMedia` n'est autorisé que sur `https://` **ou** `http://localhost`.
Pour tester le scan depuis un vrai iPhone sur le réseau local, il faut donc servir
l'app en HTTPS — le plus simple étant un tunnel :

```bash
npx localtunnel --port 5173
```

(`npm run dev` écoute déjà sur toutes les interfaces via `server.host`.)

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de dev (service worker désactivé, cf. « Page blanche ») |
| `npm run build` | Typecheck (`tsc -b`) puis build de prod + génération du SW |
| `npm run preview` | Sert le build de prod (pour tester l'install PWA) |
| `npm test` | Tests unitaires (runner natif de Node, pas de dépendance) |
| `npm run lint` | oxlint |
| `python3 scripts/generate-icons.py` | Régénère les icônes PWA depuis le logo |

## Structure

```
src/
  components/
    icons.tsx          Jeu d'icônes repris des maquettes
    layout/            Coquille mobile + barre de navigation basse
    pwa/               Bandeau hors-ligne, toast de mise à jour
    ui/                Button, Card, Chip, StatusBadge, BottomSheet, Field…
  features/
    alerts/            Calcul des alertes, source unique
    auth/              Provider de session, hook, gardes de route
    offline/           Cache Dexie et file de synchro
    orders/            Listes à commander et partage
    products/          Open Food Facts, photos, catalogue
    scan/              Moteur de scan et carte de résultat
    stock/             Dépôt, statuts, fiches, temps réel
    tenancy/           Organisations, établissements, équipe
  hooks/               Réseau, installation PWA
  lib/                 env, client Supabase typé, QueryClient
  routes/              Accueil, Stock, Scan, Alertes, Commandes, Connexion…
supabase/
  migrations/          Schéma + policies RLS (idempotent, versionné)
  tests/               Test d'isolation RLS à exécuter dans le SQL editor
public/
  fonts/               Plus Jakarta Sans auto-hébergée (offline)
  icons/               Icônes PWA générées
scripts/               Génération des icônes
```

## Modèle de données

`organizations` → `establishments` → `memberships`. Un membre appartient à une
organisation avec un rôle (`owner` / `manager` / `staff`) ; son
`establishment_id` vaut `NULL` s'il a accès à tous les établissements, sinon il
ne voit que le sien.

L'isolation repose entièrement sur la RLS Postgres, jamais sur le client. Les
policies passent par des fonctions `SECURITY DEFINER` (`is_org_member`,
`org_role`, `can_access_establishment`) : sans ça, la policy de `memberships`
s'appellerait elle-même et partirait en récursion.

L'onboarding appelle une seule fonction, `create_organization_with_establishment`,
qui crée l'organisation, le premier établissement et le membership patron dans la
même transaction — pas d'état bancal « org créée mais je n'en suis pas membre ».

`products` est le catalogue, partagé au niveau de l'organisation : un produit
scanné dans un établissement est réutilisable dans les autres. Les photos vivent
dans le bucket `product-images`, sous `<org_id>/<uuid>.<ext>` — bucket public
mais chemins impossibles à deviner, parce qu'une URL signée expire et casserait
le cache hors-ligne. L'écriture, elle, reste cloisonnée par organisation.

### Open Food Facts

Encapsulé dans `lookupBarcode()`. Deux détails qui comptent :

- Un produit inconnu renvoie `null`, pas une erreur — OFF est orienté grande
  conso, et en resto c'est le cas courant. On bascule alors vers le formulaire
  manuel avec le code déjà rempli.
- OFF demande un `User-Agent` identifiant l'app, en-tête qu'un navigateur
  interdit de définir. Leur CORS accepte `X-User-Agent`, qu'on envoie à la place.

Les images sont systématiquement recopiées dans notre Storage : les URL d'OFF
bougent, et une photo qui disparaît casserait l'écran signature de l'app. Les
photos prises au téléphone sont redimensionnées à 1024 px et réencodées en WebP
(JPEG en repli pour les vieux Safari) avant d'être envoyées.

### Le scan, et pourquoi ZXing

`BarcodeDetector`, l'API native du navigateur, **n'existe pas sur iOS** : tous les
navigateurs iPhone tournent sur WebKit, qui ne l'implémente pas. Une app qui
repose dessus échoue silencieusement chez la majorité de nos utilisateurs.

`useBarcodeScanner()` masque ça complètement :

- **ZXing est le moteur par défaut** — décodage JavaScript, marche partout.
- `BarcodeDetector` n'est qu'un accélérateur, et seulement après avoir vérifié
  via `getSupportedFormats()` qu'il lit bien nos formats.
- S'il échoue cinq frames d'affilée (cas connu sur certaines plateformes où
  l'API existe mais rejette tout), on repasse sur ZXing à chaud.

Formats lus : EAN-13, EAN-8, UPC-A, UPC-E, Code 128. Un même code ne peut pas
être compté deux fois en moins de 2,5 s. Le retour de scan est vibration +
bip — en cuisine on ne regarde pas l'écran en permanence.

L'écran est chargé en `lazy()` : ZXing pèse 487 Ko et n'a aucune raison de
ralentir le démarrage de l'app.

### Alertes

Les statuts sont calculés à la volée, jamais stockés, à partir d'une seule
fonction (`stockStatus`). Dashboard, badge de navigation et écran d'alertes
lisent la même source : ils ne peuvent pas se contredire. Couvert par `npm test`.

### Invitations

Envoyer un e-mail demanderait la clé `service_role`, qui n'a rien à faire dans
un navigateur. À la place : le patron enregistre une invitation, la personne
s'inscrit avec cette adresse, et `claim_invitations()` la transforme en
membership à sa première connexion. La fonction ne se fie qu'à l'e-mail vérifié
du JWT, jamais à un paramètre. **Réserve n'envoie pas encore d'e-mail** : il faut
prévenir la personne de son côté.

### Hors-ligne

`stock_overview` est mis en cache dans IndexedDB (Dexie) à chaque lecture
réussie. Si le réseau manque, on sert la dernière version connue — mieux vaut un
stock d'hier qu'un écran vide au moment de compter.

Les ajustements du mode inventaire passent **toujours** par la file de synchro,
en ligne comme hors-ligne : un seul chemin de code, donc un seul comportement.
La file se vide au retour du réseau (`online`). Conflits en last-write-wins par
ligne — deux personnes sur la même étagère, c'est la dernière qui a raison.

IndexedDB peut être indisponible (navigation privée, quota) : dans ce cas on
dégrade en écriture directe plutôt que de perdre le comptage.

### Stock et lots : le compromis assumé

- **`stock_items.quantity` est la quantité qui fait foi.** C'est ce qu'on compte
  sur l'étagère, c'est ce que le mode inventaire ajuste.
- **`stock_batches` enregistre les lots datés**, et ne sert qu'aux alertes DLC.

Les deux peuvent diverger — un ajustement manuel ne touche pas aux lots — et
c'est délibéré. En cuisine on compte ce qu'on voit ; les dates sont un sujet
séparé. Synchroniser automatiquement produirait des corrections surprises en
plein inventaire, ce qui est pire que la divergence.

L'ajout au stock passe par une seule fonction, `add_to_stock` : upsert de la
ligne (incrément si le produit est déjà là au même emplacement) plus création
du lot daté, en une transaction. C'est ce qui tient la promesse du « ≤ 3 taps ».
Étant `SECURITY DEFINER`, elle revérifie explicitement l'accès à
l'établissement — sinon elle contournerait la RLS.

Les statuts (`Périmé`, `Rupture`, `DLC J-n`, `Stock bas`, `En stock`) sont
**calculés, jamais stockés**, et couverts par `npm test`.

## Design system

Tous les tokens vivent dans le bloc `@theme` de `src/index.css` — palette, rayons,
ombres, animations. Règles issues des maquettes :

- **Corail `#FF5A3C`** : CTA et état actif, rien d'autre.
- **Vert / ambre / rouge** : **uniquement** les statuts. Jamais en décor, jamais en
  fond de carte.
- **Boutons et chips** : toujours en pilule. Pas de ALL CAPS dans l'app.
- **Ton de voix** : tutoiement, phrases courtes, un poil complice. On dit « produit »,
  « réserve », « à commander » — jamais « référentiel » ni « SKU ».

## Où on en est

- [x] **Phase 0 — Scaffold.** Vite + React + TS strict + Tailwind + PWA installable,
      design system, coquille mobile avec barre basse et bouton scan, client Supabase,
      routes et états vides.
- [x] **Phase 1 — Auth & multi-tenant.** Schéma Supabase + RLS testée, connexion
      e-mail / mot de passe et lien magique, wizard d'onboarding, switcher
      d'établissement.
- [x] **Phase 2 — Catalogue produits.** Table `products` + Storage, client Open
      Food Facts (lookup, cache, copie de l'image chez nous), ajout sans
      code-barre avec photo, grille de catalogue et recherche.
- [x] **Phase 3 — Scan.** `useBarcodeScanner()` (ZXing par défaut, `BarcodeDetector`
      en accélérateur), caméra plein écran, carte de scan réussi, bascule
      automatique vers la saisie manuelle si le code est inconnu.
      **Reste à valider sur un vrai iPhone.**
- [x] **Phase 4 — Stock.** `stock_items` + `stock_batches`, grille façon Yuka avec
      pastilles de statut, recherche / filtres / tri, fiche de détail avec lots
      datés, mode inventaire, ajout au stock depuis le scan.
- [x] **Phase 5 — Alertes.** Écran groupé par urgence avec action directe,
      compteurs du dashboard, badge de navigation, délai DLC réglable.
- [x] **Phase 6 — Listes à commander.** Listes, génération auto depuis le stock
      bas, cases à cocher, partage WhatsApp / mail / feuille native.
- [x] **Phase 7 — Temps réel & rôles.** Realtime sur le stock, invitations par
      e-mail réclamées à la connexion, rôles appliqués côté RLS et UI.
- [x] **Phase 8 — Offline & finitions.** Cache Dexie, file de synchro,
      reprise au retour du réseau, ErrorBoundary, `vercel.json`.

## Déploiement

Front sur Vercel (build `npm run build`, dossier `dist`), backend sur Supabase.

1. Définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables
   d'environnement du projet Vercel.
2. `vercel.json` est déjà là : il réécrit toutes les routes vers `index.html`
   (sans ça, ouvrir directement `/stock` renverrait un 404) et fige le cache des
   assets versionnés tout en gardant `sw.js` revalidé à chaque visite.
3. Dans Supabase → Authentication → URL Configuration, ajouter le domaine Vercel
   aux **Redirect URLs**, sinon les liens magiques renverront vers localhost.

### Page blanche ?

Trois causes, dans l'ordre de probabilité :

1. **Un `index.html` ouvert directement depuis le disque.** Ça ne marchera
   jamais : c'est un point d'entrée Vite, les chemins d'assets sont absolus.
   Il faut passer par `npm run dev` ou par le site déployé.
2. **Un service worker périmé** issu d'une ancienne version. Le SW est désormais
   désactivé en dev, mais s'il en reste un installé, à coller dans la console :
   ```js
   navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))
   caches.keys().then(ks => ks.forEach(k => caches.delete(k)))
   ```
   puis recharger.
3. **Une exception au rendu.** Elle n'efface plus la page : l'`ErrorBoundary`
   affiche le message et un bouton Recharger.
