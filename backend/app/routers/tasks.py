# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
import bleach
import re

from backend.app import models, schemas
from backend.app.database import get_db

router = APIRouter(prefix="/tasks", tags=["Tasks"])

# ---------- Constantes de validación ----------
VALID_PRIORITIES = ["baja", "media", "alta"]

TITLE_REGEX = r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,-]{3,100}$"
DESC_REGEX = r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s.,!?()\-]{0,255}$"


# ---------- Crear tarea ----------
@router.post("/", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    title = bleach.clean(task.title.strip())
    description = bleach.clean(
        task.description.strip() if task.description else "")

    if not re.match(TITLE_REGEX, title):
        raise HTTPException(
            status_code=400,
            detail="Título inválido (3-100 caracteres, letras, números, espacios y algunos símbolos)"
        )
    if description and not re.match(DESC_REGEX, description):
        raise HTTPException(
            status_code=400,
            detail="Descripción inválida (máx 255 caracteres, letras, números y signos permitidos)"
        )
    if task.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=400, detail="Prioridad inválida")
    if task.due_date < date.today():
        raise HTTPException(
            status_code=400, detail="La fecha de vencimiento debe ser futura")

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


# ---------- Buscar por título o fecha ----------
@router.get("/search", response_model=List[schemas.Task])
def search_tasks(
    title: Optional[str] = None,
    due_date: Optional[str] = None,  # recibir como string
    db: Session = Depends(get_db)
):
    from datetime import datetime

    query = db.query(models.Task)

    if title:
        title_clean = bleach.clean(title.strip())
        query = query.filter(models.Task.title.ilike(f"%{title_clean}%"))

    if due_date:
        try:
            # Intentar convertir formatos "YYYY-MM-DD" o "D/M/YYYY"
            if "-" in due_date:  # formato ISO
                due_date_obj = datetime.strptime(due_date, "%Y-%m-%d").date()
            else:  # formato D/M/YYYY
                due_date_obj = datetime.strptime(due_date, "%d/%m/%Y").date()
            query = query.filter(models.Task.due_date == due_date_obj)
        except ValueError:
            raise HTTPException(
                status_code=400, detail="Formato de fecha inválido. Usa YYYY-MM-DD o D/M/YYYY")

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
