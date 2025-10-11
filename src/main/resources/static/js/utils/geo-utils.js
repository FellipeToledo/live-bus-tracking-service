// utils/geo-utils.js
export class GeoUtils {
    static isValidCoordinate(lat, lng) {
        return lat && lng &&
               !isNaN(lat) && !isNaN(lng) &&
               lat >= -90 && lat <= 90 &&
               lng >= -180 && lng <= 180;
    }

    static getUniqueLines(busesData) {
        const lines = new Set();
        busesData.forEach(bus => {
            if (bus.linha) lines.add(bus.linha);
        });
        return Array.from(lines);
    }

    static createBounds(points) {
        const bounds = new L.LatLngBounds();
        points.forEach(point => bounds.extend(point));
        return bounds;
    }
}