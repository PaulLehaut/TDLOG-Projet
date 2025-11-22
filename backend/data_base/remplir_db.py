import sqlite3 # On utilise sqlite3 pour la database
import os
import sys
import json



def remplir_db(data, db_path):

    conn = sqlite3.connect(db_path) 
    cursor = conn.cursor()

    try:
        for quiz in data:

            cursor.execute("INSERT OR IGNORE INTO Quiz (nom, description) VALUES (?, ?)",
                       (quiz["quiz_nom"], quiz["quiz_desc"]))
            
            cursor.execute("SELECT id FROM Quiz WHERE nom = ?", (quiz["quiz_nom"],))
            quiz_id = cursor.fetchone()[0] # Plus sûr pour obtenir le bon id si jamais le quiz éxistait déjà

            print(f"Création du quiz: {quiz_id} ({quiz["quiz_nom"]})")

            for question in quiz["questions"]:
                # On vérifie que la question n'existe pas déjà dans ce quiz (vérification manuel nécessaire pour ne pas introduire de bug avec les types de question)
                question_vérif = cursor.execute("SELECT id, type_question FROM Question WHERE énoncé = ? AND quiz_id = ?", (question["question_énoncé"], quiz_id)).fetchone()
                question_id = None

                if question_vérif is None:
                    # La question n'existe pas, on la créer
                    print(f"Ajout de la question {question["question_énoncé"]} au quiz.")
                    cursor.execute("INSERT INTO Question (quiz_id, type_question, sujet_question, énoncé, points, réponse_correcte) VALUES (?, ?, ?, ?, ?, ?)",
                               (quiz_id, question["question_type"], question["question_sujet"], question["question_énoncé"], question["question_points"], question["question_réponse"]))
                    question_id = cursor.lastrowid
                
                else : 
                    # La question existe déjà, on l'ignore donc
                    continue
        
                if question["question_type"] == "qcm":
                    propositions = []
                    for i, prop in enumerate(question["question_propositions"]) :
                        propositions.append((question_id, i + 1, prop))
                    cursor.executemany("INSERT INTO Proposition (question_id, index_choix, proposition) VALUES (?, ?, ?)",
                           propositions)
                    
        conn.commit()
        return quiz_id
    except Exception as e:
        print(f"Erreur lors de la création des quiz: {e}.")
        conn.rollback()
        raise e
    finally:
        conn.close()

    