from sqlalchemy import Column, Integer, String, Date, Enum, TIMESTAMP, Boolean, text
from .database import Base
import enum


class PriorityEnum(enum.Enum):
    baja = "baja"
    media = "media"
    alta = "alta"


class Task(Base):
    __tablename__ = "z_tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    priority = Column(Enum(PriorityEnum), nullable=False)
    due_date = Column(Date, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text(
        "CURRENT_TIMESTAMP"), nullable=False)
    # <-- ahora Boolean está importado
    completed = Column(Boolean, default=False)
