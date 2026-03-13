import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageCircle,
  Image as ImageIcon, Send, ChevronDown, FileText, ClipboardList, History as HistoryIcon
} from 'lucide-react';
import { socketService } from '../../services/socketService';
import { consultationAPI, prescriptionAPI, mediaAPI } from '../../services/api';

export default function VideoCall() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const consultationId = location.state?.consultationId;

  const userRole = localStorage.getItem('role'); // 'doctor' or 'patient'
  const userId = localStorage.getItem('userId');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [docPanelOpen, setDocPanelOpen] = useState(false); // Doctor-only panel
  const [callStatus, setCallStatus] = useState('connecting');
  const [consultationInfo, setConsultationInfo] = useState(null); // loaded async
  
  const [msg, setMsg] = useState('');
  const [chat, setChat] = useState([]);
  const fileRef = useRef(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [imgFile, setImgFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Integrated Prescription State
  const [isWritingRx, setIsWritingRx] = useState(false);
  const [rxMedicines, setRxMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [rxNotes, setRxNotes] = useState('');
  const [rxSaving, setRxSaving] = useState(false);

  // Bandwidth Monitoring Refs
  const pcRef = peerConnectionRef;
  const lastBytesRef = useRef(0);
  const isAutoOffRef = useRef(false);
  const ultraLowBandwidthRef = useRef(false); // Marks critical <100kbps condition

  // Call Recording
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // STUN servers for WebRTC
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  useEffect(() => {
    if (!consultationId) {
      navigate(-1);
      return;
    }

    // Load consultation info async (for doctor panel)
    consultationAPI.getById(consultationId).then(res => {
      if (res?.data) setConsultationInfo(res.data);
    }).catch(() => {});

    let isMounted = true;
    const initCall = async () => {
      if (!isMounted) return;
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (isMounted) {
          setStream(s);
          setCameraError(null);
          if (localVideoRef.current) localVideoRef.current.srcObject = s;
          setupWebRTC(s);
        }
      } catch (err) {
        console.error("Failed to get local media", err);
        if (!isMounted) return;
        
        // Provide detailed error messaging
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Check browser settings.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No camera/microphone found on this device.');
        } else if (err.name === 'NotReadableError') {
          setCameraError('Camera is in use by another app.');
        } else {
          setCameraError(`Camera error: ${err.message}`);
        }
        
        // Try audio-only fallback
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (isMounted) {
            setStream(audioOnly);
            setupWebRTC(audioOnly);
          }
        } catch (audioErr) {
          console.error("Even audio-only failed", audioErr);
          setCameraError('Cannot access camera or microphone. Please check permissions.');
          setupWebRTC(null);
        }
      }
    };

    // Connect socket and wait before joining consultation
    socketService.connect(localStorage.getItem('token')).then(() => {
      if (isMounted) {
        socketService.emit('join_consultation', { consultation_id: consultationId });
      }
    }).catch(() => {
      console.warn('Socket connection failed, attempting join anyway');
      if (isMounted) {
        socketService.emit('join_consultation', { consultation_id: consultationId });
      }
    });

    // Socket.IO signaling listeners
    let peerReadyTimeout;
    socketService.on('peer_ready', () => {
      clearTimeout(peerReadyTimeout);
      console.log("Peer ready, initiating offer...");
      initiateOffer();
    });

    // Fallback: If peer doesn't send ready event within 2 seconds, try anyway
    peerReadyTimeout = setTimeout(() => {
      if (isMounted && peerConnectionRef.current) {
        console.log("No peer_ready event received, attempting offer anyway (reload recovery)...");
        initiateOffer();
      }
    }, 2000);

    socketService.on('webrtc_offer', async (data) => {
      console.log("Received Offer");
      if (!peerConnectionRef.current || !isMounted) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socketService.emit('webrtc_answer', { consultation_id: consultationId, answer });
      } catch (e) {
        console.error("Error handling offer", e);
      }
    });

    socketService.on('webrtc_answer', async (data) => {
      console.log("Received Answer");
      if (!peerConnectionRef.current || !isMounted) return;
      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
      } catch (e) {
        console.error("Error handling answer", e);
      }
    });

    socketService.on('webrtc_ice_candidate', async (data) => {
      if (!peerConnectionRef.current || !isMounted) return;
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.error('Error adding received ice candidate', e);
      }
    });

    initCall();

    return () => {
      isMounted = false;
      clearTimeout(peerReadyTimeout);
      socketService.off('peer_ready');
      socketService.off('webrtc_offer');
      socketService.off('webrtc_answer');
      socketService.off('webrtc_ice_candidate');
    };
  }, [consultationId]);

  // Socket.IO-based Chat (Real-time messaging)
  useEffect(() => {
    socketService.on('receive_message', (data) => {
      if (data.sender_id !== userId) {
        // Message from doctor
        setChat(c => [...c, {
          sender: 'doctor',
          text: data.message,
          image: data.image,
          time: data.timestamp
        }]);
      }
    });

    // Load chat history from database
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
              sender: m.sender_id === userId ? 'me' : 'doctor',
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
    };
  }, [consultationId, userId]);

  // Integrated Bandwidth Monitoring (Improved)
  useEffect(() => {
    let interval = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc || !pc.connectionState) return;
      
      try {
        const stats = await pc.getStats();
        let videoBytesReceived = 0;
        let lastVideoBytesCheck = 0;
        
        stats.forEach(report => {
          // Check video stream (inbound)
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            videoBytesReceived = report.bytesReceived || 0;
          }
          
          // Also check outbound video quality
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            const bitsSent = (report.bytesSent || 0) * 8;
            const kbpsOut = bitsSent / 3000; // Convert to kbps over 3 seconds
            
            // ONLY auto-disable once. If user manually re-enabled, don't force disable again
            if (kbpsOut < 250 && !isAutoOffRef.current && !camOff) {
              console.log(`⚡ UPLOAD SLOW: ${kbpsOut.toFixed(0)}kbps - AUTO-DISABLING video (first time only)`);
              isAutoOffRef.current = true;
              ultraLowBandwidthRef.current = (kbpsOut < 100);
              setCameraError(`📱 Slow Upload (${kbpsOut.toFixed(0)}kbps): Auto Audio Mode`);
              toggleCam(true); // Auto-off due to bandwidth
            }
            // Don't re-disable if user manually enabled it - only warn in error message
            else if (kbpsOut < 250 && isAutoOffRef.current && !camOff) {
              // User is keeping video ON despite low bandwidth - just warn, don't force off
              setCameraError(`⚠️ Slow Upload (${kbpsOut.toFixed(0)}kbps) - Video may stutter`);
            }
          }
          
          // Check video receiver quality (inbound)
          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            videoBytesReceived = report.bytesReceived || 0;
            if (lastBytesRef.current > 0) {
              const delta = videoBytesReceived - lastBytesRef.current;
              const kbps = (delta * 8) / 3000; // Convert to kbps over 3 seconds
              
              // ONLY auto-disable once on initial low bandwidth
              if (kbps < 250 && !isAutoOffRef.current && !camOff) {
                console.log(`⚡ SLOW NETWORK: ${kbps.toFixed(0)}kbps - AUTO-DISABLING (first time only)`);
                isAutoOffRef.current = true;
                ultraLowBandwidthRef.current = (kbps < 100); // Mark critical if <100
                setCameraError(`📱 Slow Network (${kbps.toFixed(0)}kbps): Auto Audio Mode`);
                toggleCam(true);
              }
              // Don't force-disable again if user enabled video manually
              // RECOVERY: Network improved to >600 kbps
              else if (kbps > 600 && isAutoOffRef.current) {
                console.log(`✅ Network recovered: ${kbps.toFixed(0)}kbps - Auto re-enabling video`);
                isAutoOffRef.current = false;
                ultraLowBandwidthRef.current = false;
                setCameraError(null);
                toggleCam(false); // Auto re-enable on good bandwidth
              }
            }
            lastBytesRef.current = videoBytesReceived;
          }
        });
      } catch (e) { 
        console.warn('Stats check error:', e); 
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [camOff]);

  // 1. Attach local stream whenever the stream is ready or the camera is toggled back on
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }

    // Apply camera state to stream tracks
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !camOff;
      });
    }
  }, [stream, camOff]);

  // 2. Attach remote stream whenever the other person connects
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // 3. Auto-open chat when in audio-only mode (for accessibility on slow networks)
  useEffect(() => {
    if (camOff && callStatus === 'active' && isAutoOffRef.current) {
      setChatOpen(true);
      console.log('Auto-opened chat for audio-only mode');
    }
  }, [camOff, callStatus, isAutoOffRef]);

  const initiateOffer = () => {
    if (!peerConnectionRef.current) return;
    peerConnectionRef.current.createOffer()
      .then(offer => peerConnectionRef.current.setLocalDescription(offer))
      .then(() => {
        socketService.emit('webrtc_offer', {
          consultation_id: consultationId,
          offer: peerConnectionRef.current.localDescription
        });
      })
      .catch(e => console.error("Error creating offer", e));
  };

  const setupWebRTC = (localStream) => {
    const pc = new RTCPeerConnection(configuration);
    peerConnectionRef.current = pc;

    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('webrtc_ice_candidate', {
          consultation_id: consultationId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track", event.streams[0]);
      setRemoteStream(event.streams[0]);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallStatus('active');
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
      if(pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        setTimeout(() => {
          if (pc.iceConnectionState === 'disconnected') setCallStatus('connecting');
        }, 3000);
      } else if (pc.iceConnectionState === 'connected') {
        setCallStatus('active');
      }
    };

    // Notify other peer that I am ready
    socketService.emit('peer_ready', { consultation_id: consultationId });
  };

  const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const toggleMute = () => {
    if (stream) {
      const isNowMuted = !muted; // Naya state pehle calculate karo
      stream.getAudioTracks().forEach(track => { 
        track.enabled = !isNowMuted; // Track ko strictly naye state ke hisaab se set karo
      });
      setMuted(isNowMuted);
      console.log("Mic muted:", isNowMuted); // Debugging ke liye
    }
  };

  const toggleCam = (forceState) => {
    const shouldTurnOff = forceState !== undefined ? forceState : !camOff;
    
    // If BANDWIDTH LOGIC is trying to auto-disable, check if user manually enabled
    if (forceState === true && isAutoOffRef.current && !camOff) {
      // User is trying to keep video ON while bandwidth is low
      // Log but don't disable - let user choose
      console.log('⚠️ User overriding bandwidth warning - keeping video ON');
      return;
    }
    
    // If no stream yet, just update state - will be applied when stream initializes
    if (!stream) {
      console.log(`Camera state queued: ${shouldTurnOff ? 'OFF' : 'ON'} (stream not ready)`);
      setCamOff(shouldTurnOff);
      if (shouldTurnOff && isAutoOffRef.current) {
        setCameraError('📱 Video disabled (Low Bandwidth)');
      } else if (shouldTurnOff) {
        setCameraError('📱 Video disabled');
      } else {
        setCameraError(null);
        isAutoOffRef.current = false; // User re-enabled manually
      }
      return;
    }
    
    const videoTracks = stream.getVideoTracks();
    
    if (videoTracks.length === 0) {
      console.warn('No video track available');
      setCameraError('No video track available');
      return;
    }

    // If user is manually re-enabling video, clear the auto-off flag
    if (!shouldTurnOff && isAutoOffRef.current) {
      console.log('✅ User manually re-enabled video (overriding bandwidth warning)');
      isAutoOffRef.current = false;
    }

    // INSTANT: Just enable/disable tracks, no async/permissions
    videoTracks.forEach(track => {
      track.enabled = !shouldTurnOff; // If shouldTurnOff=true, enabled=false (OFF)
    });

    setCamOff(shouldTurnOff);
    if (!shouldTurnOff) {
      setCameraError(null);
    } else if (isAutoOffRef.current) {
      setCameraError('📱 Low Bandwidth - Audio Only Mode');
    }
    
    console.log(`Camera ${shouldTurnOff ? 'OFF' : 'ON'} (Manual: ${forceState !== undefined ? 'user' : 'auto'})`);
  };

  const endCall = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    stopRecording();
    setStream(null);
    setRemoteStream(null);
    setCallStatus('ended');
    console.log('Call ended. User can rejoin or navigate back.');
  };

  const handleExitCall = () => {
    if (!showExitConfirm) {
      // First click - show confirmation
      setShowExitConfirm(true);
      return;
    }
    // Second click - confirmed exit
    endCall();
    const role = localStorage.getItem('role');
    setTimeout(() => navigate(role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'), 500);
  };

  const rejoinCall = async () => {
    setCallStatus('connecting');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(s);
      setCameraError(null);
      if (localVideoRef.current) localVideoRef.current.srcObject = s;
      setupWebRTC(s);
      socketService.emit('peer_ready', { consultation_id: consultationId });
    } catch (err) {
      console.error("Failed to rejoin call", err);
      
      // Try audio-only fallback
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        setStream(audioOnly);
        setupWebRTC(audioOnly);
        socketService.emit('peer_ready', { consultation_id: consultationId });
        
        if (err.name === 'NotAllowedError') {
          setCameraError('Camera denied, using audio only');
        } else {
          setCameraError('Using audio-only mode');
        }
      } catch (audioErr) {
        console.error("Cannot get audio", audioErr);
        setCameraError('Cannot access camera or microphone');
        setupWebRTC(null);
      }
    }
  };

  const startRecording = () => {
    if (!stream) {
      alert('No stream available to record');
      return;
    }

    recordedChunksRef.current = [];
    try {
      const recordingStream = new MediaStream();
      
      // Add all audio and video tracks
      stream.getTracks().forEach(track => recordingStream.addTrack(track));
      
      // Also add remote audio/video if available
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => recordingStream.addTrack(track));
      }

      const mediaRecorder = new MediaRecorder(recordingStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consultation_${consultationId}_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Recording downloaded');
      };

      mediaRecorder.start();
      setIsRecording(true);
      console.log('Recording started');
    } catch (err) {
      console.error('Recording error:', err);
      alert('Could not start recording: ' + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Recording stopped');
    }
  };

  const sendMsg = async () => {
    if (!msg.trim() && !imgFile) return;
    
    setIsUploading(true);
    const time = now();
    const payload = {
      consultation_id: consultationId,
      sender_id: userId,
      timestamp: time
    };

    try {
      if (imgFile) {
        console.log('📤 Uploading image to Cloudinary...');
        const res = await mediaAPI.upload(imgFile);
        console.log('Upload response:', res);
        
        if (res.success && res.data?.image_url) {
          const remoteUrl = res.data.image_url;
          console.log('✅ Image uploaded:', remoteUrl);
          setChat(c => [...c, { sender: 'me', image: remoteUrl, time }]);
          payload.image = remoteUrl;
          // Send via Socket.IO (real-time, doctor sees immediately)
          socketService.emit('send_message', payload);
        } else {
          console.error('❌ Upload failed:', res.error || 'Unknown error');
          alert(`Image upload failed: ${res.error || 'Unknown error'}`);
          setIsUploading(false);
          return;
        }
      } else {
        setChat(c => [...c, { sender: 'me', text: msg, time }]);
        payload.message = msg;
        // Send via Socket.IO (real-time, doctor sees immediately)
        socketService.emit('send_message', payload);
      }
    } catch (err) {
      console.error("❌ Chat send error:", err);
      alert(`Error sending message: ${err.message}`);
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

  const handleSaveRx = async () => {
    if (!consultationInfo) return;
    const medicines = rxMedicines.filter(m => m.name.trim());
    if (medicines.length === 0) {
      alert("Please add at least one medicine.");
      return;
    }

    setRxSaving(true);
    try {
      const res = await prescriptionAPI.create({
        consultation_id: consultationId,
        patient_id: consultationInfo.patient_id,
        medicines: medicines,
        notes: rxNotes
      });
      if (res.success) {
        setIsWritingRx(false);
        // Maybe notify patient via socket that Rx is ready?
        socketService.emit('send_message', {
          consultation_id: consultationId,
          sender_id: userId,
          message: "📋 I have shared your prescription. You can view it in your dashboard.",
          timestamp: now()
        });
      }
    } catch (e) {
      console.error("Failed to save Rx", e);
      alert("Failed to save prescription. Please try again.");
    } finally {
      setRxSaving(false);
    }
  };


  return (
    <div className="h-dvh max-h-dvh bg-gray-950 flex flex-col relative overflow-hidden">
      {/* Camera Error Banner */}
      {cameraError && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-500/90 text-white px-4 py-3 flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{cameraError}</span>
          </div>
          <button onClick={() => setCameraError(null)} className="text-white hover:text-red-100">
            ✕
          </button>
        </div>
      )}

      {/* Remote video area (Doctor/Patient full screen view) */}
      <div className={`flex-1 flex flex-col items-center justify-center relative bg-black ${cameraError ? 'mt-12' : ''}`}>
        {remoteStream && !camOff ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : camOff && callStatus === 'active' ? (
          // Video off - just black screen with small audio indicator
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-white text-xs font-medium">Audio Connected</span>
            </div>
          </div>
        ) : null}

        {callStatus === 'connecting' && !remoteStream && (
          <div className="flex flex-col items-center gap-4 absolute inset-0 justify-center bg-gray-950 z-10">
            <div className="w-24 h-24 rounded-full bg-sage-800 flex items-center justify-center animate-pulse">
              {stream ? (
                <Video className="text-white opacity-50" size={40} />
              ) : (
                <span className="text-white text-2xl">🔇</span>
              )}
            </div>
            <p className="text-white text-sm font-medium animate-pulse">
              {stream ? 'Waiting for peer to connect…' : 'Audio-only mode (camera unavailable)'}
            </p>
            {!stream && (
              <button
                onClick={rejoinCall}
                className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
              >
                Try Camera Again
              </button>
            )}
          </div>
        )}

        {callStatus === 'ended' && (
          <div className="flex flex-col items-center gap-3 absolute inset-0 justify-center bg-gray-950/90 z-20 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
              <PhoneOff size={32} className="text-gray-400" />
            </div>
            <p className="text-white font-semibold">Call Ended</p>
          </div>
        )}

        {/* Local video — PiP corner */}
        <div className="absolute top-safe-top right-4 mt-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-white/30 bg-gray-800 shadow-2xl z-30">
          {!camOff && stream ? (
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-gray-800">
              <VideoOff size={24} className="text-gray-500" />
            </div>
          )}
        </div>

        {/* Live indicator */}
        {callStatus === 'active' && (
          <div className="absolute top-safe-top left-4 mt-4 flex items-center gap-2 z-30">
            <div className="bg-black/50 border border-white/10 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span className="font-medium tracking-wide">LIVE P2P</span>
            </div>
            {/* Bandwidth status indicator */}
            {ultraLowBandwidthRef.current && (
              <div className="bg-red-600/90 border border-red-400 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg animate-pulse">
                <span className="text-sm">🚨</span>
                <span className="font-bold">Critical - Both Videos OFF</span>
              </div>
            )}
            {camOff && !ultraLowBandwidthRef.current && (
              <div className="bg-amber-500/90 border border-amber-300 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                <span className="text-sm">⚠️</span>
                <span className="font-medium">Slow 4G - Video Off</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 pb-safe-bottom flex items-center justify-center gap-4 bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-40">
        {callStatus !== 'ended' && (
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={toggleMute}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/10 ${muted ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
              {muted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button onClick={handleExitCall}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-xl transition-all transform hover:scale-105 border-2 ${showExitConfirm ? 'bg-orange-500 hover:bg-orange-600 border-orange-400/50' : 'bg-red-500 hover:bg-red-600 border-red-400/50'}`}>
              <PhoneOff size={24} className="text-white" />
            </button>
            <button onClick={() => toggleCam()}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/10 ${camOff ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
              {camOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            {/* Recording button */}
            <button onClick={isRecording ? stopRecording : startRecording}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/10 ${isRecording ? 'bg-red-500 text-white animate-pulse border-red-400' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}>
              <span className="text-sm font-bold">{isRecording ? '◉' : '●'}</span>
            </button>
            <button onClick={() => setChatOpen(v => !v)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/10 ${chatOpen ? 'bg-sage-500 text-white border-sage-400' : 'bg-gray-800/80 text-white hover:bg-gray-700'}`}>
              <MessageCircle size={20} />
            </button>
            {/* DOCTOR ONLY: Rx / Patient Info button */}
            {userRole === 'doctor' && (
              <button 
                onClick={() => { setDocPanelOpen(v => !v); setChatOpen(false); }}
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border border-white/20 hover:scale-105 active:scale-95 ${docPanelOpen ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-gray-800/90 text-white hover:bg-gray-700'}`}
                title="Doctor Panel"
              >
                <FileText size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
              <h3 className="text-lg font-bold text-gray-800 mb-2">End Consultation?</h3>
              <p className="text-sm text-gray-600 mb-6">Are you sure you want to end this consultation? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowExitConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleExitCall}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">
                  End Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Slide-up chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[60dvh] h-[60dvh] flex flex-col shadow-2xl z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 bg-gray-50/80 backdrop-blur-sm rounded-t-3xl">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><MessageCircle size={18} className="text-sage-500" /> In-call Chat</h3>
              <button onClick={() => setChatOpen(false)} className="p-2 rounded-xl hover:bg-cream-200 transition-colors bg-cream-100/50"><ChevronDown size={20} className="text-gray-500" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-gray-50">
              {chat.length === 0 && <div className="text-center text-xs text-gray-400 mt-4">No messages yet. Say hello!</div>}
              {chat.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                    ${m.sender === 'me' ? 'bg-sage-600 text-white rounded-br-sm' : 'bg-white border border-cream-200 text-gray-800 rounded-bl-sm'}`}>
                    {m.image && <img src={m.image} alt="img" className="rounded-xl mb-1.5 max-h-36 object-cover w-full border border-black/10" />}
                    {m.text && <p>{m.text}</p>}
                    {m.time && <div className={`text-[10px] opacity-70 mt-1 text-right ${m.sender==='me'?'text-sage-100':'text-gray-400'}`}>{m.time}</div>}
                  </div>
                </div>
              ))}
              {imgPreview && <div className="flex justify-end"><img src={imgPreview} className="max-h-24 rounded-xl border-2 border-sage-500 shadow-md opacity-80" alt="preview" /></div>}
            </div>
            
            <div className="flex gap-2 px-4 pb-safe-bottom py-3 border-t border-cream-200 bg-white">
              <input type="file" accept="image/*" ref={fileRef} className="hidden"
                onChange={handleFile} />
              <button onClick={() => fileRef.current.click()} className="p-2.5 bg-cream-100 hover:bg-cream-200 transition-colors w-11 h-11 flex items-center justify-center rounded-xl text-sage-600"><ImageIcon size={20} /></button>
              <input className="gs-input flex-1 !py-2.5 !text-sm bg-gray-50 border-transparent focus:bg-white transition-colors" placeholder="Type message…" value={msg}
                onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} />
              <button disabled={(!msg.trim() && !imgFile) || isUploading} onClick={sendMsg} className="bg-sage-500 disabled:bg-sage-300 disabled:cursor-not-allowed text-white w-11 h-11 flex items-center justify-center rounded-xl transition-colors">{isUploading ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span> : <Send size={18} />}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DOCTOR-ONLY: Patient info + Prescription panel */}
      <AnimatePresence>
        {docPanelOpen && userRole === 'doctor' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[55dvh] flex flex-col shadow-2xl z-50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200 bg-emerald-50/80 backdrop-blur-sm rounded-t-3xl">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <FileText size={16} className="text-emerald-600" />
                Doctor Panel
                {consultationInfo?.patient_name && (
                  <span className="text-xs font-normal text-gray-500">— {consultationInfo.patient_name}</span>
                )}
              </h3>
              <button onClick={() => setDocPanelOpen(false)} className="p-2 rounded-xl hover:bg-cream-200"><ChevronDown size={20} className="text-gray-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {/* Patient summary */}
              {consultationInfo && (
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-1 text-sm">
                  <div className="font-semibold text-gray-700">Patient: {consultationInfo.patient_name || '—'}</div>
                  {consultationInfo.village && <div className="text-xs text-gray-500">Village: {consultationInfo.village}</div>}
                  {consultationInfo.notes && (
                    <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
                      <span className="font-semibold">Chief complaint:</span> {consultationInfo.notes}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <button
                onClick={() => {
                  setDocPanelOpen(false);
                  setIsWritingRx(true);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white !rounded-xl flex items-center justify-center gap-2 !text-sm !py-3.5 font-semibold transition-colors shadow-sm"
              >
                <FileText size={16} /> Write Prescription
              </button>

              <button
                onClick={async () => {
                  if (window.confirm("End this consultation and finalize session?")) {
                    try {
                      await consultationAPI.complete(consultationId);
                      handleExitCall();
                    } catch(e) { console.error(e); }
                  }
                }}
                className="w-full bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 !rounded-xl flex items-center justify-center gap-2 !text-sm !py-3 font-medium transition-colors"
              >
                <PhoneOff size={16} /> End Consultation Now
              </button>

              <div className="text-[11px] text-center text-gray-400 pt-2 px-6 leading-tight">
                Finalizing resets the queue. You can write a prescription without ending the call using the button above.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INTEGRATED PRESCRIPTION FORM (Doctor Only) */}
      <AnimatePresence>
        {isWritingRx && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="absolute inset-0 bg-white z-[60] flex flex-col pt-safe-top">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <FileText size={18} className="text-sage-600" />
                Write Prescription
              </h2>
              <button onClick={() => setIsWritingRx(false)} className="p-2 hover:bg-cream-100 rounded-xl">
                <ChevronDown size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <div className="bg-sage-50 rounded-2xl p-4 border border-sage-100">
                <div className="text-xs font-bold text-sage-600 uppercase mb-1">Patient</div>
                <div className="font-bold text-gray-800">{consultationInfo?.patient_name}</div>
                <div className="text-xs text-gray-500">{consultationInfo?.village}</div>
              </div>

              {rxMedicines.map((m, idx) => (
                <div key={idx} className="bg-white border border-cream-200 rounded-2xl p-4 shadow-sm relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 capitalize">Medicine {idx + 1}</span>
                    {rxMedicines.length > 1 && (
                      <button onClick={() => setRxMedicines(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 p-1">
                        <PhoneOff size={14} className="rotate-45" /> 
                      </button>
                    )}
                  </div>
                  <input className="gs-input !text-sm mb-2" placeholder="Medicine Name" value={m.name} 
                    onChange={e => {
                      const newMeds = [...rxMedicines];
                      newMeds[idx].name = e.target.value;
                      setRxMedicines(newMeds);
                    }} 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="gs-input !text-xs" placeholder="Dosage (500mg)" value={m.dosage} 
                       onChange={e => {
                        const newMeds = [...rxMedicines];
                        newMeds[idx].dosage = e.target.value;
                        setRxMedicines(newMeds);
                      }}
                    />
                    <input className="gs-input !text-xs" placeholder="Freq (1-0-1)" value={m.frequency} 
                       onChange={e => {
                        const newMeds = [...rxMedicines];
                        newMeds[idx].frequency = e.target.value;
                        setRxMedicines(newMeds);
                      }}
                    />
                  </div>
                </div>
              ))}

              <button onClick={() => setRxMedicines([...rxMedicines, { name: '', dosage: '', frequency: '', duration: '' }])}
                className="py-3 border-2 border-dashed border-cream-300 rounded-2xl text-sage-600 font-bold text-sm bg-cream-50/50 hover:bg-cream-50 transition-colors">
                + Add Medicine
              </button>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 px-1">Notes / Instructions</label>
                <textarea className="gs-input !text-sm min-h-[100px]" placeholder="Take after food..." value={rxNotes} onChange={e => setRxNotes(e.target.value)} />
              </div>
            </div>

            <div className="p-4 border-t border-cream-200 bg-white shadow-lg flex gap-3 pb-safe-bottom">
              <button onClick={() => setIsWritingRx(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-600 font-bold rounded-2xl">Cancel</button>
              <button disabled={rxSaving} onClick={handleSaveRx}
                className="flex-[2] py-3.5 bg-sage-500 text-white font-bold rounded-2xl shadow-lg shadow-sage-200 disabled:opacity-50">
                {rxSaving ? "Saving..." : "Save & Share"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

