"""Tabele bazy.

Klient, treść i plan miesiąca trzymają swoje pola w kolumnie JSON (`data`) – interfejs jest ich właścicielem,
a nowe pole w formularzu nie wymaga migracji. W osobnych kolumnach są tylko rzeczy, po których szukamy
albo które chroni serwer: token linku dla klienta, klient treści, wersja treści, komentarze i pliki.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    password_hash: Mapped[str] = mapped_column(String(300))
    role: Mapped[str] = mapped_column(String(20), default="member")  # admin / member
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # link dla klienta /p/<token>
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    month: Mapped[str] = mapped_column(String(7), default="", index=True)
    # rośnie przy każdej zmianie; chroni przed nadpisaniem akceptacji klienta starą wersją z otwartej karty
    rev: Mapped[int] = mapped_column(Integer, default=1)
    data: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)


class MonthPlan(Base):
    """Tematy tygodni i uwagi operacyjne jednego miesiąca klienta."""

    __tablename__ = "month_plans"

    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), primary_key=True)
    month: Mapped[str] = mapped_column(String(7), primary_key=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(10))  # client / agency / sys
    author: Mapped[str] = mapped_column(String(200), default="")
    text: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[int] = mapped_column(BigInteger)  # milisekundy, jak Date.now() w przeglądarce


class Notification(Base):
    """Zdarzenie od klienta (akceptacja, prośba o zmiany, komentarz) – lista pod dzwonkiem w panelu."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(10))  # accept / changes / comment
    author: Mapped[str] = mapped_column(String(200), default="")
    text: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[int] = mapped_column(BigInteger, index=True)  # milisekundy


class NotificationSeen(Base):
    """Do kiedy dana osoba przejrzała powiadomienia (osobna tabela, żeby nie zmieniać tabeli users)."""

    __tablename__ = "notification_seen"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    seen_at: Mapped[int] = mapped_column(BigInteger, default=0)


class Media(Base):
    """Wgrana grafika. Adres /media/<id> jest publiczny, ale identyfikator jest losowy i nie do zgadnięcia."""

    __tablename__ = "media"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    content_type: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(300), default="")
    size: Mapped[int] = mapped_column(Integer, default=0)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
