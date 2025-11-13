import google.generativeai as genai
import json
import os
import sys

def générer_prompt(nom, desc, nb_questions_simples, nb_questions_qcm):
    prompt = f"""Génère un quiz sur le sujet "{nom}".
    Le quiz doit avoir {nb_questions_simples} questions simples (sans propositions) et {nb_questions_qcm} questions de type QCM.
    Le format de sortie doit être UNIQUEMENT un JSON valide, sans markdown (pas de ```json au début).
    
    Voici la structure exacte du JSON attendu :
    [
        {{
            "quiz_nom": "{nom}",
            "quiz_desc": "{desc}",
            "questions": [
                {{
                    "question_énoncé": "Exemple de question simple ?",
                    "question_type": "simple",
                    "question_sujet": "Général",
                    "question_réponse": "Réponse",
                    "question_points": 5,
                    "question_propositions": []
                }},
                {{
                    "question_énoncé": "Exemple de question QCM ?",
                    "question_type": "qcm",
                    "question_sujet": "Général",
                    "question_réponse": "1",
                    "question_points": 5,
                    "question_propositions": [
                        "Réponse A",
                        "Réponse B",
                        "Réponse C",
                        "Réponse D"
                    ]
                }}
            ]
        }}
    ]
    """
    return prompt

def appeler_ia(nom, desc, nb_questions_simples, nb_questions_qcm):
    
    #On appelle la clef IA Google
    key = os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("Erreur: La variable d'environnement GOOGLE_API_KEY n'est pas définie.")
        raise ValueError("Clé API GOOGLE_API_KEY manquante.")

    genai.configure(api_key = key)

    print("Appel de l'API Gemini... (cela peut prendre quelques secondes).")
    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        generation_config = genai.types.GenerationConfig(response_mime_type = "application/json")

        prompt = générer_prompt(nom, desc, nb_questions_simples, nb_questions_qcm)
        réponse = model.generate_content(prompt, generation_config = generation_config)

        json_brut = réponse.text
        print("Réponse reçue !")

        # On nettoie la réponse pour être sûr de ne traiter qu'un fichier json
        json_clean = json_brut.replace("```json", "").replace("```", "").strip()
        start_index = json_clean.find('[')
        end_index = json_clean.rfind(']')
        
        if start_index != -1 and end_index != -1:
            json_clean = json_clean[start_index : end_index + 1]
        # Fin du nettoyage

        json_data = json.loads(json_brut)

        with open('données_db.json', 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=4)
        print("Fichier données_db.json mis à jour avec succès !")

    except Exception as e:
        print(f"Erreur lors de la génération par l'IA : {e}.")
