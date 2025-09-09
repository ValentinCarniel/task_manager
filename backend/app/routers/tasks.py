import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import bleach

from .. import models, schemas, database

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- Constantes de validación ----------
VALID_PRIORITIES = ["baja", "media", "alta"]

# Regex para títulos: letras con acentos, ñ, números, espacios, ., ,, -, máximo 100 caracteres
TITLE_REGEX = r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]{3,100}$"

# Regex para descripción: letras con acentos, ñ, números, espacios, signos de puntuación comunes, máximo 255 caracteres
DESC_REGEX = r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,!?()\-]{0,255}$"


# ---------- Crear tarea ----------
@router.post("/", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    # Sanitizar entradas
    title = bleach.clean(task.title.strip())
    description = bleach.clean(
        task.description.strip() if task.description else "")

    # Validar título
    if not re.match(TITLE_REGEX, title):
        raise HTTPException(
            status_code=400,
            detail="Título inválido (3-100 caracteres, letras, números, espacios y algunos símbolos)"
        )

    # Validar descripción
    if description and not re.match(DESC_REGEX, description):
        raise HTTPException(
            status_code=400,
            detail="Descripción inválida (máx 255 caracteres, letras, números y signos permitidos)"
        )

    # Validar prioridad
    if task.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Prioridad inválida")

    # Validar fecha futura
    if task.due_date < date.today():
        raise HTTPException(
            status_code=400, detail="La fecha de vencimiento debe ser futura"
        )

    db_task = models.Task(
        title=title,
        description=description,
        priority=task.priority,
        due_date=task.due_date
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


# ---------- Listar todas las tareas ----------
@router.get("/", response_model=List[schemas.Task])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(models.Task).all()


# ---------- Buscar por título o fecha (query params) ----------
@router.get("/search", response_model=List[schemas.Task])
def search_tasks(
    title: Optional[str] = None,
    due_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Task)

    if title:
        title_clean = bleach.clean(title.strip())
        query = query.filter(models.Task.title.ilike(f"%{title_clean}%"))
    if due_date:
        query = query.filter(models.Task.due_date == due_date)

    return query.all()


# ---------- Marcar como completada ----------
@router.patch("/{task_id}/toggle", response_model=schemas.Task)
def toggle_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    task.completed = not getattr(task, "completed", False)
    db.commit()
    db.refresh(task)
    return task


# ---------- Eliminar tarea ----------
@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    db.delete(task)
    db.commit()
    return {"detail": "Tarea eliminada"}
