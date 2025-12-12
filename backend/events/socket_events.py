from flask import request
from flask_socketio import emit, join_room
from extensions import socketio
from state import ROOMS
from database import obtenir_connexion_db, DB_PATH
from thefuzz import fuzz
import random
import string

# Imports pour l'IA
try:
    from data_base.générer_json_ia import appeler_ia
    from data_base.remplir_db import remplir_db
except ImportError:
    print("Fonctions pour l'IA introuvables.")

def register_socket_events():

    #"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
    #                                       Fonction utilitaire
    #"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
    def generer_code_room(): # Génération d'un code unique
        while True:
            code = ''.join(random.choices(string.ascii_uppercase, k=10))
            if code not in ROOMS: # On a trouvé un nouveau code
                return code
    
    #"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
    #                                           Evènements
    #"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
    @socketio.on('creer_room')
    def creer_room(data):
        room_code = generer_code_room()
        pseudo = data['pseudo']
        ROOMS[room_code] = {
            'host': request.sid,
            'etat': 'LOBBY',
            'joueurs': {}
        }
        ROOMS[room_code]['joueurs'][request.sid] = {'pseudo': pseudo, 'score': 0}
        join_room(room_code)
        print(f'room {room_code} créée par {pseudo}.')
        emit('room_creee', {'code': room_code, 'joueurs': [pseudo]})

    @socketio.on('choisir_quiz')
    def choisir_quiz(data):
        room_code = data['roomCode']
        quiz_id = data['quiz_id']
        nb_questions = data['nbQuestions']

        if room_code not in ROOMS:
            emit('erreur_connexion', {'message': "Room introuvable."})
            return

        conn = obtenir_connexion_db()
        quiz_data = conn.execute("SELECT nom, description FROM Quiz WHERE id = ?", (quiz_id,)).fetchone()
        if quiz_data is None:
            conn.close()
            emit('erreur_connexion', {'message': "Erreur de connexion à la base de données."})
        
        quiz = dict(quiz_data)
        nom_quiz = quiz["nom"]
        quiz_desc = quiz["description"]

        questions_db = conn.execute("SELECT * FROM Question WHERE quiz_id = ? ORDER BY RANDOM() LIMIT ?", (quiz_id, nb_questions)).fetchall()
        
        liste_questions = []
        for quest in questions_db: 
            quest_dict = dict(quest)
            if quest_dict['type_question'] == 'qcm':
                props_db = conn.execute("SELECT proposition FROM Proposition WHERE question_id = ?", (quest_dict['id'],)).fetchall()
                quest_dict['propositions'] = [p['proposition'] for p in props_db]
            liste_questions.append(quest_dict)
        conn.close()

        ROOMS[room_code]['quiz_id'] = quiz_id
        ROOMS[room_code]['questions'] = liste_questions
        ROOMS[room_code]['current_index'] = 0
        
        socketio.emit('quiz_selectionne', {'message': 'Le quiz a été choisi ! Préparez-vous.', 'quiz_nom': nom_quiz, 'quiz_desc': quiz_desc}, room=room_code)

    @socketio.on('rejoindre_room')
    def rejoindre_room(data):
        room_code = data['code'].upper()
        pseudo = data['pseudo']

        if room_code not in ROOMS:
            emit('erreur_connexion', {'message': "Room introuvable."})
            return
        if ROOMS[room_code]['etat'] != 'LOBBY' and ROOMS[room_code]['etat'] != 'INTRO':
            emit('erreur_connexion', {'message': "Partie déjà en cours."})
            return
        
        ROOMS[room_code]['joueurs'][request.sid] = {'pseudo': pseudo, 'score': 0}
        join_room(room_code)
        print(f'{pseudo} a rejoint la room {room_code}.')

        liste_pseudos = [joueur['pseudo'] for joueur in ROOMS[room_code]['joueurs'].values()]
        emit('maj_lobby', {'joueurs': liste_pseudos}, room = room_code)

        if 'quiz_id' in ROOMS[room_code]:
            quiz_id = ROOMS[room_code]['quiz_id']
            conn = obtenir_connexion_db()
            quiz_data = conn.execute("SELECT nom, description FROM Quiz WHERE id = ?", (quiz_id,)).fetchone()
            conn.close()
            
            if quiz_data:
                emit('quiz_selectionne', {'message': 'Quiz déjà sélectionné, prépare-toi !', 'quiz_nom': quiz_data['nom'], 'quiz_desc': quiz_data['description']}, to=request.sid)

    @socketio.on('lancer_quiz')
    def prochaine_question(data):
        try:
            data['timer'] = int(data['timer']) 
        except ValueError:
            data['timer'] = 15
        socketio.start_background_task(cycle_jeu, data)

    @socketio.on('envoyer_reponse')    
    def gerer_reponse(data):
        try:
            room_code = data['roomCode'].upper()
            if room_code not in ROOMS or ROOMS[room_code]['etat'] != 'JEU':
                return 

            reponse_utilisateur = data['reponse_utilisateur']
            current_quest = data['question'] 

            ROOM = ROOMS[room_code]
            current_index = ROOM['current_index']
            
            room_quest = ROOM['questions'][current_index - 1] 

            if room_quest['id'] != current_quest['id']:
                print(f"Desynchro: ID Serveur {room_quest['id']} vs ID Client {current_quest['id']}")
                return

            reponse_question = room_quest['réponse_correcte'] 
            reponse_correcte = False

            match room_quest['type_question']:
                case 'qcm':
                    reponse_correcte = int(reponse_question) == int(reponse_utilisateur)
                case 'simple':
                    score = fuzz.token_sort_ratio(str(reponse_utilisateur).lower(), str(reponse_question).lower())
                    reponse_correcte = score >= 80
            
            points = room_quest['points']
            
            ROOM['joueurs'][request.sid]['score'] += points if reponse_correcte else 0
            
            emit('resultat_reponse', {'reponse_correcte': reponse_correcte})
            
        except Exception as e:
            print(f"Erreur lors de la réponse : {e}")

    @socketio.on('reset_room')
    def reset_room(data):
        room_code = data['roomCode'].upper()

        if room_code not in ROOMS:
            emit('erreur_connexion', {'message': "Room introuvable."})
            return
        
        ROOMS[room_code]['etat'] = 'LOBBY'
        if 'quiz_id' in ROOMS[room_code]:
            del ROOMS[room_code]['quiz_id']

        ROOMS[room_code]['current_index'] = 0
        for joueurs_sid in ROOMS[room_code]['joueurs']:
            ROOMS[room_code]['joueurs'][joueurs_sid]['score'] = 0

        liste_pseudos = [j['pseudo'] for j in ROOMS[room_code]['joueurs'].values()]
        emit('force_lobby', {'joueurs': liste_pseudos}, room=room_code)

    # Création d'un quiz avec l'IA depuis l'API
    @socketio.on('demande_generation_ia')
    def creer_quiz_ia(data):
        print(f'Demande de création du quiz {data['nom']} par IA.')
        socketio.start_background_task(creation_ia, data)


    # """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
    #                                         Fonction d'arrière plan
    # """"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

    # Création du quiz par l'IA
    def creation_ia(data):
        try :
            print('Démarragge de la génération.')

            quiz_nom = data.get('nom')
            quiz_desc = data.get('desc', "")
            nb_questions_simples = data.get('nb_questions_simples', 2)
            nb_questions_qcm = data.get('nb_questions_qcm', 3)
            
            data = appeler_ia(quiz_nom, quiz_desc, nb_questions_simples, nb_questions_qcm)

            if not data:
                raise Exception("L'IA n'a rien envoyé.")
            
            quiz_id = remplir_db(data, DB_PATH)
            
            print(f"Nouveau Quiz suggéré avec succès.")
            socketio.emit('ia_terminee', {'message': f"Quiz {quiz_nom} généré avec succès ! Il s'agit du quiz numéro {quiz_id}."})
        
        except Exception as e:
            print(f'Erreur: {e}')
            socketio.emit('ia_erreur', {'message': str(e)})

    # Gestion d'une session de jeu multijoueurs 
    def cycle_jeu(data):
        room_code = data['roomCode']
        if room_code not in ROOMS:
            return
        
        reponse_timer = data['timer']
        ROOMS[room_code]['etat'] = 'JEU'
        ROOM = ROOMS[room_code]
        questions = ROOM['questions']
        index = 0
        total_questions = len(questions)
        while index < total_questions:
            ROOMS[room_code]['current_index'] = index + 1
            question_brute = questions[index]
            question = {
                'index': index,
                'enonce': question_brute['énoncé'],
                'type_question': question_brute['type_question'],
                'points': question_brute['points'],
                'id': question_brute['id'],
                'propositions': question_brute.get('propositions', []),
                'reponse_correcte': question_brute['réponse_correcte']
            }

            socketio.emit('nouvelle_question', {'question': question, 'total_questions': total_questions, 'index_actuel': index}, room = room_code)
            socketio.sleep(reponse_timer)

            reponse_question = question['reponse_correcte']
            if question['type_question'] == 'qcm':
                index_reponse = int(question['reponse_correcte']) - 1
                if 0 <= index_reponse < len(question['propositions']):
                    reponse_question = question['propositions'][index_reponse]

            socketio.emit('afficher_reponse',{'points': question['points'], 'reponse_question': reponse_question}, room = room_code)
            socketio.sleep(5)

            index += 1

        dict_joueurs = ROOM['joueurs']
        liste_joueurs = []
        for sid, dict in dict_joueurs.items():
            liste_joueurs.append({'pseudo': dict['pseudo'], 'score': dict['score']})

        classement = sorted(liste_joueurs, key = lambda x: x['score'], reverse = True)
        ROOMS[room_code]['etat'] = 'FINI'
        socketio.emit('quiz_termine', {'classement': classement}, room = room_code)