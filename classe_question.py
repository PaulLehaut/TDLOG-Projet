from abc import ABC, abstractmethod

class QuestionGénérale(ABC):

    def __init__(self, texte : str, réponse : str, points : int):
        self._texte = texte
        self._réponse = réponse
        self._points = points
    
    @property
    def texte(self) -> str:
        return self._texte

    @texte.setter
    def texte(self, valeur : str) -> None:
        self._texte = valeur
    
    @property 
    def réponse(self) -> str:
        return self._réponse

    @réponse.setter 
    def réponse(self, valeur : str) -> None:
        self._réponse = valeur
    
    @property
    def points(self) -> int:
        return self._points
    
    @points.setter
    def points(self, valeur : int) -> None:
        self._points = valeur

    @abstractmethod 
    def afficher_question(self):
        pass 

    @abstractmethod
    def obtenir_réponse(self):
        pass

    @abstractmethod
    def vérifier_réponse(self, réponse_utilisteur):
        pass

    