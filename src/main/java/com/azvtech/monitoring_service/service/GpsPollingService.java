package com.azvtech.monitoring_service.service;

import com.azvtech.monitoring_service.dto.GpsDataDTO;
import com.azvtech.monitoring_service.handler.GpsWebSocketHandler;
import com.azvtech.monitoring_service.utils.DateUtils;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Serviço responsável por realizar polling periódico de dados GPS para API externa.
 * Coleta, processa e distribui dados de localização em tempo real para clientes WebSocket.
 * Implementa métricas detalhadas, logging estruturado e tratamento robusto de erros.
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */
@Service
public class GpsPollingService {

    private static final Logger logger = LoggerFactory.getLogger(GpsPollingService.class);

    @Value("${gps.endpoint}")
    private String gpsEndpoint;

    private final GpsWebSocketHandler webSocketHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate;

    // Métricas
    private final Counter dataProcessedCounter;
    private final Counter errorCounter;
    private final Counter logMessageCounter;
    private final Timer pollingTimer;
    private final Counter httpRequestsCounter;
    private final DistributionSummary batchSizeDistribution;
    private final Timer apiResponseTimer;

    /**
     * Construtor que inicializa o serviço com suas dependências e configura as métricas.
     *
     * @param webSocketHandler Handler WebSocket para broadcast de dados
     * @param registry Registry Micrometer para coleta de métricas
     */
    @Autowired
    public GpsPollingService(GpsWebSocketHandler webSocketHandler, RestTemplate restTemplate, MeterRegistry registry) {
        this.webSocketHandler = webSocketHandler;
        this.restTemplate = restTemplate;
        objectMapper.registerModule(new JavaTimeModule());

        dataProcessedCounter = Counter.builder("gps.data.processed")
                .description("Quantidade de dados de GPS processados")
                .register(registry);

        errorCounter = Counter.builder("gps.errors")
                .description("Quantidade de erros durante o polling")
                .register(registry);

        logMessageCounter = Counter.builder("app.log.messages")
                .description("Total de mensagens de log por nível")
                .tag("level", "INFO") // Será dinâmico
                .register(registry);

        pollingTimer = Timer.builder("gps.polling.timer")
                .description("Tempo de execução do polling")
                .publishPercentileHistogram(true)
                .register(registry);

        httpRequestsCounter = Counter.builder("gps.http.requests")
                .description("Total de requisições HTTP para API externa")
                .register(registry);

        batchSizeDistribution = DistributionSummary.builder("gps.batch.size")
                .description("Distribuição do tamanho dos batches")
                .baseUnit("records")
                .register(registry);

        apiResponseTimer = Timer.builder("gps.api.response.time")
                .description("Tempo de resposta da API externa")
                .publishPercentileHistogram(true)
                .register(registry);

    }

    /**
     * Executa polling periódico para buscar atualizações de dados GPS.
     * Método agendado que roda a cada 2 segundos, realizando as seguintes operações:
     * - Coleta dados da API externa para os últimos 90 segundos
     * - Processa e filtra os dados mais recentes por veículo
     * - Transmite os dados via WebSocket para clientes conectados
     * - Coleta métricas detalhadas de performance e erro
     * <p>
     * Utiliza MDC para logging estruturado com traceId único por execução.
     *
     * @throws RuntimeException em caso de falha durante o processo de polling
     *
     * @see Scheduled
     * @see #fetchGpsData(String, String)
     * @see #getLatestUpdates(List)
     * @see #processData(Map)
     */
    @Scheduled(fixedDelay = 2000)
    public void checkForUpdates() {
        // Gerar correlation ID para cada execução do polling
        String pollingId = UUID.randomUUID().toString();
        MDC.put("traceId", pollingId);
        MDC.put("spanId", "polling");

        try {
            pollingTimer.record(() -> {
                logger.debug("Starting scheduled GPS polling");
                try {
                    LocalDateTime dataFinal = LocalDateTime.now();
                    LocalDateTime dataInicial = dataFinal.minusSeconds(90);

                    String dataInicialStr = DateUtils.format(dataInicial);
                    String dataFinalStr = DateUtils.format(dataFinal);

                    logger.debug("Fetching GPS data from {} to {}", dataInicialStr, dataFinalStr);

                    List<GpsDataDTO> gpsData = apiResponseTimer.record(() ->
                    {
                        try {
                            return fetchGpsData(dataInicialStr, dataFinalStr);
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });

                    httpRequestsCounter.increment();

                    Map<String, GpsDataDTO> latestUpdates = getLatestUpdates(gpsData);
                    processData(latestUpdates);

                    dataProcessedCounter.increment(latestUpdates.size());
                    batchSizeDistribution.record(latestUpdates.size());

                    logger.info("Polling completed: processed {} GPS records", latestUpdates.size());

                } catch (Exception e) {
                    errorCounter.increment();
                    logger.error("Polling failed: {}", e.getMessage(), e);
                    // Métrica adicional para erros específicos
                    errorCounter.increment();
                }
            });
        } finally {
            MDC.clear();
        }
    }

    /**
     * Busca dados GPS da API externa para um intervalo de tempo específico.
     * Constrói a URL com parâmetros de query e realiza a requisição HTTP.
     *
     * @param dataInicial Data/hora inicial no formato string para consulta
     * @param dataFinal Data/hora final no formato string para consulta
     * @return Lista de objetos GpsDataDTO contendo os dados coletados
     * @throws IOException em caso de erro de rede ou resposta inválida
     *
     * @see RestTemplate
     * @see #parseGpsData(String)
     */
    @Cacheable(value = "gpsData", key = "{#dataInicial, #dataFinal}", unless = "#result.isEmpty()")
    private List<GpsDataDTO> fetchGpsData(String dataInicial, String dataFinal) throws IOException {
        String url = UriComponentsBuilder.fromUriString(gpsEndpoint)
                .queryParam("dataInicial", dataInicial)
                .queryParam("dataFinal", dataFinal)
                .toUriString();

        logger.debug("Making request to URL: {}", url);
        String jsonData = restTemplate.getForObject(url, String.class);
        logger.debug("Received response with {} characters", jsonData != null ? jsonData.length() : 0);

        return parseGpsData(jsonData);
    }

    /**
     * Parseia a resposta JSON da API externa para uma lista de objetos GpsDataDTO.
     * Valida se os dados não são nulos ou vazios antes do parsing.
     *
     * @param jsonData String contendo os dados JSON da API
     * @return Lista de objetos GpsDataDTO parseados
     * @throws IOException em caso de erro de parsing ou JSON malformado
     *
     * @see ObjectMapper
     * @see TypeReference
     */
    private List<GpsDataDTO> parseGpsData(String jsonData) throws IOException {
        if (jsonData == null || jsonData.isEmpty()) {
            logger.warn("Empty or null JSON data received");
            return List.of();
        }

        try {
            List<GpsDataDTO> result = objectMapper.readValue(jsonData, new TypeReference<>() {});
            logger.debug("Parsed {} GPS records from JSON", result.size());
            return result;
        } catch (IOException e) {
            logger.error("Failed to parse JSON data: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Filtra os dados GPS para manter apenas a atualização mais recente por veículo.
     * Utiliza o campo 'ordem' como identificador único do veículo e compara
     * timestamps para determinar o registro mais recente.
     *
     * @param gpsData Lista completa de dados GPS coletados
     * @return Mapa contendo as atualizações mais recentes por veículo (chave: ordem)
     *
     * @see GpsDataDTO#getOrdem()
     * @see GpsDataDTO#isMoreRecentThan(GpsDataDTO)
     */
    private Map<String, GpsDataDTO> getLatestUpdates(List<GpsDataDTO> gpsData) {
        Map<String, GpsDataDTO> latestUpdatesMap = new HashMap<>();

        if (gpsData == null || gpsData.isEmpty()) {
            logger.warn("No GPS data to process");
            return latestUpdatesMap;
        }

        for (GpsDataDTO data : gpsData) {
            GpsDataDTO existingData = latestUpdatesMap.get(data.getOrdem());

            if (existingData == null || data.isMoreRecentThan(existingData)) {
                latestUpdatesMap.put(data.getOrdem(), data);
            }
        }

        logger.debug("Filtered {} unique vehicles from {} total records",
                latestUpdatesMap.size(), gpsData.size());

        return latestUpdatesMap;
    }

    /**
     * Processa os dados filtrados e realiza o broadcast via WebSocket.
     * Converte o mapa de dados para lista e delega o envio ao WebSocketHandler.
     * Inclui tratamento de erro para garantir que falhas no broadcast não
     * interrompam o ciclo de polling.
     *
     * @param data Mapa contendo as atualizações mais recentes por veículo
     *
     * @see GpsWebSocketHandler#broadcastUpdate(List)
     */
    private void processData(Map<String, GpsDataDTO> data) {
        if (data == null || data.isEmpty()) {
            logger.warn("Invalid or empty data received in processData");
            return;
        }

        List<GpsDataDTO> latestUpdatesList = List.copyOf(data.values());

        try {
            webSocketHandler.broadcastUpdate(latestUpdatesList);
            logger.debug("Broadcasted {} records to WebSocket clients", latestUpdatesList.size());
        } catch (Exception e) {
            logger.error("Failed to broadcast data: {}", e.getMessage(), e);
        }
    }
}