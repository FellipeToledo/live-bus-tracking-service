package com.azvtech.live_bus_tracking_service.config.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class WebSocketMetrics {

    private final AtomicInteger activeConnections = new AtomicInteger(0);
    private final Counter establishedCounter;
    private final Counter closedCounter;
    private final Timer connectionDurationTimer;

    public WebSocketMetrics(MeterRegistry meterRegistry) {
        // Gauge para conexões ativas
        Gauge.builder("websocket.connections.active", activeConnections, AtomicInteger::get)
                .description("Número atual de conexões WebSocket ativas")
                .register(meterRegistry);

        // Contadores
        establishedCounter = Counter.builder("websocket.connections.established.total")
                .description("Total de conexões WebSocket estabelecidas")
                .register(meterRegistry);

        closedCounter = Counter.builder("websocket.connections.closed.total")
                .description("Total de conexões WebSocket encerradas")
                .register(meterRegistry);

        // Timer para duração das conexões
        connectionDurationTimer = Timer.builder("websocket.connection.duration")
                .description("Duração das conexões WebSocket")
                .register(meterRegistry);
    }

    public Timer.Sample startConnectionTimer() {
        return Timer.start();
    }

    public void connectionEstablished(Timer.Sample sample) {
        activeConnections.incrementAndGet();
        establishedCounter.increment();
        if (sample != null) {
            sample.stop(connectionDurationTimer);
        }
    }

    public void connectionEstablished() {
        activeConnections.incrementAndGet();
        establishedCounter.increment();
    }

    public void connectionClosed() {
        activeConnections.decrementAndGet();
        closedCounter.increment();
    }
}
