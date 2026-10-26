"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/ui/language-provider";

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

function stateLabel(state: ServiceState, language: "en" | "zh-CN") {
  if (language === "zh-CN") return state === "operational" ? "运行正常" : state === "degraded" ? "服务降级" : "未监控";
  return state === "operational" ? "Operational" : state === "degraded" ? "Degraded" : "Not monitored";
}

export default function LandingSystemStatus() {
  const { language } = useLanguage();
  const locale = language === "zh-CN" ? "zh-CN" : "en-US";
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
  const label = status
    ? language === "zh-CN"
      ? status.status === "operational" ? "所有受监控服务运行正常" : "有服务需要关注"
      : status.status === "operational" ? "All monitored services operational" : "A service needs attention"
    : unavailable
      ? language === "zh-CN" ? "实时状态暂时不可用" : "Live status is temporarily unavailable"
      : language === "zh-CN" ? "正在检查实时服务状态" : "Checking live service status";
  const groupNames: Record<string, string> = {
    Websites: "网站",
    APIs: "API",
    Data: "数据服务",
    Packages: "软件包仓库",
    "Package registries": "软件包仓库",
  };
  const time = status ? new Date(status.checkedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) : "";

  return <section className={`landing-status-card${status ? ` is-${status.status}` : unavailable ? " is-unavailable" : " is-loading"}`} aria-labelledby="landing-status-title">
    <div className="landing-status-card-head">
      <span className="landing-status-kicker"><i aria-hidden="true" /> {language === "zh-CN" ? "TIDELIGHT 服务状态" : "TIDELIGHT STATUS"}</span>
      <a href="https://status.tidelight.app" aria-label={language === "zh-CN" ? "打开 Tidelight 服务状态" : "Open Tidelight service status"}>{language === "zh-CN" ? "完整状态" : "Full status"} <span aria-hidden="true">↗</span></a>
    </div>
    <div className="landing-status-visual" aria-hidden="true">
      <svg viewBox="0 0 560 180" preserveAspectRatio="none">
        <path className="landing-status-grid" d="M0 40H560M0 90H560M0 140H560M70 0V180M210 0V180M350 0V180M490 0V180" />
        <path className="landing-status-wave landing-status-wave-back" d="M0 107C52 107 57 75 112 75s58 55 112 55 66-60 118-60 56 46 105 46 70-36 113-36" />
        <path className="landing-status-wave landing-status-wave-front" d="M0 108C55 108 59 96 112 96s61 20 112 20 63-27 118-27 58 16 105 16 67-14 113-14" />
        <path className="landing-status-wave-signal" pathLength="560" d="M0 108C55 108 59 96 112 96s61 20 112 20 63-27 118-27 58 16 105 16 67-14 113-14" />
        <circle className="landing-status-wave-point" cx="344" cy="89" r="5" />
      </svg>
      <span className="landing-status-orbit landing-status-orbit-one" />
      <span className="landing-status-orbit landing-status-orbit-two" />
      <span className="landing-status-center"><i /><b>{language === "zh-CN" ? status?.status === "degraded" ? "关注" : status?.status === "operational" ? "正常" : "状态" : status?.status === "degraded" ? "Review" : status?.status === "operational" ? "Live" : "Status"}</b><small>{language === "zh-CN" ? "服务检查" : "Service checks"}</small></span>
      <span className="landing-status-visual-label">{status ? language === "zh-CN" ? "实时状态快照" : "LIVE SNAPSHOT" : unavailable ? language === "zh-CN" ? "状态暂不可用" : "STATUS UNAVAILABLE" : language === "zh-CN" ? "正在检查状态" : "CHECKING STATUS"}</span>
    </div>
    <div className="landing-status-summary" role="status" aria-live="polite">
      <span className="landing-status-light" aria-hidden="true" />
      <div><strong id="landing-status-title">{label}</strong><small>{status ? language === "zh-CN" ? `${monitored} 项受监控检查 · 检查时间 ${time}` : `${monitored} monitored checks · checked ${time}` : language === "zh-CN" ? "Tidelight 各项服务的可用状态" : "Availability across Tidelight services"}</small></div>
    </div>
    <div className="landing-status-groups" aria-label={language === "zh-CN" ? "状态分组摘要" : "Status group summaries"}>
      {(status?.groups ?? [{ name: "Websites", services: [] }, { name: "APIs", services: [] }, { name: "Data", services: [] }, { name: "Packages", services: [] }]).slice(0, 4).map(group => {
        const state = status ? groupState(group) : "monitoring";
        const groupName = language === "zh-CN" ? groupNames[group.name] ?? group.name : group.name;
        return <div className={`landing-status-group is-${state}`} key={group.name}><span>{groupName}</span><b>{status ? stateLabel(state, language) : unavailable ? language === "zh-CN" ? "查看状态" : "Check status" : language === "zh-CN" ? "加载中" : "Loading"}</b></div>;
      })}
    </div>
    <div className="landing-status-card-foot"><span>{language === "zh-CN" ? "实时检查涵盖网站、API、数据服务和软件包仓库" : "Live checks cover sites, APIs, data, and registries"}</span><a href="https://status.tidelight.app">{language === "zh-CN" ? "查看状态页面" : "View status page"} <span aria-hidden="true">→</span></a></div>
  </section>;
}
