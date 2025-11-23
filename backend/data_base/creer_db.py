import sqlite3 # On utilise sqlite3 pour la database
import os
import sys

dossier_db = 'data_base'
nom_fichier = 'quiz.db'
data_base_nom = os.path.join(dossier_db, nom_fichier)
os.makedirs(dossier_db, exist_ok = True)

def initialiser_db():
    conn = sqlite3.connect(data_base_nom) # Il s'agit d'une connexion à la database
    cursor = conn.cursor() # Outil de commande

    # On supprime ce qui pourrait déjà exister pour repartir de zéro à l'exécution
    cursor.execute("DROP TABLE IF EXISTS Proposition;")
    cursor.execute("DROP TABLE IF EXISTS Question;")
    cursor.execute("DROP TABLE IF EXISTS Quiz;")

    # On créé une première table qui contien la liste des quiz
    cursor.execute("""
    CREATE TABLE Quiz (
                   id INTEGER PRIMARY KEY AUTOINCREMENT, 
                   nom TEXT NON NULL UNIQUE,
                   description TEXT
                   );
    """) 
    # id INTEGER (id entier) PRIMARY KEY (clé primaire, unique pour chaque quiz) AUTOINCREMENT (s'incrémente automatiquement)
    # nom TEXT NON NULL (chaque quiz a un nom qui ne peut pas être nul), on rajoute UNIQUE pour ne pas dupliquer les quiz
    # description TEXT (description optionelle du quiz)

    # Seconde table de questions 
    cursor.execute("""
    CREATE TABLE Question (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   quiz_id INTEGER NOT NULL,
                   type_question TEXT NOT NULL,
                   sujet_question TEXT NOT NULL,
                   énoncé TEXT NOT NULL UNIQUE,
                   points INTEGER NOT NULL,
                   réponse_correcte TEXT NOT NULL,
                   FOREIGN KEY (quiz_id) REFERENCES Quiz (id)
                   );
    """)
    # quiz_id spécifie à quel quiz cette question appartient
    # type_question indique si la question est une question simple ou un qcm
    # sujet_question donne le sujet de la question
    # FOREIGN KEY (quiz_id) (la colonne quiz_id contient une clef venant d'une autre table) REFERENCES Quiz (id) (La table de provenance est Quiz, la clef vient de la colonne id)

    # Troisième table spécifique pour les propositions des questions de type QCM
    cursor.execute("""
    CREATE TABLE Proposition (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   question_id INTEGER NOT NULL,
                   index_choix INTEGER NOT NULL,
                   proposition TEXT NOT NULL,
                   FOREIGN KEY (question_id) REFERENCES Question (id)
                   );
    """)

    cursor.execute("""
    CREATE TABLE Signalement (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   question_id INTEGER NOT NULL,
                   message TEXT,
                   FOREIGN KEY (question_id) REFERENCES Question (id)
                   );
    """)

    print("Tables bien créées !")

    try: # Insertion des données de quiz

        # Quiz test -----------------------------------------------------------------------------------------------------------------------------------
        cursor.execute("INSERT INTO Quiz (nom, description) VALUES (?, ?)",
                       ("Quiz Privé", "Mon quiz de test.")) # Créé le quiz de test
        quiz_id_1 = cursor.lastrowid

        # On ajoute les questions de test
        cursor.execute("INSERT INTO Question (quiz_id, type_question, sujet_question, énoncé, points, réponse_correcte) VALUES (?, ?, ?, ?, ?, ?)",
                       (quiz_id_1, "simple", "Privé", "Quel carton pour JB à la prochaine OB ?", 5, "Carton jaune en détente"))
        
        cursor.execute("INSERT INTO Question (quiz_id, type_question, sujet_question, énoncé, points, réponse_correcte) VALUES (?, ?, ?, ?, ?, ?)",
                       (quiz_id_1, "qcm", "Privé", "Comment qualifier la performance de l'équipe de foot des ponts à la coupe de l'X 2025 ?", 5, "2"))
        question_qcm_id_1 = cursor.lastrowid
        propositions_question_qcm_1 = [
            (question_qcm_id_1, 1, "1. Pas mal pour des débutants"),
            (question_qcm_id_1, 2, "2. Les 2A à la poubelle"),
            (question_qcm_id_1, 3, "3. Jb contre un 1A omg"),
            (question_qcm_id_1, 4, "4. 10 balles sur le 1A")
        ]
        cursor.executemany("INSERT INTO Proposition (question_id, index_choix, proposition) VALUES (?, ?, ?)",
                           propositions_question_qcm_1)

        cursor.execute("INSERT INTO Question (quiz_id, type_question, sujet_question, énoncé, points, réponse_correcte) VALUES (?, ?, ?, ?, ?, ?)",
                       (quiz_id_1, "qcm", "Privé", "A quel point Paul est-il proche de conclure avec la trez des Mines ?", 5, "3"))
        question_qcm_id_2 = cursor.lastrowid
        propositions_question_qcm_2 = [
            (question_qcm_id_2, 1, "1. Dans le bueno"),
            (question_qcm_id_2, 2, "2. Pourquoi il lui a parlé de Pierre ce zgeg"),
            (question_qcm_id_2, 3, "3. Il a aucun football"),
            (question_qcm_id_2, 4, "4. C'est lui qui leur a offert le champagne")
        ]
        cursor.executemany("INSERT INTO Proposition (question_id, index_choix, proposition) VALUES (?, ?, ?)",
                           propositions_question_qcm_2)
        
        conn.commit() # On commit les modifications
        print("Quiz créé avec succès.")

    except Exception as e:
        print(f"Erreur lors de la création du quiz: {e}.")
        conn.rollback() # On annule les modifications en cas d'erreur
    
    finally:
        conn.close() # On ferme la connexion

if __name__ == "__main__":
    # Sécurité car ce code réinitialise la base de données
    print("ATTENTION : Ce script va DÉTRUIRE et recréer la base de données.")
    confirmation = input("Es-tu certain de vouloir faire ça (probablement pas) ? (oui/non)")
    if confirmation.lower() == 'oui':
        print("Ok on réinitialise.")
        initialiser_db()
        print("Base de données réinitialisée.")
    else:
        print("Opération annulée.")
        sys.exit() # Quitte le script sans rien faire
    