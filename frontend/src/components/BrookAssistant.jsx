import { useEffect, useRef, useState } from 'react';
import { getSpeechRecognition } from '../lib/voice';

export default function BrookAssistant({ messages, loading, onSend, onClear }) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState(null);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    recognitionRef.current = getSpeechRecognition();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setText('');
    onSend(trimmed);
  }

  function handleMic() {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setMicError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    setMicError(null);
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onSend(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <div className="brook-panel">
      <div className="brook-header">
        <div className="brook-avatar">🌊</div>
        <div className="brook-header-text">
          <h2>Brook</h2>
          <p>Your personal shopping assistant — ask me anything, I'll remember as we go.</p>
        </div>
        {messages.length > 0 && (
          <button type="button" className="brook-clear-btn" onClick={onClear}>
            Clear chat
          </button>
        )}
      </div>

      <div className="brook-transcript" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="brook-empty">
            👋 Hi, I'm Brook. Ask me to find a product, compare prices, or just tell me what you're shopping for —
            I'll remember our conversation and can suggest things as we go.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`brook-row ${m.role}`}>
            <div className={`brook-bubble ${m.role}`}>{m.content}</div>
            {m.bestDeal && (
              <a
                className="brook-deal-chip"
                href={m.bestDeal.link}
                target="_blank"
                rel="noreferrer"
              >
                {m.bestDeal.thumbnail && <img src={m.bestDeal.thumbnail} alt="" />}
                <span className="brook-deal-info">
                  <strong>{m.bestDeal.displayPrice}</strong> at {m.bestDeal.store}
                </span>
              </a>
            )}
          </div>
        ))}
        {loading && (
          <div className="brook-row assistant">
            <div className="brook-bubble assistant brook-typing">
              <span className="brook-dot" />
              <span className="brook-dot" />
              <span className="brook-dot" />
            </div>
          </div>
        )}
      </div>

      {micError && <p className="error brook-mic-error">{micError}</p>}

      <form className="brook-input-row" onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Talk to Brook…"
          aria-label="Message Brook"
        />
        <button
          type="button"
          className={`mic-btn ${listening ? 'listening' : ''}`}
          onClick={handleMic}
          title="Talk to Brook"
        >
          {listening ? '● Listening…' : '🎤'}
        </button>
        <button type="submit" disabled={loading || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
