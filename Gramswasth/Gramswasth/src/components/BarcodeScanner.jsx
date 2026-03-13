import { useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BarcodeScanner({ onScanSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const html5QrCode = new Html5Qrcode("barcode-scanner-temp");
      
      // Attempt to decode barcode from image file
      const result = await html5QrCode.scanFile(file, true);
      
      setSuccess(`Barcode detected: ${result}`);
      
      // Delay slightly for visual feedback before closing/callback
      setTimeout(() => {
        onScanSuccess(result);
      }, 1000);

    } catch (err) {
      console.error("Barcode detection error:", err);
      setError("No valid barcode detected in this image. Please ensure the barcode is clear and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-cream-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Scan Medicine Barcode</h3>
          <button onClick={onCancel} className="p-2 hover:bg-cream-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
          <div className="w-full aspect-square bg-cream-50 rounded-2xl border-2 border-dashed border-cream-300 flex flex-col items-center justify-center relative group overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={32} className="text-sage-500 animate-spin" />
                <p className="text-xs font-medium text-sage-600">Processing image...</p>
              </div>
            ) : success ? (
              <div className="flex flex-col items-center gap-2 text-green-600">
                <CheckCircle2 size={40} />
                <p className="text-sm font-bold text-center">{success}</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={24} className="text-sage-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Upload Barcode Photo</p>
                <p className="text-xs text-gray-400 mt-1">Supports PNG, JPG, WEBP</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={handleFileUpload}
                  disabled={loading}
                />
              </>
            )}
          </div>

          {error && (
            <div className="bg-red-50 p-3 rounded-xl flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <div className="w-full bg-cream-100 p-4 rounded-xl">
             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instructions</h4>
             <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                <li>Take a clear, well-lit photo of the barcode.</li>
                <li>Ensure the barcode is not blurry or cut off.</li>
                <li>The system will automatically register the medicine to the bill.</li>
             </ul>
          </div>
        </div>

        {/* Hidden element needed by html5-qrcode library for file scanning */}
        <div id="barcode-scanner-temp" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
}
