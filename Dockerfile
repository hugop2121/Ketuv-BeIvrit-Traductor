# Etapa de construcción
FROM node:20-slim AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Argumento para la API Key (se pasa durante el build en Hugging Face)
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM node:20-slim

WORKDIR /app

# Instalar un servidor estático simple
RUN npm install -g serve

# Copiar los archivos construidos desde la etapa anterior
COPY --from=build /app/dist ./dist

# Exponer el puerto 7860 (puerto por defecto de Hugging Face Spaces)
EXPOSE 7860

# Comando para iniciar la aplicación
CMD ["serve", "-s", "dist", "-l", "7860"]
