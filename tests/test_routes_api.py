import pytest
import json

def test_api_selection_quiz_vide(client):
    """je teste /api/selection_quiz avec une db initialisée."""
    response = client.get('/api/selection_quiz')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    assert len(data) >= 1

def test_admin_creer_quiz_erreur(client):
    """je vérifie le 400 quand j'envoie un quiz sans nom."""
    response = client.post('/api/admin/quiz', json={})
    assert response.status_code == 400
    assert "manquant" in response.get_json()['erreur']