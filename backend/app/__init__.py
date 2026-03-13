from flask import Flask, jsonify
from flask_cors import CORS
from .extensions import db, jwt, socketio, bcrypt, migrate
from .config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)
    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode='threading',
        logger=False,
        engineio_logger=False,
        allow_upgrades=True,
    )
    # No hashing as requested for demo simplicity
    # bcrypt.init_app(app)
    migrate.init_app(app, db)

    # ── CORS (Broadened for Hackathon) ───────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # ── Initialize Cloudinary ───────────────────────────────────────────────
    with app.app_context():
        from .utils.image_upload import init_cloudinary
        try:
            init_cloudinary()
            if app.config.get("CLOUDINARY_CLOUD_NAME"):
                app.logger.info(f"✅ Cloudinary initialized: {app.config.get('CLOUDINARY_CLOUD_NAME')}")
            else:
                app.logger.warning("⚠️ Cloudinary not configured - using local fallback")
        except Exception as e:
            app.logger.error(f"❌ Cloudinary init failed: {e}")

    # ── Models (needed for migrate & create_all) ─────────────────────────────
    from .models.user import User
    from .models.doctor import Doctor
    from .models.consultation import Consultation
    from .models.prescription import Prescription
    from .models.health_record import HealthRecord
    from .models.medicine import Medicine
    from .models.emergency import EmergencyAlert
    from .models.message import Message

    # ── Auto-create tables on first run (SQLite dev mode) ────────────────────
    with app.app_context():
        db.create_all()

    # ── Blueprints ───────────────────────────────────────────────────────────
    from .routes import (
        auth_bp, consult_bp, emergency_bp, pharmacy_bp,
        records_bp, prescriptions_bp, doctors_bp, ai_bp,
        admin_bp, sync_bp, medicine_bp, health_bp, chat_bp
    )

    app.register_blueprint(auth_bp,          url_prefix='/api/auth')
    app.register_blueprint(consult_bp,       url_prefix='/api/consultations')
    app.register_blueprint(chat_bp,          url_prefix='/api')
    app.register_blueprint(emergency_bp,     url_prefix='/api/emergency')
    app.register_blueprint(pharmacy_bp,      url_prefix='/api/pharmacy')
    app.register_blueprint(records_bp,       url_prefix='/api/records')
    app.register_blueprint(prescriptions_bp, url_prefix='/api/prescriptions')
    app.register_blueprint(doctors_bp,       url_prefix='/api/doctors')
    app.register_blueprint(ai_bp,            url_prefix='/api/ai')
    # Admin blueprint disabled (view-only backend)
    # app.register_blueprint(admin_bp,         url_prefix='/api/admin')
    app.register_blueprint(sync_bp,          url_prefix='/api/sync')
    app.register_blueprint(medicine_bp,      url_prefix='/api/medicine')
    app.register_blueprint(health_bp,        url_prefix='/api')

    # ── Socket events ─────────────────────────────────────────────────────────
    from .routes import sockets  # noqa: F401

    # ── JSON error handlers (so frontend always gets JSON, not HTML pages) ───
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"success": False, "error": str(e)}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"success": False, "error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"500 error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app
