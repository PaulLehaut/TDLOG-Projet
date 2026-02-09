import pytest
import state

def test_connexion_socket(socket_client):
    """je vérifie que le client peut se connecter."""
    assert socket_client.is_connected()

def test_creer_room(socket_client):
    """je simule un client qui crée une salle."""
    socket_client.emit('creer_room', {'pseudo': 'Chef'})
    
    # je recupere les evenements recus par le client
    recu = socket_client.get_received()
    
    # je cherche l'evenement 'room_creee'
    event = next((e for e in recu if e['name'] == 'room_creee'), None)
    assert event is not None
    
    donnees = event['args'][0]
    assert 'code' in donnees
    
    # je verifie que le serveur a bien enregistre la salle en memoire
    code = donnees['code']
    assert code in state.ROOMS
    room = state.ROOMS[code]
    assert room['host'] in room['joueurs']
    assert room['joueurs'][room['host']]['pseudo'] == 'Chef'