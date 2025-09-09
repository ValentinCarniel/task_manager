from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import tasks
from . import models, database

app = FastAPI(title="Gestión de Tareas")

# Crear tablas si no existen
models.Base.metadata.create_all(bind=database.engine)

# Habilitar CORS para que el frontend pueda hacer fetch
origins = [
    "http://localhost:5500",   # si usás Live Server
    "http://127.0.0.1:5500",   # otra forma de localhost
    # opcional: permite cualquier origen (para pruebas)
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir rutas
app.include_router(tasks.router)

# Endpoint raíz opcional


@app.get("/")
def root():
    return {"message": "API de Gestión de Tareas funcionando!"}
