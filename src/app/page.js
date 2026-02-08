'use client';

import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';

export default function Home() {
  const [myId, setMyId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [peer, setPeer] = useState(null);
  const [conn, setConn] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  
  const fileInputRef = useRef(null);

  // Initialize peer connection
  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      console.log('My peer ID:', id);
      setMyId(id);
    });

    // Listen for incoming connections
    newPeer.on('connection', (connection) => {
      console.log('Incoming connection from:', connection.peer);
      setupConnection(connection);
    });

    newPeer.on('error', (err) => {
      console.error('Peer error:', err);
      addSystemMessage(`Error: ${err.type}`);
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  // Setup connection event listeners
  const setupConnection = (connection) => {
    setConn(connection);

    connection.on('open', () => {
      console.log('Connection opened');
      setConnected(true);
      addSystemMessage('Connected! You can now send messages and files.');
    });

    connection.on('data', (data) => {
      console.log('Received data:', data);
      
      if (data.type === 'text') {
        addMessage(data.message, 'received');
      } else if (data.type === 'file') {
        handleReceivedFile(data);
      }
    });

    connection.on('close', () => {
      console.log('Connection closed');
      setConnected(false);
      addSystemMessage('Connection closed');
    });

    connection.on('error', (err) => {
      console.error('Connection error:', err);
      addSystemMessage(`Connection error: ${err}`);
    });
  };

  // Connect to remote peer
  const connectToPeer = () => {
    if (!remotePeerId.trim()) {
      alert('Please enter a peer ID');
      return;
    }

    if (!peer) {
      alert('Peer not initialized');
      return;
    }

    const connection = peer.connect(remotePeerId.trim());
    setupConnection(connection);
  };

  // Send text message
  const sendMessage = () => {
    if (!messageInput.trim()) return;
    if (!connected || !conn) {
      alert('Not connected to a peer');
      return;
    }

    conn.send({
      type: 'text',
      message: messageInput
    });

    addMessage(messageInput, 'sent');
    setMessageInput('');
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!connected || !conn) {
      alert('Not connected to a peer');
      return;
    }

    // Send file
    const reader = new FileReader();
    reader.onload = (event) => {
      conn.send({
        type: 'file',
        name: file.name,
        size: file.size,
        fileData: event.target.result
      });
      
      addSystemMessage(`Sent file: ${file.name} (${formatFileSize(file.size)})`);
    };
    reader.readAsArrayBuffer(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle received file
  const handleReceivedFile = (data) => {
    const blob = new Blob([data.fileData]);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = data.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addSystemMessage(`Received file: ${data.name} (${formatFileSize(data.size)})`);
  };

  // Helper functions
  const addMessage = (message, type) => {
    setMessages(prev => [...prev, { text: message, type, timestamp: new Date() }]);
  };

  const addSystemMessage = (message) => {
    setMessages(prev => [...prev, { text: message, type: 'system', timestamp: new Date() }]);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(myId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-[100vh] bg-gradient-to-br from-[#84abd6] to-[#feffb9] p-[2rem]">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="text-center mb-[3rem]">
          <h1 className="text-[3rem] font-bold text-white mb-[1rem] drop-shadow-lg">
            P2P Share
          </h1>
          <p className="text-[1.2rem] text-white/90">
            Secure peer-to-peer file sharing, no server needed
          </p>
        </div>

        {/* Main Container */}
        <div className="bg-white rounded-[1.5rem] shadow-2xl p-[2rem] mb-[2rem]">
          {/* Your ID Section */}
          <div className="mb-[2rem]">
            <label className="block text-[1.1rem] font-semibold text-[#84abd6] mb-[0.5rem]">
              Your ID (Share this with others)
            </label>
            <div className="flex gap-[1rem]">
              <input
                type="text"
                value={myId || 'Generating...'}
                readOnly
                className="flex-1 p-[1rem] border-[2px] border-[#84abd6] rounded-[0.75rem] text-[1rem] font-mono bg-gray-50"
              />
              <button
                onClick={copyToClipboard}
                disabled={!myId}
                className="px-[2rem] py-[1rem] bg-[#84abd6] text-white rounded-[0.75rem] font-semibold hover:bg-[#6a93bd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copySuccess ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Connect Section */}
          <div className="mb-[2rem]">
            <label className="block text-[1.1rem] font-semibold text-[#84abd6] mb-[0.5rem]">
              Connect to Peer
            </label>
            <div className="flex gap-[1rem]">
              <input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Enter peer ID..."
                disabled={connected}
                className="flex-1 p-[1rem] border-[2px] border-[#84abd6] rounded-[0.75rem] text-[1rem] font-mono disabled:bg-gray-100"
              />
              <button
                onClick={connectToPeer}
                disabled={connected || !remotePeerId.trim()}
                className="px-[2rem] py-[1rem] bg-[#feffb9] text-[#84abd6] rounded-[0.75rem] font-semibold hover:bg-[#f5f5a0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-[2px] border-[#84abd6]"
              >
                {connected ? 'Connected' : 'Connect'}
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mb-[2rem] flex items-center gap-[1rem]">
            <div className={`w-[1rem] h-[1rem] rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-[1rem] font-medium">
              {connected ? 'Connected to peer' : 'Not connected'}
            </span>
          </div>

          {/* Messages Area */}
          <div className="mb-[2rem]">
            <label className="block text-[1.1rem] font-semibold text-[#84abd6] mb-[0.5rem]">
              Messages
            </label>
            <div className="h-[300px] overflow-y-auto border-[2px] border-[#84abd6] rounded-[0.75rem] p-[1rem] bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-[6rem]">
                  No messages yet. Connect to a peer to start chatting!
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`mb-[1rem] p-[1rem] rounded-[0.75rem] ${
                      msg.type === 'sent'
                        ? 'bg-[#84abd6] text-white ml-[3rem]'
                        : msg.type === 'received'
                        ? 'bg-[#feffb9] text-[#84abd6] mr-[3rem]'
                        : 'bg-gray-200 text-gray-600 text-center text-[0.9rem] italic'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="mb-[2rem]">
            <div className="flex gap-[1rem]">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!connected}
                className="flex-1 p-[1rem] border-[2px] border-[#84abd6] rounded-[0.75rem] text-[1rem] disabled:bg-gray-100"
              />
              <button
                onClick={sendMessage}
                disabled={!connected || !messageInput.trim()}
                className="px-[2rem] py-[1rem] bg-[#84abd6] text-white rounded-[0.75rem] font-semibold hover:bg-[#6a93bd] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-[1.1rem] font-semibold text-[#84abd6] mb-[0.5rem]">
              Send File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={!connected}
              className="block w-full p-[1rem] border-[2px] border-[#84abd6] rounded-[0.75rem] text-[1rem] bg-white file:mr-[1rem] file:py-[0.5rem] file:px-[1rem] file:rounded-[0.5rem] file:border-0 file:bg-[#feffb9] file:text-[#84abd6] file:font-semibold hover:file:bg-[#f5f5a0] file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white/80 text-[0.9rem]">
          <p>All data is transferred directly between devices. Nothing is stored on any server.</p>
        </div>
      </div>
    </div>
  );
}