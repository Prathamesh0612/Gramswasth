"""
Cloudinary image upload with local filesystem fallback.
If Cloudinary env vars are not set, images are stored in /tmp/uploads/
"""
import os
import uuid
from flask import current_app

_UPLOAD_DIR = os.path.join(os.path.expanduser('~'), '.telehealth_uploads')


def _local_fallback(file_stream, folder="telehealth"):
    """Save file locally and return a relative path (dev fallback)."""
    os.makedirs(os.path.join(_UPLOAD_DIR, folder), exist_ok=True)
    ext = 'jpg'
    try:
        filename = file_stream.filename
        if filename and '.' in filename:
            ext = filename.rsplit('.', 1)[-1].lower()
    except Exception:
        pass
    fname = f"{uuid.uuid4()}.{ext}"
    path = os.path.join(_UPLOAD_DIR, folder, fname)
    file_stream.save(path)
    base_url = current_app.config.get('BACKEND_URL', 'http://localhost:5000')
    return f"{base_url}/api/records/static/{folder}/{fname}"


def init_cloudinary():
    """Configure Cloudinary from Flask app config."""
    import cloudinary
    cloudinary.config(
        cloud_name=current_app.config.get("CLOUDINARY_CLOUD_NAME"),
        api_key=current_app.config.get("CLOUDINARY_API_KEY"),
        api_secret=current_app.config.get("CLOUDINARY_API_SECRET")
    )


def upload_image(file_stream, folder="telehealth"):
    """Upload image to Cloudinary. Falls back to local storage if not configured."""
    cloud_name = current_app.config.get("CLOUDINARY_CLOUD_NAME")
    api_key = current_app.config.get("CLOUDINARY_API_KEY")
    api_secret = current_app.config.get("CLOUDINARY_API_SECRET")
    
    if not cloud_name:
        current_app.logger.warning("⚠️ CLOUDINARY_CLOUD_NAME not set, using local fallback")
        return _local_fallback(file_stream, folder)

    try:
        import cloudinary.uploader
        init_cloudinary()
        current_app.logger.info(f"✅ Uploading to Cloudinary: {cloud_name}")
        
        # Cloudinary expects file stream at .stream for Werkzeug FileStorage
        file_to_upload = file_stream.stream if hasattr(file_stream, 'stream') else file_stream
        
        result = cloudinary.uploader.upload(
            file_to_upload,
            folder=folder,
            resource_type="image",
            transformation=[
                {"width": 1024, "crop": "limit"},  # cap resolution
                {"quality": "auto:eco"},           # compress for low-bandwidth
            ]
        )
        url = result.get("secure_url")
        current_app.logger.info(f"✅ Cloudinary upload success: {url}")
        return url
    except Exception as e:
        current_app.logger.error(f"❌ Cloudinary upload failed: {type(e).__name__}: {str(e)}")
        current_app.logger.error(f"   Cloud: {cloud_name}, Key exists: {bool(api_key)}, Secret exists: {bool(api_secret)}")
        return _local_fallback(file_stream, folder)
