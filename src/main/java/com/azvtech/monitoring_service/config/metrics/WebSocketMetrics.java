package com.azvtech.monitoring_service.config.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * Componente para coleta e gerenciamento de métricas WebSocket.
 *
 * Fornece métricas detalhadas sobre conexões WebSocket incluindo:
 * - Número atual de conexões ativas (Gauge)
 * - Contadores de conexões estabelecidas e encerradas
 * - Timer para duração média das conexões
 *
 * Essas métricas são essenciais para:
 * - Monitorar a saúde e carga do serviço WebSocket
 * - Identificar problemas de conectividade
 * - Planejamento de capacidade e escalabilidade
 * - Alertas baseados em thresholds de conexão
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */
@Component
public class WebSocketMetrics {

    /**
     * Contador atômico para acompanhar conexões ativas em tempo real.
     */
    private final AtomicInteger activeConnections = new AtomicInteger(0);

    /**
     * Contador para total de conexões estabelecidas desde o startup.
     */
    private final Counter establishedCounter;

    /**
     * Contador para total de conexões encerradas desde o startup.
     */
    private final Counter closedCounter;

    /**
     * Timer para medir a duração das conexões WebSocket.
     */
    private final Timer connectionDurationTimer;

    /**
     * Construtor que inicializa todas as métricas WebSocket no MeterRegistry.
     *
     * @param meterRegistry Registry Micrometer para registro das métricas
     */
    public WebSocketMetrics(MeterRegistry meterRegistry) {
        // Gauge para conexões ativas - valor atual em tempo real
        Gauge.builder("websocket.connections.active", activeConnections, AtomicInteger::get)
                .description("Número atual de conexões WebSocket ativas")
                .register(meterRegistry);

        // Contadores cumulativos
        establishedCounter = Counter.builder("websocket.connections.established.total")
                .description("Total de conexões WebSocket estabelecidas")
                .register(meterRegistry);

        closedCounter = Counter.builder("websocket.connections.closed.total")
                .description("Total de conexões WebSocket encerradas")
                .register(meterRegistry);

        // Timer para distribuição de duração
        connectionDurationTimer = Timer.builder("websocket.connection.duration")
                .description("Duração das conexões WebSocket")
                .register(meterRegistry);
    }

    /**
     * Inicia a medição de tempo para uma nova conexão WebSocket.
     * Deve ser chamado quando a conexão é estabelecida.
     *
     * @return Timer.Sample instância para parar o timer posteriormente
     *
     * @see #connectionEstablished(Timer.Sample)
     */
    public Timer.Sample startConnectionTimer() {
        return Timer.start();
    }

    /**
     * Registra o estabelecimento de uma conexão WebSocket com medição de tempo.
     * Atualiza contadores de conexões ativas e totais, e para o timer de duração.
     *
     * @param sample Amostra do timer iniciada previamente com startConnectionTimer()
     */
    public void connectionEstablished(Timer.Sample sample) {
        activeConnections.incrementAndGet();
        establishedCounter.increment();
        if (sample != null) {
            sample.stop(connectionDurationTimer);
        }
    }

    /**
     * Registra o estabelecimento de uma conexão WebSocket sem medição de tempo.
     * Versão simplificada para casos onde a duração não precisa ser medida.
     */
    public void connectionEstablished() {
        activeConnections.incrementAndGet();
        establishedCounter.increment();
    }

    /**
     * Registra o encerramento de uma conexão WebSocket.
     * Decrementa conexões ativas e incrementa contador de encerradas.
     */
    public void connectionClosed() {
        activeConnections.decrementAndGet();
        closedCounter.increment();
    }
}
