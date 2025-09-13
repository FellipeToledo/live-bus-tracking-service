package com.azvtech.live_bus_tracking_service.config.metrics;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Configuration;

/**
 * @author Fellipe Toledo
 */
@Configuration
public class MetricsLogAppender extends AppenderBase<ILoggingEvent>  {

    private final MeterRegistry meterRegistry;

    public MetricsLogAppender(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    protected void append(ILoggingEvent event) {
        Counter.builder("app.log.messages")
                .tag("level", event.getLevel().toString())
                .tag("logger", event.getLoggerName())
                .register(meterRegistry)
                .increment();
    }
}
