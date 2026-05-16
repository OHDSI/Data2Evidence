import { BaseMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";

export interface Session {
  sessionId: string;
  datasetId: string;
  initialContext?: string;
  history: BaseMessage[];
  createdAt: number;
  lastActiveAt: number;
}

export class SessionService {
  private sessions = new Map<string, Session>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Basic cleanup interval
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
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
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
    }
    return session;
  }

  updateActivity(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) session.lastActiveAt = Date.now();
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActiveAt > this.TTL) {
        this.sessions.delete(id);
      }
    }
  }
}
