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
 * @author Fellipe Toledo
 */
@Configuration
@EnableAsync
public class MdcConfig {

    /**
     * Filter to add correlation ID to all requests
     */
    @Bean
    public OncePerRequestFilter mdcFilter() {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal( HttpServletRequest  request,
                                            HttpServletResponse response,
                                            FilterChain filterChain)
                    throws ServletException, IOException {

                try {
                    String correlationId = UUID.randomUUID().toString();
                    MDC.put("traceId", correlationId);
                    MDC.put("spanId", UUID.randomUUID().toString().substring(0, 8));

                    response.addHeader("X-Correlation-ID", correlationId);
                    filterChain.doFilter(request, response);

                } finally {
                    MDC.clear();
                }
            }
        };
    }

    /**
     * TaskDecorator to propagate MDC in asynchronous threads
     */
    @Bean
    public TaskDecorator mdcTaskDecorator() {
        return runnable -> {
            Map<String, String> context = MDC.getCopyOfContextMap();
            return () -> {
                try {
                    if (context != null) {
                        MDC.setContextMap(context);
                    }
                    runnable.run();
                } finally {
                    MDC.clear();
                }
            };
        };
    }
}
