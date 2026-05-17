import {
  BaseMessage,
  StoredMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

// The trex runtime boots a fresh Deno worker per request, so an in-memory Map
// cannot persist sessions between calls. Sessions are written as JSON files
// under SESSIONS_DIR so every worker boot sees the same state.
const SESSIONS_DIR = "/tmp/ai-sessions";
const TTL_MS = 60 * 60 * 1000; // 1 hour

export interface Session {
  sessionId: string;
  datasetId: string;
  initialContext?: string;
  history: BaseMessage[];
  createdAt: number;
  lastActiveAt: number;
}

interface StoredSession {
  sessionId: string;
  datasetId: string;
  initialContext?: string;
  history: StoredMessage[];
  createdAt: number;
  lastActiveAt: number;
}

export class SessionService {
  constructor() {
    try {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    } catch (err) {
      console.error(`Failed to create sessions dir ${SESSIONS_DIR}:`, err);
    }
  }

  createSession(datasetId: string, context?: string): Session {
    const sessionId = uuidv4();
    const session: Session = {
      sessionId,
      datasetId,
      initialContext: context,
      history: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    this.write(session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.read(sessionId);
    if (!session) return undefined;
    // Lazy TTL eviction — there is no long-lived worker to run a setInterval
    if (Date.now() - session.lastActiveAt > TTL_MS) {
      this.deleteFile(sessionId);
      return undefined;
    }
    session.lastActiveAt = Date.now();
    this.write(session);
    return session;
  }

  updateActivity(sessionId: string) {
    const session = this.read(sessionId);
    if (!session) return;
    session.lastActiveAt = Date.now();
    this.write(session);
  }

  private filePath(sessionId: string): string {
    // sessionId comes from uuidv4 but be defensive against path traversal
    if (!/^[a-zA-Z0-9-]+$/.test(sessionId)) {
      throw new Error(`Invalid sessionId: ${sessionId}`);
    }
    return path.join(SESSIONS_DIR, `${sessionId}.json`);
  }

  private read(sessionId: string): Session | undefined {
    let raw: string;
    try {
      raw = fs.readFileSync(this.filePath(sessionId), "utf8");
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error(`Failed to read session ${sessionId}:`, err);
      }
      return undefined;
    }
    try {
      const stored = JSON.parse(raw) as StoredSession;
      return {
        sessionId: stored.sessionId,
        datasetId: stored.datasetId,
        initialContext: stored.initialContext,
        history: mapStoredMessagesToChatMessages(stored.history ?? []),
        createdAt: stored.createdAt,
        lastActiveAt: stored.lastActiveAt,
      };
    } catch (err) {
      console.error(`Corrupt session file for ${sessionId}:`, err);
      return undefined;
    }
  }

  private write(session: Session) {
    const stored: StoredSession = {
      sessionId: session.sessionId,
      datasetId: session.datasetId,
      initialContext: session.initialContext,
      history: mapChatMessagesToStoredMessages(session.history),
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
    };
    // Direct write: the trex sandbox blocklists Deno.renameSync, so the
    // temp-file + rename atomicity pattern is not available. The reader
    // catches JSON.parse errors and treats them as a missing session, so a
    // concurrent partial read just behaves like a cache miss.
    fs.writeFileSync(
      this.filePath(session.sessionId),
      JSON.stringify(stored),
      "utf8",
    );
  }

  private deleteFile(sessionId: string) {
    try {
      fs.unlinkSync(this.filePath(sessionId));
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        console.error(`Failed to delete session ${sessionId}:`, err);
      }
    }
  }
}
