import React, { useState, useEffect } from 'react'; // useState va permettre de remplacer les anciennes variables globales
import './App.css';

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//   Composant principal, comme une fonction JavaScript mais qui renvoie du HTML
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function App()
{
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                Déclaration des états (variables globales)
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  
  // liste_quiz est la variable, éditerListeQuiz est la fonction pour la modifier
  const [liste_quiz, éditerListeQuiz] = useState([]); // On commence par défaut par une liste de quiz vide

  // Même chose état_app est la variable et éditerEtat la fonction
  const [état_app, éditerEtat] = useState("Chargement du quiz");

  // Et ainsi de suite
  const [nb_questions, éditerNbQuestions] = useState(10); // 10 par défaut
  const [quiz_live, éditerQuizLive] = useState(null); // null car, pour l'instant, quiz_live n'existe pas (pas sélectionné)
  const [question_live, éditerQuestionLive] = useState(null);
  const [score, éditerScore] = useState(0);
  const [feedback, éditerFeedBack] = useState(null);

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

        éditerListeQuiz(data); // On stocke la liste des quiz dans liste_quiz
        éditerEtat("Sélection"); // On efface le message de chargement
      }
      catch (erreur)
      {
        console.error(erreur);
        éditerEtat("erreur");
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
    éditerEtat('Chargement du quiz');
    try
    {
      const url = `api/quiz/start/${quiz_id}?limite=${nb_questions}`;

      const réponse = await fetch(url, {credentials: 'include'});
      const data = await réponse.json();

      if (!réponse.ok)
      {
        throw new Error(data.erreur || "Erreur résau.")
      }

      éditerQuizLive(data);
      éditerEtat('Intro');
    }
    catch (erreur)
    {
      console.error(erreur);
      éditerEtat("erreur");
    }
  }

  /** 
   * Quand l'utilisateur démarre le quiz
  */
  async function démarrerQuiz()
  {
    éditerEtat('Jeu');
    éditerScore(0);
    éditerFeedBack(null);
    await chargerProchaineQuestion();
  }

  /**
   * Quan on charge une question
  */
  async function chargerProchaineQuestion()
  {
    éditerEtat('Chargement de la question');
    éditerFeedBack(null);
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
        éditerQuestionLive(null);
        éditerEtat('Quiz terminé');
        éditerQuizLive(prev => ({...prev, score_final: data.score, total_final: data.total}))
      }
      else
      {
        éditerQuestionLive(data);
        éditerEtat('Jeu');
      }
    }
    catch (erreur)
    {
      console.error(erreur);
      éditerEtat("erreur");
    }
  }

  /**
   * Traitement d'une réponse
  */
  async function gérerRéponse(réponse_utilisateur)
  {
    éditerEtat('Validation');

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

      éditerScore(résultat.score);
      if (résultat.résultat_correct)
        éditerFeedBack({message: 'Bonne réponse, félicitation !', correct: true});
      else 
        éditerFeedBack({message: 'Mauvaise réponse, bien guez !', correct: false});
      
      await new Promise(resolve => setTimeout(resolve, 2000));

      await chargerProchaineQuestion();
    }
    catch (erreur)
    {
      console.error(erreur);
      éditerEtat('erreur');
    }
  }

  /**
   * Réinitialisation du quiz
  */
  async function resetQuiz()
  {
    éditerEtat('Sélection');
    éditerNbQuestions(10);
    éditerQuestionLive(null);
    éditerQuizLive(null);
  }

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                          Affichage 
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  function renderContent()
  {
    if (état_app === 'Chargement du quiz')
    {
      return <h1>Chargement...</h1>;
    }

    if (état_app === 'erreur')
    {
      return <h1>Erreur de connexion.</h1>;
    }

    if (état_app === 'Sélection')
    {
      return (
        <>
          <h1>Choisissez un Quiz</h1>
          <div className='quiz-list'>
            {liste_quiz.map(quiz => (
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
            value = {nb_questions}
            onChange = {(e) => éditerNbQuestions(e.target.value)}
            min = '1'
            max = '50'
            />
          </div>
        </>
      );
    }

    if (état_app === 'Intro' && quiz_live)
    {
      return (
        <>
          <h1>{quiz_live.nom}</h1>
          <p className='quiz-description'>{quiz_live.description}</p>
          <button className='start-button' onClick={démarrerQuiz}>
            C'est parti !
          </button>
        </>
      );
    }

    if ((état_app === 'Jeu' || état_app === 'Validation') && question_live)
    {
      return (
        <QuizGame
          question = {question_live}
          score = {score}
          nb_questions = {quiz_live.nombre_questions}
          feedback = {feedback}  
          onReponse = {gérerRéponse}
          etat_jeu = {état_app}
          />
      );
    }

    if (état_app === 'Quiz terminé' && quiz_live)
    {
      return (
        <>
          <h1>Quiz Terminé !</h1>
          <h2>Votre score final est de: {quiz_live.score_final} / {quiz_live.total_final}</h2>
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
function QuizGame({question, score, nb_questions, feedback, onReponse, etat_jeu})
{
  const [réponse_simple, éditerRéponseSimple] = useState('');

  function gérerRéponseSimple(e)
  {
    e.preventDefault(); // On ne recharge pas la page
    if (réponse_simple.trim() === '')
      return;
    onReponse(réponse_simple);
  }

  const validation_en_cours = (etat_jeu === 'validation');
  return (
    <div className='quiz-game'>
      {/* Barre de statut */}
      <div className='statut-bar'>
        <div className='score'>Score: {score}</div>
        <div className='compteur'>Question {question.index + 1}/ {nb_questions}</div>
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
              value = {réponse_simple}
              onChange = {(e) => éditerRéponseSimple(e.target.value)}
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

export default App; // Exportation du composant