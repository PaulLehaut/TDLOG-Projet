from flask import Flask, jsonify, session, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sqlite3
import os # On l'ajoute pour gérer les chemins

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

app.secret_key = 'Paul-est-un-malade-mental'
CORS(app, origins=['http://127.0.0.1:5500'], supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins = "*", async_mode = 'threading')

# Chargement des questions et des scripts pour la database
dossier_db = os.path.dirname(os.path.abspath(__file__))
chemin_db = os.path.join(dossier_db, 'data_base', 'quiz.db')
try:
    from data_base.générer_json_ia import appeler_ia
    from data_base.remplir_db import remplir_db
except ImportError as e:
    print(f"Erreur d'importation d'importation des fichiers: {e}.")

# On indique où sont les fichiers statiques 
dossier_projet = os.path.dirname(os.path.abspath(__file__))

# On demande une connexion à la database
def obtenir_connexion_db():
    conn = sqlite3.connect(chemin_db)
    conn.row_factory = sqlite3.Row # Ligne essentielle qui transforme la database en dictionnaire !
    return conn

# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                            Session de jeu 
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
# Premier EndPoint, on commence par choisisr un quiz
@app.route('/api/selection_quiz', methods = ['GET'])
def sélection_quiz():
    conn = obtenir_connexion_db()
    liste_quiz = conn.execute("SELECT id, nom, description FROM Quiz").fetchall()
    conn.close() # On oublie pas de fermer la connexion
    liste_quiz_dict = [dict(quiz) for quiz in liste_quiz] # Conversion en liste de dictionnaire formelle pour passer au format json
    return jsonify(liste_quiz_dict)


# Second EndPoint, on démarre le quiz choisi
@app.route('/api/quiz/start/<int:quiz_id>', methods = ['GET'])
def start_quiz(quiz_id):
    # On prépare la session pour ce quiz
    session.pop('quiz_index', None)
    session.pop('quiz_score', None)
    session.pop('questions', None)

    nb_questions = request.args.get('limite', default = 10, type = int)
    session['quiz_id'] = quiz_id
    session['quiz_index'] = 0
    session['quiz_score'] = 0
    print(f"Lancement du quiz {quiz_id} !")

    conn = obtenir_connexion_db()
    quiz_data = conn.execute("SELECT nom, description FROM Quiz WHERE id = ?", (quiz_id,)).fetchone()
    if quiz_data is None:
        conn.close()
        return jsonify({"erreur": "Quiz non trouvé."}), 404
    
    quiz = dict(quiz_data)
    nom_quiz = quiz["nom"]
    quiz_desc = quiz["description"]

    liste_questions = conn.execute("SELECT * FROM Question WHERE quiz_id = ? ORDER BY RANDOM() LIMIT ?", (quiz_id, nb_questions)).fetchall() # On récupère les questions de ce quiz
    session['questions'] = [dict(question) for question in liste_questions]

    conn.close()
    return jsonify({
        "nom": nom_quiz,
        "description": quiz_desc,
        "nombre_questions": nb_questions
    })


# Troisième EndPoint, pour afficher les questions 
@app.route('/api/quiz/question', methods = ['GET'])
def get_question_suivante():
    if 'quiz_id' not in session or 'questions' not in session:
        return jsonify({'Echec': 'Commencer par choisir un quiz.'}), 400

    if 'quiz_index' not in session: # Il s'agit alors d'un nouveau joueur
        session['quiz_index'] = 0 # Il commence à la première question
        session['quiz_score'] = 0 # Son score est de 0
        print(f"Nouveau joueur {request.remote_addr}")

    index_live = session['quiz_index']

    if index_live >= len(session['questions']): # Quiz terminé
        print(f'Quiz terminé pour {request.remote_addr}')
        return jsonify({
            "état": "terminé",
            "message": "Quiz terminé !",
            "score": session['quiz_score'],
            "total": sum(q["points"] for q in session['questions'])
        })
    
    question_live = session['questions'][index_live]

    question = {
        "index": index_live,
        "énoncé": question_live['énoncé'],
        "points": question_live['points'],
    }

    match question_live['type_question']:
        case 'qcm':
            conn = obtenir_connexion_db()
            liste_propositon = conn.execute("SELECT proposition FROM Proposition WHERE question_id = ?",(question_live["id"],)).fetchall()
            question['type_question'] = 'qcm'
            question['propositions'] = [p['proposition'] for p in liste_propositon]
            question['réponse_correcte'] = liste_propositon[int(question_live['réponse_correcte'])-1]['proposition']
            conn.close()

        case 'simple':
            question['type_question'] = 'simple'
            question['réponse_correcte'] = question_live['réponse_correcte']

    return jsonify(question) # Renvoie de la question en convertissant le dictionnaire au format json


# Quatrième 'EndPoint' pour récupérer la réponse du joueur 
@app.route('/api/reponse', methods = ['POST']) # Mauvaise utilisation de POST (réservé aux modifications), voir pour passer à GET
def post_answer():
    if 'quiz_index' not in session or 'questions' not in session: # L'utilisateur veut envoyer une réponse sans avoir commencé le quiz
        return jsonify({"erreur": "Quiz non démarré"}), 400

    data = request.get_json()
    if not data or 'réponse_utilisateur' not in data :
        return jsonify({"erreur": "Pas de réponse"}), 400
    
    réponse_utilisateur = data['réponse_utilisateur']
    index_live = session['quiz_index']
    question = session['questions'][index_live]

    bonne_réponse = question['réponse_correcte'] 
    réponse_correcte = False

    match question['type_question']:
        case 'qcm':
            réponse_correcte = int(bonne_réponse) == int(réponse_utilisateur)
        case 'simple':
            réponse_correcte = réponse_utilisateur.strip().lower() == bonne_réponse.strip().lower()

    if réponse_correcte:
        session['quiz_score'] += question['points']

    session['quiz_index'] += 1

    return jsonify({
        "résultat_correct": réponse_correcte,
        "score": session['quiz_score'],
        "réponse_question": bonne_réponse # On renvoie la bonne réponse au cas où
    })


# 'EndPoint' final qui permet de réinitialiser l'état du quiz 
@app.route('/api/reset', methods = ['GET'])
def reset_quiz():
    session.pop('quiz_index', None) # On supprime les clés qui pourraient rester d'une session précédente
    session.pop('quiz_score', None)
    session.pop('questions', None)
    session.pop('quiz_id', None)

    print("Quiz réinitialisée.")
    return jsonify({"message": "Quiz réinitialisé. Vous pouvez jouer !"})


# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                                Interaction des utilisateurs 
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
# Signalement d'une question par un joueur 
@app.route('/api/signalement', methods = ['POST'])
def signaler_question():
    data = request.get_json()
    if not data or 'question_id' in data:
        return jsonify({'erreur': 'Données manquantes'}), 400
    
    try: 
        conn = obtenir_connexion_db()

        conn.execute("INSERT INTO Signalement (question_id, message) VALUES (?, ?)",
                     (data["question_id"], data.get('raison', 'Pas de raison')))
        conn.commit()
        conn.close()

        return jsonify({"message": "Signalement enregistré, la partie va reprendre."}), 201
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"erreur": str(e)}), 500


# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                                EndPoint d'administration 
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
# Création de Quiz depuis l'API
@app.route('/api/admin/quiz', methods = ['POST'])
def creer_quiz_admin():
    data = request.get_json()
    if not data or 'nom' not in data:
        return jsonify({"erreur": "Le nom du quiz est manquant."}), 400
    
    nom_quiz = data.get('nom')
    
    try :
        conn = obtenir_connexion_db()
        cursor = conn.cursor()

        cursor.execute("INSERT OR IGNORE INTO Quiz (nom, description) VALUES (?, ?)",
                       (nom_quiz, data.get('description', '')))
        
        if cursor.rowcount == 0:
            # Si True l'INSERT a été ignoré (doublon)
            conn.close()
            return jsonify({"erreur": f"Un quiz avec le nom '{nom_quiz}' existe déjà."}), 409 # 409 = Conflit
        
        nouveau_quiz_id = cursor.lastrowid

        conn.commit() # On valide la création du nouveau quiz
        conn.close()

        print(f"Nouveau quiz {nom_quiz} créé, son id: {nouveau_quiz_id}.")
        return jsonify({
            "id": nouveau_quiz_id,
            "nom": nom_quiz
        }), 201 # Signifie créé avec succès
    
    except Exception as e:
        conn.close()
        return jsonify({"erreur": f"Erreur dans la base de données: {e}"}), 500

# Création de questions depuis l'API
@app.route('/api/admin/questions', methods = ['POST'])
def creer_question_admin():
    data = request.get_json()
    if not data or 'quiz_id' not in data or 'type_question' not in data or 'sujet_question' not in data or 'énoncé' not in data or 'réponse_correcte' not in data:
        return jsonify({"erreur": "La question est incomplète."}), 400
    
    quiz_id = data.get('quiz_id')
    type_question = data.get('type_question')
    sujet_question = data.get('sujet_question')
    énoncé = data.get('énoncé')
    réponse = data.get('réponse_correcte')
    points = data.get('points', 5) # Par défaut une question vaut 5 points 

    if type_question ==  'qcm':
        if 'propositions' not in data:
            return jsonify({"erreur": "Il faut fournir les propositions pour un qcm."}), 400

        liste_propositions = data.get('propositions')

    try :
        conn = obtenir_connexion_db()
        cursor = conn.cursor()

        cursor.execute("INSERT OR IGNORE INTO Question (quiz_id, type_question, sujet_question, énoncé, points, réponse_correcte) VALUES (?, ?, ?, ?, ?, ?)",
                       (quiz_id, type_question, sujet_question, énoncé, points, réponse))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"erreur": f"Une question avec l'énoncé '{énoncé}' existe déjà."}), 409 
        
        nouvelle_question_id = cursor.lastrowid

        if type_question ==  'qcm':
            propositions = []
            for i in range(len(liste_propositions)):
                propositions.append((nouvelle_question_id, i+1, liste_propositions[i]))
            cursor.executemany("INSERT INTO Proposition (question_id, index_choix, proposition) VALUES (?, ?, ?)",
                                propositions)

        conn.commit() # On valide la création du nouveau quiz
        conn.close()

        print(f"Nouvelle question {type_question} créée, son id: {nouvelle_question_id}.")
        return jsonify({
            "id": nouvelle_question_id
        }), 201 # Signifie créé avec succès
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"erreur": f"Erreur dans la base de données: {e}"}), 500
    
# Création d'un quiz avec l'IA depuis l'API
@socketio.on('demande_generation_ia')
def creer_quiz_ia(data):
    print(f'Demande de création du quiz {data['nom']} par IA.')
    socketio.start_background_task(creation_ia, data)

# Affichage des questions signalées 
@app.route('/api/admin/signalement', methods = ['GET'])
def afficher_signelements():
    try: 
        conn = obtenir_connexion_db()
        data = conn.execute(""" 
        SELECT s.id, s.message, q.id as question_id, q.énoncé, q.type_question
        CASE WHEN q.type_question = 'qcm' THEN p.proposition ELSE q.réponse_correcte END as réponse
        FROM Signalement s JOIN Question q ON s.question_id = q.id
        LEFT JOIN Proposition p ON q.id = p.question_id AND q.réponse_correcte = p.index_choix
        """).fetchall()  
        signalements = [dict(s) for s in data]
        conn.close()
        return jsonify(signalements)
    
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"erreur": f"Erreur dans l'affichage des signalements: {e}."})

# Supprimer une question signalée
@app.route('/api/admin/question/<int:signalement_id>', methods = ['DELETE'])
def supprimer_question(question_id):
    try: 
        conn = obtenir_connexion_db()
        conn.execute("DELETE FROM Signalement WHERE question_id = ?", (question_id,))
        conn.execute("DELETE FROM Proposition WHERE question_id = ?", (question_id,))
        conn.execute("DELETE FROM Question WHERE id = ?", (question_id,))
        conn.commit()
        conn.close()
        return jsonify({"message" : "Question supprimée avec succès."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"erreur": f'Erreur dans la suppression de la question {e}.'}), 500

# Supprimer simplement un signalement 
@app.route('/api/admin/signalement/<int:signalement_id>', methods = ['DELETE'])
def supprimer_signalement(question_id):
    try: 
        conn = obtenir_connexion_db()
        conn.execute("DELETE FROM Signalement WHERE question_id = ?", (question_id,))
        conn.commit()
        conn.close()
        return jsonify({"message" : "Signalement supprimé avec succès."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"erreur": f'Erreur dans la suppression du signalement {e}.'}), 500
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                               Chemin généraux
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

# Page utilisateur 
@app.route('/')
def route_utilisateur():
    return send_from_directory(dossier_projet, 'index.html')

# Page administrateur
@app.route('/admin')
def route_admin():
    return send_from_directory(dossier_projet, 'admin.html')

# Pour n'importe quel autre fichier
@app.route('/<path:nom_fichier>')
def route_fichiers(nom_fichier):
    return send_from_directory(dossier_projet, nom_fichier)


# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                         Fonction d'arrière plan
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

# Création du quiz par l'IA
def creation_ia(data):
    try :
        print('Démarragge de la génération.')

        quiz_nom = data.get('nom')
        quiz_desc = data.get('desc', "")
        nb_questions_simples = data.get('nb_questions_simples', 2)
        nb_questions_qcm = data.get('nb_questions_qcm', 3)
        
        data = appeler_ia(quiz_nom, quiz_desc, nb_questions_simples, nb_questions_qcm)

        if not data:
            raise Exception("L'IA n'a rien envoyé.")
        
        quiz_id = remplir_db(data, chemin_db)
        
        print(f"Nouveau Quiz suggéré avec succès.")
        socketio.emit('ia_terminee', {'message': f"Quiz {quiz_nom} généré avec succès !"})
    
    except Exception as e:
        print(f'Erreur: {e}')
        socketio.emit('ia_erreur', {'message': str(e)})


# Fin du code, lancement du site -----------------------------------------------------------------------------------

# Test pour vérifier que le temps réel fonctionne
@socketio.on('connect')
def gérer_connexion():
    print(f'Nouvelle connexion WebSocket: {request.sid}')
    emit('message_serveur', {'data': 'Bienvenue sur le serveur !'})

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
