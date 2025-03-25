"use client";

import { useEffect, useRef, useState } from 'react';
import * as sdk from "@d-id/client-sdk";
import { initSpeechRecognition } from '../lib/webSpeechAPI';

export default function AgentVideo() {
  const [agentManager, setAgentManager] = useState(null);
  const [connectionState, setConnectionState] = useState("Connecting..");
  const [previewName, setPreviewName] = useState("Your Agent");
  const [showContainer, setShowContainer] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [answerMessages, setAnswerMessages] = useState([]);
  
  const videoRef = useRef(null);
  const textAreaRef = useRef(null);
  const langSelectRef = useRef(null);
  const speechButtonRef = useRef(null);
  const chatButtonRef = useRef(null);
  const speakButtonRef = useRef(null);
  const answersRef = useRef(null);
  
  let srcObject = null;
  
  // Speech recognition handler
  const speechHandler = useRef(null);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize the SDK
    async function initAgentManager() {
      const agentId = process.env.NEXT_PUBLIC_AGENT_ID || "";
      const auth = { 
        type: 'key', 
        clientKey: process.env.NEXT_PUBLIC_CLIENT_KEY || "" 
      };
      
      // Reminder to set environment variables
      if (agentId === "" || auth.clientKey === "") {
        setConnectionState("<span style='color:red; font-weight:bold'> Missing agentID and auth.clientKey variables</span>");
        console.error("Missing agentID and auth.clientKey variables");
        return;
      }
      
      // Define callbacks
      const callbacks = {
        onSrcObjectReady(value) {
          if (videoRef.current) {
            videoRef.current.srcObject = value;
            srcObject = value;
          }
          return srcObject;
        },
        
        onConnectionStateChange(state) {
          if (state === "connecting") {
            setConnectionState("Connecting..");
            setShowContainer(true);
            setShowHidden(false);
          }
          else if (state === "connected") {
            if (textAreaRef.current) {
              textAreaRef.current.addEventListener('keypress', (event) => { 
                if (event.key === "Enter") { event.preventDefault(); chat(); } 
              });
            }
            if (chatButtonRef.current) chatButtonRef.current.removeAttribute("disabled");
            if (speakButtonRef.current) speakButtonRef.current.removeAttribute("disabled");
            if (langSelectRef.current) langSelectRef.current.removeAttribute("disabled");
            if (speechButtonRef.current) speechButtonRef.current.removeAttribute("disabled");
            setConnectionState("Online");
          }
          else if (state === "disconnected" || state === "closed") {
            if (textAreaRef.current) {
              textAreaRef.current.removeEventListener('keypress', (event) => { 
                if (event.key === "Enter") { event.preventDefault(); chat(); } 
              });
            }
            setShowHidden(true);
            setShowContainer(false);
            if (chatButtonRef.current) chatButtonRef.current.setAttribute("disabled", true);
            if (speakButtonRef.current) speakButtonRef.current.setAttribute("disabled", true);
            if (langSelectRef.current) langSelectRef.current.setAttribute("disabled", true);
            if (speechButtonRef.current) speechButtonRef.current.setAttribute("disabled", true);
            setConnectionState("");
          }
        },
        
        onVideoStateChange(state) {
          if (state === "STOP" && videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.srcObject = undefined;
            if (agentManager) {
              videoRef.current.src = agentManager.agent.presenter.idle_video;
            }
          }
          else if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.src = "";
            videoRef.current.srcObject = srcObject;
            setConnectionState("Online");
          }
        },
        
        onNewMessage(messages, type) {
          // We want to show only the last message from the entire 'messages' array
          let lastIndex = messages.length - 1;
          let msg = messages[lastIndex];
          
          setAnswerMessages(prev => [...prev, {
            time: timeDisplay(),
            role: msg.role,
            content: msg.content,
            id: msg.id,
            showRating: msg.role === "assistant" && messages.length !== 1 && type === "answer"
          }]);
          
          // Auto-scroll to the last message 
          if (answersRef.current) {
            answersRef.current.scrollTop = answersRef.current.scrollHeight;
          }
        },
        
        onError(error, errorData) {
          setConnectionState(`<span style="color:red">Something went wrong :(</span>`);
          console.log("Error:", error, "Error Data", errorData);
        }
      };
      
      // Stream options
      let streamOptions = { compatibilityMode: "auto", streamWarmup: true };
      
      // Create agent manager
      const manager = await sdk.createAgentManager(agentId, { auth, callbacks, streamOptions });
      setAgentManager(manager);
      
      // Display agent info
      setPreviewName(manager.agent.preview_name);
      
      // Set video background
      if (videoRef.current) {
        videoRef.current.style.backgroundImage = `url(${manager.agent.presenter.source_url})`;
      }
      
      // Connect to agent
      manager.connect();
    }
    
    initAgentManager();
    
    // Initialize speech recognition
    if (langSelectRef.current && textAreaRef.current && speechButtonRef.current && 
        chatButtonRef.current && speakButtonRef.current) {
      speechHandler.current = initSpeechRecognition(
        langSelectRef.current, 
        textAreaRef.current, 
        speechButtonRef.current,
        chatButtonRef.current,
        speakButtonRef.current
      );
    }
    
    // Focus on input when loaded
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
    
    // Disable buttons initially
    if (chatButtonRef.current) chatButtonRef.current.setAttribute("disabled", true);
    if (speakButtonRef.current) speakButtonRef.current.setAttribute("disabled", true);
    if (langSelectRef.current) langSelectRef.current.setAttribute("disabled", true);
    if (speechButtonRef.current) speechButtonRef.current.setAttribute("disabled", true);
    
    // Cleanup on unmount
    return () => {
      if (agentManager) {
        agentManager.disconnect();
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  // Utility functions
  function timeDisplay() {
    const currentTime = new Date();
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Agent interaction functions
  function speak() {
    if (!agentManager || !textAreaRef.current) return;
    
    let val = textAreaRef.current.value;
    // Speak supports a minimum of 3 characters
    if (val !== "" && val.length > 2) {
      agentManager.speak({
        type: "text",
        input: val
      });
      setConnectionState("Streaming..");
    }
  }

  function chat() {
    if (!agentManager || !textAreaRef.current) return;
    
    let val = textAreaRef.current.value;
    if (val !== "") {
      agentManager.chat(val);
      setConnectionState("Thinking..");
      textAreaRef.current.value = "";
    }
  }

  function rate(messageID, score) {
    if (!agentManager) return;
    agentManager.rate(messageID, score);
  }

  function reconnect() {
    if (!agentManager) return;
    agentManager.reconnect();
  }

  function toggleStartStop() {
    if (speechHandler.current) {
      speechHandler.current.toggleStartStop();
    }
  }

  return (
    <>
      {showContainer && (
        <div id="container">
          <div className="header">
            <span id="previewName">{previewName}</span>
            <span id="connectionLabel" dangerouslySetInnerHTML={{ __html: connectionState }}></span>
          </div>

          <div>
            <video id="videoElement" ref={videoRef} autoPlay loop></video>
          </div>

          <div>
            <button id="chatButton" ref={chatButtonRef} onClick={chat} title="agentManager.chat() -> Communicate with your Agent (D-ID LLM)">Chat</button>
            <button id="speakButton" ref={speakButtonRef} onClick={speak} title="agentManager.speak() -> Streaming API (Bring your own LLM)">Speak</button>
          </div>

          <div className="inputsDiv">
            <textarea id="textArea" ref={textAreaRef} placeholder="Type a message" autoFocus></textarea>
          </div>
          
          <div style={{ display: "flex" }}>
            <select id="langSelect" ref={langSelectRef} title="Speech to Text - Language Selection">
              <option value="en_US" disabled selected>TTS Language</option>
              <option value="en_US" default>English</option>
              <option value="es_ES">Spanish</option>
              <option value="fr_FR">French</option>
              <option value="it_IT">Italian</option>
              <option value="de_DE">German</option>
              <option value="he_IL">Hebrew</option>
              <option value="ru_RU">Russian</option>
            </select>
            <button id="speechButton" ref={speechButtonRef} onClick={toggleStartStop} title="Speech to Text - Web Speech API (MDN)">🎤</button>
          </div>

          <div id="answers" ref={answersRef}>
            {answerMessages.map((msg, index) => (
              <div key={index}>
                {msg.time} - [{msg.role}] : {msg.content}
                {msg.showRating && (
                  <>
                    <button onClick={() => rate(msg.id, 1)} title="Rate this answer (+)">+</button>
                    <button onClick={() => rate(msg.id, -1)} title="Rate this answer (-)">-</button>
                  </>
                )}
                <br />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showHidden && (
        <div id="hidden">
          <h2>{previewName} Disconnected</h2>
          <button id="reconnectButton" onClick={reconnect} title="agentManager.reconnect() -> Reconnects the previous WebRTC session">Reconnect</button>
        </div>
      )}
    </>
  );
}