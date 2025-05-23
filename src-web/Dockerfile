# Build stage
FROM denoland/deno:latest as builder
WORKDIR /app
COPY . .
RUN deno install
RUN deno run -A npm:vite build

# Production stage
FROM denoland/deno:latest
WORKDIR /app
COPY --from=builder /app/dist ./dist
RUN deno install npm:vite
CMD ["deno", "run", "-A", "npm:vite", "preview", "--host"]
