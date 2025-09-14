// websocket.js - Gerenciamento da conexão WebSocket

// Variáveis para controlar a atualização atual
let currentBatchNumber = 0;
let currentTotalBatches = 0;
let currentUpdateId = 0;
let currentUpdateBusesData = [];

// Conectar ao WebSocket
const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/gps-updates`;

    console.log('Conectando ao WebSocket:', wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('Conectado ao WebSocket');
        document.getElementById('connection-status').textContent = 'Conectado';
        document.getElementById('connection-status').className = 'status-connected';
        document.getElementById('last-update-time').textContent = 'Conectado - aguardando dados...';

        // Resetar dados da atualização atual
        currentUpdateBusesData = [];
        currentBatchNumber = 0;
        currentTotalBatches = 0;
        currentUpdateId++;
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log('Mensagem recebida:', message);

            // Verificar se é o formato com metadados
            if (message.batch && Array.isArray(message.batch)) {
                const batchData = message.batch;
                const batchNumber = message.batchNumber;
                const totalBatches = message.totalBatches;

                console.log(`Recebido batch ${batchNumber}/${totalBatches} com ${batchData.length} registros`);

                // Se for uma nova atualização (batchNumber = 1), resetar os dados
                if (batchNumber === 1) {
                    currentUpdateBusesData = [];
                    currentTotalBatches = totalBatches;
                    currentUpdateId++;
                    console.log(`Iniciando nova atualização #${currentUpdateId} com ${totalBatches} batches`);
                }

                // Acumular dados da atualização atual
                currentUpdateBusesData = currentUpdateBusesData.concat(batchData);

                // Se for o último batch desta atualização, processar os dados
                if (batchNumber === totalBatches) {
                    console.log(`Último batch recebido. Total de ${currentUpdateBusesData.length} ônibus na atualização #${currentUpdateId}`);

                    // MANTER APENAS OS DADOS DA ÚLTIMA ATUALIZAÇÃO COMPLETA
                    allBusesData = [...currentUpdateBusesData];

                    // ATUALIZAR OS DADOS FILTRADOS com base nos filtros atuais
                    applyFilters();

                    // Atualizar interface
                    updateStats();
                    renderTable();

                    // Atualizar mapa apenas se estiver visível
                    if (showMap) {
                        updateMapMarkers(showingAllBuses);
                    }

                    document.getElementById('last-update-time').textContent =
                        `Última atualização: ${new Date().toLocaleTimeString()}`;
                }

            } else if (Array.isArray(message)) {
                console.log('Recebidos', message.length, 'registros (formato antigo)');
                // Formato antigo: tratar como atualização completa
                allBusesData = [...message];
                applyFilters();
                updateStats();
                renderTable();

                // Atualizar mapa apenas se estiver visível
                if (showMap) {
                    updateMapMarkers(showingAllBuses);
                }

                document.getElementById('last-update-time').textContent =
                    `Última atualização: ${new Date().toLocaleTimeString()} `;
            } else {
                console.error('Formato de mensagem desconhecido:', message);
            }

        } catch (error) {
            console.error('Erro ao processar dados:', error);
        }
    };

    ws.onclose = () => {
        console.log('Conexão WebSocket fechada');
        document.getElementById('connection-status').textContent = 'Desconectado';
        document.getElementById('connection-status').className = 'status-disconnected';
        document.getElementById('last-update-time').textContent = 'Desconectado - tentando reconectar...';

        setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        document.getElementById('connection-status').textContent = 'Erro';
        document.getElementById('connection-status').className = 'status-disconnected';
    };

};