"""
Data compression utilities for low-bandwidth environments
Minimizes payload size for sync and API responses
"""
import json
import gzip
import base64
from typing import Any, Dict

class DataCompressor:
    """Compress data for low-bandwidth transmission"""
    
    @staticmethod
    def compress_json(data: Dict[str, Any]) -> str:
        """
        Compress JSON data using gzip
        Returns base64-encoded compressed data
        """
        json_str = json.dumps(data, separators=(',', ':'), ensure_ascii=True)
        json_bytes = json_str.encode('utf-8')
        compressed = gzip.compress(json_bytes, compresslevel=9)
        return base64.b64encode(compressed).decode('ascii')
    
    @staticmethod
    def decompress_json(compressed_data: str) -> Dict[str, Any]:
        """
        Decompress base64-encoded gzip data back to JSON
        """
        try:
            compressed = base64.b64decode(compressed_data.encode('ascii'))
            json_bytes = gzip.decompress(compressed)
            return json.loads(json_bytes.decode('utf-8'))
        except Exception as e:
            return {}
    
    @staticmethod
    def compress_ratio(original: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate compression ratio for data
        """
        original_json = json.dumps(original, separators=(',', ':'))
        original_size = len(original_json.encode('utf-8'))
        
        compressed = DataCompressor.compress_json(original)
        compressed_size = len(compressed.encode('utf-8'))
        
        ratio = ((original_size - compressed_size) / original_size) * 100 if original_size > 0 else 0
        
        return {
            'original_bytes': original_size,
            'compressed_bytes': compressed_size,
            'compression_ratio': f"{ratio:.1f}%"
        }
    
    @staticmethod
    def minify_json(data: Dict[str, Any]) -> str:
        """
        Minify JSON by removing whitespace
        (Lighter compression, faster processing)
        """
        return json.dumps(data, separators=(',', ':'), ensure_ascii=True)


class PayloadOptimizer:
    """Optimize API payloads for minimal bandwidth"""
    
    @staticmethod
    def optimize_user_data(user_dict: Dict) -> Dict:
        """
        Remove unnecessary fields from user data
        """
        allowed_fields = ['id', 'name', 'phone', 'role', 'village', 'age']
        return {k: v for k, v in user_dict.items() if k in allowed_fields}
    
    @staticmethod
    def optimize_consultation(consultation_dict: Dict) -> Dict:
        """
        Minimize consultation data
        """
        allowed_fields = ['id', 'patient_id', 'doctor_id', 'status', 'type', 'notes', 'created_at']
        return {k: v for k, v in consultation_dict.items() if k in allowed_fields}
    
    @staticmethod
    def optimize_health_record(record_dict: Dict) -> Dict:
        """
        Minimize health record data
        """
        allowed_fields = ['id', 'user_id', 'record_type', 'data', 'notes', 'created_at']
        return {k: v for k, v in record_dict.items() if k in allowed_fields}
    
    @staticmethod
    def optimize_prescription(prescription_dict: Dict) -> Dict:
        """
        Minimize prescription data
        """
        allowed_fields = ['id', 'patient_id', 'medicine_id', 'dosage', 'duration', 'status', 'created_at']
        return {k: v for k, v in prescription_dict.items() if k in allowed_fields}
    
    @staticmethod
    def batch_response(items: list, item_type: str) -> list:
        """
        Batch optimize multiple items
        """
        if not items:
            return []
        
        optimizers = {
            'user': PayloadOptimizer.optimize_user_data,
            'consultation': PayloadOptimizer.optimize_consultation,
            'health_record': PayloadOptimizer.optimize_health_record,
            'prescription': PayloadOptimizer.optimize_prescription
        }
        
        optimizer = optimizers.get(item_type, lambda x: x)
        return [optimizer(item) for item in items]


class BandwidthMonitor:
    """Monitor bandwidth usage and statistics"""
    
    def __init__(self):
        self.total_sent = 0
        self.total_received = 0
        self.requests_count = 0
    
    def record_request(self, sent_bytes: int, received_bytes: int):
        """Record bandwidth for a request"""
        self.total_sent += sent_bytes
        self.total_received += received_bytes
        self.requests_count += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get bandwidth statistics"""
        total = self.total_sent + self.total_received
        avg_request = total / self.requests_count if self.requests_count > 0 else 0
        
        return {
            'total_sent_kb': round(self.total_sent / 1024, 2),
            'total_received_kb': round(self.total_received / 1024, 2),
            'total_kb': round(total / 1024, 2),
            'avg_request_bytes': round(avg_request),
            'total_requests': self.requests_count
        }
    
    def reset(self):
        """Reset statistics"""
        self.total_sent = 0
        self.total_received = 0
        self.requests_count = 0


# Global monitor instance
bandwidth_monitor = BandwidthMonitor()

def optimize_response(data: Dict[str, Any], compress: bool = False) -> str:
    """
    Optimize response for bandwidth
    """
    if compress:
        return DataCompressor.compress_json(data)
    else:
        return DataCompressor.minify_json(data)
