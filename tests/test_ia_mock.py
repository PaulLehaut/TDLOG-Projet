import pytest
from unittest.mock import patch, MagicMock
from backend.data_base import générer_json_ia
import json


def test_generation_prompt_texte():
    """je verifie juste que le prompt contient les infos cles."""
    prompt = générer_json_ia.générer_prompt("Les Chats", "Desc", "Facile", 5, 0)
    assert "Les Chats" in prompt
    assert "UNIQUEMENT un JSON" in prompt


@patch('google.generativeai.GenerativeModel')
def test_simulation_appel_ia(mock_model):
    """je simule une reponse de l'ia sans appeler google."""
    fausse_reponse_json = [
        {
            "quiz_nom": "Quiz Chat",
            "quiz_desc": "Miaou",
            "questions": []
        }
    ]

    mock_instance = mock_model.return_value
    mock_retour = MagicMock()
    mock_retour.text = json.dumps(fausse_reponse_json)
    mock_instance.generate_content.return_value = mock_retour

    resultat = générer_json_ia.appeler_ia("Les Chats", "Desc", "Facile", 1, 0)

    assert isinstance(resultat, list)
    assert resultat[0]['quiz_nom'] == "Quiz Chat"
