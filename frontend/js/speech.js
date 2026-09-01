/* Real browser speech I/O, standing in for the self-hosted Whisper (STT) and
   Coqui VITS (TTS) services described in the architecture doc. Works in
   Chrome/Edge out of the box; Safari/Firefox support for SpeechRecognition
   varies, so we degrade gracefully with a warning. */

const SpeechInput = {
  supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  recognizer: null,
  listening: false,

  start({ onResult, onEnd, onError }) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { onError && onError('SpeechRecognition is not supported in this browser. Try Chrome or Edge.'); return; }

    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;

    let finalTranscript = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t + ' ';
        else interim += t;
      }
      onResult && onResult({ final: finalTranscript.trim(), interim: interim.trim() });
    };
    rec.onerror = (e) => { onError && onError(e.error || 'Speech recognition error'); };
    rec.onend = () => { this.listening = false; onEnd && onEnd(finalTranscript.trim()); };

    this.recognizer = rec;
    this.listening = true;
    rec.start();
  },

  stop() {
    if (this.recognizer && this.listening) this.recognizer.stop();
  },
};

const SpeechOutput = {
  supported: 'speechSynthesis' in window,
  speak(text, { rate = 0.98, onEnd } = {}) {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.lang = 'en-IN';
    utter.onend = () => onEnd && onEnd();
    window.speechSynthesis.speak(utter);
  },
  stop() { if (this.supported) window.speechSynthesis.cancel(); },
};
