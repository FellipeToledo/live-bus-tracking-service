package com.azvtech.live_bus_tracking_service.utils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * @author Fellipe Toledo
 */
public class DateUtils {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd+HH:mm:ss");

    public static String format(LocalDateTime dateTime) {
        return dateTime.format(FORMATTER);
    }
}
