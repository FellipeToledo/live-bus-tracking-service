package com.azvtech.monitoring_service.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

/**
 * Configuração para gerenciamento de MDC (Mapped Diagnostic Context)
 * e correlacionação de logs em ambientes distribuídos.
 *
 * Esta configuração fornece:
 * - Filtro HTTP para adicionar correlation ID a todas as requisições
 * - TaskDecorator para propagação de MDC em execuções assíncronas
 * - Suporte a tracing distribuído com traceId e spanId
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */
@Configuration
@EnableAsync
public class MdcConfig {

    /**
     * Filtro HTTP que adiciona identificadores de correlação a todas as requisições.
     * Gera um traceId único e um spanId reduzido para cada requisição HTTP,
     * permitindo rastrear o fluxo completo de processamento através dos logs.
     *
     * O filtro adiciona os identificadores ao MDC para logging estruturado
     * e inclui o correlation ID no header HTTP de resposta.
     *
     * @return OncePerRequestFilter configurado para manipulação de MDC
     *
     * @see OncePerRequestFilter
     * @see MDC
     *
     * @example
     * // Headers na resposta:
     * // X-Correlation-ID: 123e4567-e89b-12d3-a456-426614174000
     *
     * // Nos logs:
     * // INFO [monitoring-service,123e4567-e89b-12d3-a456-426614174000,a1b2c3d4] Mensagem de log
     */
    @Bean
    public OncePerRequestFilter mdcFilter() {
        return new OncePerRequestFilter() {

            /**
             * Intercepta cada requisição HTTP para adicionar contexto de correlação.
             * Gera identificadores únicos e gerencia o ciclo de vida do MDC.
             *
             * @param request Requisição HTTP recebida
             * @param response Resposta HTTP a ser enviada
             * @param filterChain Cadeia de filtros para continuar o processamento
             * @throws ServletException em caso de erro no processamento do filtro
             * @throws IOException em caso de erro de I/O
             */
            @Override
            protected void doFilterInternal( HttpServletRequest  request,
                                            HttpServletResponse response,
                                            FilterChain filterChain)
                    throws ServletException, IOException {

                try {
                    // Gera identificadores únicos para tracing distribuído
                    String correlationId = UUID.randomUUID().toString();
                    // Adiciona ao MDC para logging estruturado
                    MDC.put("traceId", correlationId);
                    MDC.put("spanId", UUID.randomUUID().toString().substring(0, 8));

                    // Adiciona correlation ID ao header de resposta para clientes
                    response.addHeader("X-Correlation-ID", correlationId);
                    // Continua o processamento da requisição
                    filterChain.doFilter(request, response);

                } finally {
                    // Limpa o MDC ao final da requisição para evitar memory leaks
                    MDC.clear();
                }
            }
        };
    }

    /**
     * TaskDecorator para propagação de contexto MDC entre threads assíncronas.
     * Garante que o contexto de tracing (traceId, spanId) seja preservado
     * quando tarefas são executadas em threads diferentes da requisição original.
     *
     * Essencial para correlacionar logs em operações assíncronas e agendadas.
     *
     * @return TaskDecorator configurado para propagação de MDC
     *
     * @see TaskDecorator
     * @see org.springframework.scheduling.annotation.Async
     *
     * @example
     * // Em uma método @Async, o MDC será automaticamente propagado:
     * @Async
     * public void processAsync() {
     *     logger.info("Esta mensagem terá o mesmo traceId da requisição original");
     * }
     */
    @Bean
    public TaskDecorator mdcTaskDecorator() {
        return runnable -> {
            // Captura o contexto MDC atual da thread principal
            Map<String, String> context = MDC.getCopyOfContextMap();
            return () -> {
                try {
                    // Restaura o contexto MDC na thread assíncrona
                    if (context != null) {
                        MDC.setContextMap(context);
                    }
                    // Executa a tarefa original
                    runnable.run();
                } finally {
                    // Limpa o contexto após execução
                    MDC.clear();
                }
            };
        };
    }
}
