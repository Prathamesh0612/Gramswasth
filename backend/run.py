from app import create_app
from app.extensions import socketio
import os

app = create_app()

if __name__ == '__main__':
    is_prod = os.environ.get('FLASK_ENV') == 'production'
    # use_reloader=False required when async_mode='eventlet' or 'threading'
    socketio.run(app, debug=not is_prod, host='0.0.0.0', port=5000, use_reloader=False, allow_unsafe_werkzeug=True)
