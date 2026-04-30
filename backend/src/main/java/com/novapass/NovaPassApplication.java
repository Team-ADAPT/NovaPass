package com.novapass;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableAsync
@org.springframework.scheduling.annotation.EnableScheduling
public class NovaPassApplication {

    public static void main(String[] args) {
        SpringApplication.run(NovaPassApplication.class, args);
    }
}
