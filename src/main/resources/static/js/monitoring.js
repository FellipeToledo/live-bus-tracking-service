// tracking.js - JavaScript para a página de rastreamento de ônibus

// Variáveis para clusterização
let markerCluster = null;
let currentZoomLevel = 12;
let clusterEnabled = true;

let allBusesData = [];
let currentUpdateBusesData = []; // Dados da atualização atual (todos os batches)
let filteredBusesData = [];
let currentPage = 1;
const itemsPerPage = 50;
let currentSortColumn = -1;
let sortDirection = 1;

// Variáveis para controlar a atualização atual
let currentBatchNumber = 0;
let currentTotalBatches = 0;
let currentUpdateId = 0;

// Variáveis para o mapa
let map = null;
let busMarkers = {};
let showMap = false;
let mapInitialized = false;
let showingAllBuses = false;
let currentMapView = null; // Para armazenar a visualização atual do mapa
let addressMarker = null; // Marcador para o endereço pesquisado
let autocompleteTimeout = null;

// Variáveis para itinerários
let itineraryData = null; // Armazenará todos os dados de itinerário
let currentItineraryLines = {}; // Armazenará as linhas de itinerário atualmente exibidas

// Inicializar o mapa
const initMap = () => {
    const defaultCenter = [-23.5505, -46.6333];

    map = L.map('map').setView(defaultCenter, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Inicializar cluster de marcadores (AGORA DENTRO DA FUNÇÃO initMap)
    markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 100,
        disableClusteringAtZoom: 16,
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 100) size = 'large';
            else if (count > 10) size = 'medium';

            return L.divIcon({
                html: `<div class="cluster cluster-${size}">${count}</div>`,
                className: 'marker-cluster-custom',
                iconSize: L.point(40, 40)
            });
        }
    });

    if (clusterEnabled) {
        map.addLayer(markerCluster);
    }

    // Event listener para mudanças de zoom
    map.on('zoomend', function() {
        currentZoomLevel = map.getZoom();
        updateClusterBehavior();
    });

    mapInitialized = true;
    saveMapView();
};

// Toggle clusterização
document.getElementById('toggle-cluster').addEventListener('click', () => {
    clusterEnabled = !clusterEnabled;
    const toggleButton = document.getElementById('toggle-cluster');

    if (clusterEnabled) {
        // Remover todos os marcadores diretamente do mapa
        Object.values(busMarkers).forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });

        // Limpar e recriar o cluster group para garantir limpeza total
        markerCluster.clearLayers();

        // Adicionar todos os marcadores ao cluster
        markerCluster.addLayers(Object.values(busMarkers));

        // Adicionar o cluster de volta ao mapa
        map.addLayer(markerCluster);

        toggleButton.textContent = 'Desativar Cluster';
        console.log('Cluster ativado - marcadores clusterizados:', Object.keys(busMarkers).length);
    } else {
        // Remover o cluster do mapa
        map.removeLayer(markerCluster);

        // Adicionar marcadores individualmente ao mapa
        Object.values(busMarkers).forEach(marker => {
            marker.addTo(map);
        });

        toggleButton.textContent = 'Ativar Cluster';
        console.log('Cluster desativado - marcadores individuais:', Object.keys(busMarkers).length);
    }

    // Forçar redesenho do mapa
    map.invalidateSize();
});

// Salvar a visualização atual do mapa
const saveMapView = () => {
    if (!mapInitialized) return;
    currentMapView = {
        center: map.getCenter(),
        zoom: map.getZoom()
    };
};

// Restaurar a visualização salva do mapa
const restoreMapView = () => {
    if (!mapInitialized || !currentMapView) return;
    map.setView(currentMapView.center, currentMapView.zoom);
};

// Função para formatar o endereço extraindo apenas as partes relevantes
const formatAddress = (displayName) => {
    // Dividir o endereço por vírgulas
    const parts = displayName.split(',');

    // Manter apenas os primeiros elementos (rua, bairro, cidade)
    if (parts.length >= 3) {
        // Juntar os três primeiros componentes
        return `${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}`;
    }

    // Se não tiver pelo menos 3 partes, retornar o original
    return displayName;
};

// Buscar sugestões de endereço usando Nominatim com filtro para Rio de Janeiro
const fetchAddressSuggestions = async (query) => {
    if (!query || query.length < 3) {
        document.getElementById('autocomplete-suggestions').style.display = 'none';
        return;
    }

    try {
        // Parâmetros para restringir a busca ao Rio de Janeiro
        const viewbox = '-43.8,-23.1,-43.1,-22.8'; // Coordenadas aproximadas do RJ (ajustadas)
        const bounded = 1; // Forçar resultados dentro da área
        const countrycodes = 'br'; // Código do país (Brasil)

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}` +
            `&limit=5&countrycodes=${countrycodes}&bounded=${bounded}&viewbox=${viewbox}`
        );
        const data = await response.json();

        const suggestionsContainer = document.getElementById('autocomplete-suggestions');
        suggestionsContainer.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(item => {
                const suggestion = document.createElement('div');
                suggestion.className = 'autocomplete-suggestion';

                // Formatar o endereço para exibição (apenas partes relevantes)
                const displayText = formatAddress(item.display_name);
                suggestion.textContent = displayText;

                // Armazenar o endereço completo em um atributo de dados
                suggestion.setAttribute('data-full-address', item.display_name);

                suggestion.addEventListener('click', () => {
                    // Usar o endereço completo armazenado
                    const fullAddress = suggestion.getAttribute('data-full-address');
                    document.getElementById('search-address').value = displayText;
                    suggestionsContainer.style.display = 'none';
                    searchAddress(fullAddress, item.lat, item.lon);
                });

                suggestionsContainer.appendChild(suggestion);
            });
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';

            // Mostrar mensagem indicando que não foram encontrados resultados no RJ
            const noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'autocomplete-suggestion';
            noResultsMsg.textContent = 'Nenhum endereço encontrado no Rio de Janeiro';
            noResultsMsg.style.color = '#999';
            noResultsMsg.style.cursor = 'default';
            suggestionsContainer.appendChild(noResultsMsg);
            suggestionsContainer.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        document.getElementById('autocomplete-suggestions').style.display = 'none';
    }
};

// Buscar endereço usando Nominatim (OpenStreetMap)
const searchAddress = async (address = null, lat = null, lon = null) => {
    const addressValue = address || document.getElementById('search-address').value.trim();
    if (!addressValue) return;

    try {
        // Mostrar indicador de carregamento
        document.getElementById('search-address-btn').textContent = 'Buscando...';

        let result;
        if (lat && lon) {
            // Se já temos as coordenadas (vindo do autocomplete)
            result = { lat: parseFloat(lat), lon: parseFloat(lon), display_name: addressValue };
        } else {
            // Fazer uma nova busca com filtro para RJ
            const viewbox = '-43.8,-23.1,-43.1,-22.8';
            const bounded = 1;
            const countrycodes = 'br';

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressValue)}` +
                `&limit=1&countrycodes=${countrycodes}&bounded=${bounded}&viewbox=${viewbox}`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                result = data[0];
            } else {
                alert('Endereço não encontrado no Rio de Janeiro. Tente ser mais específico ou use um endereço do RJ.');
                return;
            }
        }

        const latVal = parseFloat(result.lat);
        const lonVal = parseFloat(result.lon);

        // Remover marcador anterior se existir
        if (addressMarker) {
            map.removeLayer(addressMarker);
        }

        // Adicionar marcador para o endereço encontrado
        addressMarker = L.marker([latVal, lonVal])
            .addTo(map)
            .bindPopup(`<strong>Endereço:</strong><br>${result.display_name}`)
            .openPopup();

        // Centralizar o mapa no endereço com zoom adequado
        map.setView([latVal, lonVal], 15);

        // Salvar a visualização
        saveMapView();

    } catch (error) {
        console.error('Erro ao buscar endereço:', error);
        alert('Erro ao buscar endereço. Tente novamente.');
    } finally {
        document.getElementById('search-address-btn').textContent = 'Buscar Endereço';
        document.getElementById('autocomplete-suggestions').style.display = 'none';
    }
};

// Atualizar marcadores no mapa
const updateMapMarkers = (showAll = false) => {
    if (!mapInitialized) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    const userInteracting = map._moving;

    // Limpar marcadores antigos de maneira robusta
    if (clusterEnabled && markerCluster) {
        // Modo cluster ativo - limpar apenas o cluster
        markerCluster.clearLayers();
    } else {
        // Modo cluster inativo - remover marcadores individuais do mapa
        Object.values(busMarkers).forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });
    }

    // Limpar referências dos marcadores antigos
    busMarkers = {};

    const dataToShow = showAll ? allBusesData : filteredBusesData;
    showingAllBuses = showAll;

    document.getElementById('show-all-btn').textContent =
        showAll ? 'Voltar para Busca' : 'Mostrar Todos no Mapa';

    if (dataToShow.length === 0) {
        document.getElementById('map-buses-count').textContent = 'Nenhum ônibus para exibir';
        updateClusterButtonState();
        return;
    }

    const busesWithCoords = dataToShow.filter(bus => bus.latitude && bus.longitude);
    const markers = [];

    busesWithCoords.forEach(bus => {
        const markerIcon = L.divIcon({
            className: 'bus-marker-icon',
            html: `
                <div class="bus-marker">
                    <div class="bus-marker-line">${bus.linha || ''}</div>
                </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const marker = L.marker([bus.latitude, bus.longitude], {icon: markerIcon});

        marker.bindPopup(`
            <strong>Ônibus ${bus.ordem || 'N/A'}</strong><br>
            Linha: ${bus.linha || 'N/A'}<br>
            Velocidade: ${bus.velocidade || '0'} km/h<br>
            Última atualização: ${bus.datahoraservidor ? new Date(bus.datahoraservidor).toLocaleString() : 'N/A'}
        `);

        // Adicionar dados customizados para popup de cluster
        marker.busData = bus;

        busMarkers[bus.ordem] = marker;
        markers.push(marker);
    });

    // Adicionar marcadores conforme o modo atual
    if (clusterEnabled) {
        // Adicionar todos os marcadores ao cluster
        markerCluster.addLayers(markers);

        // Configurar popup personalizado para clusters
        markerCluster.off('clusterclick'); // Remover event listeners anteriores
        markerCluster.on('clusterclick', function (a) {
            const clusterMarkers = a.layer.getAllChildMarkers();
            const popupContent = createClusterPopupContent(clusterMarkers);

            L.popup()
                .setLatLng(a.latlng)
                .setContent(popupContent)
                .openOn(map);
        });
    } else {
        // Adicionar marcadores individualmente ao mapa
        markers.forEach(marker => {
            marker.addTo(map);
        });
    }

    const totalBuses = markers.length;
    const totalText = showAll ?
        `${totalBuses} de ${allBusesData.length} ônibus no mapa (todos)` :
        `${totalBuses} ônibus no mapa`;

    document.getElementById('map-buses-count').textContent = totalText;

    // Atualizar estado do botão de cluster
    updateClusterButtonState();

    if (!userInteracting && totalBuses > 0) {
        if (!currentMapView || currentZoom === 12) {
            if (clusterEnabled) {
                markerCluster.refreshClusters();
                map.fitBounds(markerCluster.getBounds().pad(0.1));
            } else {
                const group = new L.featureGroup(markers);
                map.fitBounds(group.getBounds().pad(0.1));
            }
        } else {
            map.setView(currentCenter, currentZoom);
        }
    }

    saveMapView();
    updateClusterBehavior();

    // Forçar redesenho do mapa para garantir que tudo seja renderizado corretamente
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
};

const updateClusterButtonState = () => {
    const clusterButton = document.getElementById('toggle-cluster');
    const totalBuses = Object.keys(busMarkers).length;

    if (clusterEnabled) {
        clusterButton.textContent = 'Desativar Cluster';
        clusterButton.disabled = totalBuses === 0;
    } else {
        clusterButton.textContent = 'Ativar Cluster';
        clusterButton.disabled = totalBuses === 0;
    }

    // Atualizar tooltip para indicar estado
    clusterButton.title = clusterEnabled ?
        'Desativar agrupamento de marcadores' :
        'Ativar agrupamento de marcadores';
};

const createClusterPopupContent = (markers) => {
    const lines = new Set();
    const orders = [];

    markers.slice(0, 20).forEach(marker => {
        if (marker.busData) {
            lines.add(marker.busData.linha || 'N/A');
            orders.push(marker.busData.ordem || 'N/A');
        }
    });

    const total = markers.length;
    const linesList = Array.from(lines).join(', ');

    return `
        <div class="cluster-popup">
            <h4>Cluster de Ônibus</h4>
            <p><strong>Total:</strong> ${total} ônibus</p>
            <p><strong>Linhas:</strong> ${linesList}</p>
            ${total > 20 ? `<p><em>Mostrando 20 de ${total} ônibus</em></p>` : ''}
            <div class="cluster-popup-list">
                ${markers.slice(0, 20).map(marker =>
                    `<div class="cluster-popup-item">
                        Ônibus ${marker.busData?.ordem || 'N/A'} - Linha ${marker.busData?.linha || 'N/A'}
                    </div>`
                ).join('')}
            </div>
        </div>
    `;
};

const clearAllMapLayers = () => {
    // Remover todos os marcadores individuais
    Object.values(busMarkers).forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });

    // Remover e recriar o cluster group
    if (markerCluster && map.hasLayer(markerCluster)) {
        map.removeLayer(markerCluster);
    }

    markerCluster = L.markerClusterGroup({
        chunkedLoading: true,
        chunkInterval: 100,
        disableClusteringAtZoom: 16,
        maxClusterRadius: 80,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        iconCreateFunction: function(cluster) {
            const count = cluster.getChildCount();
            let size = 'small';
            if (count > 100) size = 'large';
            else if (count > 10) size = 'medium';

            return L.divIcon({
                html: `<div class="cluster cluster-${size}">${count}</div>`,
                className: 'marker-cluster-custom',
                iconSize: L.point(40, 40)
            });
        }
    });

    if (clusterEnabled) {
        map.addLayer(markerCluster);
    }
};

const updateClusterBehavior = () => {
    if (!markerCluster) return;

    // Ajustar comportamento baseado no nível de zoom
    if (currentZoomLevel >= 15) {
        // Zoom alto: mostrar marcadores individuais
        markerCluster.options.disableClusteringAtZoom = currentZoomLevel;
        markerCluster.options.maxClusterRadius = 40;
    } else if (currentZoomLevel >= 12) {
        // Zoom médio: clusterização moderada
        markerCluster.options.disableClusteringAtZoom = 16;
        markerCluster.options.maxClusterRadius = 60;
    } else {
        // Zoom baixo: clusterização agressiva
        markerCluster.options.disableClusteringAtZoom = 14;
        markerCluster.options.maxClusterRadius = 80;
    }

    // Forçar atualização dos clusters
    markerCluster.refreshClusters();
};

// Mostrar ou esconder o mapa
const toggleMapVisibility = (visible) => {
    const mapContainer = document.getElementById('map-container');
    const toggleButton = document.getElementById('toggle-map');

    if (visible) {
        if (!mapInitialized) {
            initMap();
        }

        mapContainer.style.display = 'block';
        toggleButton.textContent = 'Ocultar Mapa';

        // Restaurar clusterização se estava ativa
        if (clusterEnabled && markerCluster) {
            map.addLayer(markerCluster);
        }

        updateMapMarkers(showingAllBuses);

        setTimeout(() => {
            if (mapInitialized) map.invalidateSize();
        }, 100);
    } else {
        mapContainer.style.display = 'none';
        toggleButton.textContent = 'Mostrar Mapa';
    }

    showMap = visible;
};

// Carregar dados de itinerário da API
const loadItineraryData = async () => {
    try {
        console.log('Carregando dados de itinerário...');
        const response = await fetch('https://pgeo3.rio.rj.gov.br/arcgis/rest/services/Hosted/Itiner%C3%A1rios_da_rede_de_transporte_p%C3%BAblico_por_%C3%B4nibus_(SPPO)/FeatureServer/1/query?outFields=*&where=1%3D1&f=geojson');
        itineraryData = await response.json();
        console.log('Dados de itinerário carregados:', itineraryData);

        document.getElementById('itinerary-info').textContent = 'Dados de itinerário carregados';
    } catch (error) {
        console.error('Erro ao carregar dados de itinerário:', error);
        document.getElementById('itinerary-info').textContent = 'Erro ao carregar itinerários';
    }
};

// Preencher o seletor de linhas com as opções disponíveis
const populateLineSelector = () => {
    if (!itineraryData || !itineraryData.features) return;

    const lineSelect = document.getElementById('itinerary-line-select');
    const lines = new Set();

    // Coletar todas as linhas únicas
    itineraryData.features.forEach(feature => {
        if (feature.properties && feature.properties.servico) {
            lines.add(feature.properties.servico);
        }
    });

    // Ordenar as linhas numericamente
    const sortedLines = Array.from(lines).sort((a, b) => parseInt(a) - parseInt(b));

    // Adicionar opções ao seletor
    sortedLines.forEach(line => {
        const option = document.createElement('option');
        option.value = line;
        option.textContent = line;
        lineSelect.appendChild(option);
    });

    document.getElementById('itinerary-info').textContent = `${sortedLines.length} linhas carregadas`;
};

// Obter a linha selecionada no filtro
const getSelectedLineFromFilter = () => {
    return document.getElementById('search-line').value.trim();
};

// Obter linhas únicas dos ônibus filtrados
const getFilteredLines = () => {
    const lines = new Set();
    filteredBusesData.forEach(bus => {
        if (bus.linha) {
            lines.add(bus.linha);
        }
    });
    return Array.from(lines);
};

// Mostrar itinerário no mapa
const showItinerary = () => {
    const selectedDirection = document.getElementById('itinerary-direction-select').value;

    // Obter linhas dos ônibus filtrados
    const filteredLines = getFilteredLines();

    if (filteredLines.length === 0) {
        alert('Nenhuma linha encontrada nos filtros atuais. Ajuste os filtros primeiro.');
        return;
    }

    if (!itineraryData || !itineraryData.features) {
        alert('Dados de itinerário não carregados. Tente novamente em alguns instantes.');
        return;
    }

    // Limpar itinerários anteriores
    hideItinerary();

    // Filtrar features pelas linhas filtradas
    const lineFeatures = itineraryData.features.filter(feature =>
        feature.properties && filteredLines.includes(feature.properties.servico)
    );

    if (lineFeatures.length === 0) {
        document.getElementById('itinerary-info').textContent = 'Nenhum itinerário encontrado para as linhas filtradas';
        return;
    }

    // Filtrar por direção se necessário
    let featuresToShow = [];
    if (selectedDirection === 'both') {
        featuresToShow = lineFeatures;
    } else {
        const direction = parseInt(selectedDirection);
        featuresToShow = lineFeatures.filter(feature =>
            feature.properties && feature.properties.direcao === direction
        );
    }

    if (featuresToShow.length === 0) {
        const directionName = selectedDirection === '0' ? 'volta' : 'ida';
        document.getElementById('itinerary-info').textContent = `Nenhum itinerário de ${directionName} encontrado para as linhas filtradas`;
        return;
    }

    // Adicionar cada itinerário ao mapa
    featuresToShow.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
            // Converter coordenadas para o formato [lat, lng] que o Leaflet espera
            const latLngs = feature.geometry.coordinates.map(coord => [coord[1], coord[0]]);

            // Criar uma polilinha com estilos diferentes para ida e volta
            const color = feature.properties.direcao === 1 ? '#007bff' : '#ff0000';
            const weight = 4;
            const opacity = feature.properties.direcao === 1 ? 0.7 : 0.8;

            const polyline = L.polyline(latLngs, {
                color: color,
                weight: weight,
                opacity: opacity,
                dashArray: null // Sólido para ambas as direções
            }).addTo(map);

            // Adicionar popup com informações
            const directionName = feature.properties.direcao === 1 ? 'IDA' : 'VOLTA';
            polyline.bindPopup(`
                <strong>Linha ${feature.properties.servico}</strong><br>
                Direção: ${directionName}<br>
                Destino: ${feature.properties.destino || 'N/A'}<br>
                Consórcio: ${feature.properties.consorcio || 'N/A'}
            `);

            // Armazenar referência para remoção posterior
            const key = `${feature.properties.servico}_${feature.properties.direcao}`;
            if (!currentItineraryLines[key]) {
                currentItineraryLines[key] = [];
            }
            currentItineraryLines[key].push(polyline);
        }
    });

    // Ajustar a visualização do mapa para mostrar todos os itinerários
    const bounds = new L.LatLngBounds();
    featuresToShow.forEach(feature => {
        if (feature.geometry && feature.geometry.coordinates) {
            feature.geometry.coordinates.forEach(coord => {
                bounds.extend([coord[1], coord[0]]);
            });
        }
    });

    if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1));
    }

    // Atualizar informação
    const directionText = selectedDirection === 'both' ? 'idas e voltas' :
                        (selectedDirection === '1' ? 'ida' : 'volta');
    document.getElementById('itinerary-info').textContent =
        `Itinerário(s) de ${filteredLines.length} linha(s) (${directionText}) exibido(s): ${filteredLines.join(', ')}`;
};

// Ocultar itinerários do mapa
const hideItinerary = () => {
    // Remover todas as polilinhas de itinerário
    Object.values(currentItineraryLines).forEach(lines => {
        lines.forEach(line => {
            map.removeLayer(line);
        });
    });
    currentItineraryLines = {};

    document.getElementById('itinerary-info').textContent = 'Itinerário oculto';
};

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

// Aplicar filtros de linha e ordem
const applyFilters = () => {
    const lineFilter = document.getElementById('search-line').value.trim();
    const orderFilter = document.getElementById('search-order').value.trim();

    // Processar múltiplas linhas (separadas por vírgula)
    const lineFilters = lineFilter ? lineFilter.split(',').map(line => line.trim().toLowerCase()) : [];

    // Processar múltiplas ordens (separadas por vírgula)
    const orderFilters = orderFilter ? orderFilter.split(',').map(order => order.trim().toLowerCase()) : [];

    if (lineFilters.length === 0 && orderFilters.length === 0) {
        filteredBusesData = [...allBusesData];
    } else {
        filteredBusesData = allBusesData.filter(bus => {
            // Verificar se atende a pelo menos um dos filtros de linha
            const lineMatch = lineFilters.length === 0 ||
                lineFilters.some(filter => bus.linha && bus.linha.toLowerCase().includes(filter));

            // Verificar se atende a pelo menos um dos filtros de ordem
            const orderMatch = orderFilters.length === 0 ||
                orderFilters.some(filter => bus.ordem && bus.ordem.toLowerCase().includes(filter));

            return lineMatch && orderMatch;
        });
    }
};

// Atualizar a tabela com os dados recebidos
const renderTable = () => {
    const tableBody = document.getElementById('buses-body');

    if (filteredBusesData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-results">Nenhum ônibus encontrado</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredBusesData.length);
    const pageData = filteredBusesData.slice(startIndex, endIndex);

    let tableHtml = '';
    pageData.forEach(bus => {
        tableHtml += `
            <tr>
                <td>${bus.ordem || 'N/A'}</td>
                <td>${bus.linha || 'N/A'}</td>
                <td>${bus.latitude ? bus.latitude.toFixed(6) : 'N/A'}</td>
                <td>${bus.longitude ? bus.longitude.toFixed(6) : 'N/A'}</td>
                <td>${bus.velocidade || '0'}</td>
                <td>${bus.datahoraservidor ? new Date(bus.datahoraservidor).toLocaleString() : 'N/A'}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = tableHtml;
    updatePagination();
};

// Atualizar estatísticas
const updateStats = () => {
    document.getElementById('total-buses').textContent = allBusesData.length;
    document.getElementById('visible-buses').textContent = filteredBusesData.length;

    // Mostrar informações dos filtros ativos
    const lineFilter = document.getElementById('search-line').value.trim();
    const orderFilter = document.getElementById('search-order').value.trim();

    let filterInfo = '';
    if (lineFilter) {
        const lineCount = lineFilter.split(',').length;
        filterInfo += `${lineCount} linha(s) `;
    }
    if (orderFilter) {
        const orderCount = orderFilter.split(',').length;
        if (filterInfo) filterInfo += 'e ';
        filterInfo += `${orderCount} ordem(ns)`;
    }
};

// Atualizar controles de paginação
const updatePagination = () => {
    const totalPages = Math.ceil(filteredBusesData.length / itemsPerPage);
    const pageInfo = `Página ${currentPage} de ${totalPages}`;

    document.getElementById('page-info').textContent = pageInfo;
    document.getElementById('page-info-bottom').textContent = pageInfo;

    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('prev-page-bottom').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages || totalPages === 0;
    document.getElementById('next-page-bottom').disabled = currentPage === totalPages || totalPages === 0;
};

// Função para ordenar a tabela
const sortTable = (columnIndex) => {
    if (currentSortColumn === columnIndex) {
        sortDirection *= -1;
    } else {
        currentSortColumn = columnIndex;
        sortDirection = 1;
    }

    filteredBusesData.sort((a, b) => {
        let valueA, valueB;

        switch (columnIndex) {
            case 0: valueA = a.ordem; valueB = b.ordem; break;
            case 1: valueA = a.linha; valueB = b.linha; break;
            case 2: valueA = a.latitude; valueB = b.latitude; break;
            case 3: valueA = a.longitude; valueB = b.longitude; break;
            case 4: valueA = a.velocidade; valueB = b.velocidade; break;
            case 5: valueA = new Date(a.datahoraservidor); valueB = new Date(b.datahoraservidor); break;
            default: return 0;
        }

        if (valueA < valueB) return -1 * sortDirection;
        if (valueA > valueB) return 1 * sortDirection;
        return 0;
    });

    currentPage = 1;
    renderTable();

    // Atualizar mapa apenas se estiver visível e não estiver mostrando todos
    if (showMap && !showingAllBuses) {
        updateMapMarkers(false);
    }
};

// Filtrar tabela com base nos critérios de busca
const performSearch = () => {
    applyFilters();
    currentPage = 1;
    updateStats();
    renderTable();

    // Atualizar informações de itinerário disponível
    const filteredLines = getFilteredLines();
    if (filteredLines.length > 0) {
        document.getElementById('itinerary-info').textContent =
            `${filteredLines.length} linha(s) disponível(is) para mostrar itinerário: ${filteredLines.join(', ')}`;
    } else {
        document.getElementById('itinerary-info').textContent = 'Nenhuma linha disponível para itinerário';
    }

    // Se estiver mostrando o mapa, atualizar com os resultados da busca
    if (showMap) {
        showingAllBuses = false;
        updateMapMarkers(false);

        // Se já estava mostrando itinerário, atualizar também
        if (Object.keys(currentItineraryLines).length > 0) {
            showItinerary();
        }
    }
};

// Limpar todos os filtros
const clearFilters = () => {
    document.getElementById('search-line').value = '';
    document.getElementById('search-order').value = '';
    document.getElementById('search-address').value = '';

    // Remover marcador de endereço se existir
    if (addressMarker) {
        map.removeLayer(addressMarker);
        addressMarker = null;
    }

    // Esconder sugestões de autocomplete
    document.getElementById('autocomplete-suggestions').style.display = 'none';

    // Limpar itinerário se estiver visível
    hideItinerary();

    performSearch();
};

// Atualizar automaticamente o itinerário quando os filtros mudarem (opcional)
const setupItineraryAutoUpdate = () => {
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('input', () => {
            // Se o itinerário estiver visível, atualizar automaticamente
            if (Object.keys(currentItineraryLines).length > 0) {
                performSearch();
                // Pequeno delay para garantir que os dados foram processados
                setTimeout(showItinerary, 100);
            } else {
                performSearch();
            }
        });
    });
};

// Inicializar event listeners quando a página carregar
const initializeEventListeners = () => {
    // Iniciar busca e mostrar mapa
    document.getElementById('search-map-btn').addEventListener('click', () => {
        performSearch();
        toggleMapVisibility(true);
    });

    // Permitir busca ao pressionar Enter em qualquer campo de filtro
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
                toggleMapVisibility(true);
            }
        });
    });

    // Atualizar filtros em tempo real (opcional)
    searchInputs.forEach(input => {
        input.addEventListener('input', () => {
            performSearch();
        });
    });

    // Buscar endereço ao clicar no botão
    document.getElementById('search-address-btn').addEventListener('click', () => {
        searchAddress();
    });

    // Buscar endereço ao pressionar Enter no campo de endereço
    document.getElementById('search-address').addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchAddress();
        }
    });

    // Autocomplete para campo de endereço
    document.getElementById('search-address').addEventListener('input', (event) => {
        const query = event.target.value.trim();

        // Limpar timeout anterior
        if (autocompleteTimeout) {
            clearTimeout(autocompleteTimeout);
        }

        // Agendar nova busca após 300ms
        autocompleteTimeout = setTimeout(() => {
            fetchAddressSuggestions(query);
        }, 300);
    });

    // Esconder sugestões ao clicar fora
    document.addEventListener('click', (event) => {
        const suggestions = document.getElementById('autocomplete-suggestions');
        const addressInput = document.getElementById('search-address');

        if (event.target !== addressInput && !suggestions.contains(event.target)) {
            suggestions.style.display = 'none';
        }
    });

    // Limpar filtros
    document.getElementById('clear-filters').addEventListener('click', clearFilters);

    // Mostrar todos os ônibus no mapa
    document.getElementById('show-all-btn').addEventListener('click', () => {
        if (showingAllBuses) {
            // Se já está mostrando todos, voltar para a visualização de busca
            showingAllBuses = false;
            updateMapMarkers(false);
        } else {
            // Mostrar todos os ônibus no mapa
            showingAllBuses = true;
            updateMapMarkers(true);
        }
    });

    // Navegação de páginas
    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBusesData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    document.getElementById('next-page-bottom').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredBusesData.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });

    document.getElementById('prev-page-bottom').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });

    // Alternar visibilidade do mapa
    document.getElementById('toggle-map').addEventListener('click', () => {
        toggleMapVisibility(!showMap);
    });

    // Mostrar itinerário
    document.getElementById('show-itinerary-btn').addEventListener('click', showItinerary);

    // Ocultar itinerário
    document.getElementById('hide-itinerary-btn').addEventListener('click', hideItinerary);
};

// Iniciar aplicação quando a página carregar
window.onload = function() {
    connectWebSocket();
    loadItineraryData(); // Carregar dados de itinerário
    setupItineraryAutoUpdate();
    initializeEventListeners();
};