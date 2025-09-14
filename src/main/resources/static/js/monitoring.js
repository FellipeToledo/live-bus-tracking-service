// monitoring.js - JavaScript para a página de rastreamento de ônibus

let allBusesData = [];
let filteredBusesData = [];
let currentPage = 1;
const itemsPerPage = 50;
let currentSortColumn = -1;
let sortDirection = 1;
// Variáveis para itinerários
let itineraryData = null; // Armazenará todos os dados de itinerário
let currentItineraryLines = {}; // Armazenará as linhas de itinerário atualmente exibidas

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
        toggleMapVisibility(true); // Esta função estará em map.js
    });
    // Permitir busca ao pressionar Enter em qualquer campo de filtro
    const searchInputs = document.querySelectorAll('.search-input');
    searchInputs.forEach(input => {
        input.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
                toggleMapVisibility(true); // Esta função estará em map.js
            }
        });
    });
    // Atualizar filtros em tempo real (opcional)
    searchInputs.forEach(input => {
        input.addEventListener('input', () => {
            performSearch();
        });
    });
    // Limpar filtros
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
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
    // Mostrar itinerário
    document.getElementById('show-itinerary-btn').addEventListener('click', showItinerary);
    // Ocultar itinerário
    document.getElementById('hide-itinerary-btn').addEventListener('click', hideItinerary);
};