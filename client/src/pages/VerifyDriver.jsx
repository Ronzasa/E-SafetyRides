import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { loadFaceModels, getFaceDescriptor } from '../lib/faceApi';

const STEPS = { PLATE: 'plate', CONSENT: 'consent', CAMERA: 'camera', RESULT: 'result' };

const RESULT_COPY = {
  match: { label: 'Match', badgeClass: 'badge-success' },
  mismatch: { label: 'Mismatch', badgeClass: 'badge-danger' },
  no_record: { label: 'No record', badgeClass: 'badge-neutral' },
};

export default function VerifyDriver() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.PLATE);
  const [plate, setPlate] = useState(searchParams.get('plate') || '');
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  function handlePlateSubmit(e) {
    e.preventDefault();
    if (!plate.trim()) return;
    setError('');
    setStep(STEPS.CONSENT);
  }

  function handleConsentContinue() {
    setError('');
    setStep(STEPS.CAMERA);
  }

  async function handleCaptured(descriptor) {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post('/verification/scan', {
        plate: plate.trim(),
        descriptor,
        consent: true,
      });
      setResult(data);
      setStep(STEPS.RESULT);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleScanAnother() {
    setPlate('');
    setConsentChecked(false);
    setResult(null);
    setError('');
    setStep(STEPS.PLATE);
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div>
          <h1>Verify driver identity</h1>
          <p className="page-subtitle">
            Confirm the person behind the wheel matches this vehicle's record.
          </p>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}

      {step === STEPS.PLATE && (
        <form className="card" onSubmit={handlePlateSubmit} style={{ maxWidth: 420 }}>
          <label htmlFor="plate">Vehicle plate</label>
          <input
            id="plate"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder="e.g. CA 123-456"
            required
            autoFocus
            style={{
              width: '100%', marginTop: '0.35rem', marginBottom: '1rem',
              padding: '0.7rem 0.85rem', border: '1.5px solid var(--color-border)',
              borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: '1rem',
            }}
          />
          <button type="submit" className="btn-primary">Continue</button>
        </form>
      )}

      {step === STEPS.CONSENT && (
        <ConsentStep
          plate={plate}
          checked={consentChecked}
          onCheckedChange={setConsentChecked}
          onBack={() => setStep(STEPS.PLATE)}
          onContinue={handleConsentContinue}
        />
      )}

      {step === STEPS.CAMERA && (
        <CameraStep
          submitting={submitting}
          onCaptured={handleCaptured}
          onBack={() => setStep(STEPS.CONSENT)}
        />
      )}

      {step === STEPS.RESULT && result && (
        <ResultStep plate={plate} result={result} onScanAnother={handleScanAnother} />
      )}
    </div>
  );
}

function ConsentStep({ plate, checked, onCheckedChange, onBack, onContinue }) {
  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2>Before we scan</h2>
      <p>
        We'll capture a photo of the driver's face to check it against the plate{' '}
        <strong>{plate.toUpperCase()}</strong>. The photo itself is never stored — only a
        mathematical representation of the face is kept, and it's encrypted.
      </p>
      <p className="report-meta">
        This is treated as sensitive personal information under South African privacy law (POPIA).
        The driver should be aware this scan is happening.
      </p>

      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', margin: '1.25rem 0' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          style={{ marginTop: '0.2rem' }}
        />
        <span>I confirm the driver has been informed and I have consent to capture this scan.</span>
      </label>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn-primary" disabled={!checked} onClick={onContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}

function CameraStep({ submitting, onCaptured, onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        await loadFaceModels();
        if (cancelled) return;
        setModelsReady(true);

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        setCameraError('Could not access the camera. Please allow camera permission and try again.');
      }
    }

    setup();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleCapture() {
    if (!videoRef.current) return;
    setCapturing(true);
    setCaptureError('');
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setCaptureError('No face detected. Line up the driver\'s face in frame and try again.');
        return;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCaptured(descriptor);
    } catch (err) {
      setCaptureError('Something went wrong reading the face. Please try again.');
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h2>Scan driver</h2>

      {cameraError && <div className="auth-error">{cameraError}</div>}
      {captureError && <div className="auth-error">{captureError}</div>}

      <div style={{
        background: 'var(--color-primary-dark)', borderRadius: 8, overflow: 'hidden',
        aspectRatio: '4 / 3', marginBottom: '1rem', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {!modelsReady && !cameraError && (
          <span style={{ color: '#fff', fontSize: '0.9rem' }}>Loading camera…</span>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: modelsReady ? 'block' : 'none' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="button" className="btn-secondary" onClick={onBack} disabled={submitting || capturing}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={handleCapture}
          disabled={!modelsReady || !!cameraError || capturing || submitting}
        >
          {capturing || submitting ? 'Checking…' : 'Capture & verify'}
        </button>
      </div>
    </div>
  );
}

function ResultStep({ plate, result, onScanAnother }) {
  const copy = RESULT_COPY[result.result] || RESULT_COPY.no_record;

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <div className="report-card-top">
        <span className="report-plate">{plate.toUpperCase()}</span>
        <span className={`badge ${copy.badgeClass}`}>{copy.label}</span>
      </div>
      <p style={{ marginTop: '1rem' }}>{result.message}</p>
      {typeof result.confidence === 'number' && (
        <p className="report-meta">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
      )}
      <button type="button" className="btn-primary" onClick={onScanAnother} style={{ marginTop: '0.5rem' }}>
        Scan another plate
      </button>
    </div>
  );
}