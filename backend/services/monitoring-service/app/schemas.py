"""
Monitoring Service Pydantic Schemas
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

# Add your schemas here
# Example:
# class LogEntryBase(BaseModel):
#     pass
# 
# class LogEntryCreate(LogEntryBase):
#     pass
# 
# class LogEntryResponse(LogEntryBase):
#     id: str
#     created_at: datetime
#     
#     class Config:
#         from_attributes = True
