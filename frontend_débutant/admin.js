document.addEventListener('DOMContentLoaded', () => {

    // Récupération des balises pour le traîtement
    const alerte_admin = document.getElementById('admin-alerte');
        // Création de Quiz
    const creer_quiz = document.getElementById('form-creer-quiz');
    const nom_quiz = document.getElementById('quiz-nom');
    const desc_quiz = document.getElementById('quiz-description');
        // Création de questions
    const creer_question = document.getElementById('form-ajouter-question');
    const liste_quiz_id = document.getElementById('select-quiz-id');
    const énoncé_question = document.getElementById('question-enonce');
    const sujet_question = document.getElementById('question-sujet');
    const points_question = document.getElementById('question-points');
    const type_question = document.getElementById('select-type-question');
    const boîte_propositions = document.getElementById('propositions-container');
    const prop1 = document.getElementById('prop-1');
    const prop2 = document.getElementById('prop-2');
    const prop3 = document.getElementById('prop-3');
    const prop4 = document.getElementById('prop-4');
    const réponse_question = document.getElementById('question-reponse');
        // Création par IA
    const generer_ia = document.getElementById('form-generer-ia');
    const quiz_nom_ia = document.getElementById('ia-quiz-nom');
    const quiz_desc_ia = document.getElementById('ia-quiz-desc');
    const nb_quest_simples_ia = document.getElementById('ia-nb-simples');
    const nb_quest_qcm_ia = document.getElementById('ia-nb-qcm');
    const boutton_générer_ia = document.getElementById('btn-generer-ia');

    // On récupère l'URL des EndPoints
    const api_url_liste_quiz = '/api/selection_quiz';
    const api_url_creer_quiz = '/api/admin/quiz';
    const api_url_creer_question = '/api/admin/questions';
    const api_url_generer_ia = '/api/admin/ia'

    // On récupère les quiz qui existent
    async function charger_quiz()
    {
        try
        {
            const data_quiz = await fetch(api_url_liste_quiz, {credentials: 'include'});
            const liste_quiz = await data_quiz.json();

            liste_quiz_id.innerHTML = '<option value = "">Choisir un quiz: </option>';
            liste_quiz.forEach(quiz => {
                const option = document.createElement('option');
                option.value = quiz.id;
                option.textContent = quiz.nom;
                liste_quiz_id.appendChild(option);
                
            });
        }
        catch (erreur)
        {
            afficher_alerte("Erreur de chargement des quiz.", 'danger');
        }
    }

    // On affiche les champs pour les propositions des QCM
    function afficher_champs_qcm()
    {
        if (type_question.value == 'qcm')
        {
            boîte_propositions.style.display = 'block'; // Affiche le champs
        }
        else
        {
            boîte_propositions.style.display = 'none'; // Cache le champs
        }
    }

    // S'occupe du formulaire pour créer un Quiz
    async function gestion_creer_quiz(event) // event est le formulaire
    {
        event.preventDefault(); // Empêche la page de se recharger

        const data = {
            nom: nom_quiz.value,
            description: desc_quiz.value
        };

        try
        {
            const réponse = await fetch(api_url_creer_quiz, {
                method : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
                credentials: 'include'
            });

            const nouveau_quiz = await réponse.json();

            if (!réponse.ok) // Gère les erreurs 400
            {
                throw new Error(nouveau_quiz.erreur || 'Erreur inconnue');
            }

            afficher_alerte(`Quiz ${nouveau_quiz.nom} créé avec succès, son id: ${nouveau_quiz.id}`, 'success');
            creer_quiz.reset(); // On vide le formulaire

            // On ajoute le nouveau Quiz au menu
            const option = document.createElement('option');
            option.value = nouveau_quiz.id;
            option.textContent = nouveau_quiz.nom;
            liste_quiz_id.appendChild(option);
        }
        catch(erreur)
        {
            afficher_alerte(erreur.message, 'danger');
        }
    }

    // S'occupe du formulaire pour créer un question
    async function gestion_creer_question(event)
    {
        event.preventDefault(); // Empêche la page de se recharger

        let data;
        if (type_question.value == 'simple')
        {
            data = {
                quiz_id: parseInt(liste_quiz_id.value),
                énoncé: énoncé_question.value,
                sujet_question: sujet_question.value,
                points: points_question.value,
                type_question: type_question.value,
                réponse_correcte: réponse_question.value,
            };
        }
        else
        {
            data = {
                quiz_id: parseInt(liste_quiz_id.value),
                énoncé: énoncé_question.value,
                sujet_question: sujet_question.value,
                points: points_question.value,
                type_question: type_question.value,
                réponse_correcte: réponse_question.value,
                propositions: [prop1.value, prop2.value, prop3.value, prop4.value]
            }
        }

        try
        {
            const réponse = await fetch(api_url_creer_question, {
                method : 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });

            const nouvelle_question = await réponse.json();

            if (!réponse.ok) // Gère les erreurs 400
            {
                throw new Error(nouvelle_question.erreur || 'Erreur inconnue');
            }

            afficher_alerte(`Question ${nouvelle_question.énoncé} créé avec succès, son id: ${nouvelle_question.id}.`, 'success');
            creer_question.reset(); // On vide le formulaire
        }
        catch(erreur)
        {
            afficher_alerte(erreur.message, 'danger');
        }
    }

    // S'occupe du formulaire généré par IA 
    async function gestion_generer_ia(event)
    {
        event.preventDefault();

        // On indique le chargement (car c'est long)
        boutton_générer_ia.disabled = true;
        boutton_générer_ia.textContent = 'Génération en cours, patience.'
        afficher_alerte("Appel IA en cours, patience.", "info");

        const data = {
            nom: quiz_nom_ia.value,
            desc: quiz_desc_ia.value,
            nb_quest_simples: parseInt(nb_quest_simples_ia.value),
            nb_quest_qcm: parseInt(nb_quest_qcm_ia.value)
        };

        try
        {
            const reponse = await fetch(api_url_generer_ia,
                {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify(data)
                }
            );

            const resultat = await reponse.json();

            if (!reponse.ok)
            {
                throw new Error(resultat.erreur || "Erreur lors de la génération par IA.");
            }

            afficher_alerte(resultat.rep, 'success');
            generer_ia.reset(); // On oublie pas de vider le formulaire
            charger_quiz();
        }
        catch (erreur)
        {
            afficher_alerte(erreur.message, 'danger');
        }
        finally
        {
            boutton_générer_ia.disabled = false;
            boutton_générer_ia.textContent = "Lancer la Génération IA";
        }
    }

    /** 
     * Affichage des messages de succès ou d'erreur
     * @param {string} message Le texte à afficher.
     * @param {'success' | 'danger'} type Le type d'alerte (vert ou rouge)
     */
    function afficher_alerte(message, type)
    {
        alerte_admin.textContent = message;
        alerte_admin.className = `alert alert-${type}`;// Met la couleur
        alerte_admin.style.display = 'block'; // Affiche la boîte
    }

    // Gestion des interactions de l'administrateur -----------------------------------------------
        
    // Soumission des formulaires
    creer_quiz.addEventListener('submit', gestion_creer_quiz);
    creer_question.addEventListener('submit', gestion_creer_question);
    generer_ia.addEventListener('submit', gestion_generer_ia);

    // Affichage des champs pour un qcm
    type_question.addEventListener('change', afficher_champs_qcm);

    

    // On démarre ----------------------------------------------------------------------------------
    charger_quiz();


})