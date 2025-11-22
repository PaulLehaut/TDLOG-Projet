import React, { useState, useEffect } from 'react'; // useState va permettre de remplacer les anciennes variables globales
import './QuizApp.css';

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                      Constantes pour l'état du Quiz
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

const ETATS = {
  CHARGEMENT: 'Chargement du quiz',
  SELECTION: 'Sélection',
  INTRO: 'Intro',
  JEU: 'Jeu',
  VALIDATION: 'Validation',
  FINIT: 'Quiz terminé',
  ERREUR: 'erreur'
};

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//   Composant principal, comme une fonction JavaScript mais qui renvoie du HTML
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function QuizApp()
{
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                Déclaration des états (variables globales)
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  
  // listeQuiz est la variable, editerListeQuiz est la fonction pour la modifier
  const [listeQuiz, editerListeQuiz] = useState([]); // On commence par défaut par une liste de quiz vide

  // Même chose etatApp est la variable et editerEtat la fonction
  const [etatApp, editerEtat] = useState(ETATS.CHARGEMENT);

  // Et ainsi de suite
  const [nbQuestions, editerNbQuestions] = useState(10); // 10 par défaut
  const [quizLive, editerQuizLive] = useState(null); // null car, pour l'instant, quizLive n'existe pas (pas sélectionné)
  const [questionLive, editerQuestionLive] = useState(null);
  const [score, editerScore] = useState(0);
  const [feedback, editerFeedBack] = useState(null);

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                    Déclaration des effets
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  
  // On définit les fonctions avec useEffect, il prend deux arguments: 1)() => {...} c'est le travail à fiare ; 2)[] c'est le tableau de dépendances, il indique quand le travail doit être fait, s'il est vide alors on ne fait le travail qu'une seule fois au chargement de la page
  useEffect(() => 
  {
    async function chargerQuiz()
    {
      try 
      {
        const réponse = await fetch('api/selection_quiz'); // Appelle du backend, comme avant
        const data = await réponse.json();
        
        if (!réponse.ok)
        {
          throw new Error(data.erreur || "Erreur réseau.");
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
  }, []); // Le paramètre '[]' signifie que cette fonction ne doit s'exécuter qu'au montage

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //              Les fonctions pour les actions de l'utilisateur
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  /** 
   * Quand l'utilisateur choisit un quiz
  */
  async function gérerQuizSélectionné(quiz_id)
  {
    editerEtat('Chargement du quiz');
    try
    {
      const url = `api/quiz/start/${quiz_id}?limite=${nbQuestions}`;

      const réponse = await fetch(url, {credentials: 'include'});
      const data = await réponse.json();

      if (!réponse.ok)
      {
        throw new Error(data.erreur || "Erreur résau.")
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

  /** 
   * Quand l'utilisateur démarre le quiz
  */
  async function démarrerQuiz()
  {
    editerEtat(ETATS.JEU);
    editerScore(0);
    editerFeedBack(null);
    await chargerProchaineQuestion();
  }

  /**
   * Quan on charge une question
  */
  async function chargerProchaineQuestion()
  {
    editerEtat(ETATS.CHARGEMENT);
    editerFeedBack(null);
    try
    {
      const url = `api/quiz/question`;

      const réponse = await fetch(url, {credentials: 'include'});
      const data = await réponse.json();

      if (!réponse.ok)
      {
        throw new Error(data.erreur || "Erreur résau.");
      }

      if (data.état === 'terminé')
      {
        editerQuestionLive(null);
        editerEtat(ETATS.FINIT);
        editerQuizLive(prev => ({...prev, score_final: data.score, total_final: data.total}));
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

  /**
   * Traitement d'une réponse
  */
  async function gérerRéponse(réponse_utilisateur)
  {
    editerEtat(ETATS.VALIDATION);

    try
    {
      const url = 'api/reponse'
      const réponse = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({réponse_utilisateur: réponse_utilisateur})
      });
      const résultat = await réponse.json();

      if (!réponse.ok)
        throw new Error(résultat.erreur || "Erreur réseau");

      editerScore(résultat.score);
      if (résultat.résultat_correct)
        editerFeedBack({message: 'Bonne réponse, félicitation !', correct: true});
      else 
        editerFeedBack({message: 'Mauvaise réponse, bien guez !', correct: false});
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      await chargerProchaineQuestion();
    }
    catch (erreur)
    {
      console.error(erreur);
      editerEtat(ETATS.ERREUR);
    }
  }

  /**
   * Réinitialisation du quiz
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
              <button key = {quiz.id} className='quiz-bouton' onClick={() => gérerQuizSélectionné(quiz.id)}>
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
          <button className='start-button' onClick={démarrerQuiz}>
            C'est parti !
          </button>
          <button className='go-back-button' onClick={() => editerEtat(ETATS.SELECTION)}>
            Revenir à la page de sélection.
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
          nbQuestions = {quizLive.nombre_questions}
          feedback = {feedback}  
          onReponse = {gérerRéponse}
          etat_jeu = {etatApp}
          />
      );
    }

    if (etatApp === ETATS.FINIT && quizLive)
    {
      return (
        <>
          <h1>Quiz Terminé !</h1>
          <h2>Votre score final est de: {quizLive.score_final} / {quizLive.total_final}</h2>
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
  const [reponseSimple, editerRéponseSimple] = useState('');

  function gérerRéponseSimple(e)
  {
    e.preventDefault(); // On ne recharge pas la page
    if (reponseSimple.trim() === '')
      return;
    onReponse(reponseSimple);
  }

  const validation_en_cours = (etat_jeu === ETATS.VALIDATION);
  return (
    <div className='quiz-game'>
      {/* Barre de statut */}
      <div className='statut-bar'>
        <div className='score'>Score: {score}</div>
        <div className='compteur'>Question {question.index + 1}/ {nbQuestions}</div>
      </div>
      {/* La question */}
      <h2 className='question-enonce'>{question.énoncé}</h2>

      {/* La boîte de réponse */}
      <div className='reponse-container'>
        {question.type_question === 'qcm' && (
          <div className='qcm-propositions'>
            {question.propositions.map((prop, index) => (
              <button
                key = {index}
                className='qcm-bouton'
                onClick = {() => onReponse(index + 1)}
                disabled = {validation_en_cours} // Si une réponse est sélectionnée, on désactive les boutons
              >
                {prop}
              </button>
              ))}
          </div>
        )}
        {question.type_question === 'simple' && (
          <form className='simple-form' onSubmit={gérerRéponseSimple}>
            <input
              type = 'text'
              value = {reponseSimple}
              onChange = {(e) => editerRéponseSimple(e.target.value)}
              placeholder = 'Votre réponse: '
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
          {feedback.message}
        </div>
      )}
    </div>
  );
}

export default QuizApp; // Exportation du composant