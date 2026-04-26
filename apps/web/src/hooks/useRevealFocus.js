import { useEffect, useRef, useState } from "react";

const interactiveSelector = [
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

export function useRevealFocus(isActive, dependencyKey, options = {}) {
  const { block = "start", delay = 80, highlightMs = 1800 } = options;
  const targetRef = useRef(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsHighlighted(false);
      return undefined;
    }

    const timers = [];
    let attempts = 0;

    const reveal = () => {
      const target = targetRef.current;
      if (!target && attempts < 12) {
        attempts += 1;
        timers.push(setTimeout(reveal, 50));
        return;
      }
      if (!target) return;

      setIsHighlighted(true);
      target.scrollIntoView({ behavior: "smooth", block });

      timers.push(setTimeout(() => {
        const focusTarget = target.querySelector(interactiveSelector) || target;
        focusTarget.focus({ preventScroll: true });
      }, 260));

      timers.push(setTimeout(() => setIsHighlighted(false), highlightMs));
    };

    timers.push(setTimeout(reveal, delay));

    return () => timers.forEach(clearTimeout);
  }, [isActive, dependencyKey, block, delay, highlightMs]);

  return { targetRef, isHighlighted };
}
