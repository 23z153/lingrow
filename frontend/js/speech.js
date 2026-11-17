/* Real browser speech I/O, standing in for the self-hosted Whisper (STT) and
   Coqui VITS (TTS) services described in the architecture doc. Works in
   Chrome/Edge out of the box; Safari/Firefox support for SpeechRecognition
   varies, so we degrade gracefully with a warning. */

const SpeechInput = {
  supported: !!(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)),
  recognizer: null,
  listening: false,
  accumulatedFinal: '',
  _explicitStop: false,

  start({ onResult, onEnd, onError, shouldContinue = null }) {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      this.listening = false;
      onError && onError('SpeechRecognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    this._explicitStop = false;
    this.accumulatedFinal = '';
    this.listening = true;
    let restartCount = 0;
    const MAX_RESTARTS = 10;

    const mergeFinal = (chunk) => {
      const trimmed = (chunk || '').trim();
      if (!trimmed) return;
      if (!this.accumulatedFinal) {
        this.accumulatedFinal = trimmed;
      } else {
        // Prevent duplicate overlapping phrases emitted across restarts
        const existingWords = this.accumulatedFinal.split(/\s+/);
        const newWords = trimmed.split(/\s+/);
        let overlap = 0;
        for (let len = Math.min(existingWords.length, newWords.length, 6); len > 0; len--) {
          const endSlice = existingWords.slice(-len).join(' ').toLowerCase();
          const startSlice = newWords.slice(0, len).join(' ').toLowerCase();
          if (endSlice === startSlice) {
            overlap = len;
            break;
          }
        }
        const wordsToAdd = newWords.slice(overlap);
        if (wordsToAdd.length > 0) {
          this.accumulatedFinal = (this.accumulatedFinal + ' ' + wordsToAdd.join(' ')).replace(/\s+/g, ' ').trim();
        }
      }
    };

    const launchRecognizer = () => {
      if (this._explicitStop) return;

      const rec = new SR();
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      let sessionFinal = '';

      rec.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) sessionFinal += t + ' ';
          else interim += t;
        }
        const fullFinal = (this.accumulatedFinal + ' ' + sessionFinal).trim();
        onResult && onResult({ final: fullFinal, interim: interim.trim() });
      };

      rec.onerror = (e) => {
        // Never auto-restart on permission denial
        const isPermissionDenied = e.error === 'not-allowed' || e.error === 'service-not-allowed';
        if (isPermissionDenied) {
          this.listening = false;
          this._explicitStop = true;
          window.dispatchEvent(new CustomEvent('lingrow:recording', { detail: { recording: false } }));
          onError && onError(e.error || 'Microphone access denied');
          return;
        }

        const isRecoverable = e.error === 'no-speech' || e.error === 'network' || e.error === 'aborted';
        const canRestart =
          !this._explicitStop &&
          this.listening &&
          restartCount < MAX_RESTARTS &&
          (!shouldContinue || shouldContinue());

        if (isRecoverable && canRestart) {
          mergeFinal(sessionFinal);
          sessionFinal = '';
          const backoff = Math.min(1000, 150 + restartCount * 100);
          restartCount++;
          try {
            setTimeout(() => {
              if (!this._explicitStop && this.listening && (!shouldContinue || shouldContinue())) {
                launchRecognizer();
              }
            }, backoff);
            return;
          } catch (re) {}
        }

        // Fatal error, exhausted restarts, or stopped
        this.listening = false;
        window.dispatchEvent(new CustomEvent('lingrow:recording', { detail: { recording: false } }));
        onError && onError(e.error || 'Speech recognition error');
      };

      rec.onend = () => {
        mergeFinal(sessionFinal);
        sessionFinal = '';
        const canRestart =
          !this._explicitStop &&
          this.listening &&
          restartCount < MAX_RESTARTS &&
          (!shouldContinue || shouldContinue());

        if (canRestart) {
          const backoff = Math.min(1000, 100 + restartCount * 80);
          restartCount++;
          try {
            setTimeout(() => {
              if (!this._explicitStop && this.listening && (!shouldContinue || shouldContinue())) {
                launchRecognizer();
              }
            }, backoff);
            return;
          } catch (err) {}
        }

        this.listening = false;
        window.dispatchEvent(new CustomEvent('lingrow:recording', { detail: { recording: false } }));
        onEnd && onEnd(this.accumulatedFinal);
      };

      this.recognizer = rec;
      try {
        rec.start();
      } catch (err) {
        this.listening = false;
        window.dispatchEvent(new CustomEvent('lingrow:recording', { detail: { recording: false } }));
        onEnd && onEnd(this.accumulatedFinal);
      }
    };

    window.dispatchEvent(new CustomEvent('lingrow:recording', { detail: { recording: true } }));
    launchRecognizer();
  },

  stop() {
    this._explicitStop = true;
    this.listening = false;
    window.dispatchEvent(new CustomEvent('lingrow:recording', { detail: { recording: false } }));
    if (this.recognizer) {
      try { this.recognizer.stop(); } catch (e) {}
    }
  },
};

const SpeechOutput = {
  supported: 'speechSynthesis' in window,
  speaking: false,
  speak(text, { rate = 0.98, pitch = 1.0, lang = 'en-IN', onEnd } = {}) {
    if (!this.supported || !text) return;
    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/```[\s\S]*?```/g, ' Code block. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, ' ')
      .trim();
    if (!cleanText) return;
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = rate;
    utter.pitch = pitch;
    utter.lang = lang;
    this.speaking = true;
    utter.onend = () => {
      this.speaking = false;
      if (onEnd) onEnd();
    };
    utter.onerror = () => {
      this.speaking = false;
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utter);
  },
  stop() {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    this.speaking = false;
  },
};
