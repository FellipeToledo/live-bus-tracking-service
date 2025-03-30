# Live Bus Tracking Service

ServiÃ§o responsável por coletar dados de GPS de ônibus em tempo real, aplicar regras de negócio e notificar clientes via WebSocket.

## Visão Geral

O Live Bus Tracking Service é um microserviço desenvolvido com Spring Boot que realiza polling periódico em uma API externa de GPS de ônibus, processa os dados recebidos aplicando regras de negócio e disponibiliza atualizações em tempo real para clientes conectados via WebSocket.

## Funcionalidades Atuais

- Polling periódico na API de GPS (a cada 25 segundos)
- Filtragem dos dados mais recentes por veículo 
- Broadcast de atualizações via WebSocket para clientes conectados
- Métricas de monitoramento via Micrometer/Prometheus
- Suporte a configuração via application.yml

## Tecnologias Utilizadas

- Java 21
- Spring Boot 3.4.2
- Spring WebSocket
- Micrometer/Prometheus para métricas 
- Maven como gerenciador de dependências 

## Configuração 

O serviço pode ser configurado através do arquivo `application.yml`:

```yaml
gps:
  endpoint: https://dados.mobilidade.rio/gps/sppo
  batch-size: 10
management:
  endpoints:
    web:
      exposure:
        include: prometheus,health,metrics
```

## Como Usar

### Pré-requisitos 

- JDK 21
- Maven 3.8+

### Compilação 

```bash
mvn clean package
```

### Execução 

```bash
java -jar target/live-bus-tracking-service-0.0.1-SNAPSHOT.jar
```

### Conexão WebSocket

Para receber atualizações em tempo real, conecte-se ao endpoint WebSocket:

```
ws://localhost:8080/gps-updates
```

## Arquitetura Atual

O serviço segue uma arquitetura simples com os seguintes componentes:

- `GpsPollingService`: Responsável por realizar polling periódico na API externa
- `GpsWebSocketHandler`: Gerencia conexões WebSocket e envia atualizações 
- `GpsDataDTO`: Representa os dados de GPS dos veículos 

## TO DO (Melhorias Futuras)

### Refatoração Arquitetural (DDD)

- [ ] Reorganizar o projeto seguindo padrões de Domain-Driven Design:
  - [ ] Estruturar o código em camadas (domain, application, infrastructure, presentation)
  - [ ] Criar modelos de domínio (Vehicle, GpsPosition) ?
  - [ ] Implementar repositórios e serviços de domínio ?
  - [ ] Aplicar princípios de arquitetura hexagonal (Ports & Adapters)

### Melhorias de Resiliência 

- [ ] Implementar políticas de retry para chamadas à API externa
- [ ] Adicionar circuit breaker para tolerância a falhas
- [ ] Implementar graceful degradation em caso de falhas na API externa

### Performance e Escalabilidade

- [ ] Implementar sistema de cache para reduzir chamadas à  API externa
- [ ] Otimizar processamento dos dados com processamento assíncrono 
- [ ] Adicionar suporte para clusterização do serviço 

### Segurança 

- [ ] Implementar autenticação/autorização para conexões WebSocket
- [ ] Adicionar rate limiting para proteger contra abusos
- [ ] Validação e sanitização robusta dos dados recebidos

### Qualidade e DevOps

- [ ] Adicionar testes unitários e de integração 
- [ ] Configurar CI/CD pipeline
- [ ] Implementar análise de código estatística 
- [ ] Melhorar documentação técnica e de API

### Funcionalidades Adicionais

- [ ] Adicionar filtros para seleção de rotas/veículos específicos 
- [ ] Implementar sistema de alertas baseado em regras configuráveis
- [ ] Desenvolver endpoint REST para consulta histórica de posições 
- [ ] Suporte a internacionalização para mensagens de erro

### Observabilidade

- [ ] Aprimorar métricas e logs para melhor monitoramento
- [ ] Integrar com sistemas de rastreamento distribuído (Distributed Tracing)
- [ ] Configurar dashboards de monitoramento

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## Licença 

Este projeto está licenciado sob a [Licença MIT](LICENSE).
