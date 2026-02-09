import pytest
import sys
import os
import tempfile
import types
import gc
import time
from unittest.mock import patch

# je mets le dossier racine et backend dans le path pour que python trouve les modules
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

# je pose des variables d'environnement minimales pour l'app et l'ia
os.environ.setdefault('SECRET_KEY', 'test_key')
os.environ.setdefault('GOOGLE_API_KEY', 'test_key')

# je stub les imports si les deps ne sont pas installees
if 'dotenv' not in sys.modules:
    dotenv_stub = types.ModuleType('dotenv')
    def load_dotenv():
        return None
    dotenv_stub.load_dotenv = load_dotenv
    sys.modules['dotenv'] = dotenv_stub

if 'google' not in sys.modules:
    sys.modules['google'] = types.ModuleType('google')

if 'google.generativeai' not in sys.modules:
    genai_stub = types.ModuleType('google.generativeai')

    def configure(api_key=None):
        return None

    class GenerationConfig:
        def __init__(self, *args, **kwargs):
            return None

    class GenerativeModel:
        def __init__(self, *args, **kwargs):
            return None

        def generate_content(self, *args, **kwargs):
            class Response:
                text = "[]"
            return Response()

    genai_stub.configure = configure
    genai_stub.GenerativeModel = GenerativeModel
    genai_stub.types = types.SimpleNamespace(GenerationConfig=GenerationConfig)
    sys.modules['google.generativeai'] = genai_stub
    sys.modules['google'].generativeai = genai_stub

from backend.app import app as flask_app
from backend.data_base import creer_db
import extensions
socketio = extensions.socketio

@pytest.fixture(scope='function')
def temp_db_path():
    """je cree un fichier temporaire pour la base de donnees."""
    fd, path = tempfile.mkstemp()
    os.close(fd)
    
    # j'initialise la structure de la db dans ce fichier temporaire
    # je fais un patch pour dire a creer_db d'utiliser ce chemin
    with patch('backend.data_base.creer_db.data_base_nom', path):
        creer_db.initialiser_db()
        
    yield path
    
    # je nettoie apres le test
    if os.path.exists(path):
        gc.collect()
        for _ in range(3):
            try:
                os.remove(path)
                break
            except PermissionError:
                time.sleep(0.1)

@pytest.fixture(scope='function')
def client(temp_db_path):
    """je cree un client http de test connecte a la db temporaire."""
    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test_key'
    
    # je redirige la connexion db de l'app vers notre fichier temporaire
    with patch('backend.database.DB_PATH', temp_db_path):
        with flask_app.test_client() as client:
            yield client

@pytest.fixture(scope='function')
def socket_client(client, temp_db_path):
    """je cree un client socketio de test."""
    # je dois aussi patcher le chemin db pour les sockets
    with patch('backend.database.DB_PATH', temp_db_path):
        return socketio.test_client(flask_app, flask_test_client=client)