from flask import Blueprint, request, jsonify
from database import obtenir_connexion_db
from extensions import socketio

# Pour la génération par IA
from data_base.générer_json_ia import appeler_ia
from data_base.remplir_db import remplir_db
import os

admin_bp = Blueprint('admin', __name__)
chemin_db = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data_base', 'quiz.db')

# Création de Quiz depuis l'API
@admin_bp.route('/api/admin/quiz', methods = ['POST'])
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
@admin_bp.route('/api/admin/questions', methods = ['POST'])
def creer_question_admin():
    data = request.get_json()
    if not data or 'quiz_id' not in data or 'type_question' not in data or 'sujet_question' not in data or 'enonce' not in data or 'reponse_correcte' not in data:
        return jsonify({"erreur": "La question est incomplète."}), 400
    
    quiz_id = data.get('quiz_id')
    type_question = data.get('type_question')
    sujet_question = data.get('sujet_question')
    enonce = data.get('enonce')
    reponse = data.get('reponse_correcte')
    points = data.get('points', 5) # Par défaut une question vaut 5 points 

    if type_question ==  'qcm':
        if 'propositions' not in data:
            return jsonify({"erreur": "Il faut fournir les propositions pour un qcm."}), 400

        liste_propositions = data.get('propositions')

    try :
        conn = obtenir_connexion_db()
        cursor = conn.cursor()

        cursor.execute("INSERT OR IGNORE INTO Question (quiz_id, type_question, sujet_question, énoncé, points, réponse_correcte) VALUES (?, ?, ?, ?, ?, ?)",
                       (quiz_id, type_question, sujet_question, enonce, points, reponse))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({"erreur": f"Une question avec l'énoncé '{enonce}' existe déjà."}), 409 
        
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


# Affichage des questions signalées 
@admin_bp.route('/api/admin/signalements', methods = ['GET'])
def afficher_signelements():
    try: 
        conn = obtenir_connexion_db()
        data = conn.execute(""" 
        SELECT s.id, s.message, q.id as question_id, q.énoncé, q.type_question,
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
@admin_bp.route('/api/admin/question/<int:question_id>', methods = ['DELETE'])
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
@admin_bp.route('/api/admin/signalement/<int:signalement_id>', methods = ['DELETE'])
def supprimer_signalement(signalement_id):
    try: 
        conn = obtenir_connexion_db()
        conn.execute("DELETE FROM Signalement WHERE id = ?", (signalement_id,))
        conn.commit()
        conn.close()
        return jsonify({"message" : "Signalement supprimé avec succès."})
    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"erreur": f'Erreur dans la suppression du signalement {e}.'}), 500