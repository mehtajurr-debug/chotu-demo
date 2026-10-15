// Simple line icons, same paths as the prototype.
const PATHS = {
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  home: 'M4 11l8-7 8 7v9H4v-9z',
  bell: 'M6 17V11a6 6 0 0112 0v6l2 2H4l2-2zM10 21h4',
  doc: 'M7 3h8l4 4v14H7V3zM15 3v4h4M10 12h6M10 16h6',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  speaker: 'M4 10v4h4l5 4V6L8 10H4zM16 9a4 4 0 010 6',
};

export default function Icon({ name, size = 22, color = 'currentColor', width = 2.4 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d={PATHS[name]} />
    </svg>
  );
}
