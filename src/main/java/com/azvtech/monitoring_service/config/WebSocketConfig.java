package com.azvtech.monitoring_service.config;

import com.azvtech.monitoring_service.handler.GpsWebSocketHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean;

/**
 * Configuração do WebSocket para comunicação em tempo real com dispositivos GPS.
 * Habilita e configura endpoints WebSocket para receber atualizações de localização GPS.
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final GpsWebSocketHandler webSocketHandler;

    /**
     * Construtor para injeção de dependência do handler WebSocket.
     *
     * @param webSocketHandler Handler responsável por processar mensagens WebSocket de GPS
     */
    public WebSocketConfig(GpsWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    /**
     * Configura o container WebSocket com parâmetros otimizados para produção.
     * Define limites de mensagem, timeouts e buffers para prevenir DoS e memory leaks.
     */
    @Bean
    public ServletServerContainerFactoryBean createWebSocketContainer() {
        ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();

        // Timeout de inatividade (5 minutos)
        container.setMaxSessionIdleTimeout(300000L);

        // Limites de segurança e performance
        container.setMaxTextMessageBufferSize(8192); // 8KB por mensagem
        container.setMaxBinaryMessageBufferSize(8192);
        container.setAsyncSendTimeout(10000L); // 10s timeout para envio assíncrono

        return container;
    }

    /**
     * Registra o handler WebSocket com configurações de segurança.
     */
    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/gps-updates")
                .setAllowedOrigins("http://localhost:8080/web/monitoring", "https://websocketking.com/", "http://localhost:4200/");
    }
}
