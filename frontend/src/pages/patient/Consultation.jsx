import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf, Image, Send, Video } from 'lucide-react';
import { socketService } from '../../services/socketService';
import { mediaAPI, consultationAPI } from '../../services/api';

export default function Consultation() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const consultationId = location.state?.consultationId;

  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [details, setDetails] = useState(null);
  const fileRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!consultationId) {
      navigate('/patient/dashboard');
      return;
    }

    loadDetails();

    socketService.connect(localStorage.getItem('token'));
    socketService.emit('join_consultation', { consultation_id: consultationId });

    socketService.on('receive_message', (data) => {
      if (data.sender_id !== localStorage.getItem('userId')) {
        setChat(c => [...c, { sender: 'doctor', text: data.message, image: data.image, time: data.timestamp }]);
      }
    });

    socketService.on('consultation_status_update', (data) => {
      if (data.consultation_id === consultationId && data.status === 'completed') {
        alert("Consultation finished. Check prescriptions.");
        navigate('/patient/dashboard');
      }
    });
    
    // Alert when prescription is written
    socketService.on('prescription_ready', (data) => {
       if (data.consultation_id === consultationId) {
         alert("Doctor has issued a prescription!");
         navigate('/patient/prescriptions');
       }
    });

    // Load chat history
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/consultations/${consultationId}/messages`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            // map db messages to ui format
            const formatted = data.data.map(m => ({
              sender: m.sender_id === localStorage.getItem('userId') ? 'patient' : 'doctor',
              text: m.text,
              image: m.image,
              time: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''
            }));
            setChat(formatted);
          }
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    
    loadHistory();

    return () => {
      socketService.off('receive_message');
      socketService.off('consultation_status_update');
      socketService.off('prescription_ready');
    };
  }, [consultationId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const loadDetails = async () => {
    try {
      const res = await consultationAPI.getAll();
      const current = res.data?.find(c => c.id === consultationId);
      if (current) setDetails(current);
    } catch(err) {
      console.error(err);
    }
  };

  const send = async () => {
    if (!msg.trim() && !imgFile) return;
    
    setIsUploading(true);
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const payload = {
      consultation_id: consultationId,
      sender_id: localStorage.getItem('userId'),
      timestamp: time
    };

    try {
      if (imgFile) {
        // 1. Upload to Cloudinary first
        const res = await mediaAPI.upload(imgFile);
        console.log('Upload response:', res); // Debug log
        
        if (res.success && res.data?.image_url) {
          const remoteUrl = res.data.image_url;
          setChat(c => [...c, { sender: 'patient', image: remoteUrl, time }]);
          payload.image = remoteUrl;
          socketService.emit('send_message', payload);
        } else {
          console.error('Upload failed:', res.error || 'Unknown error');
          alert("Image upload failed. Try again.");
        }
      } else {
        setChat(c => [...c, { sender: 'patient', text: msg, time }]);
        payload.message = msg;
        socketService.emit('send_message', payload);
      }
    } catch (err) {
       console.error("Chat send error:", err);
    } finally {
      setMsg('');
      setImgFile(null);
      setImgPreview(null);
      setIsUploading(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImgFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImgPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream-200 pt-safe-top sticky top-0 z-20 bg-white shadow-sm">
        <button onClick={() => navigate('/patient/dashboard')} className="p-2 rounded-xl hover:bg-cream-100"><ArrowLeft size={20} className="text-gray-500" /></button>
        <div className="w-8 h-8 bg-sage-500 rounded-lg flex items-center justify-center"><Leaf size={14} className="text-white" /></div>
        <div className="flex-1">
          <div className="font-bold text-gray-800 text-sm">Dr. {details?.doctor_name || '...'}</div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${details?.status === 'accepted' || details?.status === 'ongoing' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs text-gray-500 capitalize">{details?.status || 'connecting'}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-4 py-4 gap-3 max-w-md mx-auto w-full overflow-y-auto bg-gray-50/50">
        <div className="text-center text-xs text-gray-400 my-2">
          {details?.status === 'pending' ? 'Waiting for doctor to accept...' : 'Consultation started'}
        </div>
        
        <div className="flex flex-col gap-3">
          {(details?.status === 'accepted' || details?.status === 'ongoing' || details?.type === 'video') ? (
            <button 
              onClick={() => navigate('/videocall', { state: { consultationId } })}
              className="btn-primary !rounded-xl flex items-center justify-center gap-2 !text-sm py-3 mb-2 shadow-md shadow-emerald-100"
            >
              <Video size={18} /> Join Video Call Now
            </button>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 text-center mb-2">
              Waiting for Dr. {details?.doctor_name || '...'} to join...
            </div>
          )}
        </div>

        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'patient' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm shadow-sm ${m.sender === 'patient' ? 'bg-sage-600 text-white rounded-br-sm' : 'bg-white border border-cream-200 text-gray-800 rounded-bl-sm'}`}>
              {m.image && <img src={m.image} alt="upload" className="rounded-lg mb-2 max-h-48 object-cover w-full cursor-zoom-in" onClick={() => window.open(m.image, '_blank')} />}
              {m.text && <p className="leading-relaxed break-words">{m.text}</p>}
              <div className={`text-[10px] mt-1 text-right ${m.sender === 'patient' ? 'text-sage-100' : 'text-gray-400'}`}>{m.time}</div>
            </div>
          </div>
        ))}
        {imgPreview && (
          <div className="flex justify-end">
            <div className="relative">
              <img src={imgPreview} alt="preview" className="max-h-32 rounded-xl border-2 border-sage-500 shadow-md opacity-70" />
              <div className="absolute inset-0 flex items-center justify-center"><span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-cream-200 bg-white px-4 py-3 pb-safe-bottom flex gap-2 sticky bottom-0">
        <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleFile} />
        <button onClick={() => fileRef.current.click()} className="p-2 w-10 h-10 flex items-center justify-center rounded-xl bg-cream-100 hover:bg-cream-200 transition-colors text-sage-600 flex-shrink-0"><Image size={18} /></button>
        <input className="gs-input flex-1 !py-2.5 !text-sm bg-gray-50 border-transparent focus:bg-white transition-colors" placeholder={details?.status === 'pending' ? 'Wait for doctor...' : t('typeMessage')} value={msg}
          onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} disabled={details?.status === 'pending'} />
        <button onClick={send} disabled={details?.status === 'pending' || (!msg.trim() && !imgPreview)} className="bg-sage-500 disabled:bg-sage-300 disabled:cursor-not-allowed text-white w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 transition-colors shadow-sm"><Send size={16} /></button>
      </div>
    </div>
  );
}
