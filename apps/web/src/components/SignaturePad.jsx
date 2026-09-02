import { useEffect, useRef } from 'react';

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = 160;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#050A18';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function pos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
    canvasRef.current.toBlob((blob) => onChange?.(blob), 'image/png');
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ratio = window.devicePixelRatio || 1;
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = '#050A18';
    ctx.lineWidth = 2;
    onChange?.(null);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="w-full h-40 rounded-xl bg-white touch-none"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <button type="button" onClick={clear} className="text-xs text-gold mt-2">Clear signature</button>
    </div>
  );
}
