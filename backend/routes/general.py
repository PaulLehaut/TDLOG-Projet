from flask import Blueprint, request, jsonify, session
from database import obtenir_connexion_db
from thefuzz import fuzz 
import sqlite3

general_bp = Blueprint('general', __name__)

# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                            Session de jeu (Solo)
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
# Premier EndPoint, on commence par choisisr un quiz
@general_bp.route('/api/selection_quiz', methods = ['GET'])
def sélection_quiz():
    conn = obtenir_connexion_db()
    liste_quiz = conn.execute("SELECT id, nom, description FROM Quiz").fetchall()
    conn.close() # On oublie pas de fermer la connexion
    liste_quiz_dict = [dict(quiz) for quiz in liste_quiz] # Conversion en liste de dictionnaire formelle pour passer au format json
    return jsonify(liste_quiz_dict)


# Second EndPoint, on démarre le quiz choisi
@general_bp.route('/api/quiz/start/<int:quiz_id>', methods = ['GET'])
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
@general_bp.route('/api/quiz/question', methods = ['GET'])
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
            "etat": "termine",
            "message": "Quiz terminé !",
            "score": session['quiz_score'],
            "total": sum(q["points"] for q in session['questions'])
        })
    
    question_live = session['questions'][index_live]

    question = {
        "index": index_live,
        "enonce": question_live['énoncé'],
        "points": question_live['points'],
        "id": question_live['id'],
    }

    match question_live['type_question']:
        case 'qcm':
            conn = obtenir_connexion_db()
            liste_propositon = conn.execute("SELECT proposition FROM Proposition WHERE question_id = ?",(question_live["id"],)).fetchall()
            question['type_question'] = 'qcm'
            question['propositions'] = [p['proposition'] for p in liste_propositon]
            question['reponse_correcte'] = liste_propositon[int(question_live['réponse_correcte'])-1]['proposition']
            conn.close()

        case 'simple':
            question['type_question'] = 'simple'
            question['reponse_correcte'] = question_live['réponse_correcte']

    return jsonify(question) # Renvoie de la question en convertissant le dictionnaire au format json


# Quatrième 'EndPoint' pour récupérer la réponse du joueur 
@general_bp.route('/api/reponse', methods = ['POST']) # Mauvaise utilisation de POST (réservé aux modifications), voir pour passer à GET
def post_answer():
    if 'quiz_index' not in session or 'questions' not in session: # L'utilisateur veut envoyer une réponse sans avoir commencé le quiz
        return jsonify({"erreur": "Quiz non démarré"}), 400

    data = request.get_json()
    if not data or 'reponse_utilisateur' not in data :
        return jsonify({"erreur": "Pas de réponse"}), 400
    
    réponse_utilisateur = data['reponse_utilisateur']
    index_live = session['quiz_index']
    question = session['questions'][index_live]

    bonne_réponse = question['réponse_correcte'] 
    réponse_correcte = False

    match question['type_question']:
        case 'qcm':
            réponse_correcte = int(bonne_réponse) == int(réponse_utilisateur)

        case 'simple':

            score = fuzz.token_sort_ratio(réponse_utilisateur, bonne_réponse)
            print(f"Comparaison : '{réponse_utilisateur}' et '{bonne_réponse}' => Score: {score}/100")
            réponse_correcte = score >= 80 # On valide si la ressemblance est supérieure à 80%

    if réponse_correcte:
        session['quiz_score'] += question['points']

    session['quiz_index'] += 1

    return jsonify({
        "resultat_correct": réponse_correcte,
        "score": session['quiz_score'],
        "reponse_correcte": bonne_réponse # On renvoie la bonne réponse au cas où
    })


# 'EndPoint' final qui permet de réinitialiser l'état du quiz 
@general_bp.route('/api/reset', methods = ['GET'])
def reset_quiz():
    session.pop('quiz_index', None) # On supprime les clés qui pourraient rester d'une session précédente
    session.pop('quiz_score', None)
    session.pop('questions', None)
    session.pop('quiz_id', None)

    print("Quiz réinitialisée.")
    return jsonify({"message": "Quiz réinitialisé. Vous pouvez jouer !"})

# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                               Signalements
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
# Signalement d'une question par un joueur 
@general_bp.route('/api/signalement', methods = ['POST'])
def signaler_question():
    data = request.get_json()
    if not data or 'question_id' not in data:
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