"use client";

let recognition;
let recognizing = false;

export function initSpeechRecognition(langSelect, textArea, speechButton, chatButton, speakButton) {
  if (typeof window === 'undefined') return { toggleStartStop: () => {} };
  
  if (navigator.userAgent.includes("Firefox")) {
    recognition = new SpeechRecognition();
  } else {
    recognition = new webkitSpeechRecognition();
  }
  
  recognition.lang = langSelect.value;
  recognition.continuous = true;
  reset();
  recognition.onend = reset;
  
  recognition.onresult = function (event) {
    for (var i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        textArea.value += event.results[i][0].transcript;
      }
    }
  };
  
  function reset() {
    recognizing = false;
    speechButton.style.color = "";
    speechButton.innerHTML = `<span class="material-symbols-outlined">mic</span>`;
    chatButton.removeAttribute("disabled");
    speakButton.removeAttribute("disabled");
  }
  
  function toggleStartStop() {
    recognition.lang = langSelect.value;
    if (recognizing) {
      textArea.focus();
      recognition.stop();
      reset();
    } else {
      textArea.value = "";
      recognition.start();
      recognizing = true;
      speechButton.style.color = "red";
      speechButton.innerHTML = "⏹";
      chatButton.setAttribute("disabled", true);
      speakButton.setAttribute("disabled", true);
    }
  }
  
  return { toggleStartStop };
}