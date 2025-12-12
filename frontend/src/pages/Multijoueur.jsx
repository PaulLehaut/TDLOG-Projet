import React, { useState, useEffect, useRef } from 'react'; // useState va permettre de remplacer les anciennes variables globales
import './Multijoueur.css';
import { data } from 'react-router-dom';

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                      Constantes pour l'etat de la session
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

const ETATS = {
    SELECTION: "Choix de création d'une partie ou d'en rejoindre une",
    LOBBY: 'Attente du lancement de la partie',
    INTRO: 'Ecran de lancement de parti',
    JEU: 'Partie en cours',
    VALIDATION: "Validation d'une question",
    REPONSE: "Affichage de la réponse à une question",
    FINIT: 'Partie terminée',
    FERMEE: 'Fermeture du lobby',
    ERREUR: 'erreur'
}

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                      Composant principal
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function Multijoueur({socket})
{
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                Declaration des etats (variables globales)
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  // listeQuiz est la variable, editerListeQuiz est la fonction pour la modifier
  const [listeQuiz, editerListeQuiz] = useState([]); // On commence par defaut par une liste de quiz vide
  
  // Même chose etatApp est la variable et editerEtat la fonction
  const [etatApp, editerEtat] = useState(ETATS.CHARGEMENT);
  
  // Et ainsi de suite
  const [nbQuestions, editerNbQuestions] = useState(10); // 10 par defaut
  const [quizNom, editerQuizNom] = useState('');
  const [quizDesc, editerQuizDesc] = useState('');
  const [questionLive, editerQuestionLive] = useState(null);
  const bonneReponse = useRef(false);
  const [score, editerScore] = useState(0);
  const [feedback, editerFeedBack] = useState(null);
  const [alerte, editerAlerte] = useState(null);
  const [timer, editerTimer] = useState(10);
  
  // Pour le multijoueur
  const [roomCode, editerRoomCode] = useState('');
  const [pseudo, editerPseudo] = useState('');
  const [listeJoueurs, editerListeJoueurs] = useState([]);
  const [estHote, editerEstHote] = useState(false); // Important de savoir si un joueur est l'hôte de la partie pour afficher certains boutons (comme demarrer)
  const [classementFinal, editerClassementFinal] = useState([]);

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                    Declaration des effets
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  useEffect(() => {
    editerEtat(ETATS.SELECTION);
    chargerQuiz();
  }, []);
    
  useEffect(() => {
    if (!socket) 
      return;
    
    socket.on('room_creee', (data) => {
      editerRoomCode(data.code)
      editerListeJoueurs(data.joueurs);
      editerEtat(ETATS.LOBBY);
    });
    
    socket.on('maj_lobby', (data) => {
      editerListeJoueurs(data.joueurs);
      editerEtat((etatActuel) => {
        if (etatActuel === ETATS.INTRO || etatActuel === ETATS.JEU)
          return etatActuel;
        return ETATS.LOBBY;
      });
    });
    
    socket.on('erreur_connexion', (data) => {
      alert(data.message);
    });
    
    socket.on('quiz_selectionne', (data) => {
      editerQuizDesc(data.quiz_desc);
      editerQuizNom(data.quiz_nom);
      editerEtat(ETATS.INTRO);
    });

    socket.on('nouvelle_question', (data) => {
      editerNbQuestions(data.total_questions)
      editerQuestionLive(data.question);
      editerFeedBack(null);
      editerEtat(ETATS.JEU);
      bonneReponse.current = false;
    });
    
    socket.on('resultat_reponse', (data) => {
      const estCorrecte = data['reponse_correcte'];
      if (estCorrecte)
      {
        bonneReponse.current = true;
      } 
      editerEtat(ETATS.VALIDATION);
      });
    
    socket.on('afficher_reponse', (data) => {
      if (bonneReponse.current === true)
      {
        const points = data['points'];
        editerFeedBack({message: `Bonne réponse, felicitation ! Vous avez gagné ${points} points.`, correct: true});
        editerScore(prevScore => prevScore + points);
      }
      else 
      {
        const bonne_reponse = data['reponse_question'];
        editerFeedBack({message: `Mauvaise réponse, bien guez !`, correct: false});
      }
      editerEtat(ETATS.REPONSE);
    })
    
    socket.on('quiz_termine', (data) => {
      editerEtat(ETATS.FINIT);
      const classement = data['classement'];
      editerClassementFinal(classement);
    });

    socket.on('force_lobby', (data) => {
    editerListeJoueurs(data.joueurs);
    editerScore(0); 
    editerNbQuestions(10);
    editerQuestionLive(null);
    editerQuizNom('');
    editerQuizDesc('');
    editerEtat(ETATS.LOBBY);
    })
    
    return () => {
      socket.off('room_creee');
      socket.off('maj_lobby');
      socket.off('erreur_connexion');
      socket.off('nouvelle_question');
      socket.off('resultat_reponse');
      socket.off('afficher_reponse');
      socket.off('quiz_termine');
      socket.off('force_lobby');
    };
  }, [socket]);

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //              Les fonctions pour les actions de l'utilisateur
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  // Le joueur veut rejoindre un lobby
  function rejoindreRoom(event)
  {
    event.preventDefault();

    if (!socket)
    {
      editerAlerte({message: "Erreur: Problème de connexion avec le backend.", type: 'danger'});
      return;
    }

    if (!pseudo.trim())
    {
      alert("Choisissez un pseudo !");
      return;
    }

    const data = {
      code: roomCode,
      pseudo: pseudo
    };

    socket.emit('rejoindre_room', data);
  }

  // Le joueur créer un lobby
  function creerRoom()
  { 
    if (!socket) {
      alert("Connexion au serveur en cours... Réessayez dans une seconde.");
      return;
    }

    if (!pseudo.trim())
    {
      alert("Choisissez un pseudo !");
      return;
    }
    const data = {
      pseudo: pseudo
    }

    socket.emit('creer_room', data);
    editerEstHote(true);
  }

  // Affichage de la liste de Quiz 
 async function chargerQuiz()
  {
    try 
    {
      const reponse = await fetch('/api/selection_quiz'); 
      const data = await reponse.json();
        
      if (!reponse.ok)
      {
        throw new Error(data.erreur || "Erreur reseau.");
      }

      editerListeQuiz(data); // On stocke la liste des quiz dans listeQuiz
    }
    catch (erreur)
    {
      console.error(erreur);
      editerEtat(ETATS.ERREUR);
    }
  }

  // Retour à l'accueil 
  async function resetROOM()
  {
    if (socket && roomCode)
    {
      socket.emit('reset_room', {roomCode});
    }
  }

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                          Affichage 
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  function renderContent()
  {
    if (etatApp === ETATS.SELECTION)
    {
      return (
        <div>
          <h1>Parties Multijoueur</h1>
          <div className='pseudo'>
            <h2>Entrer votre pseudo:</h2>
            <input
              id = 'pseudo-input'
              type = 'str'
              value = {pseudo}
              onChange={(e) => editerPseudo(e.target.value)}
              required
            />
          </div>

          <div className='room-selection'>
            <button className='create-room-bouton' onClick = {() => creerRoom()}>Créer une partie privée</button>
            <form className='join-room form' onSubmit={(e) => rejoindreRoom(e)}>
              <input 
                type = 'str'
                value = {roomCode}
                onChange = {(e) => editerRoomCode(e.target.value)}
                placeholder = 'Code de la partie'
              />
              <button type = 'submit'>Rejoindre la partie</button>
            </form>
          </div>
        </div>
      );
    }

    if (etatApp === ETATS.LOBBY)
    {
      return (
        <div className='lobby-container'>
          <h1>Salle d'attente</h1>
           
          <div className='room-info'>
            <p>Code de la salle à partager :</p>
            <div>
              {roomCode}
            </div>
          </div>
 
          <div className='players-list'>
            <h3>Joueurs connectés ({listeJoueurs.length}) :</h3>
            <ul>
              {listeJoueurs.map((joueur, index) => (
                <li key={index}>
                  {joueur === pseudo ? <strong>{joueur} (Moi)</strong> : joueur}
                </li>
               ))}
            </ul>
          </div>
          
          {estHote && 
          (
            <div className='quiz-list container'>
              <h2>Choisissez un Quiz</h2>
              <div className='quiz-list'>
                {listeQuiz.map(quiz => (
                  <button key = {quiz.id} className='quiz-bouton' onClick={() => socket.emit('choisir_quiz', {roomCode, quiz_id: quiz.id, nbQuestions: parseInt(nbQuestions, 10)})}>
                    <h3>{quiz.nom}</h3>
                    <p>{quiz.description}</p>
                  </button>
                ))}
              </div>

              <div className='nbQuestions-container'>
                <label htmlFor='nbQuestions-input'>Nombre de questions:</label>
                <input 
                id = 'nbQuestions-input'
                type = 'number'
                value = {nbQuestions}
                onChange = {(e) => editerNbQuestions(e.target.value)}
                min = '1'
                max = '50'
                />
              </div>

              <div className='setTimer-container'>
                <label htmlFor='setTimer-input'>Temps pour répondre:</label>
                <input 
                id = 'setTimer-input'
                type = 'number'
                value = {timer}
                onChange = {(e) => editerTimer(e.target.value)}
                min = '5'
                max = '30'
                />
              </div>
            </div>
          )}
          
          {!estHote && (
            <div className='alert alert-info'>En attente de l'hôte... Préparez-vous !</div>
          )}

        </div>        
      );
    }

    if (etatApp === ETATS.INTRO)
    {
      return (
        <>
          <h1>{quizNom}</h1>
          <p className='quiz-description'>{quizDesc}</p>
          {estHote ? (
            <div className='actions-container'>
              <button className='start-button' onClick={() => socket.emit('lancer_quiz', {roomCode, timer})}>
                C'est parti !
              </button>
              <button className='go-back-button' onClick={() => socket.emit('reset_room', {roomCode})}>
                Revenir à la page de selection.
              </button>
            </div>
          ) : (
            <div className='alert alert-info'>En attente de l'hôte... Préparez-vous !</div>
          )}
        </>
      );
    }
    if (etatApp === ETATS.JEU || etatApp === ETATS.VALIDATION || etatApp === ETATS.REPONSE)
    {
      return(
        <QuizGame
          question = {questionLive}
          score = {score}
          nbQuestions = {nbQuestions}
          feedback = {feedback}  
          etat_jeu = {etatApp}
          timer = {timer}
          roomCode = {roomCode}
          socket = {socket}
        />  
      );   
    }

    if (etatApp === ETATS.FINIT)
    {
      return (
        <div className="fin-container">
          <h1>🏆 Quiz Terminé ! 🏆</h1>

          <div className="classement-box">
            <h3>Classement Final</h3>
            <ul>
              {classementFinal.map((joueur, index) => (
                <li key={index}>
                  <span>#{index + 1} {joueur.pseudo} </span>
                  <span> {joueur.score} pts</span>
                </li>
              ))}
            </ul>
          </div>

          <button className='start-button' onClick={resetROOM}>
            Retour à l'accueil
          </button>
        </div>
      );
    }

    if (etatApp === ETATS.ERREUR) {
      return (
          <div className="fin-container">
              <h1>Oups ! Une erreur est survenue.</h1>
              <p>Vérifiez que le backend Python est bien lancé sur le port 5000.</p>
              <button className='start-button' onClick={() => window.location.reload()}>
                  Recharger la page
              </button>
          </div>
      );
    }
  }  

  return (
    <div className='App-container'>
      
      {/* Affichage des alertes d'erreur */}
      {alerte && (
          <div className={`alert alert-${alerte.type}`} style={{backgroundColor: '#ff4444', color: 'white', padding: '10px', marginBottom: '20px', borderRadius: '5px'}}>
              {alerte.message}
              <button onClick={() => editerAlerte(null)} style={{marginLeft: '10px', background: 'none', border:'none', color:'white', cursor:'pointer'}}>X</button>
          </div>
      )}

      {renderContent()}
    </div>
  )
}

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                          Composant secondaire
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function QuizGame({question, score, nbQuestions, feedback, etat_jeu, timer, roomCode, socket})
{
  const [reponseSimple, editerReponseSimple] = useState('');
  const [reponseSoumise, editerReponseSoumise] = useState(false);

  // Barre de progression
  const [progression, editerProgression] = useState(100);

  // Gestion de la désactivation des boutons une fois la réponse soumise
  useEffect(() => {
    editerReponseSoumise(false);
    editerReponseSimple('');
  }, [question]);

  // Gestion de la barre de progression
  useEffect(() => {
    if (etat_jeu === ETATS.VALIDATION)
      return; // Le joueur a soumis sa réponse, on freeze le timer

    editerProgression(100);
    let timerMS;
    if (etat_jeu === ETATS.REPONSE)
      timerMS = 5000; // On affiche la réponse pendant 5s
    else 
      timerMS = timer * 1000;

    const intervalTime = 100; // Mise à jour toute les 0.1s
    const step = 100 / (timerMS / intervalTime);

    const live_timer = setInterval (() => {
      editerProgression((oldProgression) => {
        if (oldProgression <= 0) {
          clearInterval(live_timer);
          return 0;
        }
        return oldProgression - step;
      });
    }, intervalTime);

    return () => clearInterval(live_timer);
  }, [question, etat_jeu, timer]);

  function gererReponseSimple(e)
  {
    e.preventDefault(); // On ne recharge pas la page
    if (reponseSimple.trim() === '')
      return;
    editerReponseSoumise(true);
    socket.emit('envoyer_reponse', {roomCode, reponse_utilisateur: reponseSimple, question});
  }

  const validation_en_cours = (etat_jeu === ETATS.VALIDATION);

  // Gestion d'un signalement
  async function gererSignalement()
  {
    const raison = prompt("Pourquoi signalez-vous cette question ?")
    if (!raison) return; // Il n'y a pas de raison fournis donc on ne fait pas remonter le signalement

    try 
    {
      await fetch('api/signalement',
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({question_id: question.id, raison: raison}),
          credentials: 'include'
        }
      );
      alert("Merci ! Le signalement a ete transmis aux administrateurs.")
    }
    catch (e)
    {
      console.error(e);
      alert("Erreur lors de l'envoi du signalement.")
    }
  }

  return (
    <div className='quiz-game'>

      <div className='statut-bar'>
        <div className='score'>Score: {score}</div>
        <div className='compteur'>Question {question.index + 1}/{nbQuestions}</div>
      </div>

    <div className='timer-container'>
      <div
        className={`timer-progress ${progression < 30 ? 'danger' : 'normal'}`}
        style={{ width: `${progression}%` }}
      />
    </div>

      <h2 className='question-enonce'>{question.enonce}</h2>

      <div className='reponse-container'>
        {question.type_question === 'qcm' && (
          <div className='qcm-propositions'>
            {question.propositions.map((prop, index) => (
              <button
                key = {index}
                className='qcm-bouton'
                onClick = {() => {
                  editerReponseSoumise(true);
                  socket.emit('envoyer_reponse', {roomCode, reponse_utilisateur: index + 1, question})
                }}
                disabled = {validation_en_cours || reponseSoumise} 
              >
                {prop}
              </button>
            ))}
          </div>
        )}
        {question.type_question === 'simple' && (
          <form className='simple-form' onSubmit={gererReponseSimple} >
            <input
              type = 'text'
              value = {reponseSimple}
              onChange = {(e) => editerReponseSimple(e.target.value)}
              placeholder = 'Votre reponse: '
              disabled = {validation_en_cours || reponseSoumise}
            />
            <button type = "submit" disabled = {validation_en_cours || reponseSoumise}>
              {reponseSoumise ? 'Réponse Envoyée' : 'Valider'}
            </button>
          </form>
        )}
      </div>
  
      {feedback && (
        <div className={`feedback ${feedback.correct ? 'correct' : 'incorrect'}`}>
          <p>{feedback.message}</p>
          <p>{feedback.correct ? '' : `La bonne réponse: ${question.reponse_correcte}`}</p>
        </div>
      )}

      <div className='signalement button'>
        <button className='signalement-btn' onClick = {gererSignalement}>Signaler une erreur</button>
      </div>
    </div>

  );
}

export default Multijoueur;



 