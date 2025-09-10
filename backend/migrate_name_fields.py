#!/usr/bin/env python3
"""
Database migration script to add first_name and last_name fields to the users table
"""

import sqlite3
import os
from datetime import datetime

def migrate_database():
    """Add first_name and last_name columns to the users table"""
    db_path = "app.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found. Creating new database with updated schema.")
        return True
    
    print(f"Starting migration at {datetime.now()}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        existing_columns = [column[1] for column in columns]
        
        print(f"Existing columns: {existing_columns}")
        
        migrations_needed = []
        
        if 'first_name' not in existing_columns:
            migrations_needed.append("first_name")
        
        if 'last_name' not in existing_columns:
            migrations_needed.append("last_name")
        
        if not migrations_needed:
            print("✅ Migration not needed - columns already exist")
            return True
        
        print(f"Adding columns: {migrations_needed}")
        
        # Add first_name column if it doesn't exist
        if 'first_name' in migrations_needed:
            cursor.execute("ALTER TABLE users ADD COLUMN first_name TEXT")
            print("✅ Added first_name column")
        
        # Add last_name column if it doesn't exist
        if 'last_name' in migrations_needed:
            cursor.execute("ALTER TABLE users ADD COLUMN last_name TEXT")
            print("✅ Added last_name column")
        
        # Update existing users with placeholder values
        cursor.execute("UPDATE users SET first_name = 'User', last_name = 'Name' WHERE first_name IS NULL OR last_name IS NULL")
        updated_rows = cursor.rowcount
        
        if updated_rows > 0:
            print(f"✅ Updated {updated_rows} existing users with placeholder names")
        
        # Set columns to NOT NULL after updating existing records
        # Note: SQLite doesn't support modifying column constraints directly
        # In a production environment, you'd create a new table and migrate data
        
        # Commit the changes
        conn.commit()
        print("✅ Migration completed successfully")
        
        # Verify the migration
        cursor.execute("PRAGMA table_info(users)")
        columns = cursor.fetchall()
        print("Updated table schema:")
        for column in columns:
            print(f"  - {column[1]} ({column[2]})")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        conn.rollback()
        return False
        
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    success = migrate_database()
    if success:
        print("🎉 Database migration completed successfully!")
        exit(0)
    else:
        print("💥 Database migration failed!")
        exit(1)