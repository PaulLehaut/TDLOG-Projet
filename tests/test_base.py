import pytest
import sqlite3
from backend import state


def test_app_existe(client):
    """je verifie juste que l'app n'est pas none."""
    assert client is not None


def test_state_initial():
    """je verifie que la memoire des salles est bien un dict."""
    assert isinstance(state.ROOMS, dict)


def test_db_connexion(temp_db_path):
    """je verifie qu'on peut se connecter a la db temporaire."""
    conn = sqlite3.connect(temp_db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='Quiz'")
    table = cursor.fetchone()
    conn.close()
    assert table is not None
    assert table[0] == 'Quiz'
