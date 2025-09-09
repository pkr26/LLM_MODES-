#!/usr/bin/env python3
"""
Migration script to add security fields to existing database
Run this script after updating your models.py file
"""

import os
import sys
from datetime import datetime, timezone

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text, inspect
from database import engine, Base
from models import User, RefreshToken, PasswordHistory, EmailVerification, PasswordReset

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    inspector = inspect(engine)
    columns = inspector.get_columns(table_name)
    return any(col['name'] == column_name for col in columns)

def check_table_exists(table_name):
    """Check if a table exists"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def migrate_database():
    """Apply security field migrations to existing database"""
    print("Starting security fields migration...")
    
    with engine.connect() as connection:
        trans = connection.begin()
        
        try:
            # Add new columns to users table if they don't exist
            user_columns = [
                ('is_verified', 'BOOLEAN DEFAULT FALSE'),
                ('failed_login_attempts', 'INTEGER DEFAULT 0'),
                ('locked_until', 'DATETIME'),
                ('password_changed_at', 'DATETIME'),
                ('last_login_at', 'DATETIME'),
                ('mfa_enabled', 'BOOLEAN DEFAULT FALSE'),
                ('mfa_secret', 'VARCHAR'),
                ('backup_codes', 'TEXT')  # JSON stored as text in SQLite
            ]
            
            for column_name, column_def in user_columns:
                if not check_column_exists('users', column_name):
                    print(f"Adding column {column_name} to users table...")
                    connection.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_def}"))
            
            # Add new columns to refresh_tokens table if they don't exist
            refresh_token_columns = [
                ('ip_address', 'VARCHAR'),
                ('user_agent', 'TEXT')
            ]
            
            for column_name, column_def in refresh_token_columns:
                if not check_column_exists('refresh_tokens', column_name):
                    print(f"Adding column {column_name} to refresh_tokens table...")
                    connection.execute(text(f"ALTER TABLE refresh_tokens ADD COLUMN {column_name} {column_def}"))
            
            # Create new tables if they don't exist
            new_tables = [
                ('password_history', '''
                    CREATE TABLE password_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        hashed_password VARCHAR NOT NULL,
                        created_at DATETIME NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                '''),
                ('email_verifications', '''
                    CREATE TABLE email_verifications (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token VARCHAR UNIQUE NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used BOOLEAN DEFAULT FALSE,
                        created_at DATETIME NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                '''),
                ('password_resets', '''
                    CREATE TABLE password_resets (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        token VARCHAR UNIQUE NOT NULL,
                        expires_at DATETIME NOT NULL,
                        used BOOLEAN DEFAULT FALSE,
                        created_at DATETIME NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    )
                ''')
            ]
            
            for table_name, create_sql in new_tables:
                if not check_table_exists(table_name):
                    print(f"Creating table {table_name}...")
                    connection.execute(text(create_sql))
            
            # Update existing users with default values for new security fields
            now = datetime.now(timezone.utc).isoformat()
            
            # Set password_changed_at to created_at for existing users
            update_sql = """
            UPDATE users 
            SET password_changed_at = created_at 
            WHERE password_changed_at IS NULL
            """
            connection.execute(text(update_sql))
            
            print("Migration completed successfully!")
            
            # Create all other tables that might not exist
            Base.metadata.create_all(bind=engine)
            
            trans.commit()
            
        except Exception as e:
            print(f"Migration failed: {e}")
            trans.rollback()
            raise

def main():
    """Main migration function"""
    try:
        migrate_database()
        print("✅ Database migration completed successfully!")
        print("\nSecurity improvements applied:")
        print("- Added account lockout after failed login attempts")
        print("- Added password history tracking")
        print("- Added email verification system")
        print("- Added password reset functionality")
        print("- Added MFA support preparation")
        print("- Enhanced token tracking with IP and user agent")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()