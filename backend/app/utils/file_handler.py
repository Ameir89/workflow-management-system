# app/utils/file_handler.py (Fixed Version)
"""
File handling utilities for secure upload and management
"""
import os
import hashlib
import mimetypes
# import filetype
from datetime import datetime

from filetype import filetype
from flask import current_app
from werkzeug.utils import secure_filename
from app.utils.security import secure_filename as custom_secure_filename
import logging

logger = logging.getLogger(__name__)

# Optional magic import for enhanced MIME detection
try:
    import magic

    HAS_MAGIC = True
except ImportError:
    HAS_MAGIC = False
    logger.info("python-magic not available, using alternative MIME detection")


class FileHandler:
    """Handle file operations with security"""

    @staticmethod
    def get_mime_type(file_data, filename):
        """Get MIME type using multiple detection methods"""
        mime_type = None

        # Method 1: Try python-magic if available
        if HAS_MAGIC:
            try:
                mime_type = magic.from_buffer(file_data, mime=True)
                if mime_type:
                    return mime_type
            except Exception as e:
                logger.debug(f"Magic MIME detection failed: {e}")

        # Method 2: Try filetype library
        try:
            kind = filetype.guess(file_data)
            if kind:
                return kind.mime
        except Exception as e:
            logger.debug(f"Filetype detection failed: {e}")

        # Method 3: Fallback to mimetypes based on filename
        try:
            mime_type, _ = mimetypes.guess_type(filename)
            if mime_type:
                return mime_type
        except Exception as e:
            logger.debug(f"Mimetypes detection failed: {e}")

        # Method 4: Last resort - basic extension mapping
        extension_map = {
            '.txt': 'text/plain',
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed',
        }

        if filename and '.' in filename:
            ext = '.' + filename.rsplit('.', 1)[1].lower()
            return extension_map.get(ext, 'application/octet-stream')

        return 'application/octet-stream'

    @staticmethod
    def validate_file(file):
        """Validate uploaded file with comprehensive checks"""
        try:
            if not file or not file.filename:
                logger.warning("No file or filename provided")
                return False

            # Check file size
            file.seek(0, os.SEEK_END)
            file_size = file.tell()
            file.seek(0)

            max_size = current_app.config.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024)
            if file_size > max_size:
                logger.warning(f"File size {file_size} exceeds maximum {max_size}")
                return False

            # Check if file is empty
            if file_size == 0:
                logger.warning("Empty file uploaded")
                return False

            # Check file extension
            if '.' not in file.filename:
                logger.warning("File has no extension")
                return False

            extension = file.filename.rsplit('.', 1)[1].lower()
            allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', {
                'txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx',
                'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar'
            })

            if extension not in allowed_extensions:
                logger.warning(f"File extension '{extension}' not allowed")
                return False

            # Check MIME type
            file_header = file.read(min(1024, file_size))
            file.seek(0)

            mime_type = FileHandler.get_mime_type(file_header, file.filename)
            logger.info(f"Detected MIME type: {mime_type} for file: {file.filename}")

            # Define allowed MIME types
            allowed_mime_types = current_app.config.get('ALLOWED_MIME_TYPES', {
                'text/plain',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/zip',
                'application/x-rar-compressed',
                'application/octet-stream'  # Allow as fallback
            })

            if mime_type not in allowed_mime_types:
                logger.warning(f"MIME type '{mime_type}' not allowed")
                return False

            # Additional security checks
            if not FileHandler._check_file_content_security(file_header, extension):
                logger.warning("File failed security content check")
                return False

            return True

        except Exception as e:
            logger.error(f"File validation error: {e}")
            return False

    @staticmethod
    def _check_file_content_security(file_header, extension):
        """Additional security checks on file content"""
        try:
            # Check for executable file signatures
            dangerous_signatures = [
                b'MZ',  # PE executable
                b'\x7fELF',  # ELF executable
                b'\xca\xfe\xba\xbe',  # Mach-O executable
                b'PK\x03\x04',  # ZIP (could contain executables, but allow for now)
            ]

            # For now, only block obvious executables
            executable_signatures = [b'MZ', b'\x7fELF', b'\xca\xfe\xba\xbe']

            for sig in executable_signatures:
                if file_header.startswith(sig):
                    return False

            # Check for script extensions with executable content
            script_extensions = ['js', 'php', 'py', 'sh', 'bat', 'cmd']
            if extension in script_extensions:
                # Could add more sophisticated script content checking here
                pass

            return True

        except Exception as e:
            logger.error(f"Security check error: {e}")
            return True  # Fail open for security checks

    @staticmethod
    def save_file(file, tenant_id):
        """Save file securely and return metadata"""
        try:
            # Create secure filename
            filename = custom_secure_filename(file.filename)
            if not filename:
                raise ValueError("Invalid filename after security processing")

            # Create directory structure
            upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
            tenant_folder = os.path.join(upload_folder, str(tenant_id))
            date_folder = datetime.now().strftime('%Y/%m/%d')
            full_path = os.path.join(tenant_folder, date_folder)

            os.makedirs(full_path, exist_ok=True)

            # Generate unique filename to prevent conflicts
            base_name, extension = os.path.splitext(filename)
            timestamp = int(datetime.now().timestamp())
            counter = 0

            # Ensure filename is truly unique
            while True:
                if counter == 0:
                    unique_filename = f"{base_name}_{timestamp}{extension}"
                else:
                    unique_filename = f"{base_name}_{timestamp}_{counter}{extension}"

                file_path = os.path.join(full_path, unique_filename)
                if not os.path.exists(file_path):
                    break
                counter += 1

            # Save file
            file.save(file_path)
            logger.info(f"File saved: {file_path}")

            # Calculate file size and checksum
            file_size = os.path.getsize(file_path)
            checksum = FileHandler.calculate_checksum(file_path)

            # Get MIME type for saved file
            with open(file_path, 'rb') as f:
                file_header = f.read(1024)
            mime_type = FileHandler.get_mime_type(file_header, filename)

            return {
                'file_path': file_path,
                'file_size': file_size,
                'checksum': checksum,
                'mime_type': mime_type,
                'original_filename': file.filename,
                'saved_filename': unique_filename
            }

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
    def delete_file(file_path):
        """Safely delete a file"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"File deleted: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"File deletion error: {e}")
            return False

    @staticmethod
    def get_file_info(file_path):
        """Get information about a file"""
        try:
            if not os.path.exists(file_path):
                return None

            stat = os.stat(file_path)

            with open(file_path, 'rb') as f:
                file_header = f.read(1024)

            return {
                'size': stat.st_size,
                'created': datetime.fromtimestamp(stat.st_ctime),
                'modified': datetime.fromtimestamp(stat.st_mtime),
                'mime_type': FileHandler.get_mime_type(file_header, os.path.basename(file_path)),
                'checksum': FileHandler.calculate_checksum(file_path)
            }
        except Exception as e:
            logger.error(f"Get file info error: {e}")
            return None

    @staticmethod
    def encrypt_file(file_path, encryption_key):
        """Encrypt file (placeholder for actual encryption)"""
        # TODO: Implement with cryptography library
        # Example implementation:
        # from cryptography.fernet import Fernet
        # cipher = Fernet(encryption_key)
        # with open(file_path, 'rb') as f:
        #     data = f.read()
        # encrypted_data = cipher.encrypt(data)
        # with open(file_path + '.enc', 'wb') as f:
        #     f.write(encrypted_data)
        logger.info("File encryption not yet implemented")
        pass

    @staticmethod
    def decrypt_file(file_path, encryption_key):
        """Decrypt file (placeholder for actual decryption)"""
        # TODO: Implement with cryptography library
        logger.info("File decryption not yet implemented")
        pass