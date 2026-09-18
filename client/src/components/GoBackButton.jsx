import { useNavigate } from 'react-router-dom';

export default function GoBackButton({ label = 'Go back' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="go-back-btn"
      onClick={() => navigate(-1)}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}
