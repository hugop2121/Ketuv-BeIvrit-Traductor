# Etapa de construcción
FROM node: 20 -slim AS build
DIRECTORIO DE TRABAJO /app
COPIAR paquete*.json ./
EJECUTAR npm install
COPIAR . .
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY
EJECUTAR npm run build

# Etapa de producción
Desde el nodo: 20 -slim
DIRECTORIO DE TRABAJO /app
EJECUTAR npm install -g serve
COPIAR --from=build /app/dist ./dist
EXPOSICIÓN  7860
CMD [ "servir" , "-s" , "dist" , "-l" , "7860" ]
