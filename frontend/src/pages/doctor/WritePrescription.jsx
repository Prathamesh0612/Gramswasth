import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Pill, Plus, Trash2, FileText } from 'lucide-react';
import { consultationAPI, prescriptionAPI } from '../../services/api';

export default function WritePrescription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const consultationId = location.state?.consultationId || null;

  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadConsultation = async () => {
      if (!consultationId) {
        setLoading(false);
        return;
      }
      try {
        const res = await consultationAPI.getAll();
        const current = res.data?.find((c) => c.id === consultationId);
        if (current) {
          setPatientInfo({
            id: current.patient_id,
            name: current.patient_name,
            village: current.village,
          });
        }
      } catch (e) {
        console.error('Failed to load consultation for prescription', e);
      } finally {
        setLoading(false);
      }
    };

    loadConsultation();
  }, [consultationId]);

  const updateMedicine = (index, field, value) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
    );
  };

  const addMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      { name: '', dosage: '', frequency: '', duration: '' },
    ]);
  };

  const removeMedicine = (index) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleaned = medicines
      .map((m) => ({
        name: m.name.trim(),
        dosage: m.dosage.trim(),
        frequency: m.frequency.trim(),
        duration: m.duration.trim(),
      }))
      .filter((m) => m.name);

    if (!patientInfo?.id) {
      setError('Missing patient information for this prescription.');
      return;
    }

    if (cleaned.length === 0) {
      setError('Please add at least one medicine.');
      return;
    }

    const payload = {
      consultation_id: consultationId,
      patient_id: patientInfo.id,
      medicines: cleaned,
      notes: notes.trim() || undefined,
    };

    try {
      setSaving(true);
      const res = await prescriptionAPI.create(payload);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save prescription');
      }
      setSuccess('Prescription saved successfully.');
      setTimeout(() => {
        navigate('/doctor/dashboard');
      }, 1200);
    } catch (e) {
      console.error('Failed to save prescription', e);
      setError(e.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-cream-100"
        >
          <ArrowLeft size={20} className="text-gray-500" />
        </button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
          <Leaf size={13} className="text-white" />
        </div>
        <h1 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
          <FileText size={16} className="text-sage-500" />
          {t('writePrescription') || 'Write Prescription'}
        </h1>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-10">
            Loading consultation details...
          </div>
        ) : (
          <>
            {patientInfo && (
              <div className="gs-card flex items-center gap-3 !py-3">
                <div className="w-9 h-9 rounded-full bg-sage-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-sage-700 font-bold text-sm">P</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">
                    {patientInfo.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {patientInfo.village}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-xl">
                {success}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 pb-safe-bottom"
            >
              <div className="flex flex-col gap-3">
                {medicines.map((m, idx) => (
                  <div
                    key={idx}
                    className="gs-card flex flex-col gap-2 !py-3 relative"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        <Pill size={13} className="text-sage-500" />
                        <span>Medicine {idx + 1}</span>
                      </div>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(idx)}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <input
                      className="gs-input !text-sm"
                      placeholder="Medicine name"
                      value={m.name}
                      onChange={(e) =>
                        updateMedicine(idx, 'name', e.target.value)
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="gs-input !text-xs"
                        placeholder="Dosage (e.g. 500mg)"
                        value={m.dosage}
                        onChange={(e) =>
                          updateMedicine(idx, 'dosage', e.target.value)
                        }
                      />
                      <input
                        className="gs-input !text-xs"
                        placeholder="Frequency (e.g. 2 times/day)"
                        value={m.frequency}
                        onChange={(e) =>
                          updateMedicine(idx, 'frequency', e.target.value)
                        }
                      />
                    </div>
                    <input
                      className="gs-input !text-xs"
                      placeholder="Duration (e.g. 5 days)"
                      value={m.duration}
                      onChange={(e) =>
                        updateMedicine(idx, 'duration', e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addMedicine}
                className="flex items-center justify-center gap-2 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-100 rounded-xl px-3 py-2"
              >
                <Plus size={14} />
                Add Medicine
              </button>

              <div className="gs-card flex flex-col gap-2 !py-3">
                <label className="text-xs font-semibold text-gray-600">
                  Additional Notes
                </label>
                <textarea
                  className="gs-input min-h-[80px] !text-sm"
                  placeholder="Instructions, precautions, lifestyle advice..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary !py-3 !text-sm mt-1 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileText size={16} />
                {saving ? 'Saving...' : 'Save Prescription'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

