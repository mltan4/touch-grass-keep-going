import { useEffect, useRef } from "react";
import grassTexture from "@/assets/grass.jpg";

interface Blade {
  x: number;
  baseY: number;
  height: number;
  width: number;
  hue: number;
  sat: number;
  light: number;
  phase: number;
  bend: number;
  targetBend: number;
}

interface Quote {
  text: string;
  author: string;
  x: number;
  y: number;
  maxWidth: number;
  rotation: number;
}

const QUOTES: { text: string; author: string }[] = [
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "Through perseverance many people win success out of what seemed destined to be certain failure.", author: "Benjamin Disraeli" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "You may encounter many defeats, but you must not be defeated.", author: "Maya Angelou" },
  { text: "Rock bottom became the solid foundation on which I rebuilt my life.", author: "J.K. Rowling" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },
  { text: "I can accept failure, everyone fails at something. But I can't accept not trying.", author: "Michael Jordan" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Success is not final, failure is not fatal, it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "The difference between the impossible and the possible lies in a person's determination.", author: "Tommy Lasorda" },
];

const Index = () => {
  const quotesCanvasRef = useRef<HTMLCanvasElement>(null);
  const grassCanvasRef = useRef<HTMLCanvasElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const grassCanvas = grassCanvasRef.current!;
    const quotesCanvas = quotesCanvasRef.current!;
    const ctx = grassCanvas.getContext("2d")!;
    const qctx = quotesCanvas.getContext("2d")!;
    let blades: Blade[] = [];
    let quotes: Quote[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;
    let bgPattern: CanvasPattern | null = null;

    const bgImage = new Image();
    bgImage.src = grassTexture;
    bgImage.onload = () => {
      bgPattern = ctx.createPattern(bgImage, "repeat");
    };

    const wrapLines = (text: string, maxWidth: number, fontPx: number): string[] => {
      qctx.font = `italic ${fontPx}px 'Georgia', serif`;
      const words = text.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const word of words) {
        const test = current ? current + " " + word : word;
        if (qctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    const drawQuotes = () => {
      qctx.clearRect(0, 0, width, height);
      // soft background gradient (what the spotlight reveals beneath the grass)
      const bg = qctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.2);
      bg.addColorStop(0, "hsl(45, 30%, 12%)");
      bg.addColorStop(1, "hsl(35, 25%, 6%)");
      qctx.fillStyle = bg;
      qctx.fillRect(0, 0, width, height);

      for (const q of quotes) {
        qctx.save();
        qctx.translate(q.x, q.y);
        qctx.rotate(q.rotation);

        const fontPx = Math.max(16, Math.min(22, width / 50));
        const lines = wrapLines(q.text, q.maxWidth, fontPx);
        const lineHeight = fontPx * 1.4;
        const totalH = lines.length * lineHeight;

        qctx.font = `italic ${fontPx}px 'Georgia', serif`;
        qctx.fillStyle = "hsl(45, 60%, 88%)";
        qctx.textAlign = "center";
        qctx.textBaseline = "middle";
        qctx.shadowColor = "hsl(45, 80%, 60%)";
        qctx.shadowBlur = 12;

        lines.forEach((line, i) => {
          qctx.fillText(line, 0, -totalH / 2 + i * lineHeight + lineHeight / 2);
        });

        // author
        qctx.font = `${fontPx * 0.75}px 'Georgia', serif`;
        qctx.fillStyle = "hsl(45, 50%, 70%)";
        qctx.fillText(`— ${q.author}`, 0, totalH / 2 + lineHeight * 0.6);

        qctx.restore();
      }
    };

    const generate = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      for (const c of [grassCanvas, quotesCanvas]) {
        c.width = width * dpr;
        c.height = height * dpr;
        c.style.width = width + "px";
        c.style.height = height + "px";
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      qctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // grass blades
      const density = Math.floor((width * height) / 900);
      blades = [];
      for (let i = 0; i < density; i++) {
        blades.push({
          x: Math.random() * width,
          baseY: Math.random() * height,
          height: 18 + Math.random() * 38,
          width: 1.5 + Math.random() * 2.5,
          hue: 95 + Math.random() * 35,
          sat: 45 + Math.random() * 30,
          light: 22 + Math.random() * 28,
          phase: Math.random() * Math.PI * 2,
          bend: 0,
          targetBend: 0,
        });
      }
      blades.sort((a, b) => a.baseY - b.baseY);

      // scatter quotes in a loose grid to avoid overlap
      quotes = [];
      const cols = width < 700 ? 2 : 3;
      const rows = Math.ceil(QUOTES.length / cols);
      const cellW = width / cols;
      const cellH = height / rows;
      const maxWidth = Math.min(cellW * 0.85, 360);

      QUOTES.forEach((q, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = cellW * col + cellW / 2 + (Math.random() - 0.5) * cellW * 0.2;
        const cy = cellH * row + cellH / 2 + (Math.random() - 0.5) * cellH * 0.2;
        quotes.push({
          text: q.text,
          author: q.author,
          x: cx,
          y: cy,
          maxWidth,
          rotation: (Math.random() - 0.5) * 0.08,
        });
      });

      drawQuotes();
    };

    const draw = (t: number) => {
      // realistic grass photo background (tiled)
      ctx.globalCompositeOperation = "source-over";
      if (bgPattern) {
        ctx.fillStyle = bgPattern;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = "hsl(110, 45%, 25%)";
        ctx.fillRect(0, 0, width, height);
      }

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const radius = 110;
      const radiusSq = radius * radius;
      const time = t * 0.001;

      for (const b of blades) {
        const ambient = Math.sin(time * 1.2 + b.phase) * 3;
        let push = 0;
        if (mouseRef.current.active) {
          const dx = b.x - mx;
          const dy = b.baseY - my;
          const distSq = dx * dx + dy * dy;
          if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq);
            const strength = 1 - dist / radius;
            push = Math.sign(dx) * strength * strength * 32;
          }
        }
        b.targetBend = ambient + push;
        b.bend += (b.targetBend - b.bend) * 0.18;

        const tipX = b.x + b.bend;
        const tipY = b.baseY - b.height;
        const ctrlX = b.x + b.bend * 0.5;
        const ctrlY = b.baseY - b.height * 0.55;

        ctx.beginPath();
        ctx.moveTo(b.x - b.width / 2, b.baseY);
        ctx.quadraticCurveTo(ctrlX - b.width / 2, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX + b.width / 2, ctrlY, b.x + b.width / 2, b.baseY);
        ctx.closePath();

        ctx.fillStyle = `hsl(${b.hue}, ${b.sat}%, ${b.light}%)`;
        ctx.fill();
      }

      // spotlight: erase a soft circle from the grass to reveal the quote layer
      if (mouseRef.current.active) {
        const spotR = 180;
        const spot = ctx.createRadialGradient(mx, my, 0, mx, my, spotR);
        spot.addColorStop(0, "rgba(0,0,0,1)");
        spot.addColorStop(0.55, "rgba(0,0,0,0.85)");
        spot.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = spot;
        ctx.beginPath();
        ctx.arc(mx, my, spotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }

      raf = requestAnimationFrame(draw);
    };

    const onMove = (x: number, y: number) => {
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;
      if (handRef.current) {
        handRef.current.style.transform = `translate(${x - 18}px, ${y - 18}px) rotate(-15deg)`;
        handRef.current.style.opacity = "1";
      }
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onLeave = () => {
      mouseRef.current.active = false;
      if (handRef.current) handRef.current.style.opacity = "0";
    };

    generate();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", generate);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchend", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", generate);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchend", onLeave);
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden" style={{ cursor: "none" }}>
      <h1 className="sr-only">Touch Grass — Inspirational Quotes Hidden in a Field</h1>
      <canvas ref={quotesCanvasRef} className="absolute inset-0 block h-full w-full" />
      <canvas ref={grassCanvasRef} className="absolute inset-0 block h-full w-full" />
      <div
        ref={handRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-10 select-none text-4xl transition-opacity duration-200"
        style={{ opacity: 0, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}
      >
        ✋
      </div>
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-white/50">
        part the grass — find what's hidden
      </div>
    </main>
  );
};

export default Index;
