import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { useOnScreenKeyboard } from "./KeyboardContext";
import { usePreferencesStore } from "../preferencesStore";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
};

export function TouchTextInput({ value, onChange, onFocus, onBlur, ...rest }: Props) {
  const touchMode = usePreferencesStore((s) => s.touchMode);
  const onScreenKeyboard = usePreferencesStore((s) => s.onScreenKeyboard);
  const { register, unregister } = useOnScreenKeyboard();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    return () => {
      if (input) unregister(input);
    };
  }, [unregister]);

  return (
    <input
      {...rest}
      ref={inputRef}
      value={value}
      readOnly={touchMode && onScreenKeyboard ? true : rest.readOnly}
      inputMode={touchMode && onScreenKeyboard ? "none" : rest.inputMode}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        onFocus?.(e);
        if (touchMode && onScreenKeyboard) {
          register({
            value,
            setValue: onChange,
            input: e.currentTarget,
          });
        }
      }}
      onBlur={(e) => {
        onBlur?.(e);
        if (touchMode && onScreenKeyboard) {
          unregister(e.currentTarget);
        }
      }}
    />
  );
}
