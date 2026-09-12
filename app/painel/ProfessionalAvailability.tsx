"use client";

import { useCallback, useEffect, useState } from "react";

import { saoPauloDateTimeToIso } from "@/utils/brazil-time";
import { supabase } from "@/utils/supabase";
import ActionFeedback from "./ActionFeedback";

type AvailabilityDay = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};
type AvailabilityBreak = { starts_at: string; ends_at: string };
type TimeBlock = { id: string; starts_at: string; ends_at: string; reason: string | null };

const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const defaultAvailability: AvailabilityDay[] = days.map((_, weekday) => ({
  weekday,
  opens_at: weekday === 0 ? "" : "09:00",
  closes_at: weekday === 0 ? "" : weekday === 6 ? "18:00" : "20:00",
  is_closed: weekday === 0,
}));

function localDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default function ProfessionalAvailability({
  professionalId,
  barbershopId,
}: {
  professionalId: string;
  barbershopId: string;
}) {
  const [hours, setHours] = useState<AvailabilityDay[]>(defaultAvailability);
  const [scheduleMode, setScheduleMode] = useState<"barbershop" | "custom">("barbershop");
  const [breaks, setBreaks] = useState<Record<number, AvailabilityBreak>>({});
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [message, setMessage] = useState("Carregando sua disponibilidade...");
  const [saving, setSaving] = useState(false);
  const [absenceStartsAt, setAbsenceStartsAt] = useState("");
  const [absenceEndsAt, setAbsenceEndsAt] = useState("");
  const [absenceReason, setAbsenceReason] = useState("");

  const load = useCallback(async () => {
    const [businessResult, ownHoursResult, breaksResult, blocksResult, professionalResult] = await Promise.all([
      supabase.from("business_hours").select("weekday,opens_at,closes_at,is_closed").eq("barbershop_id", barbershopId),
      supabase.from("professional_hours").select("weekday,opens_at,closes_at,is_closed").eq("professional_id", professionalId),
      supabase.from("professional_breaks").select("weekday,starts_at,ends_at").eq("professional_id", professionalId),
      supabase.from("professional_time_blocks").select("id,starts_at,ends_at,reason").eq("professional_id", professionalId).gte("ends_at", new Date().toISOString()).order("starts_at"),
      supabase.from("professionals").select("schedule_mode").eq("id", professionalId).maybeSingle<{ schedule_mode: "barbershop" | "custom" }>(),
    ]);

    if (businessResult.error || ownHoursResult.error || breaksResult.error || blocksResult.error || professionalResult.error) {
      setMessage("Não foi possível carregar todas as configurações da sua disponibilidade.");
      return;
    }

    const businessHours = businessResult.data || [];
    const ownHours = ownHoursResult.data || [];
    setScheduleMode(professionalResult.data?.schedule_mode || "barbershop");
    setHours(days.map((_, weekday) => {
      const own = ownHours.find((row) => row.weekday === weekday);
      const business = businessHours.find((row) => row.weekday === weekday);
      const source = own || business || defaultAvailability[weekday];
      return {
        weekday,
        opens_at: source.opens_at?.slice(0, 5) || "",
        closes_at: source.closes_at?.slice(0, 5) || "",
        is_closed: source.is_closed,
      };
    }));
    setBreaks(Object.fromEntries((breaksResult.data || []).map((row) => [
      row.weekday,
      { starts_at: row.starts_at.slice(0, 5), ends_at: row.ends_at.slice(0, 5) },
    ])));
    setTimeBlocks((blocksResult.data || []) as TimeBlock[]);
    setMessage("");
  }, [barbershopId, professionalId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function changeHour(weekday: number, update: Partial<AvailabilityDay>) {
    setHours((current) => current.map((day) => day.weekday === weekday ? { ...day, ...update } : day));
  }

  function changeBreak(weekday: number, field: keyof AvailabilityBreak, value: string) {
    setBreaks((current) => ({
      ...current,
      [weekday]: {
        starts_at: current[weekday]?.starts_at || "",
        ends_at: current[weekday]?.ends_at || "",
        [field]: value,
      },
    }));
  }

  async function save() {
    setMessage("");
    for (const day of hours) {
      if (!day.is_closed && (!day.opens_at || !day.closes_at || day.opens_at >= day.closes_at)) {
        setMessage(`Revise o horário de ${days[day.weekday]}.`);
        return;
      }
      const pause = breaks[day.weekday];
      const hasPause = Boolean(pause?.starts_at || pause?.ends_at);
      if (hasPause && (!pause?.starts_at || !pause?.ends_at || pause.starts_at >= pause.ends_at || day.is_closed || pause.starts_at < day.opens_at || pause.ends_at > day.closes_at)) {
        setMessage(`Revise a pausa de ${days[day.weekday]}.`);
        return;
      }
    }

    setSaving(true);
    if (scheduleMode === "custom") {
      const { error: hoursError } = await supabase.from("professional_hours").upsert(
        hours.map((day) => ({
          professional_id: professionalId,
          weekday: day.weekday,
          opens_at: day.is_closed ? null : day.opens_at,
          closes_at: day.is_closed ? null : day.closes_at,
          is_closed: day.is_closed,
        })),
        { onConflict: "professional_id,weekday" },
      );
      if (hoursError) {
        setSaving(false);
        setMessage("Não foi possível salvar seus horários.");
        return;
      }
    }

    const { error: deleteBreaksError } = await supabase.from("professional_breaks").delete().eq("professional_id", professionalId);
    if (deleteBreaksError) {
      setSaving(false);
      setMessage("Os horários foram salvos, mas não foi possível atualizar suas pausas.");
      return;
    }
    const pauseValues = hours.flatMap((day) => {
      const pause = breaks[day.weekday];
      return !day.is_closed && pause?.starts_at && pause?.ends_at
        ? [{ professional_id: professionalId, weekday: day.weekday, starts_at: pause.starts_at, ends_at: pause.ends_at }]
        : [];
    });
    if (pauseValues.length) {
      const { error } = await supabase.from("professional_breaks").insert(pauseValues);
      if (error) {
        setSaving(false);
        setMessage("Os horários foram salvos, mas não foi possível salvar suas pausas.");
        return;
      }
    }
    setSaving(false);
    setMessage("Sua disponibilidade semanal foi atualizada.");
    await load();
  }

  async function selectScheduleMode(mode: "barbershop" | "custom") {
    if (mode === scheduleMode) return;
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("set_my_professional_schedule_mode", { p_schedule_mode: mode });
    setSaving(false);
    if (error) {
      setMessage("Não foi possível alterar a origem da sua agenda.");
      return;
    }
    setMessage(mode === "barbershop" ? "Você voltou a usar a agenda da barbearia." : "Sua agenda personalizada está pronta para edição.");
    await load();
  }

  async function addAbsence() {
    if (!absenceStartsAt || !absenceEndsAt) {
      setMessage("Informe o início e o fim da ausência.");
      return;
    }
    const startsAt = saoPauloDateTimeToIso(absenceStartsAt);
    const endsAt = saoPauloDateTimeToIso(absenceEndsAt);
    if (new Date(startsAt) >= new Date(endsAt)) {
      setMessage("O fim da ausência deve ser posterior ao início.");
      return;
    }
    const { error } = await supabase.from("professional_time_blocks").insert({
      professional_id: professionalId,
      starts_at: startsAt,
      ends_at: endsAt,
      reason: absenceReason.trim() || null,
    });
    if (error) {
      setMessage("Não foi possível registrar a ausência.");
      return;
    }
    setAbsenceStartsAt("");
    setAbsenceEndsAt("");
    setAbsenceReason("");
    setMessage("Ausência registrada. Novos agendamentos não serão oferecidos nesse período.");
    await load();
  }

  async function removeAbsence(id: string) {
    const { error } = await supabase.from("professional_time_blocks").delete().eq("id", id).eq("professional_id", professionalId);
    setMessage(error ? "Não foi possível remover a ausência." : "Ausência removida.");
    if (!error) await load();
  }

  return (
    <>
      <section className="product-card professional-availability-week">
        <div className="product-section-head">
          <div>
            <h2>Horários da semana</h2>
            <p>Escolha usar o horário geral da barbearia ou defina a sua agenda, sempre dentro do funcionamento dela.</p>
          </div>
        </div>
        <div className="product-chip-row professional-schedule-mode" aria-label="Origem da agenda">
          <button className="product-chip" data-active={scheduleMode === "barbershop" ? "true" : "false"} type="button" disabled={saving} onClick={() => void selectScheduleMode("barbershop")}>Usar agenda da barbearia</button>
          <button className="product-chip" data-active={scheduleMode === "custom" ? "true" : "false"} type="button" disabled={saving} onClick={() => void selectScheduleMode("custom")}>Personalizar minha agenda</button>
        </div>
        <div className="professional-availability-days">
          {hours.map((day) => (
            <fieldset className="professional-availability-day" key={day.weekday}>
              <legend>{days[day.weekday]}</legend>
              <label className="professional-availability-toggle">
                <input type="checkbox" disabled={scheduleMode !== "custom"} checked={!day.is_closed} onChange={(event) => changeHour(day.weekday, { is_closed: !event.target.checked })} />
                <span>{day.is_closed ? "Não atende" : "Atende neste dia"}</span>
              </label>
              <div className="professional-availability-times">
                <label>Início<input className="product-input" type="time" disabled={day.is_closed || scheduleMode !== "custom"} value={day.opens_at} onChange={(event) => changeHour(day.weekday, { opens_at: event.target.value })} /></label>
                <label>Fim<input className="product-input" type="time" disabled={day.is_closed || scheduleMode !== "custom"} value={day.closes_at} onChange={(event) => changeHour(day.weekday, { closes_at: event.target.value })} /></label>
                <label>Pausa — início<input className="product-input" type="time" disabled={day.is_closed} value={breaks[day.weekday]?.starts_at || ""} onChange={(event) => changeBreak(day.weekday, "starts_at", event.target.value)} /></label>
                <label>Pausa — fim<input className="product-input" type="time" disabled={day.is_closed} value={breaks[day.weekday]?.ends_at || ""} onChange={(event) => changeBreak(day.weekday, "ends_at", event.target.value)} /></label>
              </div>
            </fieldset>
          ))}
        </div>
        <div className="management-action-area professional-availability-save">
          <button className="product-button professional-availability-submit" type="button" disabled={saving} onClick={() => void save()}>{saving ? "Salvando..." : "Salvar disponibilidade"}</button>
          <ActionFeedback message={message} tone={message.includes("Não foi") || message.includes("Revise") ? "error" : "success"} />
        </div>
      </section>

      <section className="product-grid cols-2 professional-absence-grid">
        <div className="product-card pad professional-absence-card">
          <div className="product-section-head"><div><h2>Registrar ausência</h2><p>Bloqueie folga, férias ou outro compromisso.</p></div></div>
          <div className="professional-absence-form">
            <div className="product-field"><label>Início</label><input className="product-input" type="datetime-local" value={absenceStartsAt} onChange={(event) => setAbsenceStartsAt(event.target.value)} /></div>
            <div className="product-field"><label>Fim</label><input className="product-input" type="datetime-local" value={absenceEndsAt} onChange={(event) => setAbsenceEndsAt(event.target.value)} /></div>
            <div className="product-field"><label>Motivo</label><input className="product-input" value={absenceReason} onChange={(event) => setAbsenceReason(event.target.value)} placeholder="Ex.: férias, médico, compromisso" /></div>
            <button className="product-button" type="button" onClick={() => void addAbsence()}>Registrar ausência</button>
          </div>
        </div>
        <div className="product-card pad professional-absence-card">
          <div className="product-section-head"><div><h2>Próximas ausências</h2><p>Períodos que não serão oferecidos em novas reservas.</p></div></div>
          <div className="product-list">
            {timeBlocks.map((block) => <div className="product-row" key={block.id}><div><b>{localDateTime(block.starts_at)}</b><div className="product-row-meta">até {localDateTime(block.ends_at)} · {block.reason || "Sem motivo informado"}</div></div><button className="product-button secondary" type="button" onClick={() => void removeAbsence(block.id)}>Remover</button></div>)}
            {!timeBlocks.length && <div className="product-empty">Nenhuma ausência futura registrada.</div>}
          </div>
        </div>
      </section>
    </>
  );
}
