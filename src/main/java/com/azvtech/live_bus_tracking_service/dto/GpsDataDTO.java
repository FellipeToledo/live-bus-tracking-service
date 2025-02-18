package com.azvtech.live_bus_tracking_service.dto;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * @author Fellipe Toledo
 */

public class GpsDataDTO {

    private String ordem;
    private String latitude;
    private String longitude;
    private LocalDateTime datahora;
    private int velocidade;
    private String linha;
    private LocalDateTime datahoraenvio;
    private LocalDateTime datahoraservidor;

    public String getOrdem() {
        return ordem;
    }

    public void setOrdem(String ordem) {
        this.ordem = ordem;
    }

    public String getLatitude() {
        return latitude;
    }

    public void setLatitude(String latitude) {
        this.latitude = latitude;
    }

    public String getLongitude() {
        return longitude;
    }

    public void setLongitude(String longitude) {
        this.longitude = longitude;
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

    public boolean isMoreRecentThan(GpsDataDTO other) {
        return this.datahoraservidor.isAfter(other.getDatahoraservidor());
    }
}
