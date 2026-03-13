from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from app.utils.response import error

def role_required(required_role):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != required_role:
                return error(f"{required_role} access required", 403)
            return fn(*args, **kwargs)
        return decorator
    return wrapper
