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
    private final GpsWebSocketHandler webSocketHandler;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private static final String GPS_ENDPOINT = "https://dados.mobilidade.rio/gps/sppo";

    public GpsPollingService(GpsWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Scheduled(fixedDelay = 25000)
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
            System.out.println("Data quantity: " + latestUpdates.size());
        } catch (IOException e) {
            System.err.println("Error fetching or processing GPS data: " + e.getMessage());
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
        return objectMapper.readValue(jsonData, new TypeReference<>() {
        });
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
            System.out.println("Invalid or empty data received.");
            return;
        }

        List<GpsDataDTO> latestUpdatesList = List.copyOf(data.values());

        /* if (!latestUpdatesList.isEmpty()) {
            GpsDataDTO firstObject = latestUpdatesList.get(0);
            System.out.println("First object in the list: " + firstObject);
        } */

        webSocketHandler.broadcastUpdate(latestUpdatesList);
        System.out.println("New data received: " + latestUpdatesList.size());
    }
}
