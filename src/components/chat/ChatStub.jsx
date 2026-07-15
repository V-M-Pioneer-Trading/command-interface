import { useRef, useState } from "react";
import { Panel } from "../common/Panel";
import { PillButton } from "../common/PillButton";
import "./ChatStub.css";

const CANNED_REPLY =
  "Command execution is not yet online. Natural-language ship control is coming in a future update.";

let nextId = 1;

export function ChatStub() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const logRef = useRef(null);

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    const userMessage = { id: nextId++, author: "user", text };
    setMessages((prev) => [...prev, userMessage]);
    setDraft("");

    setTimeout(() => {
      setMessages((prev) => [...prev, { id: nextId++, author: "ai", text: CANNED_REPLY }]);
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
    }, 500);
  };

  return (
    <Panel title="Command Console (stub)" accent="violet" className="lcars-chat-stub">
      <div className="lcars-chat-stub__body">
        <div className="lcars-chat-stub__log" ref={logRef}>
          {messages.length === 0 && (
            <div className="lcars-chat-stub__placeholder">
              Type a command below — this is a design stub, no commands execute yet.
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`lcars-chat-stub__message lcars-chat-stub__message--${m.author}`}>
              <span className="lcars-chat-stub__author">{m.author === "user" ? "YOU" : "AI"}</span>
              <span>{m.text}</span>
            </div>
          ))}
        </div>
        <form className="lcars-chat-stub__input-row" onSubmit={send}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Enter command..."
          />
          <PillButton type="submit" accent="violet" disabled={!draft.trim()}>
            Send
          </PillButton>
        </form>
      </div>
    </Panel>
  );
}
