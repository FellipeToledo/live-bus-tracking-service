package com.azvtech.monitoring_service.config.metrics;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Configuration;

/**
 * Appender customizado do Logback para coleta de métricas de logs.
 *
 * Esta classe estende AppenderBase para interceptar todos os eventos de log
 * e convertê-los em métricas Micrometer, permitindo monitorar a frequência
 * e distribuição de logs por nível e logger.
 *
 * As métricas coletadas são úteis para:
 * - Identificar padrões de erro através de alertas
 * - Monitorar volume de logs por componente
 * - Detectar anomalias no comportamento da aplicação
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */
@Configuration
public class MetricsLogAppender extends AppenderBase<ILoggingEvent>  {

    private final MeterRegistry meterRegistry;

    /**
     * Construtor para injeção do MeterRegistry do Micrometer.
     *
     * @param meterRegistry Registry para registro e coleta de métricas
     */
    public MetricsLogAppender(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    /**
     * Processa cada evento de log, convertendo-o em métricas.
     * Cria ou atualiza contadores Micrometer com tags para nível do log
     * e nome do logger, permitindo análise detalhada dos padrões de logging.
     *
     * @param event Evento de log a ser processado e convertido em métrica
     *
     * @example
     * // Métricas geradas:
     * // app.log.messages{level="ERROR",logger="com.azvtech.Service"} 15
     * // app.log.messages{level="INFO",logger="com.azvtech.Controller"} 42
     *
     * @see ILoggingEvent
     * @see Counter
     */
    @Override
    protected void append(ILoggingEvent event) {
        Counter.builder("app.log.messages")
                .tag("level", event.getLevel().toString())
                .tag("logger", event.getLoggerName())
                .register(meterRegistry)
                .increment();
    }
}
