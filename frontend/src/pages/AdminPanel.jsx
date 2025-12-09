import React, { useState, useEffect } from "react";
import "./AdminPanel.css";

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                      Constantes pour l'état du panneau
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

const ETATS = {
  CHARGEMENT: "Chargement du quiz",
  ADMINISTRATION: "Création d'un quiz, d'une question",
  GESTION_SIGNALEMENT: "Gestion des signalements",
};

const ONGLETS = {
  CREER_QUIZ: "Création du quiz",
  AJOUTER_QUESTION: "Ajouter une question",
  IA: "IA",
  SIGNALEMENT: "Signalement",
};

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                          Composant principale
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

function AdminPanel({ socket }) {
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                Déclaration des états (variables globales)
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  const [listeQuiz, editerListeQuiz] = useState([]);
  const [alerte, editerAlerte] = useState({ message: null, type: "" });
  const [etatPanel, editerEtat] = useState(ETATS.CHARGEMENT);
  const [ongletActif, editerOngletActif] = useState(ONGLETS.CREER_QUIZ);

  // Pour la création d'un quiz
  const [nvQuizNom, editerNvQuizNom] = useState("");
  const [nvQuizDesc, editerNvQuizDesc] = useState("");

  // Pour la création d'une question
  const [nvQuestQuizId, editerNvQuestQuizId] = useState("");
  const [nvQuestEnonce, editerNvQuestEnoncé] = useState("");
  const [nvQuestType, editerNvQuestType] = useState("simple");
  const [nvQuestSujet, editerNvQuestSujet] = useState("");
  const [nvQuestReponse, editerNvQuestRéponse] = useState("");
  const [nvQuestPoints, editerNvQuestPoints] = useState(5);
  const [nvQuestProp1, editerNvQuestProp1] = useState("");
  const [nvQuestProp2, editerNvQuestProp2] = useState("");
  const [nvQuestProp3, editerNvQuestProp3] = useState("");
  const [nvQuestProp4, editerNvQuestProp4] = useState("");

  // Pour la création par IA
  const [nvQuizIaNom, editerNvQuizIANom] = useState("");
  const [nvQuizIaDesc, editerNvQuizIADesc] = useState("");
  const [nbQuestSimplesIa, editerNbQuestionsSimplesIA] = useState(2);
  const [nbQuestQcmIa, editerNbQuestionsQcmIA] = useState(3);

  // Pour les signalements
  const [listeSignalements, editerListeSignalements] = useState([]);

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                       Fonction utilitaire et effets
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  async function chargerQuiz() {
    try {
      const réponse = await fetch("/api/selection_quiz");
      const data = await réponse.json();

      if (!réponse.ok) throw new Error(data.erreur || "Erreur réseau.");

      editerListeQuiz(data);
      editerEtat(ETATS.ADMINISTRATION);
    } catch (erreur) {
      console.error(erreur);
      editerAlerte({
        message: "Erreur de chargement des quiz.",
        type: "danger",
      });
      editerEtat(ETATS.ADMINISTRATION);
    }
  }

  async function chargerSignalement() {
    try {
      const réponse = await fetch("api/admin/signalements");
      const data = await réponse.json();

      if (!réponse.ok) throw new Error(data.erreur || "Erreur réseau.");

      editerListeSignalements(data);
      editerEtat(ETATS.GESTION_SIGNALEMENT);
    } catch (erreur) {
      console.error(erreur);
      editerAlerte({
        message: "Erreur de chargement des signalements.",
        type: "danger",
      });
      editerEtat(ETATS.ADMINISTRATION);
    }
  }

  useEffect(() => {
    editerEtat(ETATS.CHARGEMENT);

    if (ongletActif === ONGLETS.AJOUTER_QUESTION) {
      chargerQuiz();
    }

    if (ongletActif === ONGLETS.SIGNALEMENT) {
      chargerSignalement();
    } else {
      editerEtat(ETATS.ADMINISTRATION);
    }
  }, [ongletActif]);

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //             Les fonctions pour les actions de l'administrateur
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  /**
   * Quand l'administrateur soumet un nouveau quiz
   */
  async function créerQuiz(event) {
    event.preventDefault();
    const data = {
      nom: nvQuizNom,
      description: nvQuizDesc,
    };

    try {
      const réponse = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const nv_quiz = await réponse.json();

      if (!réponse.ok) throw new Error(data.erreur || "Erreur réseau.");

      editerAlerte({ message: `Quiz ${nv_quiz.nom} créé !`, type: "success" });

      // Mise à jour de la liste de quiz pour l'affichage
      await chargerQuiz();

      editerNvQuizNom("");
      editerNvQuizDesc("");
      editerNbQuestionsQcmIA(3);
      editerEtat(ETATS.ADMINISTRATION);
    } catch (erreur) {
      console.error(erreur);
      editerAlerte({ message: erreur.message, type: "danger" });
    }
  }

  /**
   * Quand l'administrateur soumet une nouvelle question
   */
  async function créerQuestion(event) {
    event.preventDefault();
    let data;
    if (nvQuestType === "qcm") {
      data = {
        quiz_id: parseInt(nvQuestQuizId),
        enonce: nvQuestEnonce,
        type_question: nvQuestType,
        sujet_question: nvQuestSujet,
        reponse_correcte: nvQuestReponse,
        points: parseInt(nvQuestPoints),
        propositions: [nvQuestProp1, nvQuestProp2, nvQuestProp3, nvQuestProp4],
      };
    } else {
      data = {
        quiz_id: parseInt(nvQuestQuizId),
        enonce: nvQuestEnonce,
        type_question: nvQuestType,
        sujet_question: nvQuestSujet,
        reponse_correcte: nvQuestReponse,
        points: parseInt(nvQuestPoints),
      };
    }
    try {
      const réponse = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const nv_quest = await réponse.json();

      if (!réponse.ok) throw new Error(data.erreur || "Erreur réseau.");

      editerAlerte({
        message: `Question ${nv_quest.énoncé} créé !`,
        type: "success",
      });

      editerNvQuestQuizId("");
      editerNvQuestType("simple");
      editerNvQuestEnoncé("");
      editerNvQuestSujet("");
      editerNvQuestPoints(5);
      editerNvQuestRéponse("");
      editerNvQuestProp1("");
      editerNvQuestProp2("");
      editerNvQuestProp3("");
      editerNvQuestProp4("");
      editerEtat(ETATS.ADMINISTRATION);
    } catch (erreur) {
      console.error(erreur);
      editerAlerte({ message: erreur.message, type: "danger" });
    }
  }

  /**
   * Création par l'IA
   */
  async function créerQuizIA(event) {
    event.preventDefault();

    if (!socket) {
      editerAlerte({
        message: "Erreur: Problème de connexion avec le backend.",
        type: "danger",
      });
      return;
    }

    const data = {
      nom: nvQuizIaNom,
      desc: nvQuizIaDesc,
      nb_questions_simples: parseInt(nbQuestSimplesIa) || 10,
      nb_questions_qcm: parseInt(nbQuestQcmIa) || 10,
    };

    editerAlerte({
      message: "Génération lancée en arrière plan.",
      type: "info",
    });
    socket.emit("demande_generation_ia", data);

    editerNvQuizIANom("");
    editerNvQuizIADesc("");
    editerNbQuestionsSimplesIA(2);
    nbQuestQcmIa(3);
  }

  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
  //                          Affichage
  //"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

  function renderContent() {
    if (etatPanel === ETATS.CHARGEMENT) {
      return (
        <div
          className="admin-container"
          style={{ textAlign: "center", marginTop: "50px" }}
        >
          <div className="spinner-border text-primary" role="status"></div>
          <h2>Chargement de l'interface...</h2>
        </div>
      );
    }

    return (
      <div className="admin-container">
        <header className="admin-header">
          <h1>Panneau d'Administration</h1>
        </header>

        {/* Zone d'alerte */}
        {alerte.message && (
          <div className={`admin-alerte alerte-${alerte.type}`}>
            {alerte.message}
          </div>
        )}

        {/* Liste des onglets */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${ongletActif === ONGLETS.CREER_QUIZ ? "active" : ""}`}
            onClick={() => editerOngletActif(ONGLETS.CREER_QUIZ)}
          >
            Nouveau Quiz
          </button>
          <button
            className={`tab-btn ${ongletActif === ONGLETS.AJOUTER_QUESTION ? "active" : ""}`}
            onClick={() => editerOngletActif(ONGLETS.AJOUTER_QUESTION)}
          >
            Nouvelle Question
          </button>
          <button
            className={`tab-btn ${ongletActif === ONGLETS.CREATION_IA ? "active" : ""}`}
            onClick={() => editerOngletActif(ONGLETS.CREATION_IA)}
          >
            Nouveau Quiz via l'IA
          </button>
          <button
            className={`tab-btn ${ongletActif === ONGLETS.SIGNALEMENT ? "active" : ""}`}
            onClick={() => editerOngletActif(ONGLETS.SIGNALEMENT)}
          >
            Signalements
          </button>
        </div>

        <div className="tab-content">
          {/* Création d'un quiz */}
          {ongletActif === ONGLETS.CREER_QUIZ && (
            <section className="card mb-4">
              <div className="card-header">
                <h2>Créer un Nouveau Quiz</h2>
              </div>
              <form
                id="form-creer-quiz"
                className="card-body"
                onSubmit={créerQuiz}
              >
                <div className="mb-3">
                  <label htmlFor="quiz-nom" className="form-label">
                    Nom du Quiz:
                  </label>
                  <input
                    type="text"
                    id="quiz-nom"
                    value={nvQuizNom}
                    onChange={(e) => editerNvQuizNom(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="quiz-desc" className="form-label">
                    Description du Quiz:
                  </label>
                  <textarea
                    id="quiz-desc"
                    className="form-control"
                    rows="2"
                  ></textarea>
                </div>
                <button type="submit">Créer le Quiz</button>
              </form>
            </section>
          )}

          {/* Création d'une question */}
          {ongletActif === ONGLETS.AJOUTER_QUESTION && (
            <section className="card">
              <div className="card-header">
                <h2>Ajouter une Question</h2>
              </div>

              <form
                id="form-ajouter-question"
                className="card-body"
                onSubmit={créerQuestion}
              >
                <div className="mb-3">
                  <label htmlFor="select-quiz-id" className="form-label">
                    Choisir le Quiz:
                  </label>
                  <select
                    id="select-quiz-id"
                    className="form-select"
                    value={nvQuestQuizId}
                    onChange={(e) => editerNvQuestQuizId(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      -- Choisir un quiz --
                    </option>
                    {listeQuiz.map((quiz) => (
                      <option key={quiz.id} value={quiz.id}>
                        {quiz.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="question-enonce" className="form-label">
                    Enoncé de la Question:
                  </label>
                  <input
                    type="text"
                    id="question-enonce"
                    value={nvQuestEnonce}
                    onChange={(e) => editerNvQuestEnoncé(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label htmlFor="question-sujet" className="form-label">
                      Sujet:
                    </label>
                    <input
                      type="text"
                      id="question-sujet"
                      value={nvQuestSujet}
                      onChange={(e) => editerNvQuestSujet(e.target.value)}
                      className="form-control"
                      placeholder="Ex: Sport, Cinéma..."
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="question-points" className="form-label">
                      Points:
                    </label>
                    <input
                      type="number"
                      id="question-points"
                      value={nvQuestPoints}
                      onChange={(e) => editerNvQuestPoints(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="selec-type-question" className="form-label">
                    Type de Question
                  </label>
                  <select
                    id="select-type-question"
                    className="form-select"
                    value={nvQuestType}
                    onChange={(e) => editerNvQuestType(e.target.value)}
                  >
                    <option value="simple">Simple</option>
                    <option value="qcm">QCM</option>
                  </select>
                </div>

                {nvQuestType === "qcm" && (
                  <div id="propositions-container" className="mb-3">
                    <label className="form-label">
                      Propositions (pour QCM)
                    </label>
                    <input
                      type="text"
                      id="prop-1"
                      className="form-control mb-2"
                      placeholder="Proposition 1"
                      value={nvQuestProp1}
                      onChange={(e) => editerNvQuestProp1(e.target.value)}
                    />

                    <input
                      type="text"
                      id="prop-2"
                      className="form-control mb-2"
                      placeholder="Proposition 2"
                      value={nvQuestProp2}
                      onChange={(e) => editerNvQuestProp2(e.target.value)}
                    />

                    <input
                      type="text"
                      id="prop-3"
                      className="form-control mb-2"
                      placeholder="Proposition 3"
                      value={nvQuestProp3}
                      onChange={(e) => editerNvQuestProp3(e.target.value)}
                    />

                    <input
                      type="text"
                      id="prop-4"
                      className="form-control mb-2"
                      placeholder="Proposition 4"
                      value={nvQuestProp4}
                      onChange={(e) => editerNvQuestProp4(e.target.value)}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label htmlFor="question-reponse" className="form-label">
                    Réponse Correcte:
                  </label>
                  <input
                    type="text"
                    id="question-reponse"
                    className="form-control"
                    value={nvQuestReponse}
                    onChange={(e) => editerNvQuestRéponse(e.target.value)}
                    placeholder="Pour un QCM, entrez le numéro (1, 2, 3 ou 4)"
                    required
                  />
                </div>

                <button type="submit" className="btn btn-success">
                  Ajouter la Question
                </button>
              </form>
            </section>
          )}

          {/* Création par IA */}
          {ongletActif === ONGLETS.CREATION_IA && (
            <section className="card mb-4">
              <div className="card-header">
                <h2> Générer un Quiz par IA</h2>
              </div>

              <form
                id="form-generer-ia"
                className="card-body"
                onSubmit={créerQuizIA}
              >
                <div className="alert alert-info">
                  <strong>Note: </strong>La génération peut prendre jusqu'à 30
                  secondes. Le serveur sera indisponible pendant ce temps.
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label htmlFor="ia-quiz-nom" className="form-label">
                      Nom du Quiz:
                    </label>
                    <input
                      type="text"
                      id="ia-quiz-nom"
                      className="form-control"
                      value={nvQuizIaNom}
                      onChange={(e) => editerNvQuizIANom(e.target.value)}
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="ia-quiz-desc" className="form-label">
                      Description du Quiz:
                    </label>
                    <input
                      type="text"
                      id="ia-quiz-desc"
                      className="form-control"
                      value={nvQuizIaDesc}
                      onChange={(e) => editerNvQuizIADesc(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label htmlFor="ia-nb-quest-simples" className="form-label">
                      Nombre de questions 'Simple':
                    </label>
                    <input
                      type="number"
                      id="ia-nb-quest-simples"
                      className="form-control"
                      value={nbQuestSimplesIa}
                      onChange={(e) =>
                        editerNbQuestionsSimplesIA(e.target.value)
                      }
                    />
                  </div>

                  <div className="col-md-6">
                    <label htmlFor="ia-nb-quest-qcm" className="form-label">
                      Nombre de questions QCM:
                    </label>
                    <input
                      type="number"
                      id="ia-nb-quest-qcm"
                      className="form-control"
                      value={nbQuestQcmIa}
                      onChange={(e) => editerNbQuestionsQcmIA(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-generer-ia"
                  className="btn btn-warning"
                >
                  Lancer la génération
                </button>
              </form>
            </section>
          )}

          {/* Gestion des signalements */}
          {ongletActif === ONGLETS.SIGNALEMENT && (
            <div className="card">
              <div className="card-header">
                <h2>Gestion des Signalements</h2>
              </div>

              <div className="card-body">
                {listeSignalements.length === 0 ? (
                  <p className="text-center text-muted">
                    Aucun signalement à traiter.
                  </p>
                ) : (
                  <div className="signalements-list">
                    {listeSignalements.map((signalement) => (
                      <GestionSignalement
                        key={signalement.id}
                        signalement={signalement}
                        onRefresh={chargerSignalement}
                        onAlert={editerAlerte}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return renderContent();
}

//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
//                          Composant secondaire
//"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function GestionSignalement({ signalement, onRefresh, onAlert }) {
  const [chargement, editerChargement] = useState(false);
  const { id, message, question_id, énoncé, type_question, réponse } =
    signalement;

  async function gestionAdmin(url, method, reussiteMessage) {
    if (!window.confirm("Confirmez votre décision ?")) return;

    editerChargement(true);
    try {
      const reponse = await fetch(url, {
        method: method,
        credentials: "include",
      });
      if (!reponse.ok) throw new Error("Erreur serveur");

      onAlert({ message: reussiteMessage, type: "success" });
      onRefresh();
    } catch (erreur) {
      console.error(erreur);
      onAlert({ message: erreur.message, type: "danger" });
      editerChargement(false);
    }
  }

  return (
    <div className="card mb-3 p-3 shadow-sm">
      <div className="description-signalement">
        <h5 className="text-primary">Question: {énoncé}</h5>
        <p>
          Réponse: {réponse} ({type_question})
        </p>
        <div className="alert alert-warning">Signalement: {message}</div>
      </div>

      <div className="d-flex gap-2 justify-content-end">
        <button
          className="btn btn-outline-secondary"
          onClick={() =>
            gestionAdmin(
              `/api/admin/signalement/${id}`,
              "DELETE",
              "Signalement supprimé.",
            )
          }
          disabled={chargement}
        >
          Supprimer le signalement
        </button>

        <button
          className="btn btn-danger"
          onClick={() =>
            gestionAdmin(
              `/api/admin/question/${question_id}`,
              "DELETE",
              "Question et signalement supprimés.",
            )
          }
          disabled={chargement}
        >
          Supprimer la question
        </button>
      </div>
    </div>
  );
}

export default AdminPanel; // Exportation du composant
