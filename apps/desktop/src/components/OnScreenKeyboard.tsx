import { useEffect, useState } from "react";
import styles from "./OnScreenKeyboard.module.css";

interface KeyboardTarget {
  value: string;
  setValue: (next: string) => void;
  input: HTMLInputElement | HTMLTextAreaElement;
}

interface Props {
  target: KeyboardTarget;
  onDismiss: () => void;
}

const ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m", "-", "_"],
];

function insertAtCursor(input: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  return input.value.slice(0, start) + text + input.value.slice(end);
}

function deleteAtCursor(input: HTMLInputElement | HTMLTextAreaElement) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  if (start !== end) {
    return input.value.slice(0, start) + input.value.slice(end);
  }
  if (start === 0) return input.value;
  return input.value.slice(0, start - 1) + input.value.slice(start);
}

export function OnScreenKeyboard({ target, onDismiss }: Props) {
  const [shift, setShift] = useState(false);
  const [draft, setDraft] = useState(target.value);

  useEffect(() => {
    setDraft(target.value);
  }, [target.value, target.input]);

  const apply = (next: string) => {
    setDraft(next);
    target.setValue(next);
    target.input.value = next;
  };

  const pressKey = (key: string) => {
    const char = shift ? key.toUpperCase() : key;
    const next = insertAtCursor(target.input, char);
    apply(next);
    const pos = (target.input.selectionStart ?? next.length) + char.length;
    target.input.setSelectionRange(pos, pos);
  };

  const pressSpace = () => {
    const next = insertAtCursor(target.input, " ");
    apply(next);
  };

  const pressBackspace = () => {
    const next = deleteAtCursor(target.input);
    apply(next);
  };

  return (
    <div className={styles.overlay} onMouseDown={(e) => e.preventDefault()}>
      <div className={styles.panel}>
        <div className={styles.preview}>{draft || " "}</div>
        {ROWS.map((row) => (
          <div key={row.join("-")} className={styles.row}>
            {row.map((key) => (
              <button key={key} type="button" className={styles.key} onClick={() => pressKey(key)}>
                {shift ? key.toUpperCase() : key}
              </button>
            ))}
          </div>
        ))}
        <div className={styles.row}>
          <button type="button" className={styles.wide} onClick={() => setShift((s) => !s)}>
            {shift ? "SHIFT" : "shift"}
          </button>
          <button type="button" className={styles.space} onClick={pressSpace}>
            Space
          </button>
          <button type="button" className={styles.wide} onClick={pressBackspace}>
            ⌫
          </button>
          <button type="button" className={styles.done} onClick={onDismiss}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
