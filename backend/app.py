from flask import Flask, send_from_directory
from flask_cors import CORS
import os # On l'ajoute pour gérer les chemins
from dotenv import load_dotenv
load_dotenv()

from extensions import socketio
from routes.admin import admin_bp
from routes.general import general_bp
from events.socket_events import register_socket_events

dossier_frontend = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')
app = Flask(__name__, static_folder=dossier_frontend, static_url_path='')
app.config['JSON_AS_ASCII'] = False

secret_key = os.getenv('SECRET_KEY')
if not secret_key:
    raise RuntimeError("ERREUR CRITIQUE : La variable d'environnement 'SECRET_KEY' est manquante. Impossible de démarrer le serveur en toute sécurité.")
app.secret_key = secret_key

CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

socketio.init_app(app)
app.register_blueprint(admin_bp)
app.register_blueprint(general_bp)
register_socket_events()

# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
#                                               Chemin généraux
# """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

@app.route('/')
def serve_index():
    if os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return "Erreur : index.html introuvable.", 404

@app.route('/multijoueur')
def serve_multijoueur():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')




if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
