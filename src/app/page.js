"use client";

import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";

export default function Home() {
  const [myCode, setMyCode] = useState("");
  const [remoteCode, setRemoteCode] = useState("");
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const fileInputRef = useRef(null);
  const codeMapRef = useRef(new Map()); // Map 4-digit codes to peer IDs

  // Generate a random 4-digit code
  const generateCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Initialize peer connection
  useEffect(() => {
    const code = generateCode();
    const customPeerId = `p2p-${code}`;

    const newPeer = new Peer(customPeerId);

    newPeer.on("open", (id) => {
      console.log("My peer ID:", id);
      console.log("My code:", code);
      setMyCode(code);
    });

    // Listen for incoming connections
    newPeer.on("connection", (connection) => {
      console.log("Incoming connection from:", connection.peer);
      setupConnection(connection);
    });

    newPeer.on("error", (err) => {
      console.error("Peer error:", err);
      if (err.type === "unavailable-id") {
        // ID already taken, try again
        window.location.reload();
      } else {
        addSystemMessage(`Error: ${err.type}`);
      }
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  // Setup connection event listeners
  const setupConnection = (connection) => {
    setConn(connection);

    connection.on("open", () => {
      console.log("Connection opened");
      setConnected(true);
      addSystemMessage("Connected! You can now send messages and files.");
    });

    connection.on("data", (data) => {
      console.log("Received data:", data);

      if (data.type === "text") {
        addMessage(data.message, "received");
      } else if (data.type === "file") {
        handleReceivedFile(data);
      }
    });

    connection.on("close", () => {
      console.log("Connection closed");
      setConnected(false);
      setRemoteCode("");
      addSystemMessage("Connection closed");
    });

    connection.on("error", (err) => {
      console.error("Connection error:", err);
      addSystemMessage(`Connection error: ${err}`);
    });
  };

  // Connect to remote peer using 4-digit code
  const connectToPeer = () => {
    if (!remoteCode.trim() || remoteCode.length !== 4) {
      alert("Please enter a valid 4-digit code");
      return;
    }

    if (!peer) {
      alert("Peer not initialized");
      return;
    }

    // Create a custom peer ID from the code
    const remotePeerId = `p2p-${remoteCode}`;

    console.log("Connecting to:", remotePeerId);
    const connection = peer.connect(remotePeerId);
    setupConnection(connection);
  };

  // Send text message
  const sendMessage = () => {
    if (!messageInput.trim()) return;
    if (!connected || !conn) {
      alert("Not connected to a peer");
      return;
    }

    conn.send({
      type: "text",
      message: messageInput,
    });

    addMessage(messageInput, "sent");
    setMessageInput("");
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!connected || !conn) {
      alert("Not connected to a peer");
      return;
    }

    // Send file
    const reader = new FileReader();
    reader.onload = (event) => {
      conn.send({
        type: "file",
        name: file.name,
        size: file.size,
        fileData: event.target.result,
      });

      addSystemMessage(
        `Sent file: ${file.name} (${formatFileSize(file.size)})`
      );
    };
    reader.readAsArrayBuffer(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle received file
  const handleReceivedFile = (data) => {
    const blob = new Blob([data.fileData]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = data.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addSystemMessage(
      `Received file: ${data.name} (${formatFileSize(data.size)})`
    );
  };

  // Helper functions
  const addMessage = (message, type) => {
    setMessages((prev) => [
      ...prev,
      { text: message, type, timestamp: new Date() },
    ]);
  };

  const addSystemMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      { text: message, type: "system", timestamp: new Date() },
    ]);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(myCode);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCodeInput = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setRemoteCode(value);
  };

  return (
    <div className="min-h-[100vh] bg-[#f5f5f5] relative overflow-hidden">
      {/* Decorative shapes - hidden on mobile */}
      <div className="hidden md:block absolute top-[5vh] left-[5vw] w-[80px] h-[80px] opacity-10">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="50" cy="50" r="45" stroke="black" strokeWidth="3" />
          <circle cx="50" cy="50" r="30" stroke="black" strokeWidth="2" />
        </svg>
      </div>

      <div className="hidden md:block absolute bottom-[10vh] right-[8vw] w-[100px] h-[100px] opacity-10">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 50 Q30 10, 50 50 T90 50"
            stroke="black"
            strokeWidth="3"
            fill="none"
          />
          <circle cx="20" cy="70" r="8" fill="black" />
        </svg>
      </div>

      <div className="hidden md:block absolute top-[50vh] left-[2vw] w-[60px] h-[60px] opacity-10">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="20"
            y="20"
            width="60"
            height="60"
            stroke="black"
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      <div className="max-w-[1200px] mx-auto px-[1rem] sm:px-[2rem] py-[2rem] sm:py-[4rem] relative z-10">
        {/* Header */}
        <div className="text-center mb-[2rem] sm:mb-[4rem]">
          <p className="text-[0.75rem] sm:text-[0.9rem] tracking-[0.2em] uppercase text-gray-500 mb-[0.5rem] sm:mb-[1rem]">
            SIMPLE FILE SHARING
          </p>
          <h1 className="text-[2.5rem] sm:text-[4rem] md:text-[5rem] font-bold text-black mb-[1rem] sm:mb-[1.5rem] leading-[1.1] px-[1rem]">
            Yoink
            <br />
            <span className="text-[2rem] sm:text-[3rem] md:text-[4rem] font-normal">
              yoink it over.
            </span>
          </h1>
          <p className="text-[0.95rem] sm:text-[1.1rem] text-gray-600 max-w-[600px] mx-auto px-[1rem]">
            Secure peer-to-peer file sharing. No servers, no tracking, no
            hassle.
          </p>
        </div>

        {/* Main Card */}
        <div className="max-w-[800px] mx-auto bg-white rounded-[1rem] shadow-lg border-[1px] border-gray-200 overflow-hidden">
          {/* Your Code Section */}
          <div className="p-[1.5rem] sm:p-[3rem] border-b-[1px] border-gray-200 bg-gradient-to-br from-[#84abd6]/5 to-[#feffb9]/5">
            <div className="text-center mb-[1.5rem] sm:mb-[2rem]">
              <h2 className="text-[0.85rem] sm:text-[1rem] tracking-[0.15em] uppercase text-gray-500 mb-[0.75rem] sm:mb-[1rem]">
                Your Code
              </h2>
              <div className="inline-block">
                <div className="text-[3.5rem] sm:text-[5rem] font-bold tracking-[0.3em] text-[#84abd6] font-mono">
                  {myCode || "----"}
                </div>
              </div>
              <p className="text-[0.85rem] sm:text-[0.9rem] text-gray-500 mt-[0.75rem] sm:mt-[1rem] px-[1rem]">
                Share this code with others to connect
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={copyToClipboard}
                disabled={!myCode}
                className="px-[2rem] sm:px-[3rem] py-[0.875rem] sm:py-[1rem] bg-black text-white rounded-[0.5rem] font-medium hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[0.95rem] sm:text-[1rem] w-full sm:w-auto max-w-[250px]"
              >
                {copySuccess ? "✓ Copied!" : "Copy Code"}
              </button>
            </div>
          </div>

          {/* Connect Section */}
          <div className="p-[1.5rem] sm:p-[3rem] border-b-[1px] border-gray-200">
            <h2 className="text-[0.85rem] sm:text-[1rem] tracking-[0.15em] uppercase text-gray-500 mb-[1.5rem] sm:mb-[2rem] text-center">
              Connect to a Peer
            </h2>

            <div className="flex flex-col items-center gap-[1.25rem] sm:gap-[1.5rem]">
              <input
                type="text"
                inputMode="numeric"
                value={remoteCode}
                onChange={handleCodeInput}
                placeholder="0000"
                disabled={connected}
                maxLength={4}
                className="w-full max-w-[250px] text-center text-[2.5rem] sm:text-[3rem] font-bold font-mono tracking-[0.4em] sm:tracking-[0.5em] p-[0.875rem] sm:p-[1rem] border-[2px] border-gray-300 rounded-[0.5rem] focus:outline-none focus:border-[#84abd6] disabled:bg-gray-50 disabled:text-gray-400"
              />

              <button
                onClick={connectToPeer}
                disabled={connected || remoteCode.length !== 4}
                className="px-[2rem] sm:px-[3rem] py-[0.875rem] sm:py-[1rem] bg-[#84abd6] text-white rounded-[0.5rem] font-medium hover:bg-[#6a93bd] transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[0.95rem] sm:text-[1rem] w-full sm:w-auto max-w-[250px]"
              >
                {connected ? "Connected" : "Connect"}
              </button>

              {/* Status */}
              <div className="flex items-center gap-[0.5rem]">
                <div
                  className={`w-[0.5rem] h-[0.5rem] rounded-full ${
                    connected ? "bg-green-500" : "bg-gray-300"
                  }`}
                ></div>
                <span className="text-[0.85rem] sm:text-[0.9rem] text-gray-600">
                  {connected ? "Connected" : "Waiting to connect"}
                </span>
              </div>
            </div>
          </div>

          {/* Chat Section */}
          {connected && (
            <div className="p-[1.5rem] sm:p-[3rem]">
              <h2 className="text-[0.85rem] sm:text-[1rem] tracking-[0.15em] uppercase text-gray-500 mb-[1.25rem] sm:mb-[1.5rem]">
                Messages
              </h2>

              <div className="h-[200px] sm:h-[250px] overflow-y-auto mb-[1.25rem] sm:mb-[1.5rem] p-[0.875rem] sm:p-[1rem] bg-gray-50 rounded-[0.5rem]">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-[3rem] sm:mt-[4rem] text-[0.85rem] sm:text-[0.9rem]">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-[0.875rem] sm:mb-[1rem] ${
                        msg.type === "sent"
                          ? "text-right"
                          : msg.type === "received"
                          ? "text-left"
                          : "text-center"
                      }`}
                    >
                      <div
                        className={`inline-block px-[1rem] sm:px-[1.5rem] py-[0.625rem] sm:py-[0.75rem] rounded-[0.5rem] max-w-[85%] sm:max-w-[80%] text-[0.9rem] sm:text-[1rem] ${
                          msg.type === "sent"
                            ? "bg-black text-white"
                            : msg.type === "received"
                            ? "bg-[#84abd6] text-white"
                            : "bg-gray-200 text-gray-600 text-[0.8rem] sm:text-[0.85rem] italic"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-[0.75rem] sm:gap-[1rem] mb-[1.5rem] sm:mb-[2rem]">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-[1rem] sm:px-[1.5rem] py-[0.875rem] sm:py-[1rem] border-[1px] border-gray-300 rounded-[0.5rem] focus:outline-none focus:border-[#84abd6] text-[0.95rem] sm:text-[1rem]"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim()}
                  className="px-[1.5rem] sm:px-[2rem] py-[0.875rem] sm:py-[1rem] bg-black text-white rounded-[0.5rem] font-medium hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[0.95rem] sm:text-[1rem]"
                >
                  Send
                </button>
              </div>

              <div>
                <label className="block text-[0.8rem] sm:text-[0.9rem] tracking-[0.1em] uppercase text-gray-500 mb-[0.75rem] sm:mb-[1rem]">
                  Send File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="block w-full text-[0.85rem] sm:text-[0.9rem] file:mr-[0.75rem] sm:file:mr-[1rem] file:py-[0.625rem] sm:file:py-[0.75rem] file:px-[1rem] sm:file:px-[1.5rem] file:rounded-[0.5rem] file:border-0 file:bg-black file:text-white file:font-medium hover:file:bg-gray-800 file:cursor-pointer border-[1px] border-gray-300 rounded-[0.5rem] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-[2rem] sm:mt-[3rem] text-gray-500 text-[0.8rem] sm:text-[0.85rem] px-[1rem]">
          <p>End-to-end encrypted. No data stored on servers.</p>
        </div>
      </div>
    </div>
  );
}
