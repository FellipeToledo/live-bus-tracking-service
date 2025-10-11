package com.azvtech.monitoring_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Classe principal da aplicação de Monitoramento GPS em Tempo Real.
 * <p>
 * Esta aplicação Spring Boot fornece um sistema de monitoramento contínuo
 * de dados GPS de veículos, com as seguintes funcionalidades principais:
 * <p>
 * Funcionalidades:
 * - Polling periódico de dados GPS de API externa
 * - Transmissão em tempo real via WebSocket para clientes
 * - Processamento e filtragem de dados por veículo
 * - Métricas detalhadas e monitoramento via Spring Boot Actuator
 * - Logging estruturado com correlacionação distribuída
 * <p>
 * Características Técnicas:
 * - Arquitetura baseada em eventos e polling agendado
 * - Comunicação bidirecional via WebSocket
 * - Configuração externalizada via application.yml
 * - Métricas Micrometer para Prometheus
 * - Tratamento robusto de erros e exceções
 * - Configuração de pool de threads otimizada
 * <p>
 * Endpoints Principais:
 * - WebSocket: /gps-updates (transmissão de dados GPS)
 * - Actuator: /actuator/health, /actuator/metrics, /actuator/prometheus
 * <p>
 * Configurações de Agendamento:
 * - Polling GPS: executa a cada 2 segundos
 * - Janela temporal: coleta dados dos últimos 90 segundos
 * - Tamanho de batch: 10 registros por transmissão WebSocket
 *
 * @author Fellipe Toledo
 * @version 1.0.0
 * @since 2025
 *
 * @see org.springframework.boot.autoconfigure.SpringBootApplication
 * @see org.springframework.scheduling.annotation.EnableScheduling
 */
@SpringBootApplication
@EnableScheduling
public class MonitoringServiceApplication {

    /**
     * Método principal que inicia a aplicação Spring Boot.
     *
     * Responsável por:
     * - Inicializar o contexto da aplicação Spring
     * - Configurar auto-configurações do Spring Boot
     * - Registrar componentes e configurações customizadas
     * - Iniciar o agendamento de tarefas com @EnableScheduling
     *
     * Fluxo de Inicialização:
     * 1. Carrega configurações do application.yml
     * 2. Inicializa beans do Spring (@Configuration classes)
     * 3. Configura WebSocket e handlers
     * 4. Inicia agendamento de polling GPS
     * 5. Expõe endpoints Actuator para monitoramento
     *
     * @param args Argumentos de linha de comando
     *            - --server.port=8080: Define porta do servidor
     *            - --gps.endpoint=http://api.gps.com: Define endpoint GPS
     *            - --logging.level.com.azvtech=DEBUG: Define nível de log
     *
     * @example
     * // Execução básica
     * java -jar monitoring-service.jar
     * <p>
     * // Execução com configurações customizadas
     * java -jar monitoring-service.jar \
     *   --server.port=8080 \
     *   --gps.endpoint="https://api.gps-service.com/data" \
     *   --logging.level.com.azvtech=INFO
     *
     * @throws Exception em caso de falha crítica na inicialização
     *
     * @see SpringApplication#run(Class, String...)
     */
	public static void main(String[] args) {
		SpringApplication.run(MonitoringServiceApplication.class, args);
	}

}
