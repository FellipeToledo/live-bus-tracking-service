package com.azvtech.live_bus_tracking_service.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.TaskDecorator;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * @author Fellipe Toledo
 */

@Configuration
public class ThreadPoolConfig {

    private final TaskDecorator mdcTaskDecorator;

    public ThreadPoolConfig(TaskDecorator mdcTaskDecorator) {
        this.mdcTaskDecorator = mdcTaskDecorator;
    }

    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5);
        scheduler.setThreadNamePrefix("GpsPolling-");
        scheduler.setTaskDecorator(mdcTaskDecorator);
        scheduler.initialize();
        return scheduler;
    }
}
