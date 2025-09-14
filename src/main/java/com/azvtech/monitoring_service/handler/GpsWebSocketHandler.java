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
 * @author Fellipe Toledo
 */

@Component
public class GpsWebSocketHandler extends TextWebSocketHandler {

    @Value("${gps.batch-size}")
    private int batchSize;

    private static final Logger logger = LoggerFactory.getLogger(GpsWebSocketHandler.class);
    private final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();


    public GpsWebSocketHandler() {
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        sessions.add(session);
        logger.info("New client connected: {}", session.getId());
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        if (status.getCode() == CloseStatus.SESSION_NOT_RELIABLE.getCode()) {
            logger.info("Connection closed due to inactivity: {}", session.getId());
        } else {
            logger.info("Connection closed: {} - Reason: {}", session.getId(), status.getReason());
        }
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, @NonNull Throwable exception) {
        logger.error("Transport error in session {}: {}", session.getId(), exception.getMessage(), exception);

        // Notificar o cliente sobre o erro antes de fechar a conexão
        try {
            session.sendMessage(new TextMessage("Error: " + exception.getMessage()));
        } catch (IOException e) {
            logger.error("Failed to send error message to session {}: {}", session.getId(), e.getMessage());
        }

        sessions.remove(session);

        // Tentar reconectar após 5 segundos
        try {
            Thread.sleep(5000);
            logger.info("Attempting to reconnect session: {}", session.getId());
            // Aqui você pode adicionar lógica para reconectar manualmente, se necessário
        } catch (InterruptedException e) {
            logger.error("Reconnection attempt interrupted: {}", e.getMessage());
        }
    }

    public void broadcastUpdate(List<GpsDataDTO> data) {
        logger.info("Broadcasting {} records to {} clients in batches of {}",
                data.size(), sessions.size(), batchSize);

        int totalBatches = (int) Math.ceil((double) data.size() / batchSize);

        for (int i = 0; i < data.size(); i += batchSize) {
            List<GpsDataDTO> batch = data.subList(i, Math.min(i + batchSize, data.size()));
            sendBatch(batch, i/batchSize + 1, totalBatches);
        }
    }

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
