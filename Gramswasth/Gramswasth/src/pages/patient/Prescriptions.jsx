import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Leaf, Pill, Download, ChevronDown, Calendar, User, FileText } from 'lucide-react';
import { usePatient } from '../../context/PatientContext';
import { jsPDF } from 'jspdf';

export default function Prescriptions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = usePatient();
  const prescriptions = profile?.history || [];
  
  const [expandedIndex, setExpandedIndex] = useState(null);

  const generatePDF = (p) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(71, 115, 95); // Sage-600 color
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('GRAMSWASTH', 20, 20);
    doc.setFontSize(10);
    doc.text('Rural Healthcare Ecosystem Prescription', 20, 28);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    // Body Info
    doc.setFont("helvetica", "bold");
    doc.text('PATIENT:', 20, 50);
    doc.setFont("helvetica", "normal");
    doc.text(profile.name || "N/A", 50, 50);

    doc.setFont("helvetica", "bold");
    doc.text('DOCTOR:', 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(p.doctor || "N/A", 50, 60);

    doc.setFont("helvetica", "bold");
    doc.text('DATE:', 20, 70);
    doc.setFont("helvetica", "normal");
    doc.text(p.date || "N/A", 50, 70);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 75, 190, 75);

    // Medicines Header
    doc.setFont("helvetica", "bold");
    doc.text('MEDICINES PRESCRIBED:', 20, 85);
    
    // List Medicines
    let y = 95;
    (p.medicines || []).forEach((m, i) => {
      doc.setFont("helvetica", "normal");
      doc.text(`${i + 1}. ${m}`, 25, y);
      y += 10;
    });

    // Instructions
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text('INSTRUCTIONS:', 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    const splitInstructions = doc.splitTextToSize(p.instructions || "No special instructions.", 150);
    doc.text(splitInstructions, 20, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Generated via Gramswasth App - Valid Digital Copy', 105, 280, { align: 'center' });

    doc.save(`Prescription_${p.date}_${p.doctor.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={13} className="text-white" /></div>
        <h1 className="font-bold text-gray-800">{t('prescriptions')}</h1>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-md mx-auto w-full">
        {prescriptions.map((p, index) => (
          <div key={index} className="gs-card flex flex-col gap-0 !p-0 overflow-hidden border border-cream-200">
            {/* Summary Header (Clickable) */}
            <button 
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-cream-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center text-sage-600">
                    <FileText size={20} />
                 </div>
                 <div>
                    <div className="font-bold text-gray-800 text-sm">{p.doctor}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                       <Calendar size={10} /> {p.date}
                    </div>
                 </div>
              </div>
              <motion.div
                animate={{ rotate: expandedIndex === index ? 180 : 0 }}
                className="text-gray-300"
              >
                <ChevronDown size={20} />
              </motion.div>
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
              {expandedIndex === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 flex flex-col gap-4 border-t border-cream-100">
                     <div className="flex flex-col gap-2 bg-cream-50 p-3 rounded-2xl">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Medicines</span>
                        <div className="flex flex-col gap-2">
                          {(p.medicines || []).map((m, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-700 font-medium">
                              <Pill size={14} className="text-sage-500 mt-0.5 flex-shrink-0" /> 
                              <span>{m}</span>
                            </div>
                          ))}
                        </div>
                     </div>

                     <div className="flex flex-col gap-1.5 px-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instructions</span>
                        <p className="text-xs text-gray-600 leading-relaxed italic border-l-2 border-sage-200 pl-3 py-1">
                           "{p.instructions || "No special instructions recorded for this visit."}"
                        </p>
                     </div>

                     <button 
                        onClick={(e) => { e.stopPropagation(); generatePDF(p); }}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 !text-sm"
                     >
                        <Download size={18} /> Download Detailed PDF
                     </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {prescriptions.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 bg-cream-100 rounded-full flex items-center justify-center text-gray-300">
                   <FileText size={32} />
                </div>
                <div className="text-gray-400 max-w-[200px]">
                   <p className="font-bold text-gray-500">No Prescriptions</p>
                   <p className="text-xs mt-1">Your medical documents will appear here after a consultation.</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
