# WebSocket Real-Time Audio Streaming Implementation

This document describes the WebSocket implementation for handling Twilio media streams in real-time, enabling live speech-to-text transcription and AI responses.

## Architecture Overview

```
┌──────────────────────────────────┐
│      User Phone Call             │
│      (Voice Audio)               │
└────────────┬─────────────────────┘
             │
             ↓ (HTTPS)
┌──────────────────────────────────┐
│      Twilio Voice Service        │
│      - Call Routing              │
│      - WebSocket Setup           │
└────────────┬─────────────────────┘
             │
             ↓ (WebSocket Connection)
┌──────────────────────────────────┐
│   Backend WebSocket Server       │
│   /ws/media-stream               │
│   - Receives audio chunks        │
│   - Manages connections          │
│   - Routes to services           │
└────────────┬─────────────────────┘
             │
      ┌──────┴──────┬──────────┐
      ↓             ↓          ↓
  ┌─────────┐  ┌────────────┐  ┌──────────┐
  │ Speech- │  │ Database   │  │ AI       │
  │ to-Text │  │ Service    │  │ Response │
  │ (Google)│  │(Supabase)  │  │(OpenAI) │
  └─────────┘  └────────────┘  └──────────┘
```

## Core Components

### 1. MediaStreamManager (`services/mediaStreamManager.js`)

Manages active WebSocket connections for media streaming.

**Responsibilities:**
- Create and track media stream connections
- Buffer audio chunks
- Maintain transcript history
- Track statistics per connection

**Key Methods:**
```javascript
// Create new connection
const connection = mediaStreamManager.createConnection(callSid, userId);

// Get specific connection
const conn = mediaStreamManager.getConnection(callSid);

// Get all user connections
const userConns = mediaStreamManager.getUserConnections(userId);

// Close connection
mediaStreamManager.closeConnection(callSid);

// Get statistics
const stats = mediaStreamManager.getConnectionStats(callSid);
```

**Connection Statistics:**
- `audioChunksReceived` - Count of audio packets
- `bytesReceived` - Total audio data size
- `transcriptLinesReceived` - Count of transcript updates
- `duration` - Connection duration in ms
- `bufferSize` - Current audio buffer size

### 2. Speech-to-Text Service (`services/speechToTextService.js`)

Integrates Google Cloud Speech-to-Text API for real-time transcription.

**Configuration:**
- Encoding: MULAW (Twilio default)
- Sample Rate: 8000 Hz
- Language: English (en-US)
- Features: Auto-punctuation, enhanced model, custom speech context

**Speech Context:**
Boosts recognition accuracy for domain-specific words:
- reminder, note, todo, schedule, call, email
- meeting, project, task, follow up, action item

**Key Methods:**
```javascript
// Create streaming recognizer
const recognizer = await createStreamingRecognizer();

// Process audio chunk
const request = await transcribeAudioChunk(audioPayload);

// Process response from Google Cloud
const result = processTranscriptResponse(googleResponse);
// Returns: { isFinal, text, confidence, alternatives }
```

### 3. Media Stream Handler (`websocket/mediaStreamHandler.js`)

Handles WebSocket connections from Twilio.

**WebSocket Event Flow:**

1. **connected** - Initial connection confirmation
2. **start** - Call begins, media stream initializes
3. **media** (repeated) - Audio chunks arrive
4. **stop** - Call ends, stream closes

**Key Functions:**
```javascript
// Main handler
export const handleMediaStreamWebSocket = (ws, req) => { ... }

// Send audio response (for TTS)
export function sendAudioResponse(ws, streamSid, audioPayload) { ... }

// Send transcript update (for real-time display)
export function sendTranscriptUpdate(ws, streamSid, transcript, isFinal) { ... }
```

## Integration with Twilio

### TwiML Configuration

When Twilio calls the webhook, it receives TwiML with media stream connection:

```xml
<Response>
  <Connect>
    <Stream url="wss://yourdomain.com/ws/media-stream" />
  </Connect>
</Response>
```

The WebSocket URL must be:
- **Publicly accessible** (HTTPS/WSS required)
- **Properly configured** in environment variables
- **Authorized** by Twilio (validates origin headers)

### Twilio Media Stream Format

**Audio Format:**
- Codec: MULAW (μ-law encoding)
- Sample Rate: 8000 Hz
- Bit Depth: 8 bits
- Format: Raw audio bytes base64-encoded

**Message Format:**
```json
{
  "event": "media",
  "streamSid": "MZ123...",
  "sequenceNumber": 0,
  "media": {
    "payload": "base64-encoded-audio",
    "track": "inbound_track"
  }
}
```

## Data Flow: Real-Time Transcription

### Step 1: Connection Established
```
User calls → Twilio → WebSocket handshake → Backend accepts
↓
mediaStreamManager creates MediaStreamConnection
↓
Connection marked as active
```

### Step 2: Audio Arrives
```
Twilio sends media event → Backend receives audio chunk
↓
mediaStreamManager.addAudioChunk(payload)
↓
Audio added to connection's buffer
↓
Event emitted: 'audioChunk' with timestamp
```

### Step 3: Transcription (TODO)
```
Audio buffer → Google Cloud Speech-to-Text API
↓
Interim results returned as transcription progresses
↓
mediaConnection.addTranscriptLine(text, isFinal)
↓
Event emitted: 'transcript' with results
```

### Step 4: Results Sent to Client (TODO)
```
Transcript results → Backend processes
↓
sendTranscriptUpdate(ws, streamSid, transcript, isFinal)
↓
WebSocket message sent back to Twilio
↓
Visible in mobile app's CallScreen in real-time
```

### Step 5: Call Ends
```
User hangs up → Twilio sends 'stop' event
↓
mediaConnection.close() called
↓
mediaStreamManager.closeConnection(callSid)
↓
Final transcript saved to database (TODO)
```

## Environment Variables

```env
# WebSocket Configuration
WEBSOCKET_URL=wss://yourdomain.com/ws/media-stream

# Twilio
WEBHOOK_URL=https://yourdomain.com
TWILIO_PHONE_NUMBER=+1234567890

# Google Cloud Speech-to-Text
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# OpenAI (for response generation - Phase 1+)
OPENAI_API_KEY=sk-...
```

## Performance Considerations

### Audio Buffering
- Each WebSocket connection maintains its own audio buffer
- Buffers cleared after processing to prevent memory leaks
- Multiple concurrent calls handled independently

### Concurrent Connections
- WebSocket server can handle hundreds of simultaneous calls
- Each connection is event-driven (non-blocking)
- Memory per connection: ~100KB base + audio buffer

### Latency
- Audio chunks: 20ms intervals (160 bytes at 8kHz)
- Google Cloud STT latency: 500-2000ms typically
- End-to-end latency: ~1-3 seconds per transcription

## Error Handling

**Connection Errors:**
- Invalid credentials → 401 Unauthorized
- Connection timeout → Auto-cleanup after 5 minutes
- WebSocket disconnect → Graceful close of resources

**Audio Processing Errors:**
- Invalid audio format → Skip chunk, continue
- Buffer overflow → Clear oldest data
- Google Cloud API errors → Retry with exponential backoff

**Database Errors:**
- Connection fails → Log error, continue buffering
- Transaction fails → Retry up to 3 times
- Data loss prevention → Audio always buffered locally first

## Security

### WebSocket Security
- Only accepts connections from authenticated Twilio
- Validates Twilio request signature
- Closes unauthorized connections immediately
- Rate limiting on connections per IP

### Audio Data
- Streamed directly to Google Cloud (encrypted in transit)
- Not stored locally on backend (only in-memory buffer)
- Database stores transcripts encrypted at rest
- User isolation via JWT authentication

### Rate Limiting
- Max 100 audio chunks per second per connection
- Max 1000 concurrent connections per server
- Max 24-hour call duration per session
- Overflow rejected with 429 Too Many Requests

## Troubleshooting

### WebSocket Not Connecting
1. Verify `WEBSOCKET_URL` is publicly accessible
2. Check that WSS (secure) is required by Twilio
3. Verify firewall allows WebSocket connections (port 443)
4. Check Twilio console for webhook delivery logs

### No Transcriptions Appearing
1. Verify Google Cloud credentials are configured
2. Check that audio chunks are arriving (log to see stats)
3. Verify speech-to-text API is enabled in Google Cloud
4. Check for rate limiting issues

### Latency Issues
1. Reduce buffering before sending to Google Cloud (smaller chunks)
2. Consider running backend closer to users (CDN/edge)
3. Verify network bandwidth between backend and Google Cloud
4. Profile database queries that save transcripts

### Memory Usage Growing
1. Check for connection leaks (connections not closing)
2. Verify audio buffers are being cleared after processing
3. Monitor number of active connections over time
4. Implement periodic cleanup of dead connections

## Testing

### Local Development
```bash
# Start backend with WebSocket support
cd backend
npm run dev

# Server should log:
# 📡 WebSocket server listening at wss://localhost:3000/ws/media-stream
```

### Testing with Ngrok (expose local server)
```bash
# Terminal 1: Run backend
npm run dev

# Terminal 2: Expose to internet
ngrok http 3000

# Use ngrok URL in:
# - WEBSOCKET_URL=wss://abc123.ngrok.io/ws/media-stream
# - WEBHOOK_URL=https://abc123.ngrok.io
```

### Testing WebSocket Connection
```bash
# Using wscat
npm install -g wscat
wscat -c wss://localhost:3000/ws/media-stream

# Send test message
{"event": "start", "start": {"callSid": "CA123", "customParameters": {"userId": "user1"}}}
```

## Next Steps

### Implement in Order:

1. **Google Cloud Speech-to-Text Integration**
   - Connect audio stream to Google Cloud API
   - Handle streaming responses
   - Parse interim and final transcripts

2. **Transcript Storage**
   - Save each transcript line to database
   - Track speaker (user/AI)
   - Store confidence scores

3. **Real-Time Display**
   - Send transcript updates via WebSocket
   - Update CallScreen with live text
   - Show speaker labels

4. **AI Response Generation**
   - Send transcript to OpenAI
   - Generate response based on context
   - Send response back in real-time

5. **Text-to-Speech**
   - Convert AI response to audio
   - Send audio back through Twilio
   - Maintain conversation flow

6. **Call Summarization**
   - After call ends, generate summary
   - Extract key points and action items
   - Store in database for notes

## References

- [Twilio Media Streams Documentation](https://www.twilio.com/docs/voice/media-streams)
- [Google Cloud Speech-to-Text API](https://cloud.google.com/speech-to-text/docs)
- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Node.js ws Library](https://github.com/websockets/ws)
