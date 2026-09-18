import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppIcon, PageIntro, SafetyAppShell, StatusPill } from '../components/SafetyAppShell';
import { api } from '../lib/api';
import { loadFaceModels, getFaceDescriptor } from '../lib/faceApi';

const STEPS = { PLATE: 'plate', CONSENT: 'consent', CAMERA: 'camera', RESULT: 'result' };

const RESULT_COPY = {
  match: { label: 'Match', tone: 'green', heading: 'Identity matches' },
  mismatch: { label: 'Mismatch', tone: 'red', heading: 'Identity does not match' },
  no_record: { label: 'No record', tone: 'neutral', heading: 'No verified record found' },
};

export default function VerifyDriver() {
  const [searchParams] = useSearchParams();
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
    <SafetyAppShell>
      <div className="app-content narrow-content">
        <PageIntro
          eyebrow="Identity check"
          title="Verify a driver"
          description="Confirm the person behind the wheel matches the vehicle's public record."
        />

        <VerificationStepper step={step} />
        {error && <div className="auth-error">{error}</div>}

        {step === STEPS.PLATE && (
          <form className="verify-card" onSubmit={handlePlateSubmit}>
            <div className="verify-icon"><AppIcon name="verify" size={24} /></div>
            <h2>Which vehicle are you checking?</h2>
            <p>Start with the plate number on the vehicle you are about to enter.</p>
            <input
              id="plate"
              className="full-input"
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder="e.g. CA 123-456"
              required
              autoFocus
            />
            <button type="submit" className="app-button primary full-button">Continue</button>
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
    </SafetyAppShell>
  );
}

function VerificationStepper({ step }) {
  const secondStepDone = step === STEPS.CAMERA || step === STEPS.RESULT;
  const thirdStepDone = step === STEPS.RESULT;

  return (
    <div className="stepper" aria-label="Verification progress">
      <span className="done">1</span><i />
      <span className={secondStepDone ? 'done' : ''}>2</span><i />
      <span className={thirdStepDone ? 'done' : ''}>3</span>
    </div>
  );
}

function ConsentStep({ plate, checked, onCheckedChange, onBack, onContinue }) {
  return (
    <div className="verify-card">
      <div className="verify-icon"><AppIcon name="shield" size={24} /></div>
      <h2>Ask for consent first</h2>
      <p>
        We will capture a photo of the driver&apos;s face to check it against plate <strong>{plate.toUpperCase()}</strong>.
        The photo itself is never stored — only an encrypted mathematical representation is kept.
      </p>
      <p className="verify-privacy-note">This is sensitive personal information under South African privacy law (POPIA). The driver should know this scan is happening.</p>
      <label className="consent-line">
        <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
        <span>I confirm the driver has been informed and I have consent to capture this scan.</span>
      </label>
      <div className="button-row">
        <button type="button" className="app-button ghost" onClick={onBack}>Back</button>
        <button type="button" className="app-button primary" disabled={!checked} onClick={onContinue}>Continue</button>
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
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setCameraError('Could not access the camera. Please allow camera permission and try again.');
      }
    }

    setup();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function handleCapture() {
    if (!videoRef.current) return;
    setCapturing(true);
    setCaptureError('');
    try {
      const descriptor = await getFaceDescriptor(videoRef.current);
      if (!descriptor) {
        setCaptureError("No face detected. Line up the driver's face in frame and try again.");
        return;
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      onCaptured(descriptor);
    } catch {
      setCaptureError('Something went wrong reading the face. Please try again.');
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="verify-card">
      {cameraError && <div className="auth-error">{cameraError}</div>}
      {captureError && <div className="auth-error">{captureError}</div>}
      <div className="camera-placeholder">
        {!modelsReady && !cameraError && <span>Loading camera...</span>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={modelsReady ? 'camera-feed' : 'camera-feed is-hidden'}
        />
      </div>
      <StatusPill tone="neutral">Photo is not stored</StatusPill>
      <div className="button-row verify-camera-actions">
        <button type="button" className="app-button ghost" onClick={onBack} disabled={submitting || capturing}>Back</button>
        <button
          type="button"
          className="app-button primary"
          onClick={handleCapture}
          disabled={!modelsReady || Boolean(cameraError) || capturing || submitting}
        >
          {capturing || submitting ? 'Checking...' : 'Capture and verify'}
        </button>
      </div>
    </div>
  );
}

function ResultStep({ plate, result, onScanAnother }) {
  const copy = RESULT_COPY[result.result] || RESULT_COPY.no_record;

  return (
    <div className="verify-card result-verified">
      <div className="verified-check"><AppIcon name="shield" size={28} /></div>
      <span className="plate-label verify-result-plate">{plate.toUpperCase()}</span>
      <StatusPill tone={copy.tone}>{copy.label}</StatusPill>
      <h2>{copy.heading}</h2>
      <p>{result.message}</p>
      {typeof result.confidence === 'number' && (
        <p className="verify-privacy-note">Confidence: {(result.confidence * 100).toFixed(0)}%</p>
      )}
      <button type="button" className="app-button ghost" onClick={onScanAnother}>Scan another plate</button>
    </div>
  );
}
