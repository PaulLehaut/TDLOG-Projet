# TDLOG-Projet
Ce projet consiste en une plateforme de quiz interactive développée en React et Flask. Elle propose une expérience allant du jeu en solo aux parties privées multijoueurs en temps réel (via WebSockets). Au-delà des quiz classiques, l'application se propose un moteur de génération automatique basé sur l'IA, permettant de créer des questionnaires uniques et personnalisés en quelques secondes sur n'importe quel sujet.

Vue d'ensemble:
'''text
Client (React + Vite)
    │
    ├── Navigation & Admin (HTTP/REST) ──┐
    │                                    ▼
    │                            API Flask (Blueprints)
    │                                    │
    │        ┌───────────────────────────┴──────────────────────────┐
    │        │                                                      │
    ▼        ▼                                                      ▼
Socket.IO (Events) ◄───► Moteur de Jeu (Python/Memory) ──► Base de Données (SQLite)
                             │
                             ▼
                    Service IA (Google Gemini)
'''
## FICHIER CENTRAL ## backend/events/socket_events.py

C'est le coeur du moteur de jeu. Ce fichier gère l'état des salons (Rooms), la synchronisation des questions et la validation des réponses en temps réel pour éviter la triche.
L'état global des parties est stocké en mémoire dans un dictionnaire ROOMS (importé depuis state.py)
La structure d'une room est la suivante : 
{
    'host': 'socket_id_hote',
    'etat': 'LOBBY' | 'INTRO' | 'JEU' | 'FINI',
    'quiz_id': 12,
    'questions': [ ],      # Liste des questions chargées depuis la DB
    'current_index': 0,      # Index de la question en cours
    'timer': 15,             # Temps par question
    'joueurs': {
        'socket_id': { 'pseudo': '...', 'score': 0, 'statut': 'online' }
    }
}

Les événements WebSockets Clés sont réalisés de la façon suivante :

Event Name	              Direction	          Payload	                                              Description
creer_room	        Client → Server	        { pseudo }	                              Initialise une nouvelle entrée dans ROOMS avec un code unique.
rejoindre_room	    Client → Server	        { code, pseudo }	                        Ajoute un joueur au dictionnaire joueurs de la room cible.
lancer_quiz	        Client → Server	        { roomCode, timer }          	            Déclenche la background_task : cycle_jeu().
envoyer_reponse	    Client → Server	        { reponse_utilisateur }	                  Valide la réponse (comparaison stricte pour QCM, fuzzing pour texte) et incrémente le score.
reconnecter_joueur	Client → Server	        { roomCode, pseudo }	                    Gère la résilience : restaure le socket ID d'un joueur déconnecté sans perdre son score.




Le cycle de jeu est géré par la focntion cycle_jeu qui est asynchrone et qui orchestre le déroulement de la partie : 

1. Passer l'état de la room à JEU
2. Boucler sur les questions du quiz
3. Emettre 'nouvelle_question' -> Attend 'timer' secondes
4. Emettre 'afficher_reponse' -> Attend 5 secondes
5. Calculer le classement et émettre 'quiz_termine'


## data_base/générer_json_ia.py ##

Ce fichier fait le lien avec l'API Google Gemini 2.5 Flash pour créer du contenu structuré 

* Prompt : utilise un prompt système strict demandant uniquement un json suivant un schéma précis (question simples ou QCM)
* Le script nettoie les balises Markdown ('''json ... ''') souvent ajoutées par les LLMs
* Vérifie que les index de réponses des QCMs (ex: réponse B) correspondent bien aux indices numériques attendus par le moteur de jeu





## data_base/creer_db.py & remplir_db.py ##

On utilise SQLite pour le légèreté et la rapidité 

Schéma rationnel :
* Quiz (id, nom, description)
* Question (id, question_id, énoncé, réponse_correcte, type, points)
* Proposition (id, question_id, proposition, index_choix) - Uniquement pour les QCM
* Signalement (id, question_id, message) - Pour la modération


** Logique d'insertion (pour remplir_db.py) **

Le script prend le JSON généré par l'IA et les met dans les tables. Il gère l'intégrité référentielle (créee le Quiz d'abord, récupère l'ID, puis créee les Questions liées).



## API REST (routes/general.py & routes/admin.py) ##

Permet de gérer les interactions hors-jeu via Flask Blueprints.

Endpoint	                Méthode	                                        Description
/api/selection_quiz	      GET	                          Liste tous les quiz disponibles (id, nom).
/api/quiz/start/<id>	    GET	                          Initialise une session de jeu solo (session Flask).
/api/admin/quiz	          POST                          Création manuelle d'un quiz.
/api/signalement	        POST	                        Permet aux joueurs de signaler une question erronée.


** Gestions d'erreurs **

Pour les déconnexions ( socket_events.py)
Le système distingue une acutalisation de page (f5) d'un départ définitif. 
1. Event 'disconnect' : Marque le joueur comme offline mais conserve ses données (score, pseudo).
2. Timer de nettoyage : Lance une tâche de fond 'verifier_depart_definitif' , il est supprimé de la mémoire.

Validations des Réponses:
* QCM : Comparaison stricte d'entiers (Index envoyé vs Index stocké)
* Réponses Libre (Simple) : Utilisation de 'fuzz.token_sort_ratio'. Si la similitude est > 80 %, la répone est accepté (tolère les fautes de frappe)

Quiz IA :
Si l'IA renvoie un index 0 (hors bornes pour l'humain 1-4) ou une chaîne de caractères au lieu d'un index pour un QCM, le script de parsing tente de corriger ou applique une valeur par défaut ("1") pour éviter le crash de l'application.


## 2 points intéressants : Le système de signamelent et la gestion des sessions (toujours en cours d'implémentation) ##

** Système de signalement **
Le jeu intègre une boucle de rétroaction permettant aux joueurs de signaler une erreur (contenu offensant, inexactitude factuelle, coquille) directement depuis l'interface de jeu. Ces signalements sont persistés en base de données pour être traités ultérieurement par un administrateur via des endpoints dédiés.

Le flux de données se fait ainsi:
Joueur (Client)
   │
   ▼
POST /api/signalement (Payload JSON)
   │
   ▼
Insertion Table 'Signalement' (SQLite)
   │
   ▼
Interface Admin (Review) ──┬──► DELETE /api/admin/signalement (Rejet du signalement)
                           └──► DELETE /api/admin/question (Validation + Suppression question)


Logique du signalement (routes/general.py & routes/admin.py) :
L'endpoint /api/signalement reçoit un objet JSON contenant l'ID de la question et une raison optionnelle. Il n'y a pas d'authentification forte requise pour signaler, permettant une remontée fluide côté utilisateur.

Champ	          Type	            Description
question_id	    int	              Clé étrangère vers la table Question.
raison	        str	              Message libre (défaut: "Pas de raison").

Les données sont insérées dans la table Signalement définie dans creer_db.py. La relation est One-to-Many (Une question peut avoir plusieurs signalements).

Deux actions de modération sont exposées via l'API :
* Suppression de la question (DELETE /api/admin/question/<id>) : Action drastique.
  Elle déclenche une suppression en cascade :
    1. Suppression des signalements liés.
    2. Suppression des propositions (si QCM) via DELETE FROM Proposition.
    3. Suppression de la question elle-même.
* Rejet du signalement (DELETE /api/admin/signalement/<id>) : Si le signalement est abusif ou incorrect, l'admin supprime uniquement l'entrée dans la table Signalement, laissant la question intacte.


** Gestion des sessions **
Contrairement aux requêtes HTTP classiques, les connexions WebSocket (Socket.IO) sont persistantes mais volatiles. Si un joueur actualise sa page (F5) ou subit une micro-coupure réseau :
1. La connexion socket est coupée immédiatement.
2. Le serveur détecte une déconnexion (disconnect).
3. Au rechargement de la page, le client obtient un nouveau socket_id.
4. Sans mécanisme dédié, le serveur considérerait ce joueur comme un nouvel inconnu, et sa progression (score, statut d'hôte) serait perdue.

Le système implémente une stratégie de "Soft Disconnect" couplée à une persistance locale côté client.

Côté client : 
Le frontend utilise le 'sessionStorage' du navigateur pour survivre au rafraîchissement de la page.
À la connexion : Dès qu'un joueur rejoint ou crée une salle, ses identifiants critiques sont sauvegardés :

sessionStorage.setItem('roomCode', roomCode);
sessionStorage.setItem('pseudo', pseudo);
sessionStorage.setItem('isHost', 'true'); // Si c'est l'hôte

Au montage du composant (useEffect) : Le script vérifie immédiatement la présence de ces clés. Si elles existent, il tente une reconnexion silencieuse au lieu d'afficher l'écran de login :

socket.emit('reconnecter_joueur', { roomCode, pseudo });

Côté serveur :
Le backend gère un état transitoire pour les joueurs déconnectés.
* Sur déconnexion (disconnect) : Le joueur n'est pas supprimé immédiatement. Il est marqué comme offline dans l'état ROOMS et une tâche de fond (verifier_depart_definitif) est lancée avec un délai de 10 secondes.
* Sur tentative de reconnexion (reconnecter_joueur) : Le serveur recherche le pseudo dans la salle indiquée:
    * Si trouvé : Il effectue une "greffe de socket". L'ancien socket_id (mort) est remplacé par le nouveau request.sid. Le statut repasse à online.
    * Conséquence : La tâche de fond, qui se réveille après 10s, constate que le joueur est de nouveau online et annule la suppression


Navigateur (Client)                          Serveur (Python)
      │                                          │
      │  Enregistre room/pseudo                  │
      │    dans sessionStorage                   │
      │                                          │
      │  ACTION: Rafraîchissement (F5)           │
      │  Socket coupé ────────────────────────►  │    Event: 'disconnect'
      │                                          │    ├─ Statut Joueur = 'offline'
      │                                          │    └─ Start Timer(10s)
      │                                          │
      │    Rechargement Page                     │
      │    └─ Lit sessionStorage                 │
      │                                          │
      ├─── Event: 'reconnecter_joueur' ─────────►│    Vérifie ROOMS[code][pseudo]
      │    { room: "AB12", pseudo: "Moi" }       │    ├─ Trouvé ? OUI
      │                                          │    ├─ Update socket_id = Nouveau
      │                                          │    └─ Statut Joueur = 'online'
      │                                          │
      │◄── Event: 'reconnexion_reussie' ─────────┤
      │    (Restaure interface Jeu)              │    Timer 10s expire
      │                                          │    └─ Joueur est 'online' ?
      │                                          │       ➔ ANNULATION SUPPRESSION


Synthèse : 

Composant	                          Langage/technologie	                                     Rôle / Fichiers Clés
Backend	                            Python / Flask	                          Serveur d'application principal (app.py).
Temps Réel	                        Flask-SocketIO	                          Gestion des WebSockets et events (socket_events.py).
Frontend	                          React 19 / Vite	                          Interface utilisateur SPA (package.json).
IA Model	                          Gemini 2.5 Flash	                        Moteur de génération de questions (générer_json_ia.py).
Base de Données	                    SQLite3	                                  Stockage relationnel local (database.py).
Validation	                        TheFuzz	                                  Algorithme de correspondance floue pour les réponses textuelles (socket_events.py).


NB: Il faut tutiliser ngrok pour lancer le site et la secret_key est SECRET_KEY=tdlog-secret-key 





