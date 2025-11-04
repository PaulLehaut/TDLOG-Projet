from flask import Flask, jsonify, session, request
from flask_cors import CORS
from classe_quiz import Quiz  
from classe_question import QuestionQCM 

app = Flask(__name__)
app.config['JSON_AS_ASCII'] = False

app.secret_key = 'Paul-est-un-malade-mental'
CORS(app, origins=['http://127.0.0.1:5500'], supports_credentials=True)

# Chargement des questions
quiz_test = Quiz('questions.json')
if not quiz_test.question_chargées:
    print("Les questions n'ont pas pues être chargées.")

# 'EndPoint' initial qui permet de réinitialiser l'état du quiz ---------------------------
@app.route('/api/reset', methods = ['GET'])
def reset_quiz():
    session.pop('quiz_index', None) # On supprime les clés qui pourraient rester d'une session précédente
    session.pop('quiz_score', None)

    print("Quiz réinitialisée.")
    return jsonify({"message": "Quiz réinitialisé. Vous pouvez jouer !"})


# Premier 'EndPoint', pour afficher les questions -----------------------------------------
@app.route('/api/premier_test', methods = ['GET'])
def get_question_suivante():
    if 'quiz_index' not in session: # Il s'agit alors d'un nouveau joueur
        session['quiz_index'] = 0 # Il commence à la première question
        session['quiz_score'] = 0 # Son score est de 0
        print(f"Nouveau joueur {request.remote_addr}")

    index_live = session['quiz_index']

    if index_live >= len(quiz_test.questions): # Quiz terminé
        print(f'Quiz terminé pour {request.remote_addr}')
        return jsonify({
            "état": "terminé",
            "message": "Quiz terminé !",
            "score": session['quiz_score'],
            "total": sum(q.points for q in quiz_test.questions)
        })
    
    question_data = quiz_test.questions[index_live]
    question = {
        "index": index_live,
        "énoncé": question_data.énoncé,
        "points": question_data.points
    }

    if isinstance(question_data, QuestionQCM):
        question["catégorie"] = "qcm"
        question["propositions"] = question_data.propositions
    else:
        question["catégorie"] = "simple"

    return jsonify(question) # Renvoie de la question en convertissant le dictionnaire au format json

# Second 'EndPoint' pour récupérer la réponse du joueur --------------------------------------
@app.route('/api/reponse', methods = ['POST']) # Mauvaise utilisation de POST (réservé aux modifications), voir pour passer à GET
def post_answer():
    if 'quiz_index' not in session: # L'utilisateur veut envoyer une réponse sans avoir commencé le quiz
        return jsonify({"erreur": "Quiz non démarré"}), 400

    data = request.get_json()
    if not data or 'réponse_utilisateur' not in data :
        return jsonify({"erreur": "Pas de réponse"}), 400
    
    réponse_utilisateur = data['réponse_utilisateur']
    index_live = session['quiz_index']
    question = quiz_test.questions[index_live]

    bonne_réponse = question.vérifier_réponse(réponse_utilisateur)
    if bonne_réponse:
        session['quiz_score'] += question.points
    
    session['quiz_index'] += 1

    return jsonify({
        "résultat_correct": bonne_réponse,
        "score": session['quiz_score'],
        "réponse_question": question.réponse # On renvoie la bonne réponse au cas où
    })

if __name__ == '__main__':
    app.run(debug = True, port = 5000)
