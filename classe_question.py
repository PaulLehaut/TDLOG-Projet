from abc import ABC, abstractmethod


class QuestionGénérale(ABC):

    def __init__(self, énoncé : str, réponse, points : int) -> None:
        self._énoncé = énoncé
        self._réponse = réponse
        self._points = points
    
    @property
    def énoncé(self) -> str:
        return self._énoncé

    @property 
    def réponse(self) -> str:
        return self._réponse
    
    @property
    def points(self) -> int:
        return self._points

    def afficher_question(self):
        pass

    @abstractmethod
    def vérifier_réponse(self, réponse_utilisteur) -> bool:
        pass


class QuestionSimple(QuestionGénérale):
    """Une question classique avec réponse ouverte comme: Quelle est la capitale de l'Italie ?"""

    def __init__(self, énoncé : str, réponse : str, points : int) -> None:
        super().__init__(énoncé, réponse, points)

    def afficher_question(self):
        return super().afficher_question()

    def vérifier_réponse(self, réponse_utilisteur: str) -> bool:
        réponse_finale = réponse_utilisteur.strip().lower()
        réponse_attendue = self.réponse.strip().lower()
        return réponse_attendue == réponse_finale

    

class QuestionQCM(QuestionGénérale):
    """Une question à choix multiples, les différentes propositions sont indexées par des nombres."""

    def __init__(self, énoncé : str, réponse : int, points : int, propositions : list[str]) -> None:
        super().__init__(énoncé, réponse, points)
        self._propositions = propositions 

    @property
    def propositions(self) -> list[str]:
        return self._propositions

    def afficher_question(self):
        pass

    def vérifier_réponse(self, réponse_utilisteur : int) -> bool:
        try:
            return int(réponse_utilisteur) == self.réponse
        except ValueError: 
            return False

