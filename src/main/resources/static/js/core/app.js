// app.js - Arquivo principal de inicialização da aplicação

// Iniciar aplicação quando a página carregar
window.onload = function() {
    connectWebSocket();  // Do websocket.js
    initMap();
    initializeMapListeners();
    loadItineraryData();     // Do monitoring.js
    setupItineraryAutoUpdate(); // Do monitoring.js
    initializeEventListeners(); // Do monitoring.js
};