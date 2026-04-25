import { useEffect, useRef } from "react";

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

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let blades: Blade[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;

    const generate = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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
    };

    const draw = (t: number) => {
      // sky-to-ground gradient background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "hsl(140, 40%, 8%)");
      grad.addColorStop(1, "hsl(110, 35%, 14%)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const radius = 110;
      const radiusSq = radius * radius;

      const time = t * 0.001;

      for (const b of blades) {
        // ambient sway
        const ambient = Math.sin(time * 1.2 + b.phase) * 3;

        // cursor influence
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

        // draw blade as a curved triangle
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
      <h1 className="sr-only">Touch Grass — Interactive Grass Field</h1>
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div
        ref={handRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-10 select-none text-4xl transition-opacity duration-200"
        style={{ opacity: 0, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.5))" }}
      >
        ✋
      </div>
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-10 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-white/50">
        move your cursor — touch grass
      </div>
    </main>
  );
};

export default Index;
