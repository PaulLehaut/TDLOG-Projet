import React, { useState, useEffect } from 'react'; // useState va permettre de remplacer les anciennes variables globales
import './QuizApp.css';

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                      Constantes pour l'etat du Quiz
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

const ETATS = {
  CHARGEMENT: 'Chargement du quiz',
  SELECTION: 'Selection',
  INTRO: 'Intro',
  JEU: 'Jeu',
  VALIDATION: 'Validation',
  FINIT: 'Quiz termine',
  ERREUR: 'erreur'
};

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//   Composant principal, comme une fonction JavaScript mais qui renvoie du HTML
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function QuizApp()
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
  const [quizLive, editerQuizLive] = useState(null); // null car, pour l'instant, quizLive n'existe pas (pas selectionne)
  const [questionLive, editerQuestionLive] = useState(null);
  const [score, editerScore] = useState(0);
  const [feedback, editerFeedBack] = useState(null);
  const [resultatsFinaux, editerResultatsFinaux] = useState(null);


  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                    Declaration des effets
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  
  // On definit les fonctions avec useEffect, il prend deux arguments: 1)() => {...} c'est le travail à fiare ; 2)[] c'est le tableau de dependances, il indique quand le travail doit être fait, s'il est vide alors on ne fait le travail qu'une seule fois au chargement de la page
  useEffect(() => 
  {
    async function chargerQuiz()
    {
      try 
      {
        const reponse = await fetch('api/selection_quiz'); // Appelle du backend, comme avant
        const data = await reponse.json();
        
        if (!reponse.ok)
        {
          throw new Error(data.erreur || "Erreur reseau.");
        }

        editerListeQuiz(data); // On stocke la liste des quiz dans listeQuiz
        editerEtat(ETATS.SELECTION); // On efface le message de chargement
      }
      catch (erreur)
      {
        console.error(erreur);
        editerEtat(ETATS.ERREUR);
      }
    }

    chargerQuiz(); // On appelle la fonction
  }, []); // Le paramètre '[]' signifie que cette fonction ne doit s'executer qu'au montage

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //              Les fonctions pour les actions de l'utilisateur
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  /** 
   * Quand l'utilisateur choisit un quiz pour joueur en solo
   * @param {int} quiz_id Le quiz selectionne
  */
  async function gererQuizSelectionne(quiz_id)
  {
    editerEtat('Chargement du quiz');
    try
    {
      const url = `api/quiz/start/${quiz_id}?limite=${nbQuestions}`;

      const reponse = await fetch(url, {credentials: 'include'});
      const data = await reponse.json();

      if (!reponse.ok)
      {
        throw new Error(data.erreur || "Erreur resau.")
      }

      editerQuizLive(data);
      editerEtat(ETATS.INTRO);
    }
    catch (erreur)
    {
      console.error(erreur);
      editerEtat(ETATS.ERREUR);
    }
  }

  //Quand l'utilisateur demarre le quiz
  async function demarrerQuiz()
  {
    editerEtat(ETATS.JEU);
    editerScore(0);
    editerFeedBack(null);
    await chargerProchaineQuestion();
  }

  //Quan on charge une question
  async function chargerProchaineQuestion()
  {
    editerEtat(ETATS.CHARGEMENT);
    editerFeedBack(null);
    try
    {
      const url = `api/quiz/question`;

      const reponse = await fetch(url, {credentials: 'include'});
      const data = await reponse.json();

      if (!reponse.ok)
      {
        throw new Error(data.erreur || "Erreur resau.");
      }

      if (data.etat === 'termine')
      {
        editerQuestionLive(null);
        editerResultatsFinaux({ score: data.score, total: data.total });
        editerEtat(ETATS.FINIT);
      }
      else
      {
        editerQuestionLive(data);
        editerEtat(ETATS.JEU);
      }
    }
    catch (erreur)
    {
      console.error(erreur);
      editerEtat(ETATS.ERREUR);
    }
  }

  // Traitement d'une réponse
  async function gererReponse(reponse_utilisateur)
  {
    editerEtat(ETATS.VALIDATION);

    try
    {
      const url = 'api/reponse';
      const reponse = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({reponse_utilisateur})
      });
      const resultat = await reponse.json();
            
      // Mise à jour locale
      editerScore(resultat.score);
      if (resultat.resultat_correct)
        editerFeedBack({message: 'Bonne réponse, bravo !', correct: true});
      else 
        editerFeedBack({message: `Raté, bien guez ! `, correct: false});
            
      // En solo, on passe à la suite automatiquement après 2s
      setTimeout(chargerProchaineQuestion, 2000);
    }
    catch (e)
    { 
      console.error(e); 
    }
  }

  /**
   * Reinitialisation du quiz
  */
  async function resetQuiz()
  {
    editerEtat(ETATS.SELECTION);
    editerNbQuestions(10);
    editerQuestionLive(null);
    editerQuizLive(null);
  }

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                          Affichage 
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  function renderContent()
  {
    if (etatApp === ETATS.CHARGEMENT)
    {
      return <h1>Chargement...</h1>;
    }

    if (etatApp === ETATS.ERREUR)
    {
      return <h1>Erreur de connexion.</h1>;
    }

    if (etatApp === ETATS.SELECTION)
    {
      return (
        <>
          <h1>Choisissez un Quiz</h1>
          <div className='quiz-list'>
            {listeQuiz.map(quiz => (
              <button key = {quiz.id} className='quiz-bouton' onClick={() => gererQuizSelectionne(quiz.id)}>
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
        </>
      );
    }

    if (etatApp === ETATS.INTRO && quizLive)
    {
      return (
        <>
          <h1>{quizLive.nom}</h1>
          <p className='quiz-description'>{quizLive.description}</p>
          <button className='start-button' onClick={demarrerQuiz}>
            C'est parti !
          </button>
          <button className='go-back-button' onClick={() => editerEtat(ETATS.SELECTION)}>
            Revenir à la page de selection.
          </button>
        </>
      );
    }

    if ((etatApp === ETATS.JEU || etatApp === ETATS.VALIDATION) && questionLive)
    {
      return (
        <QuizGame
          question = {questionLive}
          score = {score}
          nbQuestions = {nbQuestions}
          feedback = {feedback}  
          onReponse = {gererReponse}
          etat_jeu = {etatApp}
          />
      );
    }

    if (etatApp === ETATS.FINIT)
    {
      return (
        <>
          <h1>Quiz Terminé !</h1>
          {resultatsFinaux && (
              <h2>Votre score final est de: {resultatsFinaux.score} / {resultatsFinaux.total}</h2>
          )}
          
          <button className='start-button' onClick={resetQuiz}>
            Retour à la sélection de Quiz !
          </button>
        </>
      );
    }

    return <h1>Etat inconnu, bug.</h1>;// Ne devrait jamais s'afficher
  }
  
  return (
    <div className='App-container'>
      {renderContent()}
    </div>
  );
}

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                          Composant secondaire
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function QuizGame({question, score, nbQuestions, feedback, onReponse, etat_jeu})
{
  const [reponseSimple, editerReponseSimple] = useState('');

  function gererReponseSimple(e)
  {
    e.preventDefault(); // On ne recharge pas la page
    if (reponseSimple.trim() === '')
      return;
    onReponse(reponseSimple);
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
      {/* Barre de statut */}
      <div className='statut-bar'>
        <div className='score'>Score: {score}</div>
        <div className='compteur'>Question {question.index + 1}/{nbQuestions}</div>
      </div>
      {/* La question */}
      <h2 className='question-enonce'>{question.enonce}</h2>

      {/* La boîte de reponse */}
      <div className='reponse-container'>
        {question.type_question === 'qcm' && (
          <div className='qcm-propositions'>
            {question.propositions.map((prop, index) => (
              <button
                key = {index}
                className='qcm-bouton'
                onClick = {() => onReponse(index + 1)}
                disabled = {validation_en_cours} // Si une reponse est selectionnee, on desactive les boutons
              >
                {prop}
              </button>
              ))}
          </div>
        )}
        {question.type_question === 'simple' && (
          <form className='simple-form' onSubmit={gererReponseSimple}>
            <input
              type = 'text'
              value = {reponseSimple}
              onChange = {(e) => editerReponseSimple(e.target.value)}
              placeholder = 'Votre reponse: '
              disabled = {validation_en_cours}
            />
            <button type = "submit" disabled = {validation_en_cours}>
              Valider
            </button>
          </form>
        )}
      </div>

      {/* Le feedback (s'il existe) */}
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

export default QuizApp; // Exportation du composant