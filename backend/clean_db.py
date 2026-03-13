from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("WARNING: This will delete ALL data in the database.")
    confirm = input("Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        try:
            # Delete in order of constraints
            # Alternatively, drop all and create all
            db.drop_all()
            db.create_all()
            print("Database cleaned successfully. All tables recreated (empty).")
            
            # Optionally seed basic data if you want after cleaning
            # from seed_mock import seed_mock_data
            # seed_mock_data()
            # print("Mock data re-seeded.")
        except Exception as e:
            print(f"Error cleaning database: {e}")
    else:
        print("Operation cancelled.")
