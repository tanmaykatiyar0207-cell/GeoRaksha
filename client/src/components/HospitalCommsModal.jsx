import React, { useState } from 'react';

const TRIAGE_PRESETS = [
  {
    id: 'trauma',
    label: '🚨 Polytrauma Code',
    text: 'Trauma Code Activated: Multi-trauma patient on-board. Requesting Level-1 Trauma Bay & Emergency Blood Transfusion standby.',
    protocol: 'Trauma Alert'
  },
  {
    id: 'cardiac',
    label: '🫀 Cardiac STEMI',
    text: 'Cardiac Code: Acute STEMI indicated on 12-lead ECG. Paramedic administering Aspirin/Heparin. Request immediate Cath Lab prep.',
    protocol: 'Cardiac Alert'
  },
  {
    id: 'stroke',
    label: '🧠 Stroke Alert',
    text: 'Stroke Code: FAST positive, acute onset within 90 mins. Requesting immediate CT Neuro scan & Stroke Team at emergency bay.',
    protocol: 'Stroke Alert'
  },
  {
    id: 'respiratory',
    label: '🫁 Respiratory Distress',
    text: 'Severe Respiratory Distress: SpO2 88% on high-flow O2. Requesting immediate ICU bed and respiratory therapist on arrival.',
    protocol: 'Respiratory Alert'
  }
];

const HOSPITAL_REPLIES = {
  'Trauma Alert': [
    '🏥 [ER Dispatch] Trauma Bay 1 cleared. Dr. Reddy & surgical team en route to receiving bay. Blood bank on standby — Type O-neg crossmatch initiated.',
    '✅ [OR Scheduling] Operating Room 3 on 15-min standby. Anesthesia team paged.'
  ],
  'Cardiac Alert': [
    '🏥 [Cath Lab Control] Cath Lab activated. Interventional cardiologist Dr. Sharma scrubbing in now. Heparin drip prepped.',
    '✅ [ER Charge Nurse] Bay 2 prepped with 12-lead ECG and defibrillator. Awaiting patient arrival.'
  ],
  'Stroke Alert': [
    '🏥 [Neuro On-Call] CT scanner reserved. Stroke Team Alpha activated — Dr. Patel (Neurologist) and Dr. Khan (Neuroradiologist) en route.',
    '✅ [Pharmacy] tPA thrombolytic drawn and staged at ER Bay 4. Weight-based dosing ready on your vitals.'
  ],
  'Respiratory Alert': [
    '🏥 [ICU Coordinator] ICU Bed 7 cleared for immediate admission. Ventilator prepped. Respiratory therapist at ER bay.',
    '✅ [ER Charge Nurse] High-flow nasal cannula and BiPAP at Bay 5. ABG kit ready.'
  ]
};

export default function HospitalCommsModal({
  isOpen,
  onClose,
  hospitalName = 'Destination Hospital',
  etaSeconds = 0,
  messages = [],
  onSendMessage,
  onHospitalReply
}) {
  const [inputText, setInputText] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState('Trauma Alert');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  if (!isOpen) return null;

  const handleSend = (textToSend = inputText, protocol = selectedProtocol, imageUrl = null) => {
    if (!textToSend.trim() && !imageUrl) return;
    onSendMessage(textToSend || 'Sent an image.', protocol, hospitalName, imageUrl);
    setInputText('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      handleSend('', selectedProtocol, base64String);
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };



  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      
      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);
      
      recognition.start();
    } else {
      // Fallback for browsers that don't support it
      setIsRecording(true);
      setTimeout(() => {
        setInputText("Voice transcribed: Patient is a 45-year-old male with severe chest pain. ETA 4 minutes. Please prepare Cath Lab.");
        setIsRecording(false);
      }, 3000);
    }
  };

  const handlePresetClick = (preset) => {
    setSelectedProtocol(preset.protocol);
    handleSend(preset.text, preset.protocol);
  };

  const mins = Math.ceil((etaSeconds || 300) / 60);

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: '#fef2f2', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px'
            }}>
              🏥
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {hospitalName}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Emergency ER Telemedicine Link</span>
                <span style={{ color: '#059669', fontWeight: 700 }}>• Live (ETA: {mins} min)</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Telemedicine"
            style={{
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              color: '#0f172a', borderRadius: '50%', width: '34px', height: '34px',
              fontSize: '16px', fontWeight: 800, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            ✕
          </button>
        </div>

        {/* Quick Emergency Protocol Presets */}
        <div style={{ padding: '12px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
            ⚡ 1-Click ER Triage Protocols (Instant Telemetry Dispatch)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {TRIAGE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetClick(p)}
                style={{
                  padding: '7px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#1e293b',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#ffffff',
          minHeight: '220px'
        }}>
          {messages.map((m, i) => {
            const isAmb = m.sender === 'ambulance';
            return (
              <div
                key={m.id || i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isAmb ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}
              >
                <div style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isAmb ? '#2563eb' : '#dc2626',
                  marginBottom: '3px',
                  alignSelf: isAmb ? 'flex-end' : 'flex-start'
                }}>
                  {m.senderName || (isAmb ? 'Paramedic Unit' : 'Hospital ER')} • {m.timestamp}
                </div>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: isAmb ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: isAmb ? '#eff6ff' : '#fef2f2',
                  color: '#0f172a',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  border: `1px solid ${isAmb ? '#bfdbfe' : '#fecaca'}`,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.text}
                  {m.imageUrl && (
                    <img 
                      src={m.imageUrl} 
                      alt="Uploaded by paramedic" 
                      style={{ 
                        display: 'block', 
                        marginTop: m.text ? '8px' : '0', 
                        maxWidth: '100%', 
                        maxHeight: '200px', 
                        borderRadius: '8px', 
                        border: '1px solid rgba(0,0,0,0.1)' 
                      }} 
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Input Bar */}
        <div style={{
          padding: '12px 18px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            placeholder="Type custom paramedic notes or patient vitals..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button
            onClick={startVoiceRecording}
            disabled={isRecording}
            style={{
              background: isRecording ? '#fee2e2' : '#f1f5f9',
              color: isRecording ? '#dc2626' : '#334155',
              border: `1px solid ${isRecording ? '#f87171' : '#cbd5e1'}`,
              borderRadius: '10px',
              padding: '0 14px',
              fontWeight: 700,
              fontSize: '18px',
              cursor: isRecording ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              animation: isRecording ? 'pulse 1.5s infinite' : 'none'
            }}
            title="Voice to Text"
          >
            {isRecording ? '🔴' : '🎤'}
          </button>
          <label
            style={{
              background: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '0 14px',
              fontWeight: 700,
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            title="Upload Photo (ECG / Wound)"
          >
            <input 
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleImageUpload} 
            />
            📷
          </label>
          <button
            onClick={() => handleSend()}
            style={{
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0 18px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
