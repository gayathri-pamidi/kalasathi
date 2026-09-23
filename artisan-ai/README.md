# Artisan AI

## Project Purpose
Artisan AI is an advanced AI platform designed to provide powerful services including Image AI, Speech AI, Catalog generation, and dynamic pricing ML models. The backend is modularly structured to accommodate these various AI services efficiently.

## Current Architecture
The current architecture is a modular FastAPI application. It is designed with separate routes and services for each core AI component (Image, Speech, Catalog, Pricing). Currently, this is a skeleton project containing only a basic health check endpoint and the foundational directory structure. 

## Getting Started

### 1. Create a Python virtual environment
Navigate to the `backend` directory and create a virtual environment:
```bash
cd backend
python -m venv venv
```

Activate the virtual environment:
- On Windows: `venv\Scripts\activate`
- On macOS/Linux: `source venv/bin/activate`

### 2. Install requirements
```bash
pip install -r requirements.txt
```

### 3. Run FastAPI locally
```bash
uvicorn app.main:app --reload
```
The application will start on `http://127.0.0.1:8000`.

### 4. Access Swagger Documentation
Once the server is running, you can access the interactive API documentation (Swagger UI) at:
`http://127.0.0.1:8000/docs`

## Future Phases
The following features are planned for subsequent development phases and are **not yet implemented**:
- **Image AI:** Analysis, enhancement, and background removal.
- **Speech AI:** Regional-language speech-to-text.
- **Catalog AI:** Product information extraction and catalog generation.
- **Pricing ML:** ML-based dynamic pricing models.
- **Database:** PostgreSQL integration for persistent storage.
- **Frontend:** A cross-platform Flutter application integrating these APIs.
