import pytest
import sqlite3
from backend.data_base import remplir_db


def test_remplir_db_logique(temp_db_path):
    """je teste si je peux inserer un quiz via la fonction python."""
    donnees_test = [
        {
            "quiz_nom": "Quiz Test Unitaire",
            "quiz_desc": "Description du test",
            "questions": [
                {
                    "question_énoncé": "Question 1 ?",
                    "question_type": "simple",
                    "question_sujet": "Test",
                    "question_réponse": "Oui",
                    "question_points": 1,
                    "question_propositions": []
                }
            ]
        }
    ]

    remplir_db.remplir_db(donnees_test, temp_db_path)

    conn = sqlite3.connect(temp_db_path)
    cursor = conn.cursor()
    quiz = cursor.execute("SELECT nom FROM Quiz WHERE nom='Quiz Test Unitaire'").fetchone()
    assert quiz is not None

    quest = cursor.execute("SELECT énoncé FROM Question WHERE énoncé = ?", ("Question 1 ?",)).fetchone()
    assert quest is not None

    conn.close()
