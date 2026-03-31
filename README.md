# ✦ Gallery

![Build](https://img.shields.io/badge/build-passing-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-orange) ![AWS](https://img.shields.io/badge/cloud-AWS-FF9900?logo=amazonaws)

> Galerie photo privée serverless — upload direct vers S3, pipeline de miniatures automatisé, authentification JWT via Cognito.

URL : https://d19v2fo4sjqv87.cloudfront.net/

---

## Table des matières

- [Aperçu](#aperçu)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Flux de données](#flux-de-données)
- [Démarrage](#démarrage)
- [Fonctionnalités](#fonctionnalités)
- [Licence](#licence)

---

## Aperçu

**Gallery** est une application web serverless permettant à des utilisateurs authentifiés d'uploader, stocker et visualiser leurs photos en privé. Chaque utilisateur accède uniquement à sa propre galerie, protégée par un token JWT émis par AWS Cognito.

Le point clé de l'architecture : le client uploade directement vers S3 via une pre-signed URL — les fichiers ne transitent jamais par le backend, ce qui maintient le coût Lambda proche de zéro et élimine tout goulot d'étranglement. Un pipeline automatisé génère ensuite des miniatures via une fonction Lambda déclenchée par l'événement S3.

Cible : développeurs souhaitant déployer une galerie photo privée à coût quasi nul sur AWS.

---

## Architecture

<img width="8192" height="2690" alt="Architecture" src="https://github.com/user-attachments/assets/79fbd2c3-748b-46ea-a2dd-7dbb6e04a8a7" />

---

## Stack technique

| Couche | Technologie | Rôle |
|---|---|---|
| Frontend | React 18 + Vite | Interface utilisateur SPA |
| Auth UI | AWS Amplify UI React | Composant `<Authenticator>` |
| Auth backend | AWS Cognito | User Pool, JWT, vérification email |
| CDN | AWS CloudFront (x2) | Servir le frontend et les thumbnails |
| Stockage | AWS S3 (x2) | Photos originales + miniatures |
| API | AWS API Gateway HTTP | Routes REST protégées par JWT |
| Compute | AWS Lambda (x3) | Upload URL, thumbnail, récupération photos |
| Traitement image | sharp (Node.js) | Redimensionnement à 200px |
| Base de données | AWS DynamoDB | Métadonnées photos par utilisateur |
| Déploiement frontend | AWS CLI — `aws s3 sync` | Sync du `dist/` Vite vers S3 |

---

## Structure du projet

<img width="4118" height="3346" alt="Structure du projet" src="https://github.com/user-attachments/assets/0628f355-ab43-4a4c-94bb-9cb7387bd5d7" />


```
gallery-frontend/
├── src/
│   ├── App.jsx          # Composant principal, Gallery, Lightbox
│   └── App.css          # Styles (drop zone, masonry, lightbox)
├── dist/                # Build Vite — déployé sur S3
└── vite.config.js

lambdas/
├── generateUploadUrl/   # Génère une pre-signed PUT URL S3
├── processThumbnail/    # Trigger S3 → sharp → DynamoDB
└── getUserPhotos/       # Query DynamoDB par UserId
```

---

## Flux de données
<img width="8192" height="3868" alt="Mermaid Chart - Create complex, visual diagrams with text -2026-03-31-113127" src="https://github.com/user-attachments/assets/1400af70-dbe7-403a-813d-b5b7cfc44b50" />


---

## Démarrage

### Prérequis

- Node.js >= 18
- AWS CLI configuré (`aws configure`)
- Un compte AWS avec les droits : S3, Lambda, DynamoDB, Cognito, CloudFront, API Gateway

### Installation

1. **Cloner le dépôt**
```bash
git clone 
cd gallery/gallery-frontend
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables**

Édite `src/App.jsx` et mets à jour les constantes :

```js
const API_BASE      = "https://<api-id>.execute-api.<region>.amazonaws.com";
const CLOUDFRONT_URL = "https://<distribution-id>.cloudfront.net";
```

Et la config Amplify :
```js
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId:       '<region>_<poolId>',
      userPoolClientId: '<clientId>'
    }
  }
});
```

### Variables d'environnement Lambda

| Variable | Description | Exemple |
|---|---|---|
| `BUCKET_NAME` | Bucket S3 des photos originales | `gallery-raw-photos-xxxx` |
| `THUMB_BUCKET` | Bucket S3 des miniatures | `gallery-thumbnails-xxxx` |
| `TABLE_NAME` | Table DynamoDB | `GalleryMetadata` |
| `REGION` | Région AWS | `eu-north-1` |

### Build & déploiement frontend

```bash
# Build
npm run build

# Sync vers S3
aws s3 sync dist/ s3://<gallery-frontend-bucket> --delete --region eu-north-1

# Invalider le cache CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### Lancement local

```bash
npm run dev
```

L'app tourne sur `http://localhost:5173`.

---

## Fonctionnalités

### Upload direct vers S3 (pre-signed URL)
Le frontend demande une URL pré-signée à l'API, puis uploade directement le fichier vers S3 sans passer par Lambda. Cela élimine tout coût de transfert côté compute et supprime le goulot d'étranglement réseau.

### Pipeline de miniatures automatisé
Chaque upload déclenche automatiquement une Lambda via S3 Event. La fonction utilise `sharp` pour redimensionner l'image à 200px, stocke la miniature dans un bucket dédié, et enregistre les métadonnées en DynamoDB.

### Galerie privée par utilisateur
Chaque utilisateur ne voit que ses propres photos. L'identifiant Cognito (`sub`) est injecté dans les métadonnées S3 lors de l'upload et propagé jusqu'à DynamoDB — aucune donnée cross-user n'est possible.

### Authentification JWT
Toutes les routes API sont protégées par un JWT Authorizer sur API Gateway. Le composant `<Authenticator loginMechanisms={['email']}>` d'Amplify gère l'UI de login, signup et vérification email.

---

## Licence

Ce projet est sous licence [MIT](LICENSE).
