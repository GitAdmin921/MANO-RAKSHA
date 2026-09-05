# MANORAKSHA AI — V13 foundation

## What changed
- Removed Gemini from the active backend AI path.
- Added a dedicated MANORAKSHA AI agent instruction layer.
- Added text + browser speech input.
- Added optional front-camera context. The page requests camera permission when the AI screen opens.
- A still frame is captured only when the user sends a message and is sent as transient request context.
- Backend does not save the frame.
- Responses are intentionally constrained to short, relevant, supportive replies.

## Security
- `OPENAI_API_KEY` remains server-side.
- Frontend never receives the API key.
- Camera permission is controlled by the browser and can be turned off in the UI.
- Visual context is explicitly non-diagnostic.

## Next planned layers
1. MANORAKSHA knowledge/RAG storage
2. User-context and conversation memory with strict data minimization
3. Telegram bot using the same agent service
4. Voice output / realtime voice
5. Evaluation set for relevance, brevity, safety, and escalation behavior
