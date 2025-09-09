from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum


class PriorityEnum(str, Enum):
    baja = "baja"
    media = "media"
    alta = "alta"


# Schema para crear tarea
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: PriorityEnum
    due_date: date


# Schema para respuesta
class Task(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    priority: PriorityEnum
    due_date: date
    created_at: datetime
    completed: bool

    class Config:
        orm_mode = True
