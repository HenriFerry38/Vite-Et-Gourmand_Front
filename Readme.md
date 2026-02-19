# 🏷️ Vite & Gourmand – Frontend 

## 📌 Présentation

Vite & Gourmand est une application web Full-Stack développée dans le cadre de l' Evaluation en cours de formation.  
Elle simule une plateforme moderne de commande de menus gastronomiques avec gestion complète des utilisateurs, des commandes et des avis clients.

L’application permet aux clients de découvrir des menus thématiques, passer commande en ligne, suivre l’évolution de leur prestation et laisser un avis après livraison.  
Elle intègre également un espace employé permettant la gestion des menus, des commandes et la validation des avis.
Elle possède aussi un espace administrateur permettant la création de comptes employés et l'analyse des statistiques administrative

Bien que le contexte soit fictif, le projet reproduit des problématiques réelles d’un service de restauration événementielle : gestion de stock, workflow de commande, authentification sécurisée, gestion des rôles et statistiques administratives.

---

## 🌍 Objectifs du projet

- Concevoir une architecture Full-Stack (Frontend SPA + Backend API REST)
- Mettre en place une authentification sécurisée par token
- Implémenter une gestion complète des commandes avec contrôle de stock
- Développer un système d’avis client modéré par les employés
- Séparer données transactionnelles (MySQL) et analytiques (MongoDB)
- Implémenter des notifications email automatiques
- Concevoir une interface responsive adaptée aux appareils mobiles
- Appliquer des bonnes pratiques d’architecture et de séparation des responsabilités

Cette API est une application Frontend développée en :

- HTML  
- JavaScript Vanilla (Router SPA custom)  
- Sass  
- Bootstrap  

Elle consomme une API Symfony développée séparément (architecture full-stack découplée).

---

## 🏗️ Stack technique

- HTML5  
- JavaScript ES6 (Modules natifs)  
- Router SPA personnalisé  
- Bootstrap (installé via npm)  
- Bootstrap Icons  
- Sass  

---

## Préparation préalable 

Créez un dossier ViteEtGourmand en local

ou 

si la partie Back a été installée au préalable, dans le Dossier ViteEtGourmand 


## 🚀 Installation en local

### 1️⃣ Cloner le repository

Depuis VsCode ou un terminal positionez vous dans le dossier ViteEtGourmand et ensuite :

```bash
git clone 'https://github.com/HenriFerry38/Vite-Et-Gourmand_Front'
```

Et après la fin du téléchargement.

```bash
cd Vite-Et-Gourmand_Front
```
---

### 2️⃣ Installer les dépendances

```bash
npm install bootstrap
npm install bootstrap-icons
```

Les dépendances sont installées dans le dossier `node_modules`.

---

### 3️⃣ Compiler le Sass

La compilation Sass est réalisée via l’extension VSCode :

LiveSass Compiler

Elle génère automatiquement le fichier CSS à partir du fichier `main.scss`.

N'oubliez pas de cliquer sur l'option Watch Sass en bas de VsCode.

---

### 4️⃣ Lancer le serveur local

Le projet peut être lancé avec :

- L’extension VSCode PHP Server  
ou  
- Live Server  
- Apache  
- Tout autre serveur local

- ou par terminal:
```bash
cd Vite-Et-Gourmand_Front
php -S localhost:3000
```

---

## 🔌 Configuration API

Dans le fichier JavaScript global :

```js
const apiUrl = "http://127.0.0.1:8000/api/";
```

⚠️ L’API backend Symfony doit être démarrée avant le lancement du frontend.

---

## 🧠 Fonctionnalités

- Authentification utilisateur  
- Gestion des commandes  
- Historique des commandes  
- Dépôt d’avis  
- Dashboard employé  
- Validation des avis  
- Gestion des menus  

---

## 🏛️ Architecture

Ce projet fait partie d’une architecture Full-Stack.

Le frontend et le backend sont maintenus dans des dépôts séparés.

- Backend : API Symfony  
- Frontend : Html et JavaScript  

Cette séparation permet une meilleure maintenabilité et une architecture professionnelle.
