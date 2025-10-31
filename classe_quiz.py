from classe_question import QuestionGénérale, QuestionSimple, QuestionQCM
import json

class Quiz: 

    def __init__(self, chemin_fichier: str) -> None:
        self._score = 0
        self._index_live = 0 # Indice de la question en cours de traitement
        self._quiz_fini = False
        self._questions: list[QuestionGénérale] = [] # On va récupérer les questions dans une liste
        self._questions_chargées = False

        """On va charger les questions du quiz à partir d'un fichier JSON depuis chemin_fichier."""
        try:
            with open(chemin_fichier, 'r', encoding = 'utf-8') as f:
                questions = json.load(f)

            for question in questions:
                question_catégorie = question.get("catégorie")
                try:
                    if question_catégorie == "simple":
                        nouvelle_question = QuestionSimple(question["énoncé"], question["réponse"], question["points"])
                    elif question_catégorie == "qcm":
                        nouvelle_question = QuestionQCM(question["énoncé"], question["réponse"], question["points"], question["propositions"])
                    else: 
                        print(f"Catégorie de question {question_catégorie} inconnue, elle ne figurera pas dans le quiz.")
                        continue
                    self._questions.append(nouvelle_question)
                except KeyError as e:
                    print(f"Clé manquante pour une question de catégorie {question_catégorie}: {e}, nous ignorons la question.")
            print(f"Quiz prêt !")
            self._questions_chargées = True

        except FileNotFoundError:
            print(f"Le fichier {chemin_fichier} n'a pas été trouvé, le quiz est vide.")
            

    @property
    def questions(self) -> list[QuestionGénérale]:
        return self._questions
    
    @property
    def score(self) -> int:
        return self._score
    
    @property
    def question_chargées(self) -> bool:
        return self._questions_chargées
    
    @score.setter
    def score(self, j : int) -> None:
        self._score = j

    @property
    def index_live(self) -> int:
        return self._index_live
    
    @index_live.setter
    def index_live(self, j : int) -> None:
        self._index_live = j

    @property
    def quiz_fini(self) -> bool:
        return self._quiz_fini
    
    @quiz_fini.setter
    def quiz_fini(self, etat: bool) -> None:
        self._quiz_fini = etat

    def maj_quiz(self) -> None:
        self.index_live += 1
        if self.index_live >= len(self.questions):
            self.quiz_fini = True
        
    def afficher_question_live(self):
        if not self.quiz_fini:
            return self.questions[self.index_live].afficher_question()
        else : # Si le quiz est terminé on renvoie None
            return None
    
    def valider_réponse(self, réponse) -> bool:
        if not self.quiz_fini:
            bonne_réponse = self.questions[self.index_live].vérifier_réponse(réponse)
            if bonne_réponse:
                self.score = self.score + self.questions[self.index_live].points
            self.maj_quiz()
            return bonne_réponse
        return False # On ne peut pas valider de réponse si le quiz est fini
    
