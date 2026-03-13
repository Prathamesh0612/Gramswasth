from app import create_app
from app.models.user import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"{'Name':<20} | {'Phone':<15} | {'Role':<10} | {'Plain Password':<20}")
    print("-" * 75)
    for user in users:
        print(f"{user.name:<20} | {user.phone:<15} | {user.role:<10} | {getattr(user, 'plain_password', 'N/A')}")
