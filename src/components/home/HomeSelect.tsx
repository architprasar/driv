"use client";

import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./HomePrimitives";

type Props = {
  children: ReactNode;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  hint?: string;
  heading?: string;
  fitContent?: boolean;
  "aria-label"?: string;
  onValueChange?: (value: string) => void;
};

export default function HomeSelect({ children, name, value, defaultValue, hint, heading, fitContent = false, "aria-label": label, onValueChange }: Props) {
  const options = Children.toArray(children).filter(isValidElement).map(child => {
    const props = child.props as { value?: string | number; children: ReactNode };
    const text = Children.toArray(props.children).join("");
    return { value: String(props.value ?? text), label: text };
  });
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const selectedValue = String(value ?? internalValue);
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === selectedValue));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [position, setPosition] = useState<CSSProperties>({});
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ text: "", time: 0 });
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    function placeMenu() {
      // Search fields include an icon and padding outside the trigger button.
      // Anchor to their full outlined box; compact selects use their own button.
      const anchor = trigger.current?.closest(".home-search-panel label") || trigger.current;
      const rect = anchor?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const flip = below < 240 && above > below;
      // Reserve space for option padding, scrollbar, gap and selection checkmark.
      // Measure the actual rendered font instead of estimating by character count.
      const optionWidths = fitContent
        ? Array.from(menu.current?.querySelectorAll<HTMLElement>(".drivio-dropdown-option > span:first-child") || [])
          .map(option => Math.ceil(option.scrollWidth * 1.08) + 76)
        : [];
      const width = Math.min(
        Math.max(rect.width, ...(fitContent ? [240, ...optionWidths] : [])),
        window.innerWidth - 24,
      );
      setPosition({
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
        maxHeight: Math.min(320, Math.max(100, flip ? above : below)),
        ...(flip ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
      });
    }
    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open, fitContent]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !menu.current?.contains(target)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  useEffect(() => {
    if (open) menu.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    setInternalValue(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    trigger.current?.focus();
  }

  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    setPortalContainer(event.currentTarget.closest("dialog") || document.body);
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) {
      event.preventDefault();
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key === "Enter" || event.key === " ") {
        if (open) choose(activeIndex);
        else { setActiveIndex(selectedIndex); setOpen(true); }
        return;
      }
      setOpen(true);
      if (event.key === "Home") setActiveIndex(0);
      else if (event.key === "End") setActiveIndex(options.length - 1);
      else setActiveIndex(index => !open ? selectedIndex : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
    } else if (event.key === "Tab") setOpen(false);
    else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = (now - typeahead.current.time < 700 ? typeahead.current.text : "") + event.key.toLowerCase();
      typeahead.current = { text, time: now };
      const match = options.findIndex(option => option.label.toLowerCase().startsWith(text));
      if (match >= 0) { setActiveIndex(match); setOpen(true); }
    }
  }

  return <span className="home-select">
    {name && <input type="hidden" name={name} value={selectedValue} />}
    <button ref={trigger} type="button" className="home-select-trigger" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} aria-activedescendant={open ? `${id}-${activeIndex}` : undefined} onKeyDown={keyDown} onBlur={() => setOpen(false)} onClick={event => { setPortalContainer(event.currentTarget.closest("dialog") || document.body); setActiveIndex(selectedIndex); setOpen(previous => !previous); }}>
      <span>{heading || options[selectedIndex]?.label}{(heading || hint) && <small className="home-select-hint">{heading ? options[selectedIndex]?.label : hint}</small>}</span><Icon name="expand_more" />
    </button>
    {open && createPortal(<div ref={menu} id={id} role="listbox" aria-label={label || name || "Options"} className="drivio-dropdown-menu" style={{ ...position, whiteSpace: fitContent ? "nowrap" : undefined }} onMouseDown={event => event.preventDefault()}>
      {options.map((option, index) => <div id={`${id}-${index}`} key={option.value} role="option" aria-selected={option.value === selectedValue} data-index={index} data-active={index === activeIndex} className="drivio-dropdown-option" onPointerMove={() => setActiveIndex(index)} onClick={() => choose(index)}><span>{option.label}</span>{option.value === selectedValue && <Icon name="check" />}</div>)}
    </div>, portalContainer || document.body)}
  </span>;
}
