package com.azvtech.live_bus_tracking_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class LiveBusTrackingServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(LiveBusTrackingServiceApplication.class, args);
	}

}
