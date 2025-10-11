package com.azvtech.monitoring_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Data Transfer Object (DTO) que representa os dados de GPS de um veículo.
 * Contém informações de localização, timestamp e metadados do veículo
 * para transmissão via WebSocket e processamento pelo sistema de monitoramento.
 *
 * Implementa conversões automáticas de formatos de dados (string para double,
 * timestamp para LocalDateTime) para facilitar a integração com APIs externas.
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */
public class GpsDataDTO {

    /**
     * Identificador único do veículo (número de ordem).
     * Utilizado como chave para agrupamento e identificação.
     */
    private String ordem;

    /**
     * Coordenada de latitude da posição do veículo.
     * Valor em graus decimais no formato WGS84.
     */
    private double latitude;

    /**
     * Coordenada de longitude da posição do veículo.
     * Valor em graus decimais no formato WGS84.
     */
    private double  longitude;

    /**
     * Data e hora da coleta da posição GPS pelo dispositivo.
     * Formato ISO 8601: yyyy-MM-dd'T'HH:mm:ss
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")


    private LocalDateTime datahora;

    /**
     * Velocidade instantânea do veículo em km/h.
     * Valor inteiro representando a velocidade no momento da coleta.
     */
    private int velocidade;

    /**
     * Identificador da linha ou rota do veículo.
     * Representa a rota ou itinerário sendo executado.
     */
    private String linha;

    /**
     * Data e hora do envio dos dados pelo dispositivo GPS.
     * Formato ISO 8601: yyyy-MM-dd'T'HH:mm:ss
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime datahoraenvio;

    /**
     * Data e hora do recebimento dos dados pelo servidor.
     * Utilizado para determinar a atualização mais recente por veículo.
     * Formato ISO 8601: yyyy-MM-dd'T'HH:mm:ss
     */
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime datahoraservidor;

    /**
     * Getter e Setter
     */
    public String getOrdem() {
        return ordem;
    }

    public void setOrdem(String ordem) {
        this.ordem = ordem;
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(String  latitude) {
        this.latitude = Double.parseDouble(latitude.replace(",", "."));
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = Double.parseDouble(longitude.replace(",", "."));
    }

    public int getVelocidade() {
        return velocidade;
    }

    public void setVelocidade(int velocidade) {
        this.velocidade = velocidade;
    }

    public String getLinha() {
        return linha;
    }

    public void setLinha(String linha) {
        this.linha = linha;
    }

    public LocalDateTime getDatahora() {
        return datahora;
    }

    public void setDatahora(long timestamp) {
        this.datahora = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
    }

    public LocalDateTime getDatahoraenvio() {
        return datahoraenvio;
    }

    public void setDatahoraenvio(long timestamp) {
        this.datahoraenvio = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
    }

    public LocalDateTime getDatahoraservidor() {
        return datahoraservidor;
    }

    public void setDatahoraservidor(long timestamp) {
        this.datahoraservidor = LocalDateTime.ofInstant(Instant.ofEpochMilli(timestamp), ZoneId.systemDefault());
    }

    /**
     * Compara este registro com outro para determinar qual é mais recente.
     * A comparação é baseada no timestamp de recebimento pelo servidor (datahoraservidor).
     *
     * @param other Outro objeto GpsDataDTO para comparação
     * @return true se este registro for mais recente que o outro
     *
     * @example
     * GpsDataDTO current = new GpsDataDTO();
     * GpsDataDTO previous = new GpsDataDTO();
     * boolean isNewer = current.isMoreRecentThan(previous);
     */
    public boolean isMoreRecentThan(GpsDataDTO other) {
        return this.datahoraservidor.isAfter(other.getDatahoraservidor());
    }

    /**
     * Retorna uma representação em string do objeto.
     * Útil para logging e debugging.
     *
     * @return String representando o objeto GpsDataDTO
     */
    @Override
    public String toString() {
        return "GpsDataDTO{" +
                "ordem='" + ordem + '\'' +
                ", latitude=" + latitude +
                ", longitude=" + longitude +
                ", datahora=" + datahora +
                ", velocidade=" + velocidade +
                ", linha='" + linha + '\'' +
                ", datahoraenvio=" + datahoraenvio +
                ", datahoraservidor=" + datahoraservidor +
                '}';
    }
}
