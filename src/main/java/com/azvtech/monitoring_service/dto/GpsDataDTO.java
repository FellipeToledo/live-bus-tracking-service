package com.azvtech.monitoring_service.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * @author Fellipe Toledo
 */

public class GpsDataDTO {

    private String ordem;
    private double latitude;
    private double  longitude;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime datahora;
    private int velocidade;
    private String linha;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime datahoraenvio;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime datahoraservidor;

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

    public boolean isMoreRecentThan(GpsDataDTO other) {
        return this.datahoraservidor.isAfter(other.getDatahoraservidor());
    }

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
