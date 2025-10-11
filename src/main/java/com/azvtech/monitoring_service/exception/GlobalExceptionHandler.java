package com.azvtech.monitoring_service.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Handler global de exceções para a aplicação de monitoramento GPS.
 * Centraliza o tratamento de exceções não capturadas em controllers,
 * fornecendo respostas padronizadas e apropriadas para o cliente.
 *
 * Implementa o padrão REST Controller Advice para interceptar exceções
 * em nível de aplicação e converter em respostas HTTP consistentes.
 *
 * @author Fellipe Toledo
 * @version 1.0
 * @since 2025
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handler genérico para exceções não tratadas específicas.
     * Captura qualquer exceção do tipo Exception e suas subclasses,
     * retornando uma resposta HTTP 500 (Internal Server Error) com
     * uma mensagem amigável ao cliente.
     *
     * @param e Exceção capturada a ser tratada
     * @return String Mensagem de erro formatada para o cliente
     *
     * @example
     * // Quando uma exceção não tratada ocorre:
     * // HTTP Response: 500 Internal Server Error
     * // Body: "Erro no servidor: [detalhe da exceção]"
     *
     * @see Exception
     * @see HttpStatus#INTERNAL_SERVER_ERROR
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public String handleException(Exception e) {
        return "Erro no servidor: " + e.getMessage();
    }
}
