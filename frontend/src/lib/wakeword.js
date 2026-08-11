// True passive "always listening" wake words aren't possible in a browser tab —
// mic access requires an explicit user gesture, and only one SpeechRecognition
// session can run at a time. This approximates it: one tap arms continuous
// recognition, which auto-restarts itself on pauses/timeouts until disarmed, so
// after that first tap the user really can just say the phrase at any point.
const WAKE_TEST = /^\s*hey\b/i;
const WAKE_STRIP = /^\s*hey[,.\s]*(brook)?[,.:\s]*/i;

const ERROR_MESSAGES = {
  'not-allowed': 'Microphone access was blocked. Check your browser\'s site permissions and allow the mic to use "hey brook".',
  'service-not-allowed': 'Microphone access was blocked. Check your browser\'s site permissions and allow the mic to use "hey brook".',
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice recognition needs an internet connection to work.',
};

function friendlyError(code) {
  return ERROR_MESSAGES[code] || `Voice wake word stopped unexpectedly (${code}).`;
}

export function startWakeWordListener({ onWake, onError }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError?.('Voice wake word is not supported in this browser. Try Chrome or Edge.');
    return { stop: () => {} };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let stopped = false;

  recognition.onresult = (event) => {
    const latest = event.results[event.results.length - 1];
    if (!latest.isFinal) return;
    const transcript = latest[0].transcript.trim();
    if (WAKE_TEST.test(transcript)) {
      onWake(transcript.replace(WAKE_STRIP, '').trim());
    }
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') onError?.(friendlyError(e.error));
  };

  recognition.onend = () => {
    if (!stopped) {
      try {
        recognition.start();
      } catch {
        /* already starting/running */
      }
    }
  };

  try {
    recognition.start();
  } catch {
    /* ignore double-start */
  }

  return {
    stop: () => {
      stopped = true;
      recognition.onend = null;
      recognition.stop();
    },
  };
}

export function listenOnce() {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Voice input is not supported in this browser.'));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => resolve(event.results[0][0].transcript);
    recognition.onerror = (e) => reject(new Error(e.error));
    try {
      recognition.start();
    } catch (err) {
      reject(err);
    }
  });
}
