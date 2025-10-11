// utils/date-utils.js
export class DateUtils {
    static formatDate(date) {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('pt-BR');
    }

    static getCurrentTime() {
        return new Date().toLocaleTimeString();
    }
}