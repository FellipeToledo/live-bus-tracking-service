// utils.js - Funções utilitárias e helpers

/**
 * Formata um endereço completo para exibir apenas partes relevantes
 * @param {string} displayName - Endereço completo
 * @returns {string} Endereço formatado
 */
const formatAddress = (displayName) => {
    if (!displayName) return '';

    const parts = displayName.split(',');
    if (parts.length >= 3) {
        return `${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}`;
    }
    return displayName;
};

/**
 * Debounce function para limitar chamadas frequentes
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em ms
 * @returns {Function} Função com debounce
 */
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Formata data para exibição amigável
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('pt-BR');
};

/**
 * Valida se um valor é uma coordenada válida
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True se coordenadas são válidas
 */
const isValidCoordinate = (lat, lng) => {
    return lat && lng &&
           !isNaN(lat) && !isNaN(lng) &&
           lat >= -90 && lat <= 90 &&
           lng >= -180 && lng <= 180;
};

/**
 * Extrai linhas únicas de uma lista de ônibus
 * @param {Array} busesData - Array de dados de ônibus
 * @returns {Array} Array de linhas únicas
 */
const getUniqueLines = (busesData) => {
    const lines = new Set();
    busesData.forEach(bus => {
        if (bus.linha) {
            lines.add(bus.linha);
        }
    });
    return Array.from(lines);
};

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.Utils = {
        formatAddress,
        debounce,
        formatDate,
        isValidCoordinate,
        getUniqueLines
    };
}