package com.azvtech.monitoring_service.handler;

import com.azvtech.monitoring_service.dto.GpsDataDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Handler WebSocket para gerenciamento de conexões em tempo real de dados GPS.
 * Responsável por estabelecer, manter e encerrar conexões WebSocket, além de
 * transmitir dados GPS para clientes conectados em formato de batches.
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */

@Component
public class GpsWebSocketHandler extends TextWebSocketHandler {

    @Value("${gps.batch-size}")
    private int batchSize;

    private static final Logger logger = LoggerFactory.getLogger(GpsWebSocketHandler.class);
    private final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Construtor que configura o ObjectMapper para serialização JSON.
     * Registra módulo JavaTime para suporte a classes de data/hora do Java 8+
     * e desabilita serialização de datas como timestamps.
     */
    public GpsWebSocketHandler() {
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Chamado quando uma nova conexão WebSocket é estabelecida.
     * Adiciona a sessão à lista de sessões ativas e registra o evento.
     *
     * @param session Sessão WebSocket do cliente conectado
     */
    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        try {
            session.setBinaryMessageSizeLimit(1024 * 1024); // 1MB
            session.setTextMessageSizeLimit(1024 * 1024);   // 1MB
        } catch (Exception e) {
            logger.warn("Could not configure session limits: {}", e.getMessage());
        }
        sessions.add(session);
        logger.info("New client connected: {}", session.getId());
    }

    /**
     * Chamado quando uma conexão WebSocket é fechada.
     * Remove a sessão da lista de sessões ativas e registra o motivo do fechamento.
     *
     * @param session Sessão WebSocket sendo fechada
     * @param status Status de fechamento contendo código e motivo
     */
    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        if (status.getCode() == CloseStatus.SESSION_NOT_RELIABLE.getCode()) {
            logger.info("Connection closed due to inactivity: {}", session.getId());
        } else {
            logger.info("Connection closed: {} - Reason: {}", session.getId(), status.getReason());
        }
    }

    /**
     * Chamado quando ocorre um erro de transporte na conexão WebSocket.
     * Notifica o cliente sobre o erro, remove a sessão e fecha a conexão.
     *
     * @param session Sessão WebSocket onde ocorreu o erro
     * @param exception Exceção que causou o erro de transporte
     */
    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) {
        logger.error("Transport error in session {}: {}", session.getId(), exception.getMessage(), exception);

        // Notificar o cliente sobre o erro antes de fechar a conexão
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage("Error: " + exception.getMessage()));
            }
        } catch (IOException e) {
            logger.error("Failed to send error message to session {}: {}", session.getId(), e.getMessage());
        }

        // Remover sessão e tentar fechar
        sessions.remove(session);
        try {
            session.close();
        } catch (IOException e) {
            logger.debug("Error closing session after transport error: {}", e.getMessage());
        }
    }

    /**
     * Transmite uma lista de dados GPS para todos os clientes conectados.
     * Divide os dados em batches conforme configurado e envia sequencialmente.
     *
     * @param data Lista de objetos GpsDataDTO a serem transmitidos
     */
    public void broadcastUpdate(List<GpsDataDTO> data) {
        CleanupResult cleanupResult = cleanupInactiveSessions();

        if (sessions.isEmpty()) {
            logger.debug("No active connections after cleanup. Skipping broadcast.");
            return;
        }

        logger.info("Broadcasting {} records to {} clients (cleaned up: {} inactive sessions)",
                data.size(), sessions.size(), cleanupResult.removedSessions());

        int totalBatches = (int) Math.ceil((double) data.size() / batchSize);

        for (int i = 0; i < data.size(); i += batchSize) {
            List<GpsDataDTO> batch = data.subList(i, Math.min(i + batchSize, data.size()));
            sendBatch(batch, i/batchSize + 1, totalBatches);
        }
    }

    /**
     * Executa limpeza de sessões WebSocket inativas com logging detalhado.
     * Realiza as seguintes operações:
     * 1. Identifica sessões fechadas ou com erro
     * 2. Remove sessões inativas da lista
     * 3. Registra estatísticas do cleanup
     * 4. Retorna métricas para monitoramento
     * Cenários de uso recomendado:
     * - Antes de operações de broadcast em massa
     * - Durante tarefas de manutenção periódica
     * - Após detectar picos de desconexões
     *
     * @return CleanupResult Objeto contendo estatísticas detalhadas da operação
     *
     * @throws IllegalStateException se a lista de sessões for inconsistente
     *
     * @see CleanupResult
     * @see #broadcastUpdate(List)
     */
    private CleanupResult cleanupInactiveSessions() {
        long startTime = System.currentTimeMillis();
        int initialSize = sessions.size();

        if (initialSize == 0) {
            logger.trace("No sessions to clean up");
            return new CleanupResult(0, 0, 0);
        }

        // Identifica sessões inativas
        List<WebSocketSession> inactiveSessions = sessions.stream()
                .filter(session -> !session.isOpen())
                .toList();

        // Remove sessões inativas
        boolean removed = sessions.removeAll(inactiveSessions);
        int removedCount = inactiveSessions.size();
        int finalSize = sessions.size();

        long duration = System.currentTimeMillis() - startTime;

        // Log baseado na criticidade
        if (removedCount > 0) {
            logger.info("Session cleanup completed: removed {} sessions, active: {} (took {}ms)",
                    removedCount, finalSize, duration);
        } else {
            logger.debug("Session cleanup: no inactive sessions found (took {}ms)", duration);
        }

        return new CleanupResult(initialSize, removedCount, duration);
    }

    /**
     * Record para armazenar resultados do cleanup de sessões.
     *
     * @param initialSessions Número total de sessões antes do cleanup
     * @param removedSessions Número de sessões removidas
     * @param durationMs Tempo de execução do cleanup em milissegundos
     */
    private record CleanupResult(int initialSessions, int removedSessions, long durationMs) {}

    /**
     * Envia um batch de dados GPS para todas as sessões ativas.
     * Empacota os dados em formato JSON incluindo metadados do batch.
     *
     * @param batch Lista de dados GPS do batch atual
     * @param batchNumber Número sequencial do batch (1-based)
     * @param totalBatches Número total de batches a serem enviados
     */
    private void sendBatch(List<GpsDataDTO> batch, int batchNumber, int totalBatches) {
        try {
            Map<String, Object> messageWrapper = new HashMap<>();
            messageWrapper.put("batch", batch);
            messageWrapper.put("batchNumber", batchNumber);
            messageWrapper.put("totalBatches", totalBatches);
            messageWrapper.put("totalRecords", batch.size());

            String jsonMessage = objectMapper.writeValueAsString(messageWrapper);
            TextMessage message = new TextMessage(jsonMessage);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                }
            }
        } catch (IOException e) {
            logger.error("Error sending batch: {}", e.getMessage(), e);
        }
    }
}
