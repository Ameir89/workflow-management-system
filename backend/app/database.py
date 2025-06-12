### app/database.py
"""
Database connection and utilities
"""
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from flask import current_app, g
import logging

logger = logging.getLogger(__name__)

class Database:
    """Database connection manager"""
    
    @staticmethod
    def init_app(app):
        """Initialize database with Flask app"""
        app.teardown_appcontext(Database.close_db)
    
    @staticmethod
    def get_connection():
        """Get database connection for current request"""
        if 'db_conn' not in g:
            try:
                g.db_conn = psycopg2.connect(
                    current_app.config['DATABASE_URL'],
                    cursor_factory=psycopg2.extras.RealDictCursor
                )
                g.db_conn.autocommit = False
                logger.info(f"Connected to DB {current_app.config['DATABASE_URL'].rsplit(':', 1)[0]} (connection open: {g.db_conn.closed == 0})")
            except psycopg2.Error as e:
                logger.error(f"Database connection error: {e}")
                raise
        return g.db_conn
    
    @staticmethod
    def close_db(error):
        """Close database connection"""
        db_conn = g.pop('db_conn', None)
        if db_conn is not None:
            db_conn.close()
    
    @staticmethod
    @contextmanager
    def get_cursor():
        """Context manager for database cursor"""
        conn = Database.get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()
    
    @staticmethod
    def execute_query(query, params=None):
        """Execute a query and return results"""
        with Database.get_cursor() as cursor:
            cursor.execute(query, params)
            if cursor.description:
                return cursor.fetchall()
            return None
    
    @staticmethod
    def execute_one(query, params=None):
        """Execute a query and return first result"""
        with Database.get_cursor() as cursor:
            cursor.execute(query, params)
            if cursor.description:
                return cursor.fetchone()
            return None
    
    @staticmethod
    def execute_insert(query, params=None):
        """Execute insert query and return inserted ID"""
        with Database.get_cursor() as cursor:
            cursor.execute(query + " RETURNING id", params)
            result = cursor.fetchone()
            return result['id'] if result else None