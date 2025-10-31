from classe_quiz import Quiz
from classe_question import QuestionGénérale, QuestionSimple, QuestionQCM

if __name__ == "__main__":

    test_quiz = Quiz('questions.json')

    if not test_quiz.question_chargées:
        print("Problème de chargement.")
    else:
        print("\nDémarrage du Quiz !")
        while not test_quiz.quiz_fini:

            index_live = test_quiz.index_live
            question = test_quiz.questions[index_live]
            print(f"\n Question numéro: {index_live + 1}:")
            print(question.énoncé)
            if isinstance(question, QuestionQCM):
                for proposition in question.propositions:
                    print(proposition)
            
            réponse = input("Votre réponse: ")
            bonne_réponse = test_quiz.valider_réponse(réponse)
            if bonne_réponse:
                print(f"Bonne réponse ! Votre score est: {test_quiz.score}")
            else:
                print(f"Mauvaise réponse, bien guez !")
        
        print(f"\nQuiz terminé, votre score: {test_quiz.score} / {sum(q.points for q in test_quiz.questions)}")

            

