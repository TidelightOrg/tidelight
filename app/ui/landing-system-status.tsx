"use client";

import { useEffect, useState } from "react";

type ServiceState = "operational" | "degraded" | "monitoring";
type ServiceStatus = { state: ServiceState };
type StatusGroup = { name: string; services: ServiceStatus[] };
type SystemStatus = {
  status: "operational" | "degraded";
  checkedAt: string;
  groups: StatusGroup[];
};

function groupState(group: StatusGroup): ServiceState {
  if (group.services.some(service => service.state === "degraded")) return "degraded";
  if (group.services.every(service => service.state === "monitoring")) return "monitoring";
  return "operational";
}

function stateLabel(state: ServiceState) {
  return state === "operational" ? "Operational" : state === "degraded" ? "Degraded" : "Not monitored";
}

export default function LandingSystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/status/summary", { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Status snapshot unavailable");
        setStatus(await response.json() as SystemStatus);
      })
      .catch(error => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setUnavailable(true);
      });
    return () => controller.abort();
  }, []);

  const monitored = status?.groups.flatMap(group => group.services).filter(service => service.state !== "monitoring").length ?? 0;
  const label = status ? (status.status === "operational" ? "All monitored services operational" : "A service needs attention")
    : unavailable ? "Live status is temporarily unavailable" : "Checking live service status";

  return <section className={`landing-status-card${status ? ` is-${status.status}` : unavailable ? " is-unavailable" : " is-loading"}`} aria-labelledby="landing-status-title">
    <div className="landing-status-card-head">
      <span className="landing-status-kicker"><i aria-hidden="true" /> TIDELIGHT STATUS</span>
      <a href="https://status.tidelight.app" aria-label="Open Tidelight service status">Full status <span aria-hidden="true">↗</span></a>
    </div>
    <div className="landing-status-visual" aria-hidden="true">
      <svg viewBox="0 0 560 180" preserveAspectRatio="none">
        <path className="landing-status-grid" d="M0 40H560M0 90H560M0 140H560M70 0V180M210 0V180M350 0V180M490 0V180" />
        <path className="landing-status-wave landing-status-wave-back" d="M0 107C52 107 57 75 112 75s58 55 112 55 66-60 118-60 56 46 105 46 70-36 113-36" />
        <path className="landing-status-wave landing-status-wave-front" d="M0 108C55 108 59 96 112 96s61 20 112 20 63-27 118-27 58 16 105 16 67-14 113-14" />
        <circle className="landing-status-wave-point" cx="344" cy="89" r="5" />
      </svg>
      <span className="landing-status-orbit landing-status-orbit-one" />
      <span className="landing-status-orbit landing-status-orbit-two" />
      <span className="landing-status-center"><i /><b>{status?.status === "degraded" ? "Review" : status?.status === "operational" ? "Live" : "Status"}</b><small>Service checks</small></span>
      <span className="landing-status-visual-label">LIVE SNAPSHOT</span>
    </div>
    <div className="landing-status-summary" role="status" aria-live="polite">
      <span className="landing-status-light" aria-hidden="true" />
      <div><strong id="landing-status-title">{label}</strong><small>{status ? `${monitored} monitored checks · checked ${new Date(status.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Availability across Tidelight services"}</small></div>
    </div>
    <div className="landing-status-groups" aria-label="Status group summaries">
      {(status?.groups ?? [{ name: "Websites", services: [] }, { name: "APIs", services: [] }, { name: "Data", services: [] }, { name: "Packages", services: [] }]).slice(0, 4).map(group => {
        const state = status ? groupState(group) : "monitoring";
        return <div className={`landing-status-group is-${state}`} key={group.name}><span>{group.name}</span><b>{status ? stateLabel(state) : unavailable ? "Check status" : "Loading"}</b></div>;
      })}
    </div>
    <div className="landing-status-card-foot"><span>Live checks cover sites, APIs, data, and registries</span><a href="https://status.tidelight.app">View status page <span aria-hidden="true">→</span></a></div>
  </section>;
}
