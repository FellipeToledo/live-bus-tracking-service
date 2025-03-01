package com.azvtech.live_bus_tracking_service.service;

import com.azvtech.live_bus_tracking_service.dto.GpsDataDTO;
import com.azvtech.live_bus_tracking_service.handler.GpsWebSocketHandler;
import com.azvtech.live_bus_tracking_service.utils.DateUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${gps.endpoint}")
    private String gpsEndpoint;

    private final GpsWebSocketHandler webSocketHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    // Métricas
    private final Counter dataProcessedCounter;
    private final Counter errorCounter;
    private final Timer pollingTimer;

    @Autowired
    public GpsPollingService(GpsWebSocketHandler webSocketHandler, MeterRegistry registry) {
        this.webSocketHandler = webSocketHandler;
        objectMapper.registerModule(new JavaTimeModule());

        dataProcessedCounter = Counter.builder("gps.data.processed")
                .description("Quantidade de dados de GPS processados")
                .register(registry);

        errorCounter = Counter.builder("gps.errors")
                .description("Quantidade de erros durante o polling")
                .register(registry);

        pollingTimer = Timer.builder("gps.polling.timer")
                .description("Tempo de execução do polling")
                .publishPercentileHistogram(true)
                .register(registry);

    }

    @Scheduled(fixedDelay = 25000)
    public void checkForUpdates() {
        pollingTimer.record(() -> {
            System.out.println("Method checkForUpdates executed in: " + LocalDateTime.now());
            try {
                LocalDateTime dataFinal = LocalDateTime.now();
                LocalDateTime dataInicial = dataFinal.minusMinutes(20);

                String dataInicialStr = DateUtils.format(dataInicial);
                String dataFinalStr = DateUtils.format(dataFinal);

                List<GpsDataDTO> gpsData = fetchGpsData(dataInicialStr, dataFinalStr);
                Map<String, GpsDataDTO> latestUpdates = getLatestUpdates(gpsData);
                processData(latestUpdates);

                // Registrar métrica de dados processados

                dataProcessedCounter.increment(latestUpdates.size());
                System.out.println("Dados processados: " + latestUpdates.size());
            } catch (IOException e) {
                // Registrar métrica de erro
                errorCounter.increment();
                System.err.println("Erro ao buscar ou processar dados de GPS: " + e.getMessage());
            }
        });
    }

    private List<GpsDataDTO> fetchGpsData(String dataInicial, String dataFinal) throws IOException {
        String url = UriComponentsBuilder.fromUriString(gpsEndpoint)
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
