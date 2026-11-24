"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { readConnectionProfile } from "@/lib/network";

type Phase = "idle" | "loading" | "complete";

const SLOW_NOTICE_MS = 1200;
const SETTLE_TIMEOUT_MS = 9000;
const HIDE_MS = 240;

function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}

function navigationTarget(target: EventTarget | null, current: URL) {
  const anchor = target instanceof Element ? target.closest("a[href]") : null;
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const next = new URL(anchor.href, current);
  if (next.origin !== current.origin) return null;
  if (next.pathname === current.pathname && next.search === current.search) {
    return null;
  }
  return next;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [phase, setPhase] = useState<Phase>("idle");
  const [waiting, setWaiting] = useState(false);
  const pending = useRef(false);
  const routeKeyRef = useRef(routeKey);
  const activeKey = useRef(routeKey);
  const slowTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);

  const clear = (timer: { current: number | null }) => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const start = useCallback((source: "link" | "history") => {
    if (pending.current) return;
    const liveKey = `${window.location.pathname}?${window.location.search.slice(1)}`;
    if (source === "history" && liveKey === routeKeyRef.current) return;
    pending.current = true;
    activeKey.current = routeKeyRef.current;
    clear(slowTimer);
    clear(settleTimer);
    clear(hideTimer);
    setWaiting(readConnectionProfile().slow);
    setPhase("loading");
    slowTimer.current = window.setTimeout(
      () => setWaiting(true),
      SLOW_NOTICE_MS,
    );
    settleTimer.current = window.setTimeout(() => {
      pending.current = false;
      setWaiting(false);
      setPhase("idle");
    }, SETTLE_TIMEOUT_MS);
  }, []);

  const finish = useCallback(() => {
    if (!pending.current) return;
    pending.current = false;
    clear(slowTimer);
    clear(settleTimer);
    setPhase("complete");
    hideTimer.current = window.setTimeout(() => {
      setWaiting(false);
      setPhase("idle");
    }, HIDE_MS);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!isPlainLeftClick(event)) return;
      if (!navigationTarget(event.target, new URL(window.location.href))) {
        return;
      }
      start("link");
    };
    const onPopState = () => start("history");
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [start]);

  useEffect(() => {
    routeKeyRef.current = routeKey;
    if (routeKey !== activeKey.current) finish();
    return () => {
      clear(slowTimer);
      clear(settleTimer);
      clear(hideTimer);
    };
  }, [routeKey, finish]);

  return (
    <>
      <div aria-hidden="true" className="nav-progress" data-state={phase}>
        <div className="nav-progress-bar" />
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {phase === "loading" && waiting
          ? "Still loading. This page is taking longer than usual."
          : ""}
      </p>
    </>
  );
}
