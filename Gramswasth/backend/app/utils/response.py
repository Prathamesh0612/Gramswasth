from flask import jsonify

def success(data, status=200):
    return jsonify({"success": True, "data": data}), status

def error(message, status=400):
    return jsonify({"success": False, "error": message}), status
