// Fichier: frontend/src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// On import les pages
import QuizApp from './pages/QuizApp';
import AdminPanel from './pages/AdminPanel';
import Multijoueur from './pages/Multijoueur';

// Le styl global
import './App.css'; 

// Import du client 
import { io } from 'socket.io-client';

function App() {

  const [socket, editerSocket] = useState(null);

  // Etat pour les notifications 
  const [notification, editerNotification] = useState(null);

  useEffect(() => {

    const newSocket = io();
    editerSocket(newSocket);
    newSocket.on('connect', () => {
      console.log("Connexion au serveur réussie ! ID:", newSocket.id);
    });

    newSocket.on('message_serveur', (msg) =>
      {
        console.log(" Message reçu du backend:", msg);
      });

      // On définit ici deux écouteurs globaux pour la création de quiz par IA: la création pouvant être longue, il est important de pouvoir naviguer sur l'application en attendant
      newSocket.on('ia_terminee', (data) => {
        editerNotification({message: data.message, type: 'success'});
        // On l'efface après 5s 
        setTimeout(() => editerNotification(null), 5000);
      })
      newSocket.on('ia_erreur', (data) => {
        editerNotification({message:'Erreur IA:' + data.message, type: 'danger'});
        // On l'efface après 5s 
        setTimeout(() => editerNotification(null), 5000);
      })    

      return () => {
        newSocket.disconnect();
      };
  }, []);

  return (
    // Gestion de l'URL
    <BrowserRouter>
      
      {/* La barre de navigation (visible sur toutes les pages) */}
      <nav className="main-nav">
        <Link to="/">Jouer au Quiz</Link> | 
        <Link to="/admin">Administration</Link> |
        <Link to="/multijoueur">Multijoueur</Link>
      </nav>

      {/* Affichage des notifications */}
      {notification && (
        <div className={`global-notification ${notification.type}`}>
          {notification.message}
          <button onClick = {() => editerNotification(null)}>✖</button>
        </div>
      )}

      {/* Le système d'échange de contenu */}
      <Routes>
        {/* Si l'URL est "/", affiche le jeu */}
        <Route path="/" element={<QuizApp/>} />
        
        {/* Si l'URL est "/admin", affiche le panneau admin */}
        <Route path="/admin" element={<AdminPanel socket = {socket} />} />

        {/* Si l'URL est "/multijoueurs", affiche le panneau admin */}
        <Route path="/multijoueur" element={<Multijoueur socket = {socket} />} />
      </Routes>
      
    </BrowserRouter>
  );
}

export default App;