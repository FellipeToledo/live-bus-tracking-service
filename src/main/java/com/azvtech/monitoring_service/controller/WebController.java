package com.azvtech.monitoring_service.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {

    @GetMapping("web/monitoring")
    public String Map() {
        return "monitoring";
    }
}
