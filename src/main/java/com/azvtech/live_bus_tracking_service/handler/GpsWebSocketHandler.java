package com.azvtech.live_bus_tracking_service.handler;

import com.azvtech.live_bus_tracking_service.dto.GpsDataDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * @author Fellipe Toledo
 */

@Component
public class GpsWebSocketHandler extends TextWebSocketHandler {

    private final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final int BATCH_SIZE = 10;

    public GpsWebSocketHandler() {
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        sessions.add(session);
        System.out.println("New client connected: " + session.getId());
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        System.out.println("Closed connection: " + session.getId() + " - Reason: " + status.getReason());
    }

    @Override
    public void handleTransportError(@NonNull WebSocketSession session, Throwable exception) {
        sessions.remove(session);
        System.err.println("Error in session " + session.getId() + ": " + exception.getMessage());
    }

    public void broadcastUpdate(List<GpsDataDTO> data) {
        // System.out.println("Sending data to clients: " + data);
        for (int i = 0; i < data.size(); i += BATCH_SIZE) {
            List<GpsDataDTO> batch = data.subList(i, Math.min(i + BATCH_SIZE, data.size()));
            sendBatch(batch);
        }
    }

    private void sendBatch(List<GpsDataDTO> batch) {
        try {
            String jsonBatch = objectMapper.writeValueAsString(batch);
            TextMessage message = new TextMessage(jsonBatch);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(message);
                } else {
                    sessions.remove(session);
                }
            }
        } catch (IOException e) {
            System.err.println("Error sending batch data: " + e.getMessage());
        }
    }
}
