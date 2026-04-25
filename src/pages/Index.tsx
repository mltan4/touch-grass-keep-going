import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import grassTexture from "@/assets/grass.jpg";
import puddleImage from "@/assets/puddle.png";
import { supabase } from "@/integrations/supabase/client";

// puddle position/size — kept in one place so quote layout can avoid it
const PUDDLE = {
  // bottom-left, sized relative to viewport
  widthPct: 0.28, // 28% of viewport width
  maxWidth: 360,
  minWidth: 200,
  marginLeft: 24,
  marginBottom: 24,
};

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
  revealProgress: number;
  revealed: boolean;
}

const MAX_ON_SCREEN = 12;

const FALLBACK_QUOTES: { text: string; author: string }[] = [
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
];

const Index = () => {
  const quotesCanvasRef = useRef<HTMLCanvasElement>(null);
  const grassCanvasRef = useRef<HTMLCanvasElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const dirtyRef = useRef(false);
  const [quotePool, setQuotePool] = useState<{ text: string; author: string }[]>(FALLBACK_QUOTES);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("quotes")
      .select("text, author")
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          console.warn("Could not load quotes from database, using fallback", error);
          return;
        }
        setQuotePool(data as { text: string; author: string }[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (quotePool.length === 0) return;
    const grassCanvas = grassCanvasRef.current!;
    const quotesCanvas = quotesCanvasRef.current!;
    const ctx = grassCanvas.getContext("2d")!;
    const qctx = quotesCanvas.getContext("2d")!;
    let blades: Blade[] = [];
    let quotes: Quote[] = [];
    let poops: { x: number; y: number; size: number }[] = [];
    let queue: { text: string; author: string }[] = [];
    let replaceQuoteSlot: (i: number) => void = () => {};
    let raf = 0;
    let width = 0;
    let height = 0;
    let bgReady = false;
    let puddleBox = { left: 0, top: 0, right: 0, bottom: 0 };

    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const nextQuote = (): { text: string; author: string } => {
      if (queue.length === 0) queue = shuffle(quotePool);
      return queue.shift()!;
    };

    const bgImage = new Image();
    bgImage.src = grassTexture;
    bgImage.onload = () => {
      bgReady = true;
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
      // rich soil background (what the spotlight reveals beneath the grass)
      const bg = qctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) / 1.2);
      bg.addColorStop(0, "hsl(28, 45%, 22%)");
      bg.addColorStop(1, "hsl(22, 50%, 10%)");
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

      // poops, hidden in the field — drawn on the quotes canvas so the spotlight reveals them too
      for (const p of poops) {
        qctx.save();
        qctx.translate(p.x, p.y);
        qctx.font = `${p.size}px serif`;
        qctx.textAlign = "center";
        qctx.textBaseline = "middle";
        qctx.shadowColor = "rgba(0,0,0,0.6)";
        qctx.shadowBlur = 8;
        qctx.fillText("💩", 0, 0);
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
          hue: 80 + Math.random() * 40,
          sat: 60 + Math.random() * 30,
          light: 35 + Math.random() * 30,
          phase: Math.random() * Math.PI * 2,
          bend: 0,
          targetBend: 0,
        });
      }
      blades.sort((a, b) => a.baseY - b.baseY);

      // puddle bounding box (lower-left). quotes that would land inside it get nudged out.
      const puddleW = Math.max(PUDDLE.minWidth, Math.min(PUDDLE.maxWidth, width * PUDDLE.widthPct));
      const puddleH = puddleW * 0.78; // image aspect ratio is roughly 4:3
      const puddleLeft = PUDDLE.marginLeft;
      const puddleTop = height - PUDDLE.marginBottom - puddleH;
      const puddleRight = puddleLeft + puddleW;
      const puddleBottom = puddleTop + puddleH;
      const inPuddle = (x: number, y: number, pad = 40) =>
        x > puddleLeft - pad && x < puddleRight + pad && y > puddleTop - pad && y < puddleBottom + pad;

      // scatter quotes in a loose grid to avoid overlap
      const onScreen = Math.min(MAX_ON_SCREEN, quotePool.length);
      const cols = width < 700 ? 2 : Math.min(3, onScreen);
      const rows = Math.ceil(onScreen / cols);
      const cellW = width / cols;
      const cellH = height / rows;
      const maxWidth = Math.min(cellW * 0.85, 360);

      const makeQuoteAt = (i: number): Quote => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        let cx = cellW * col + cellW / 2 + (Math.random() - 0.5) * cellW * 0.2;
        let cy = cellH * row + cellH / 2 + (Math.random() - 0.5) * cellH * 0.2;
        // if the quote would fall behind the puddle, push it up & right out of the way
        if (inPuddle(cx, cy)) {
          cy = Math.max(cy, puddleTop - 60);
          if (cx < puddleRight + 20) cx = puddleRight + 40;
          // clamp to viewport
          cy = Math.max(40, Math.min(height - 40, cy));
          cx = Math.max(40, Math.min(width - 40, cx));
        }
        const q = nextQuote();
        return {
          text: q.text,
          author: q.author,
          x: cx,
          y: cy,
          maxWidth,
          rotation: (Math.random() - 0.5) * 0.08,
          revealProgress: 0,
          revealed: false,
        };
      };

      // expose for use inside draw() to recycle a slot after reveal
      replaceQuoteSlot = (i: number) => {
        quotes[i] = makeQuoteAt(i);
      };

      queue = shuffle(quotePool);
      quotes = [];
      for (let i = 0; i < onScreen; i++) quotes.push(makeQuoteAt(i));

      // store puddle box for hand-washing detection
      puddleBox = { left: puddleLeft, top: puddleTop, right: puddleRight, bottom: puddleBottom };

      // hide 3 poops in random spots, away from the puddle and screen edges
      poops = [];
      for (let i = 0; i < 3; i++) {
        let px = 0;
        let py = 0;
        for (let attempt = 0; attempt < 30; attempt++) {
          px = 80 + Math.random() * (width - 160);
          py = 80 + Math.random() * (height - 160);
          if (!inPuddle(px, py, 60)) break;
        }
        poops.push({ x: px, y: py, size: 32 + Math.random() * 14 });
      }

      drawQuotes();
    };

    const draw = (t: number) => {
      // realistic grass photo, stretched to cover the viewport (no tiling)
      ctx.globalCompositeOperation = "source-over";
      if (bgReady) {
        ctx.drawImage(bgImage, 0, 0, width, height);
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

        // reveal tracking: if the spotlight lingers near a quote, mark it revealed and swap it
        const revealRadius = 140;
        let needsRedraw = false;
        for (let i = 0; i < quotes.length; i++) {
          const q = quotes[i];
          if (q.revealed) continue;
          const dx = q.x - mx;
          const dy = q.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < revealRadius) {
            q.revealProgress += (1 - dist / revealRadius) * 0.02;
            if (q.revealProgress >= 1) {
              q.revealed = true;
              // delay the swap slightly so the user sees it fully revealed
              setTimeout(() => {
                replaceQuoteSlot(i);
                drawQuotes();
              }, 1200);
            }
          }
          if (q.revealProgress > 0 && !q.revealed) needsRedraw = true;
        }
        if (needsRedraw) drawQuotes();
      }

      raf = requestAnimationFrame(draw);
    };

    const CLEAN_FILTER = "drop-shadow(0 4px 6px rgba(0,0,0,0.5))";
    const DIRTY_FILTER =
      "sepia(1) saturate(3) hue-rotate(-30deg) brightness(0.55) drop-shadow(0 4px 6px rgba(0,0,0,0.5))";

    const onMove = (x: number, y: number) => {
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;

      // poop touch — center hit only
      if (!dirtyRef.current) {
        for (const p of poops) {
          const dx = x - p.x;
          const dy = y - p.y;
          if (dx * dx + dy * dy < (p.size * 0.35) * (p.size * 0.35)) {
            dirtyRef.current = true;
            break;
          }
        }
      } else {
        // wash hand if cursor enters the puddle
        const pb = puddleBox;
        if (x >= pb.left && x <= pb.right && y >= pb.top && y <= pb.bottom) {
          dirtyRef.current = false;
        }
      }

      if (handRef.current) {
        handRef.current.style.transform = `translate(${x - 18}px, ${y - 18}px) rotate(-15deg)`;
        handRef.current.style.opacity = "1";
        handRef.current.style.filter = dirtyRef.current ? DIRTY_FILTER : CLEAN_FILTER;
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
  }, [quotePool]);

  return (
    <main className="fixed inset-0 overflow-hidden" style={{ cursor: "none" }}>
      <h1 className="sr-only">Touch Grass — Inspirational Quotes Hidden in a Field</h1>
      <canvas ref={quotesCanvasRef} className="absolute inset-0 block h-full w-full" />
      <canvas ref={grassCanvasRef} className="absolute inset-0 block h-full w-full" />
      <img
        src={puddleImage}
        alt=""
        aria-hidden
        className="pointer-events-none absolute z-[5] select-none"
        style={{
          left: PUDDLE.marginLeft,
          bottom: PUDDLE.marginBottom,
          width: `clamp(${PUDDLE.minWidth}px, ${PUDDLE.widthPct * 100}vw, ${PUDDLE.maxWidth}px)`,
          filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.55))",
          mixBlendMode: "multiply",
        }}
      />
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
      <Link
        to="/admin"
        className="fixed bottom-4 right-4 z-10 text-xs uppercase tracking-[0.2em] text-white/30 hover:text-white/70 transition-colors"
        style={{ cursor: "none" }}
      >
        admin
      </Link>
    </main>
  );
};

export default Index;
