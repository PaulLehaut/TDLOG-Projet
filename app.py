from flask import Flask, jsonify, session, request
from flask_cors import CORS
import sqlite3
import os # On l'ajoute pour gérer les chemins

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

app.secret_key = 'Paul-est-un-malade-mental'
CORS(app, origins=['http://127.0.0.1:5500'], supports_credentials=True)

# Chargement des questions
dossier_db = os.path.dirname(os.path.abspath(__file__))
chemin_db = os.path.join(dossier_db, 'data_base', 'quiz.db')

# On demande une connexion à la database
def obtenir_connexion_db():
    conn = sqlite3.connect(chemin_db)
    conn.row_factory = sqlite3.Row # Ligne essentielle qui transforme la database en dictionnaire !
    return conn


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

    liste_questions = conn.execute("SELECT id, catégorie, énoncé, points, réponse_correcte FROM Question WHERE quiz_id = ?", (quiz_id,)).fetchall() # On récupère les questions de ce quiz
    session['questions'] = [dict(question) for question in liste_questions]

    conn.close()
    return jsonify({
        "nom": nom_quiz,
        "description": quiz_desc
    })


# Second EndPoint, pour afficher les questions -----------------------------------------
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
        "points": question_live['points']
    }

    match question_live['catégorie']:
        case 'qcm':
            conn = obtenir_connexion_db()
            liste_propositon = conn.execute("SELECT proposition FROM Proposition WHERE question_id = ?",(question_live["id"],)).fetchall()
            question['catégorie'] = 'qcm'
            question['propositions'] = [p['proposition'] for p in liste_propositon]
            conn.close()
        case 'simple':
            question['catégorie'] = 'simple'

    return jsonify(question) # Renvoie de la question en convertissant le dictionnaire au format json


# Second 'EndPoint' pour récupérer la réponse du joueur --------------------------------------
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

    match question['catégorie']:
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


# 'EndPoint' final qui permet de réinitialiser l'état du quiz ---------------------------
@app.route('/api/reset', methods = ['GET'])
def reset_quiz():
    session.pop('quiz_index', None) # On supprime les clés qui pourraient rester d'une session précédente
    session.pop('quiz_score', None)
    session.pop('questions', None)
    session.pop('quiz_id', None)

    print("Quiz réinitialisée.")
    return jsonify({"message": "Quiz réinitialisé. Vous pouvez jouer !"})

if __name__ == '__main__':
    app.run(debug = True, port = 5000)
