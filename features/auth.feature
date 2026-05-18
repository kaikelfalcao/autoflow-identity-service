Feature: Autenticação de admins e clientes
  Como identity-service
  Quero emitir JWTs para admins e clientes válidos
  Para que outros serviços confiem na identidade do chamador

  Scenario: Admin loga com credenciais válidas
    Given existe um admin "admin@autoflow.com" com senha "Admin@123" ativo
    When ele faz login admin com a senha correta
    Then um token JWT é emitido com role "ADMIN"

  Scenario: Admin não loga com senha errada
    Given existe um admin "admin@autoflow.com" com senha "Admin@123" ativo
    When ele faz login admin com a senha "errada"
    Then o login admin é recusado

  Scenario: Admin inativo não loga
    Given existe um admin "inativo@autoflow.com" com senha "Admin@123" inativo
    When ele faz login admin com a senha correta
    Then o login admin é recusado

  Scenario: Cliente loga via CPF
    Given existe um cliente ativo no order-service com CPF "12345678900" e id "cust-1"
    When o cliente faz login com CPF "123.456.789-00"
    Then um token JWT é emitido com role "CUSTOMER"

  Scenario: Cliente não encontrado no order-service
    Given o order-service não tem cliente com CPF "98765432100"
    When o cliente faz login com CPF "987.654.321-00"
    Then o login customer é recusado

  Scenario: CPF inválido é rejeitado antes de consultar order-service
    When o cliente faz login com CPF "abc"
    Then o login customer é rejeitado por CPF inválido
