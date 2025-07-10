
import hashlib
import jwt
import bcrypt
import pyotp
import qrcode
from datetime import datetime, timedelta
from flask import current_app
from app.database import Database
import logging

logger = logging.getLogger(__name__)

class TaskUtils:
    """Authentication utility functions"""
    
    @staticmethod
    def is_rejection_rule(rule):
        return rule.get('value') == 'rejected' and rule.get('operator') == 'equals'