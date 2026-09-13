import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Binary,
  Braces,
  Calculator,
  Clock,
  Dices,
  FileDiff,
  Gauge,
  Network,
  QrCode,
  ReceiptText,
} from "lucide-react";
import { SiteJsonLd } from "@/components/ToolJsonLd";
import { qrcodegen } from "@/lib/qrcodegen";
import { SITE_HOST, SITE_URL } from "@/lib/site";
import { tools } from "@/lib/tools";

/**
 * Presentation icons keyed by tool href, kept out of the shared data module.
 */
const toolIcons: Record<string, ReactNode> = {
  "/env-compare": <FileDiff className="size-[18px]" strokeWidth={1.75} />,
  "/ip-planner": <Network className="size-[18px]" strokeWidth={1.75} />,
  "/ipcalc": <Calculator className="size-[18px]" strokeWidth={1.75} />,
  "/random-string": <Dices className="size-[18px]" strokeWidth={1.75} />,
  "/invoice": <ReceiptText className="size-[18px]" strokeWidth={1.75} />,
  "/qr-gen": <QrCode className="size-[18px]" strokeWidth={1.75} />,
  "/json-schema": <Braces className="size-[18px]" strokeWidth={1.75} />,
  "/cron": <Clock className="size-[18px]" strokeWidth={1.75} />,
  "/base64": <Binary className="size-[18px]" strokeWidth={1.75} />,
  "/tire-pressure": <Gauge className="size-[18px]" strokeWidth={1.75} />,
};

/** Real, scannable QR of the site URL for the featured card, built once. */
function buildQrPath(value: string): { path: string; size: number } {
  const qr = qrcodegen.QrCode.encodeText(value, qrcodegen.QrCode.Ecc.MEDIUM);
  let path = "";
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) {
      if (qr.getModule(x, y)) path += `M${x} ${y}h1v1h-1z`;
    }
  }
  return { path, size: qr.size };
}

const homeQr = buildQrPath(SITE_URL);

/**
 * Static "display screen" specimens — a real-looking slice of each tool's
 * output. Decorative only (the screen container is aria-hidden).
 */
const previews: Record<string, ReactNode> = {
  "/env-compare": (
    <>
      <p>
        <span className="text-red-500/80 dark:text-red-400/80">- </span>
        DEBUG=false
      </p>
      <p>
        <span className="text-emerald-600/90 dark:text-emerald-400/90">+ </span>
        DEBUG=true
      </p>
      <p>
        <span className="text-muted-foreground/60">~ </span>PORT=3000
      </p>
    </>
  ),
  "/ip-planner": (
    <>
      <p>10.0.0.0/8</p>
      <p className="text-muted-foreground">├ 10.0.0.0/9</p>
      <p className="text-muted-foreground">└ 10.128.0.0/9</p>
    </>
  ),
  "/ipcalc": (
    <>
      <p>192.168.1.0/24</p>
      <p>
        <span className="text-muted-foreground">net </span>255.255.255.0
      </p>
      <p>
        <span className="text-muted-foreground">hosts </span>254
      </p>
    </>
  ),
  "/random-string": (
    <>
      <p>Kp#9mXq2$vR7!tLw</p>
      <p className="text-muted-foreground">Zq4&amp;nP8s^Wm3@kJd</p>
    </>
  ),
  "/invoice": (
    <>
      <p className="flex justify-between gap-2">
        <span>CONSULTING · 32H</span>
        <span>$4,800.00</span>
      </p>
      <p className="flex justify-between gap-2">
        <span>DESIGN RETAINER</span>
        <span>$1,200.00</span>
      </p>
      <p className="mt-1 flex justify-between gap-2 border-t border-border/70 pt-1 text-foreground">
        <span className="text-muted-foreground">TOTAL DUE</span>
        <span>$6,000.00</span>
      </p>
    </>
  ),
  "/qr-gen": (
    <div className="flex h-full items-center gap-4">
      <svg
        viewBox={`0 0 ${homeQr.size} ${homeQr.size}`}
        shapeRendering="crispEdges"
        className="h-full w-auto text-foreground/85"
        aria-hidden="true"
      >
        <path d={homeQr.path} fill="currentColor" />
      </svg>
      <div className="min-w-0 space-y-1">
        <p className="truncate">{SITE_HOST}</p>
        <p className="text-muted-foreground">point a camera at it</p>
      </div>
    </div>
  ),
  "/json-schema": (
    <>
      <p>{'{ "type": "object",'}</p>
      <p className="pl-3">{'"required": ["id"]'}</p>
      <p>{"}"}</p>
    </>
  ),
  "/cron": (
    <>
      <p className="text-muted-foreground">0 9 * * 1-5</p>
      <p>every weekday at 09:00</p>
    </>
  ),
  "/base64": (
    <>
      <p className="text-muted-foreground">tulkit</p>
      <p>dHVsa2l0</p>
    </>
  ),
  "/tire-pressure": (
    <>
      <p>
        <span className="text-muted-foreground">F </span>2.6 bar · 38 psi
      </p>
      <p>
        <span className="text-muted-foreground">R </span>2.9 bar · 42 psi
      </p>
    </>
  ),
};

function ToolCard({
  tool,
  index,
}: {
  tool: (typeof tools)[number];
  index: number;
}) {
  const icon = toolIcons[tool.href];
  const preview = previews[tool.href];

  return (
    <div className="tool-enter" style={{ "--i": index } as CSSProperties}>
      <Link
        href={tool.href}
        className="group flex h-full flex-col rounded-lg border border-border/70 bg-card p-5 outline-offset-2 transition-[border-color,transform] duration-200 ease-soft hover:border-foreground/30 focus-visible:outline-2 active:scale-[0.99] sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <span className="tabular-nums transition-colors duration-200 ease-soft group-hover:text-signal">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="truncate">{tool.category}</span>
        </div>
        <div className="mt-5 flex items-center gap-2.5">
          {icon && (
            <span aria-hidden="true" className="text-foreground/60">
              {icon}
            </span>
          )}
          <h3 className="text-[17px] font-medium leading-snug tracking-tight text-foreground">
            {tool.title}
          </h3>
          <ArrowUpRight
            aria-hidden="true"
            className="ml-auto size-4 shrink-0 -translate-x-1 translate-y-1 text-signal opacity-0 transition-[opacity,transform] duration-200 ease-soft group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          />
        </div>
        <p className="mt-2 min-h-[82px] pb-4 text-sm leading-[22px] text-muted-foreground">
          {tool.description}
        </p>
        <div className="mt-auto h-24 overflow-hidden rounded-md border border-border/60 bg-muted/45 px-3.5 py-3.5">
          <div className="flex h-full flex-col justify-center gap-1 font-mono text-[12px] leading-[18px] text-foreground/80 select-none">
            {preview}
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Quiet placeholder: dashed, muted, no facts (hero + footer own those). */
function ComingSoonCard({ index }: { index: number }) {
  return (
    <div className="tool-enter" style={{ "--i": index } as CSSProperties}>
      <div
        aria-disabled="true"
        className="flex h-full flex-col rounded-lg border border-dashed border-border/70 p-5 sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          <span>--</span>
          <span>coming soon</span>
        </div>
        <h3 className="mt-5 text-[17px] font-medium leading-snug tracking-tight text-muted-foreground">
          More Tools Coming
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground/80">
          Future utilities are currently trapped in the backlog. Please hold for
          your inevitable convenience.
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteJsonLd />
      <section className="hero-enter mx-auto w-full max-w-6xl px-5 pt-16 pb-14 sm:px-6 sm:pt-24 sm:pb-16">
        <h1 className="text-6xl font-semibold tracking-tighter text-foreground sm:text-7xl">
          tulkit
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          because apparently, you *do* need another random tool on the internet.
          ¯\_(ツ)_/¯
        </p>
      </section>

      <p className="sr-only">
        tulkit is a collection of focused developer utilities that run entirely
        in your browser. No signups, no tracking, no &quot;we reserve the right
        to use your data for training.&quot; Just tools that do one thing well
        and get out of your way. Whether you&apos;re comparing environment
        configs before a deploy, generating a clean invoice for freelance work,
        or sanity-checking an IP plan, each tool here is built to save you a few
        minutes of friction. Because apparently, you *do* need another random
        tool on the internet — might as well be one that doesn&apos;t phone
        home. Everything stays local: your files, your configs, your data. We
        just provide the interface.
      </p>

      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-6 sm:pb-28">
        <h2 className="sr-only">Tools</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool, index) => (
            <ToolCard key={tool.href} tool={tool} index={index} />
          ))}
          <ComingSoonCard index={tools.length} />
        </div>
      </section>
    </>
  );
}
