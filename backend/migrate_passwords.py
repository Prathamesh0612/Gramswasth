from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    try:
        # Check if column exists
        with db.engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password VARCHAR(100)"))
            conn.commit()
            print("Successfully added plain_password column (if it didn't exist).")
    except Exception as e:
        print(f"Error migrating database: {e}")
