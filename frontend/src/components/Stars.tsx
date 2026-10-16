export default function Stars({
  value,
  onChange,
}: {
  value: number | null;
  onChange?: (v: number | null) => void;
}) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          className={n <= (value ?? 0) ? 'star on' : 'star'}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange?.(value === n ? null : n)}
        >
          ★
        </button>
      ))}
    </span>
  );
}