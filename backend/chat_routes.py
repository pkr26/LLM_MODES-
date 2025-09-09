from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from auth import get_current_user
from models import User, Chat, Message, ChatSettings, AIMode, MessageRole
from schemas import (
    ChatCreate, ChatUpdate, ChatResponse, ChatDetailResponse,
    MessageCreate, MessageResponse, ChatSettingsCreate, 
    ChatSettingsUpdate, ChatSettingsResponse, AIModeEnum
)

router = APIRouter(prefix="/api/chats", tags=["chats"])

@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_chat = Chat(
        user_id=current_user.id,
        title=chat_data.title,
        mode=AIMode(chat_data.mode)
    )
    db.add(db_chat)
    db.commit()
    db.refresh(db_chat)
    
    return ChatResponse(
        id=db_chat.id,
        user_id=db_chat.user_id,
        title=db_chat.title,
        mode=db_chat.mode.value,
        is_pinned=db_chat.is_pinned,
        is_archived=db_chat.is_archived,
        created_at=db_chat.created_at,
        updated_at=db_chat.updated_at,
        message_count=0
    )

@router.get("/", response_model=List[ChatResponse])
async def get_chats(
    mode: Optional[AIModeEnum] = None,
    include_archived: bool = False,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Chat).filter(Chat.user_id == current_user.id)
    
    if mode:
        query = query.filter(Chat.mode == AIMode(mode))
    
    if not include_archived:
        query = query.filter(Chat.is_archived == False)
    
    # Get pinned chats first, then by updated_at desc
    query = query.order_by(desc(Chat.is_pinned), desc(Chat.updated_at))
    
    chats = query.offset(offset).limit(limit).all()
    
    # Get message counts and last messages for each chat
    chat_responses = []
    for chat in chats:
        message_count = db.query(func.count(Message.id)).filter(Message.chat_id == chat.id).scalar()
        last_message = db.query(Message).filter(Message.chat_id == chat.id).order_by(desc(Message.created_at)).first()
        
        last_message_response = None
        if last_message:
            last_message_response = MessageResponse(
                id=last_message.id,
                chat_id=last_message.chat_id,
                role=last_message.role.value,
                content=last_message.content,
                metadata=last_message.message_metadata,
                created_at=last_message.created_at
            )
        
        chat_responses.append(ChatResponse(
            id=chat.id,
            user_id=chat.user_id,
            title=chat.title,
            mode=chat.mode.value,
            is_pinned=chat.is_pinned,
            is_archived=chat.is_archived,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            message_count=message_count,
            last_message=last_message_response
        ))
    
    return chat_responses

@router.get("/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).options(joinedload(Chat.messages)).filter(
        Chat.id == chat_id,
        Chat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    messages = [
        MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            role=msg.role.value,
            content=msg.content,
            metadata=msg.message_metadata,
            created_at=msg.created_at
        ) for msg in chat.messages
    ]
    
    return ChatDetailResponse(
        id=chat.id,
        user_id=chat.user_id,
        title=chat.title,
        mode=chat.mode.value,
        is_pinned=chat.is_pinned,
        is_archived=chat.is_archived,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        message_count=len(messages),
        messages=messages
    )

@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: int,
    chat_data: ChatUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    update_data = chat_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(chat, key, value)
    
    chat.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(chat)
    
    message_count = db.query(func.count(Message.id)).filter(Message.chat_id == chat.id).scalar()
    
    return ChatResponse(
        id=chat.id,
        user_id=chat.user_id,
        title=chat.title,
        mode=chat.mode.value,
        is_pinned=chat.is_pinned,
        is_archived=chat.is_archived,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
        message_count=message_count
    )

@router.delete("/{chat_id}")
async def delete_chat(
    chat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    db.delete(chat)
    db.commit()
    
    return {"message": "Chat deleted successfully"}

@router.post("/{chat_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    chat_id: int,
    message_data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    db_message = Message(
        chat_id=chat_id,
        role=MessageRole.USER,
        content=message_data.content,
        message_metadata=message_data.message_metadata
    )
    db.add(db_message)
    
    # Update chat's updated_at timestamp
    chat.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(db_message)
    
    return MessageResponse(
        id=db_message.id,
        chat_id=db_message.chat_id,
        role=db_message.role.value,
        content=db_message.content,
        metadata=db_message.message_metadata,
        created_at=db_message.created_at
    )

@router.get("/{chat_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    chat_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chat = db.query(Chat).filter(
        Chat.id == chat_id,
        Chat.user_id == current_user.id
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    messages = db.query(Message).filter(Message.chat_id == chat_id).order_by(
        Message.created_at
    ).offset(offset).limit(limit).all()
    
    return [
        MessageResponse(
            id=msg.id,
            chat_id=msg.chat_id,
            role=msg.role.value,
            content=msg.content,
            metadata=msg.message_metadata,
            created_at=msg.created_at
        ) for msg in messages
    ]

# Chat Settings endpoints
@router.post("/settings", response_model=ChatSettingsResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_settings(
    settings_data: ChatSettingsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if settings already exist for this mode
    existing_settings = db.query(ChatSettings).filter(
        ChatSettings.user_id == current_user.id,
        ChatSettings.mode == AIMode(settings_data.mode)
    ).first()
    
    if existing_settings:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Settings already exist for this mode"
        )
    
    db_settings = ChatSettings(
        user_id=current_user.id,
        mode=AIMode(settings_data.mode),
        settings=settings_data.settings
    )
    db.add(db_settings)
    db.commit()
    db.refresh(db_settings)
    
    return ChatSettingsResponse(
        id=db_settings.id,
        user_id=db_settings.user_id,
        mode=db_settings.mode.value,
        settings=db_settings.settings,
        created_at=db_settings.created_at,
        updated_at=db_settings.updated_at
    )

@router.get("/settings/{mode}", response_model=ChatSettingsResponse)
async def get_chat_settings(
    mode: AIModeEnum,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(ChatSettings).filter(
        ChatSettings.user_id == current_user.id,
        ChatSettings.mode == AIMode(mode)
    ).first()
    
    if not settings:
        # Return default settings if none exist
        default_settings = {
            "similar_questions": {
                "max_questions": 5,
                "similarity_threshold": 0.8,
                "include_context": True
            },
            "image_processing": {
                "max_file_size": "10MB",
                "supported_formats": ["jpg", "jpeg", "png", "gif", "webp"],
                "auto_enhance": False
            }
        }
        
        return ChatSettingsResponse(
            id=0,
            user_id=current_user.id,
            mode=mode,
            settings=default_settings.get(mode, {}),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
    
    return ChatSettingsResponse(
        id=settings.id,
        user_id=settings.user_id,
        mode=settings.mode.value,
        settings=settings.settings,
        created_at=settings.created_at,
        updated_at=settings.updated_at
    )

@router.put("/settings/{mode}", response_model=ChatSettingsResponse)
async def update_chat_settings(
    mode: AIModeEnum,
    settings_data: ChatSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    settings = db.query(ChatSettings).filter(
        ChatSettings.user_id == current_user.id,
        ChatSettings.mode == AIMode(mode)
    ).first()
    
    if not settings:
        # Create new settings if they don't exist
        settings = ChatSettings(
            user_id=current_user.id,
            mode=AIMode(mode),
            settings=settings_data.settings
        )
        db.add(settings)
    else:
        settings.settings = settings_data.settings
        settings.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(settings)
    
    return ChatSettingsResponse(
        id=settings.id,
        user_id=settings.user_id,
        mode=settings.mode.value,
        settings=settings.settings,
        created_at=settings.created_at,
        updated_at=settings.updated_at
    )