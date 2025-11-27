# IPA-Navigator

IPA Navigator is a pronunciation trainer app that helps learners by giving interactive feedback about their pronunciation at the phoneme-level.

## 🏗 Architecture

The project is structured as a monorepo with the following components:

- **Frontend** (`src-web`): A modern React application built with Vite, TailwindCSS, and Convex. It uses Clerk for authentication and TanStack Router for navigation.
- **Backend** (`src-server`): A high-performance Rust server using the Axum framework. **KokoroTTS** is used for text-to-speech.
- **Aligner Service** (`aligner`): A Python-based service utilizing **wav2vec2** for audio alignment and **WhisperX** for word-level transcription. 

## 🚀 Getting Started

This project uses `docker-compose` for containerization and `just` as a command runner to simplify common tasks.

### Prerequisites

- [Docker](https://www.docker.com/) & Docker Compose
- [Just](https://github.com/casey/just)

### Local Development

For local development without Docker, you need the following:

1.  **System Dependencies**:
    - **Espeak-ng** must be installed locally.
    - Export the following environment variables:
        ```bash
        export PHONEMIZER_ESPEAK_LIBRARY=/path/to/libespeak-ng.dylib # (or .so on Linux)
        export ESPEAK_DATA_PATH=/path/to/espeak-ng-data
        ```

2.  **Service Startup**:
    - **Aligner** (`aligner`):
        ```bash
        uv run fastapi dev
        ngrok http 8000
        ```
    - **Backend** (`src-server`):
        ```bash
        cargo run
        ```
    - **Frontend** (`src-web`):
        ```bash
        deno run dev
        # In a separate terminal:
        cd convex && npx convex dev
        ```

> [!NOTE]
> When developing locally, the endpoint APIs fallback to localhost. However, you **MUST** set the `PYTHON_API_URL` in your Convex Dashboard to the `ngrok` endpoint (e.g., `https://xxxx.ngrok-free.app`) so the cloud function can reach your local aligner.

### Docker Commands

- **Start Development Environment**:
  ```bash
  just dev
  ```
  This spins up the services in development mode. The website will be available at `http://127.0.0.1:5173`.

  > [!IMPORTANT]
  > **Convex Connectivity**: To allow the cloud-hosted Convex instance to communicate with your local Aligner API, you **MUST** run ngrok manually:
  > ```bash
  > ngrok http 8000
  > ```
  > Then, set the `PYTHON_API_URL` environment variable in your Convex dashboard or pass it when running `npx convex dev`.

- **Start Production Environment**:
  ```bash
  just prod
  ```
  Runs the application in production mode. The website will be available at `http://127.0.0.1:4173`.

- **Stop Services**:
  ```bash
  just stop
  ```
  Stops all running containers.

- **Clean Up**:
  ```bash
  just nuke
  ```
  Stops containers and removes all volumes (useful for a fresh start).

## 📂 Project Structure

```
├── aligner/        # Python wav2vec2/WhisperX alignment service
├── src-server/     # Rust Axum backend server
├── src-web/        # React/Vite frontend application
├── docker-compose.yml      # Production docker-compose config
├── docker-compose.dev.yml  # Development docker-compose config
└── justfile        # Command runner configuration
```

## 🔧 Development

- **Frontend**: Located in `src-web`. Run `npm install` (or `pnpm`/`yarn`) inside the directory to install dependencies locally if needed.
- **Backend**: Located in `src-server`. Standard Rust project structure.
- **Aligner**: Located in `aligner`. Python project using `uv` for dependency management.