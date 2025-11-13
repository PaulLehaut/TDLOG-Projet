document.addEventListener('DOMContentLoaded', () => {
    console.log('Démarrage du script JavaScript.'); // Affiche un message dans la console (F12)

    // Récupération des balises pour le traîtement
    const énoncé_question = document.getElementById('énoncé_question');
    const boîte_réponse = document.getElementById('boîte_réponse');
    const affichage_score = document.getElementById('affichage_score');
    const compteur_question = document.getElementById('compteur-question');
    const boîte_choix_nb_questions = document.getElementById('choix-nombre-questions');

    // On récupère l'URL des EndPoints
    const api_url_sélection_quiz = 'http://127.0.0.1:5000/api/selection_quiz'
    const api_url_démarrage_quiz = '/api/quiz/start/'
    const api_url_afficher_question_suivante = '/api/quiz/question';
    const api_url_reset = '/api/reset';
    const api_url_post_réponse = '/api/reponse';

    /** 
    * On définit une fonction pour mettre le jeu en pause (pour après une réponse par exemple)
    * @param {number} ms Le temps de pause
    */
    async function pause(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let total_question = 0; // Variable globale indiquant le total de question

    // Sélection du Quiz
    async function sélection_quiz()
    {
        console.log("Sélection d'un quiz.")
        
        try 
        {
            énoncé_question.innerHTML = '';
            boîte_réponse.innerHTML = '';
            compteur_question.style.display = 'none';
            const liste_quiz = await fetch(api_url_sélection_quiz, {credentials: 'include'});
            const liste_quiz_js = await liste_quiz.json();
            console.log("Quiz reçus.");
            
            const nb_questions = document.getElementById('limite-questions')
            boîte_choix_nb_questions.style.display = 'block';
            const liste_boutons_quiz = [];
            liste_quiz_js.forEach((quiz, index) =>
            {
                const bouton = document.createElement('button');
                bouton.textContent = quiz['nom'];
                bouton.addEventListener('click', () => 
                {
                    console.log(`Choix du quiz: ${quiz['nom']}.`);
                    id_quiz_choisi = quiz['id'];
                    const nb_questions_choisi = nb_questions.value;
                    liste_boutons_quiz.forEach(bouton => bouton.disabled = true)
                    boîte_réponse.innerHTML = '';
                    démarrage(id_quiz_choisi, nb_questions_choisi);
                })
                liste_boutons_quiz.push(bouton);
                boîte_réponse.appendChild(bouton);
            })

        }
        catch(erreur)
        {
            énoncé_question.textContent = "Erreur dans la sélection du quiz.";
            console.error("Erreur dans la sélection du quiz: ", erreur);
        }
    };

    // On lance le quiz
    async function démarrage(id_quiz_choisi, nb_questions)
    {
        try
        {

            const quiz_data = await fetch(`${api_url_démarrage_quiz}${id_quiz_choisi}?limite=${nb_questions}`, {credentials: 'include'});
            const quiz_data_js = await quiz_data.json();

            énoncé_question.innerHTML = '';
            boîte_réponse.innerHTML = '';
            boîte_choix_nb_questions.style.display = 'none';

            const intro = "Vous avez choisi le quiz: ";
            énoncé_question.textContent = `${intro}${quiz_data_js['nom']}`;
            boîte_réponse.textContent = quiz_data_js['description'];
            const bouton = document.createElement('button');
            bouton.textContent = "Commencer le quiz ?";
            bouton.addEventListener('click', async () =>
            {
                await pause(1000);
                afficher_prochaine_question();
                bouton.disabled = true;
            })
            boîte_réponse.appendChild(bouton);
            total_question = quiz_data_js.nombre_questions;
            compteur_question.style.display = 'block'
        }
        catch(erreur)
        {
            énoncé_question.textContent = "Erreur dans le lancement du quiz.";
            console.error("Erreur dans le lancement du quiz: ", erreur);
        }
    }


    // Chargement de la question
    async function afficher_prochaine_question() // Async signifie que cette fonction peut faire des pauses
    {
        console.log("Affichage d'une question à l'aide de l'API.");

        try 
        {
            // On commence par récupérer et afficher la question
            const data_question = await fetch(api_url_afficher_question_suivante, {credentials: 'include'}); // Demande à recevoir la question (ok car méthode GET), on attend que le serveur réponde grâce à await
            const question = await data_question.json(); // Le code python renvoie la question sous la forme d'un dictionnaire, on la convertit donc au format json pour la lecture
            
            console.log("Question reçue:", question); // On vérifie qu'on a bien reçu la question

            énoncé_question.textContent = question.énoncé;

            // Puis on gère la réponse utilisateur
            boîte_réponse.innerHTML = '';
            if (question.type_question ==="qcm")
            {
                compteur_question.textContent = `Question ${question.index + 1}/ ${total_question}`;
                obtenir_réponse_qcm(question.propositions); // Cette fonction récupère la réponse et la vérifie à l'aide de vérifier_réponse(réponse_utilisateur)
            }
            else if (question.type_question ==="simple")
            {
                compteur_question.textContent = `Question ${question.index + 1}/ ${total_question}`;
                obtenir_réponse_question_simple(); // Cette fonction récupère la réponse et la vérifie à l'aide de vérifier_réponse(réponse_utilisateur)
            }
            else if (question.état === "terminé")
            {
                énoncé_question.textContent = `Quiz terminé ! Score : ${question.score} / ${question.total}`;
                const bouton = document.createElement('button');
                bouton.textContent = "Redémarrer un quiz ?";
                bouton.addEventListener('click', () => 
                {
                    reset();
                    bouton.disabled = true;
                })
                boîte_réponse.appendChild(bouton);
                compteur_question.style.display = 'none';
            }
        }
        catch(erreur)
        {
            énoncé_question.textContent = "Erreur de connexion avec le serveur."
            console.error("Erreur de connexion avec le serveur:", erreur)
        }
    }


    /**
    * Affichage des propositions pour un qcm
    * @param {string[]} propositions
    */
    function obtenir_réponse_qcm(propositions)
    {
        const liste_boutons_propositions = [];
        propositions.forEach((proposition, index) =>
        {
            const bouton = document.createElement('button'); // crée un bouton en HTML
            bouton.textContent = proposition;
            bouton.addEventListener('click', () =>
            {
                console.log(`Choix de la réponse : ${index + 1}`);
                liste_boutons_propositions.forEach(bouton => bouton.disabled = true);
                vérifier_réponse(index + 1);
            });
            boîte_réponse.appendChild(bouton);
            liste_boutons_propositions.push(bouton);
        });
    };


    // Récupération de la réponse pour une question simple
    function obtenir_réponse_question_simple()
    {
        // Champs de réponse
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Votre réponse:';

        const bouton = document.createElement('button');
        bouton.textContent = "Valider";
        bouton.addEventListener('click', () =>
        {
            const réponse = input.value;
            console.log(`Réponse validée: ${réponse}. `);
            input.disabled = true;
            bouton.disabled = true;
            vérifier_réponse(réponse);
        });
        boîte_réponse.append(input);
        boîte_réponse.append(bouton);
    };


    // Vérification de la réponse
    async function vérifier_réponse(réponse_utilisateur)
    {
        console.log("Vérification de la réponse à l'aide de l'API.");

        try 
        {
            // On transmet la réponse au BackEnd
            const vérification_réponse = await fetch(api_url_post_réponse,{
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({'réponse_utilisateur': réponse_utilisateur}),
                credentials: 'include'
            }); 

            const résultat = await vérification_réponse.json();
            await feedback(résultat);
            afficher_prochaine_question();
        }
        catch(erreur)
        {
            énoncé_question.textContent = "Erreur lors de la vérification."
            console.error("Erreur de connexion avec le serveur:", erreur)
        }
    }


    // Feedback en fonction de la réponse
    async function feedback(résultat)
    {
        const texte = document.createElement('p');
        if (résultat.résultat_correct)
        {
            affichage_score.textContent = résultat.score;
            texte.textContent = "Bonne réponse !";
            texte.style.color = "green";
        }
        else 
        {
            texte.textContent = "Mauvaise réponse, bien guez !";
            texte.style.color = "red";
        }
        boîte_réponse.appendChild(texte);
        await pause(2000);
    }


    // On redémarre le quiz
    async function reset()
    {
        console.log("Affichage d'une question à l'aide de l'API.");

        try 
        {
            const data_reset = await fetch(api_url_reset, {credentials: 'include'}); // Demande à réinitialiser le quiz (ok car méthode GET), on attend que le serveur réponde grâce à await
            const message_reset = await data_reset.json(); // Le code python renvoie la question sous la forme d'un dictionnaire, on la convertit donc au format json pour la lecture
            compteur_question.textContent = `Question ${1}/ ${total_question}`;
            compteur_question.style.display = 'none';
            affichage_score.textContent = 0;
            console.log("Teste réinitialisé."); // On vérifie qu'on a bien réinitialisé
            
            sélection_quiz();
        }
        catch(erreur)
        {
            énoncé_question.textContent = "Erreur de connexion avec le serveur."
            console.error("Erreur de connexion avec le serveur:", erreur)
        }
    }

    // On démarre !!! --------------------------------------------------------------------
    sélection_quiz();
});