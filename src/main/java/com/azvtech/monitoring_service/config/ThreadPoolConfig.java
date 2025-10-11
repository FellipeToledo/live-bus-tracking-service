package com.azvtech.monitoring_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * Configuração do pool de threads para execução de tarefas agendadas.
 * Define um ThreadPoolTaskScheduler customizado para processamento de polling GPS
 * com suporte a MDC (Mapped Diagnostic Context) para correlacionação de logs.
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */

@Configuration
public class ThreadPoolConfig {

    private final TaskDecorator mdcTaskDecorator;

    /**
     * Construtor para injeção do TaskDecorator responsável por propagar
     * o contexto MDC entre threads para correlacionação de logs.
     *
     * @param mdcTaskDecorator Decorator que propaga MDC entre threads
     */
    public ThreadPoolConfig(TaskDecorator mdcTaskDecorator) {
        this.mdcTaskDecorator = mdcTaskDecorator;
    }

    /**
     * Configura e inicializa o ThreadPoolTaskScheduler para tarefas agendadas.
     * O scheduler é otimizado para operações de polling GPS com as seguintes características:
     * - Pool fixo de 5 threads para controle de recursos
     * - Nomeação de threads para melhor identificação em logs e monitoramento
     * - Propagação de MDC para manter contexto entre execuções assíncronas
     * - Ideal para tarefas periódicas de curta duração
     *
     * @return ThreadPoolTaskScheduler configurado e inicializado
     *
     * @see ThreadPoolTaskScheduler
     * @see TaskDecorator
     *
     * @example
     * // Uso típico com @Scheduled
     * @Scheduled(fixedRate = 2000)
     * public void pollingTask() {
     *     // Executado em thread do pool configurado
     * }
     */
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

        // Tamanho fixo do pool para controle de recursos
        scheduler.setPoolSize(5);
        // Prefixo para identificação nos logs e monitoramento
        scheduler.setThreadNamePrefix("GpsPolling-");
        // Propaga contexto MDC para correlacionação entre threads
        scheduler.setTaskDecorator(mdcTaskDecorator);
        // Inicializa o scheduler imediatamente após configuração
        scheduler.initialize();
        return scheduler;
    }
}
