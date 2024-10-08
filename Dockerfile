# Use uma imagem base oficial do Node.js
FROM node:18

# Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie o package.json e o package-lock.json para o contêiner
COPY package*.json ./

# Instale as dependências da aplicação
RUN npm install

# Copie o restante do código da aplicação para o contêiner
COPY . .

# Variavel de Ambiente

ENV GEMINI_API_KEY=${GEMINI_API_KEY}

# Compilando o TypeScript

RUN npm run build

# Exponha a porta em que a aplicação vai rodar
EXPOSE 3000

# Defina o comando para iniciar a aplicação
CMD ["npm", "start"]
