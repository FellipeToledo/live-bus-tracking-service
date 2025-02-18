package com.azvtech.live_bus_tracking_service.service;

import com.azvtech.live_bus_tracking_service.dto.GpsDataDTO;
import com.azvtech.live_bus_tracking_service.handler.GpsWebSocketHandler;
import com.azvtech.live_bus_tracking_service.utils.DateUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * @author Fellipe Toledo
 */

@Service
public class GpsPollingService {

    @Autowired
    private GpsWebSocketHandler webSocketHandler;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String GPS_ENDPOINT = "https://dados.mobilidade.rio/gps/sppo";

    public GpsPollingService() {
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Scheduled(fixedDelay = 25000) // Polling a cada 25 segundos
    public void checkForUpdates() {
        System.out.println("Method checkForUpdates executed in: " + LocalDateTime.now());
        try {
            LocalDateTime dataFinal = LocalDateTime.now();
            LocalDateTime dataInicial = dataFinal.minusMinutes(20);

            String dataInicialStr = DateUtils.format(dataInicial);
            String dataFinalStr = DateUtils.format(dataFinal);

            List<GpsDataDTO> gpsData = fetchGpsData(dataInicialStr, dataFinalStr);
            Map<String, GpsDataDTO> latestUpdates = getLatestUpdates(gpsData);
            processData(latestUpdates);
            System.out.println("Dados: " + latestUpdates.size());
        } catch (IOException e) {
            System.err.println("Erro ao buscar ou processar dados de GPS: " + e.getMessage());
        }
    }

    private List<GpsDataDTO> fetchGpsData(String dataInicial, String dataFinal) throws IOException {
        String url = UriComponentsBuilder.fromUriString(GPS_ENDPOINT)
                .queryParam("dataInicial", dataInicial)
                .queryParam("dataFinal", dataFinal)
                .toUriString();

        String jsonData = restTemplate.getForObject(url, String.class);
        return parseGpsData(jsonData);
    }

    private List<GpsDataDTO> parseGpsData(String jsonData) throws IOException {
        return objectMapper.readValue(jsonData, new TypeReference<List<GpsDataDTO>>() {});
    }

    private Map<String, GpsDataDTO> getLatestUpdates(List<GpsDataDTO> gpsData) {
        Map<String, GpsDataDTO> latestUpdatesMap = new HashMap<>();

        for (GpsDataDTO data : gpsData) {
            GpsDataDTO existingData = latestUpdatesMap.get(data.getOrdem());

            if (existingData == null || data.isMoreRecentThan(existingData)) {
                latestUpdatesMap.put(data.getOrdem(), data);
            }
        }
        return latestUpdatesMap;
    }

    private void processData(Map<String, GpsDataDTO> data) {
        if (data == null || data.isEmpty()) {
            System.out.println("Dados inválidos ou vazios recebidos.");
            return;
        }

        // Converte o Map para uma lista de valores (GpsDataDTO)
        List<GpsDataDTO> latestUpdatesList = List.copyOf(data.values());
        // System.out.println("Novos dados recebidos: " + data);
        // Notifique os clientes via WebSocket
        webSocketHandler.broadcastUpdate(latestUpdatesList);
        System.out.println("Novos dados recebidos: " + latestUpdatesList.size());

    }
}
