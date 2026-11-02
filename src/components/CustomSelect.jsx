import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import './CustomSelect.css';

export default function CustomSelect({
  value,
  options = [],
  onChange,
  ariaLabel,
  className = '',
  disabled = false,
  placeholder = 'Select an option'
}) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const listboxId = useId();
  const selectedIndex = Math.max(
    options.findIndex(option => String(option.value) === String(value)),
    0
  );
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(selectedIndex);
  const selectedOption = options.find(option => String(option.value) === String(value));

  useEffect(() => {
    if (open) setHighlightedIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = event => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    const handleKeyDown = event => {
      if (!rootRef.current?.contains(document.activeElement)) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setHighlightedIndex(current => (
          (current + direction + options.length) % options.length
        ));
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        setHighlightedIndex(event.key === 'Home' ? 0 : Math.max(options.length - 1, 0));
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const option = options[highlightedIndex];
        if (option) selectOption(option);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [highlightedIndex, open, options, selectedIndex]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-option-index="${highlightedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, open]);

  const selectOption = option => {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = event => {
    if (disabled || open) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div ref={rootRef} className={`custom-select ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        ref={buttonRef}
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setOpen(current => !current)}
        onKeyDown={handleButtonKeyDown}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span className="custom-select-value">
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="custom-select-chevron" size={16} aria-hidden="true" />
      </button>

      {open && (
        <div ref={listRef} id={listboxId} className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => {
            const isSelected = String(option.value) === String(value);
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                key={String(option.value)}
                id={`${listboxId}-${index}`}
                className={`custom-select-option ${isSelected ? 'is-selected' : ''} ${isHighlighted ? 'is-highlighted' : ''}`.trim()}
                data-option-index={index}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={event => event.preventDefault()}
                onClick={event => {
                  event.preventDefault();
                  event.stopPropagation();
                  selectOption(option);
                }}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
