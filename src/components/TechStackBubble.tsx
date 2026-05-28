import { useState } from "react";
import { MessageCircle, X } from "lucide-react";

const TechStackBubble = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 max-w-[calc(100vw-3rem)] rounded-2xl border border-border bg-card text-card-foreground shadow-xl animate-scale-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">How are the animations made?</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-4 py-3 text-sm space-y-3 max-h-96 overflow-y-auto">
            <p>
              Good news: the animations are super lightweight. There's no heavy
              animation library running in the background — everything is done
              with plain <strong>CSS</strong>, organized through{" "}
              <strong>Tailwind CSS</strong>.
            </p>
            <p>Here's what's doing the work:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Tailwind CSS</strong> — utility classes like fade-in,
                hover scale, and smooth transitions.
              </li>
              <li>
                <strong>tailwindcss-animate</strong> — a small plugin that adds
                ready-made animation utilities.
              </li>
              <li>
                <strong>Custom keyframes</strong> — for things like accordions
                opening and closing.
              </li>
              <li>
                <strong>Radix UI</strong> — the building blocks for menus,
                dialogs, tooltips, etc. handle their own open/close motion.
              </li>
            </ul>
            <p className="text-muted-foreground">
              The result: snappy, browser-native animations without shipping a
              big JavaScript animation engine to your visitors.
            </p>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open chat"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
};

export default TechStackBubble;
