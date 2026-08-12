import { useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import { TouchTextInput } from "./TouchTextInput";

export function GroupPanel() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const [groupName, setGroupName] = useState("Group");

  if (!state) return null;

  return (
    <section className="panel">
      <h2>Groups</h2>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <div className="row">
          <TouchTextInput
            aria-label="Group name"
            value={groupName}
            onChange={setGroupName}
            style={{ flex: 1 }}
          />
          <button type="button" onClick={() => run(() => api.storeGroup(groupName))}>
            Store
          </button>
        </div>
        {state.groups.map((g) => (
          <div
            key={g.id}
            className="row"
            style={{ justifyContent: "space-between", marginTop: "0.15rem" }}
          >
            <button
              type="button"
              onClick={(e) => run(() => api.selectGroup(g.id, e.shiftKey || e.metaKey))}
            >
              {g.name} ({g.fixtureIds.length})
            </button>
            <button type="button" className="danger" onClick={() => run(() => api.deleteGroup(g.id))}>
              Del
            </button>
          </div>
        ))}
        {!state.groups.length ? <div className="muted">No groups stored yet.</div> : null}
      </div>
    </section>
  );
}
