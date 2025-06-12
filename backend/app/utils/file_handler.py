# app/utils/file_handler.py (New Utility)
"""
File handling utilities for secure upload and management
"""
import os
import hashlib
import magic
from datetime import datetime
from flask import current_app
from werkzeug.utils import secure_filename
from app.utils.security import secure_filename as custom_secure_filename
import logging

logger = logging.getLogger(__name__)


class FileHandler:
    """Handle file operations with security"""

    @staticmethod
    def validate_file(file):
        """Validate uploaded file"""
        try:
            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            max_size = current_app.config.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024)
            if file_size > max_size:
                return False

            # Check file type
            allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', set())
            if '.' not in file.filename:
                return False

            extension = file.filename.rsplit('.', 1)[1].lower()
            if extension not in allowed_extensions:
                return False

            # Check MIME type using python-magic
            file_header = file.read(1024)
            file.seek(0)

            try:
                mime_type = magic.from_buffer(file_header, mime=True)
                # Additional MIME type validation could go here
            except:
                logger.warning("Could not determine MIME type")

            return True

        except Exception as e:
            logger.error(f"File validation error: {e}")
            return False

    @staticmethod
    def save_file(file, tenant_id):
        """Save file securely and return metadata"""
        try:
            # Create secure filename
            filename = custom_secure_filename(file.filename)

            # Create directory structure
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            tenant_folder = os.path.join(upload_folder, str(tenant_id))
            date_folder = datetime.now().strftime('%Y/%m/%d')
            full_path = os.path.join(tenant_folder, date_folder)

            os.makedirs(full_path, exist_ok=True)

            # Generate unique filename
            base_name, extension = os.path.splitext(filename)
            timestamp = int(datetime.now().timestamp())
            unique_filename = f"{base_name}_{timestamp}{extension}"

            file_path = os.path.join(full_path, unique_filename)

            # Save file
            file.save(file_path)

            # Calculate file size and checksum
            file_size = os.path.getsize(file_path)
            checksum = FileHandler.calculate_checksum(file_path)

            return file_path, file_size, checksum

        except Exception as e:
            logger.error(f"File save error: {e}")
            raise

    @staticmethod
    def calculate_checksum(file_path):
        """Calculate SHA-256 checksum of file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Checksum calculation error: {e}")
            return None

    @staticmethod
    def encrypt_file(file_path, encryption_key):
        """Encrypt file (placeholder for actual encryption)"""
        # Implementation would use actual encryption library
        # For now, this is a placeholder
        pass

    @staticmethod
    def decrypt_file(file_path, encryption_key):
        """Decrypt file (placeholder for actual decryption)"""
        # Implementation would use actual decryption library
        # For now, this is a placeholder
        pass
