"""
Health check and system status endpoints
"""
from flask import Blueprint, jsonify
import os
from datetime import datetime
from pathlib import Path

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'TeleHealth API'
    })

@health_bp.route('/status', methods=['GET'])
def system_status():
    """Detailed system status"""
    cache_dir = Path.home() / '.telehealth_cache'
    cache_size = 0
    cache_files = 0
    
    if cache_dir.exists():
        for file in cache_dir.glob('*.db'):
            cache_size += file.stat().st_size
            cache_files += 1
    
    return jsonify({
        'status': 'operational',
        'timestamp': datetime.utcnow().isoformat(),
        'components': {
            'api': 'running',
            'cache': f'{cache_files} files, {cache_size / 1024:.1f}KB',
            'offline_mode': 'supported'
        },
        'features': {
            'symptom_checker': True,
            'medicine_database': True,
            'offline_sync': True,
            'emergency_alerts': True
        }
    })

@health_bp.route('/version', methods=['GET'])
def version():
    """Get application version"""
    return jsonify({
        'version': '1.0.0-offline-first',
        'release_date': '2024-03-12',
        'features': [
            'offline-first',
            'auto-sync',
            'ai-diagnosis',
            'low-bandwidth'
        ]
    })
