// map.js - Gerenciamento do mapa e funcionalidades de geolocalização

// Variáveis para o mapa
let map = null;
let busMarkers = {};
let showMap = false;
let mapInitialized = false;
let showingAllBuses = false;
let currentMapView = null;
let addressMarker = null;
let autocompleteTimeout = null;

// Variáveis para clusterização
let markerCluster = null;
let currentZoomLevel = 12;
let clusterEnabled = true;

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

//Cria conteúdo popup para clusters
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

//Atualiza comportamento de cluster
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

// Alterna visibilidade do mapa
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

const toggleCluster = () => {
    clusterEnabled = !clusterEnabled;
    const toggleButton = document.getElementById('toggle-cluster');
    if (!mapInitialized || !markerCluster) {
        console.warn('Mapa ou cluster não inicializado');
        return;
    }
    if (clusterEnabled) {
        // Remover marcadores individuais do mapa
        Object.values(busMarkers).forEach(marker => {
            if (map.hasLayer(marker)) {
                map.removeLayer(marker);
            }
        });

        // Limpar cluster e adicionar todos os marcadores
        markerCluster.clearLayers();
        markerCluster.addLayers(Object.values(busMarkers));

        // Adicionar cluster ao mapa se não estiver
        if (!map.hasLayer(markerCluster)) {
            map.addLayer(markerCluster);
        }

        toggleButton.textContent = 'Desativar Cluster';
    } else {
        // Remover cluster do mapa
        if (map.hasLayer(markerCluster)) {
            map.removeLayer(markerCluster);
        }

        // Adicionar marcadores individualmente
        Object.values(busMarkers).forEach(marker => {
            marker.addTo(map);
        });

        toggleButton.textContent = 'Ativar Cluster';
    }


    updateClusterButtonState();
    document.getElementById('toggle-cluster').textContent =
        clusterEnabled ? 'Desativar Cluster' : 'Ativar Cluster';
};

//Atualiza estado do botão de cluster
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

// map.js - Inicializador de event listeners do mapa
const initializeMapListeners = () => {
    // Toggle clusterização
    document.getElementById('toggle-cluster').addEventListener('click', toggleCluster => {
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
        } else {
            // Remover o cluster do mapa
            map.removeLayer(markerCluster);

            // Adicionar marcadores individualmente ao mapa
            Object.values(busMarkers).forEach(marker => {
                marker.addTo(map);
            });

            toggleButton.textContent = 'Ativar Cluster';
        }

        // Forçar redesenho do mapa
        map.invalidateSize();
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

    // Alternar visibilidade do mapa
    document.getElementById('toggle-map').addEventListener('click', () => {
        toggleMapVisibility(!showMap);
    });
};



// Resto das funções de mapa...
// [Todas as outras funções listadas acima]