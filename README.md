# teste-shopper

## Descrição

O projeto `teste-shopper` é uma aplicação Node.js que utiliza TypeScript, Docker e PostgreSQL. O objetivo principal é fornecer uma API para manipulação de dados com suporte a validação e integração com serviços do Google.

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução para a aplicação.
- **TypeScript**: Linguagem de programação para fornecer tipagem estática ao JavaScript.
- **Express**: Framework para construir a API.
- **PostgreSQL**: Banco de dados relacional.
- **Docker**: Contêiner para empacotar a aplicação e suas dependências.
- **Google Cloud Vision**: Serviço para reconhecimento de imagem.
- **Google Generative AI**: Serviço para geração de conteúdo.

## Estrutura do Projeto

- **src/**: Código-fonte da aplicação.
- **dist/**: Código transpilado do TypeScript.
- **Dockerfile**: Configuração para criar a imagem Docker da aplicação.
- **docker-compose.yml**: Configuração para definir e executar múltiplos contêineres Docker.
- **.env**: Arquivo de variáveis de ambiente (não incluído no repositório).

## Dependências

### Dependências do Projeto

- `@google-cloud/vision`: Biblioteca para utilizar o serviço Google Cloud Vision.
- `@google/generative-ai`: Biblioteca para utilizar o serviço Google Generative AI.
- `cors`: Middleware para habilitar CORS.
- `date-fns`: Biblioteca para manipulação de datas.
- `dotenv`: Carregar variáveis de ambiente de um arquivo `.env`.
- `express`: Framework web para Node.js.
- `express-validator`: Middleware para validação de dados.
- `node-fetch`: Biblioteca para realizar requisições HTTP.
- `pg`: Biblioteca cliente para PostgreSQL.
- `typeorm`: ORM para TypeScript e Node.js.

### Dependências de Desenvolvimento

- `@types/*`: Tipagens TypeScript para bibliotecas usadas.
- `ts-node-dev`: Ferramenta para desenvolvimento com recarregamento automático.
- `typescript`: Compilador TypeScript.

## Scripts

- **build**: Compila o código TypeScript para JavaScript.
- **start**: Inicia a aplicação.
- **dev**: Inicia a aplicação em modo de desenvolvimento com recarregamento automático.

## Docker

### Dockerfile

O Dockerfile configura a construção da imagem Docker para a aplicação.

### docker-compose.yml

O `docker-compose.yml` define dois serviços:

- **app**: Serviço principal da aplicação.
- **db**: Serviço para o banco de dados PostgreSQL.

Para iniciar os serviços, use:

```sh
docker-compose up
