"use client";

import { createClient } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
type Item = {
  id: string;
  name: string;
  active: boolean;
  price?: number;
  duration_minutes?: number | null;
  scheduleConfigured?: boolean;
};
type Shop = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  notification_email: string | null;
  description: string | null;
  photo_url: string | null;
};
type Hours = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

const days = [
  "Domingo",
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
];
const defaultHours: Hours[] = days.map((_, weekday) => ({
  weekday,
  opens_at: weekday === 0 ? "" : "09:00",
  closes_at: weekday === 0 ? "" : weekday === 6 ? "18:00" : "20:00",
  is_closed: weekday === 0,
}));
const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  border: "1px solid #d9d0c8",
  borderRadius: 7,
  padding: 11,
  fontSize: 15,
  background: "#fff",
};
const card = {
  background: "#fff",
  padding: 22,
  borderRadius: 12,
  border: "1px solid #e8e0d8",
};
const button = {
  border: 0,
  borderRadius: 7,
  padding: "11px 14px",
  background: "#d7612c",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

export default function Configurar() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Item[]>([]);
  const [professionals, setProfessionals] = useState<Item[]>([]);
  const [hours, setHours] = useState<Hours[]>(defaultHours);
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [professionalName, setProfessionalName] = useState("");
  const [message, setMessage] = useState("Carregando...");
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingService, setEditingService] = useState<Item | null>(null);
  const [editingProfessional, setEditingProfessional] = useState<Item | null>(
    null,
  );
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editingProfessionalSchedule, setEditingProfessionalSchedule] =
    useState<Item | null>(null);
  const [professionalSchedule, setProfessionalSchedule] =
    useState<Hours[]>(defaultHours);
  const [professionalBreaks, setProfessionalBreaks] = useState<Record<number, { starts_at: string; ends_at: string }>>({});

  const whatsappLink = useMemo(() => {
    const number = (shop?.whatsapp || "").replace(/\D/g, "");
    return number ? `https://wa.me/${number}` : "";
  }, [shop?.whatsapp]);
  const mapsLink = useMemo(
    () =>
      shop?.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`
        : "",
    [shop?.address],
  );
  const publicLink = useMemo(
    () => (shop ? `https://barbeariasp.cullentech.com.br/${shop.slug}` : ""),
    [shop],
  );

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.replace("/entrar");
      return;
    }
    const { data: currentShop, error } = await supabase
      .from("barbershops")
      .select(
        "id,name,slug,address,phone,whatsapp,notification_email,description,photo_url",
      )
      .eq("owner_id", user.id)
      .single();
    if (error || !currentShop) {
      window.location.replace("/painel/inicio");
      return;
    }
    setShop(currentShop);
    const [
      serviceResult,
      professionalResult,
      hoursResult,
      professionalHoursResult,
    ] = await Promise.all([
      supabase
        .from("services")
        .select("id,name,price,duration_minutes,active")
        .eq("barbershop_id", currentShop.id)
        .order("created_at"),
      supabase
        .from("professionals")
        .select("id,name,active")
        .eq("barbershop_id", currentShop.id)
        .order("created_at"),
      supabase
        .from("business_hours")
        .select("weekday,opens_at,closes_at,is_closed")
        .eq("barbershop_id", currentShop.id),
      supabase.from("professional_hours").select("professional_id").limit(1000),
    ]);
    const configuredProfessionals = new Set(
      (professionalHoursResult.data || []).map((hour) => hour.professional_id),
    );
    setServices(serviceResult.data || []);
    setProfessionals(
      (professionalResult.data || []).map((professional) => ({
        ...professional,
        scheduleConfigured: configuredProfessionals.has(professional.id),
      })),
    );
    if (hoursResult.data?.length)
      setHours(
        defaultHours.map(
          (day) =>
            hoursResult.data?.find((saved) => saved.weekday === day.weekday) ||
            day,
        ),
      );
    setMessage("Dados salvos nesta barbearia.");
  }
  useEffect(() => {
    void load();
  }, []);

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase
      .from("barbershops")
      .update({
        name: shop.name.trim(),
        address: shop.address?.trim() || null,
        phone: shop.phone?.trim() || null,
        whatsapp: shop.whatsapp?.trim() || null,
        notification_email: shop.notification_email?.trim() || null,
        description: shop.description?.trim() || null,
        photo_url: shop.photo_url?.trim() || null,
      })
      .eq("id", shop.id);
    setSaving(false);
    if (error) {
      setMessage("Nao foi possivel salvar os dados cadastrais.");
      return;
    }
    setEditingProfile(false);
    setMessage("Dados cadastrais salvos.");
  }
  async function saveHours(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    setSaving(true);
    const values = hours.map((day) => ({
      barbershop_id: shop.id,
      weekday: day.weekday,
      is_closed: day.is_closed,
      opens_at: day.is_closed ? null : day.opens_at,
      closes_at: day.is_closed ? null : day.closes_at,
    }));
    const { error } = await supabase
      .from("business_hours")
      .upsert(values, { onConflict: "barbershop_id,weekday" });
    setSaving(false);
    setMessage(
      error
        ? "Nao foi possivel salvar os horarios."
        : "Dias e horarios salvos.",
    );
  }
  async function addService(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    const { error } = await supabase
      .from("services")
      .insert({
        barbershop_id: shop.id,
        name: serviceName,
        price: Number(price),
        duration_minutes: Number(duration),
      });
    if (error) {
      setMessage("Nao foi possivel adicionar o servico.");
      return;
    }
    setServiceName("");
    setPrice("");
    setDuration("");
    setMessage("Servico adicionado.");
    await load();
  }
  async function addProfessional(event: FormEvent) {
    event.preventDefault();
    if (!shop) return;
    const { error } = await supabase
      .from("professionals")
      .insert({ barbershop_id: shop.id, name: professionalName });
    if (error) {
      setMessage("Nao foi possivel adicionar o profissional.");
      return;
    }
    setProfessionalName("");
    setMessage("Profissional adicionado.");
    await load();
  }
  async function toggle(table: "services" | "professionals", item: Item) {
    const { error } = await supabase
      .from(table)
      .update({ active: !item.active })
      .eq("id", item.id);
    setMessage(
      error ? "Nao foi possivel atualizar o status." : "Status atualizado.",
    );
    await load();
  }
  function beginServiceEdit(item: Item) {
    setEditingService(item);
    setEditName(item.name);
    setEditPrice(String(item.price ?? ""));
    setEditDuration(String(item.duration_minutes ?? ""));
  }
  async function saveServiceEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingService) return;
    const { error } = await supabase
      .from("services")
      .update({
        name: editName.trim(),
        price: Number(editPrice),
        duration_minutes: Number(editDuration),
      })
      .eq("id", editingService.id);
    if (error) {
      setMessage("Nao foi possivel editar o servico.");
      return;
    }
    setEditingService(null);
    setMessage(
      "Servico atualizado. Agendamentos concluidos mantem os valores originais.",
    );
    await load();
  }
  function beginProfessionalEdit(item: Item) {
    setEditingProfessional(item);
    setEditName(item.name);
  }
  async function saveProfessionalEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingProfessional) return;
    const { error } = await supabase
      .from("professionals")
      .update({ name: editName.trim() })
      .eq("id", editingProfessional.id);
    if (error) {
      setMessage("Nao foi possivel editar o profissional.");
      return;
    }
    setEditingProfessional(null);
    setMessage(
      "Profissional atualizado. Historico concluido permanece preservado.",
    );
    await load();
  }
  function changeHour(weekday: number, update: Partial<Hours>) {
    setHours((current) =>
      current.map((day) =>
        day.weekday === weekday ? { ...day, ...update } : day,
      ),
    );
  }
  function changeProfessionalHour(weekday: number, update: Partial<Hours>) {
    setProfessionalSchedule((current) =>
      current.map((day) =>
        day.weekday === weekday ? { ...day, ...update } : day,
      ),
    );
  }
  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicLink);
    setMessage("Link publico copiado. Use-o nas redes sociais da barbearia.");
  }
  async function beginProfessionalSchedule(item: Item) {
    const [{ data }, { data: breaks }] = await Promise.all([supabase
      .from("professional_hours")
      .select("weekday,opens_at,closes_at,is_closed")
      .eq("professional_id", item.id), supabase.from("professional_breaks").select("weekday,starts_at,ends_at").eq("professional_id", item.id)]);
    const saved = data || [];
    setProfessionalSchedule(
      hours.map((day) => {
        const stored = saved.find((row) => row.weekday === day.weekday);
        return stored
          ? {
              weekday: day.weekday,
              opens_at: stored.opens_at?.slice(0, 5) || "",
              closes_at: stored.closes_at?.slice(0, 5) || "",
              is_closed: stored.is_closed,
            }
          : { ...day };
      }),
    );
    setProfessionalBreaks(Object.fromEntries((breaks || []).map(row => [row.weekday, { starts_at: row.starts_at.slice(0, 5), ends_at: row.ends_at.slice(0, 5) }])));
    setEditingProfessionalSchedule(item);
  }
  async function saveProfessionalSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProfessionalSchedule) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const values = professionalSchedule.map((day) => {
      const isClosed = form.get(`closed-${day.weekday}`) === "on";
      return {
        professional_id: editingProfessionalSchedule.id,
        weekday: day.weekday,
        is_closed: isClosed,
        opens_at: isClosed
          ? null
          : String(form.get(`opens-${day.weekday}`) || ""),
        closes_at: isClosed
          ? null
          : String(form.get(`closes-${day.weekday}`) || ""),
      };
    });
    const { error } = await supabase
      .from("professional_hours")
      .upsert(values, { onConflict: "professional_id,weekday" });
    if (!error) {
      await supabase.from("professional_breaks").delete().eq("professional_id", editingProfessionalSchedule.id);
      const pauseValues = professionalSchedule.flatMap(day => {
        const pause = professionalBreaks[day.weekday];
        return !day.is_closed && pause?.starts_at && pause?.ends_at ? [{ professional_id: editingProfessionalSchedule.id, weekday: day.weekday, starts_at: pause.starts_at, ends_at: pause.ends_at }] : [];
      });
      if (pauseValues.length) await supabase.from("professional_breaks").insert(pauseValues);
    }
    setSaving(false);
    if (error) {
      setMessage("Nao foi possivel salvar a agenda do profissional.");
      return;
    }
    setEditingProfessionalSchedule(null);
    setMessage(
      "Agenda individual salva. Profissional liberado para os horarios configurados.",
    );
    await load();
  }

  if (!shop)
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: 30,
          background: "#f6f2ed",
          fontFamily: "Arial,sans-serif",
        }}
      >
        <p>{message}</p>
      </main>
    );
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f2ed",
        color: "#1b1714",
        fontFamily: "Arial,sans-serif",
        padding: "32px 18px 72px",
      }}
    >
      <section style={{ maxWidth: 920, margin: "0 auto" }}>
        <p
          style={{
            color: "#d7612c",
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 1.2,
          }}
        >
          CONFIGURACAO DA BARBEARIA
        </p>
        <h1
          style={{
            font: "bold clamp(30px,5vw,46px) Georgia,serif",
            margin: "0 0 8px",
          }}
        >
          {shop.name}
        </h1>
        <p style={{ color: "#6d6257", marginBottom: 18 }}>{message}</p>
        <section style={{ ...card, marginBottom: 18, background: "#fff8f3" }}>
          <b>Link publico da sua barbearia</b>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginTop: 8,
            }}
          >
            <code style={{ overflowWrap: "anywhere", color: "#7b3519" }}>
              {publicLink}
            </code>
            <button
              type="button"
              onClick={() => void copyPublicLink()}
              style={{ ...button, padding: "8px 12px" }}
            >
              Copiar link
            </button>
          </div>
          <small style={{ display: "block", marginTop: 8, color: "#6d6257" }}>
            Divulgue este endereco no Instagram, Facebook e WhatsApp.
          </small>
        </section>
        <div style={{ display: "grid", gap: 18 }}>
          <section style={card}>
            <h2 style={{ marginTop: 0 }}>1. Dados e contatos</h2>
            {!editingProfile ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                    gap: 12,
                    lineHeight: 1.55,
                  }}
                >
                  <div>
                    <b>Telefone</b>
                    <br />
                    {shop.phone || "Nao informado"}
                  </div>
                  <div>
                    <b>WhatsApp</b>
                    <br />
                    {shop.whatsapp || "Nao informado"}
                  </div>
                  <div>
                    <b>E-mail para notificacoes</b>
                    <br />
                    {shop.notification_email || "Nao informado"}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <b>Endereco</b>
                    <br />
                    {shop.address || "Nao informado"}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <b>Descricao</b>
                    <br />
                    {shop.description || "Nao informada"}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button
                    onClick={() => setEditingProfile(true)}
                    style={button}
                  >
                    Editar dados cadastrais
                  </button>
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...button,
                        textDecoration: "none",
                        background: "#16874b",
                      }}
                    >
                      Testar WhatsApp
                    </a>
                  )}
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        ...button,
                        textDecoration: "none",
                        background: "#425e9b",
                      }}
                    >
                      Testar Google Maps
                    </a>
                  )}
                </div>
              </>
            ) : (
              <form onSubmit={saveProfile}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                    gap: 12,
                  }}
                >
                  <label>
                    Nome da barbearia
                    <input
                      required
                      style={input}
                      value={shop.name}
                      onChange={(event) =>
                        setShop({ ...shop, name: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Telefone
                    <input
                      style={input}
                      value={shop.phone || ""}
                      placeholder="(11) 3333-3333"
                      onChange={(event) =>
                        setShop({ ...shop, phone: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    WhatsApp
                    <input
                      style={input}
                      value={shop.whatsapp || ""}
                      placeholder="5511999999999"
                      onChange={(event) =>
                        setShop({ ...shop, whatsapp: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    E-mail para notificacoes
                    <input
                      required
                      type="email"
                      style={input}
                      value={shop.notification_email || ""}
                      placeholder="contato@barbearia.com"
                      onChange={(event) =>
                        setShop({
                          ...shop,
                          notification_email: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Foto da barbearia (link da imagem)
                    <input
                      type="url"
                      style={input}
                      value={shop.photo_url || ""}
                      placeholder="https://..."
                      onChange={(event) =>
                        setShop({ ...shop, photo_url: event.target.value })
                      }
                    />
                  </label>
                </div>
                <label style={{ display: "block", marginTop: 12 }}>
                  Endereco completo
                  <input
                    style={input}
                    value={shop.address || ""}
                    placeholder="Rua, numero, bairro, cidade"
                    onChange={(event) =>
                      setShop({ ...shop, address: event.target.value })
                    }
                  />
                </label>
                <label style={{ display: "block", marginTop: 12 }}>
                  Descricao curta
                  <textarea
                    style={{ ...input, minHeight: 82, resize: "vertical" }}
                    value={shop.description || ""}
                    onChange={(event) =>
                      setShop({ ...shop, description: event.target.value })
                    }
                  />
                </label>
                {shop.photo_url && (
                  <img
                    src={shop.photo_url}
                    alt="Previa da barbearia"
                    style={{
                      marginTop: 14,
                      width: 112,
                      height: 112,
                      borderRadius: 10,
                      objectFit: "cover",
                    }}
                  />
                )}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                    marginTop: 16,
                  }}
                >
                  <button disabled={saving} style={button}>
                    Salvar dados
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    style={{ ...button, background: "#725b4b" }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>
          <form onSubmit={saveHours} style={card}>
            <h2 style={{ marginTop: 0 }}>2. Dias e horarios</h2>
            <div style={{ display: "grid", gap: 9 }}>
              {hours.map((day) => (
                <div
                  key={day.weekday}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(105px,1fr) 88px 88px auto",
                    alignItems: "center",
                    gap: 9,
                  }}
                >
                  <b>{days[day.weekday]}</b>
                  <input
                    disabled={day.is_closed}
                    type="time"
                    style={input}
                    value={day.opens_at}
                    onChange={(event) =>
                      changeHour(day.weekday, { opens_at: event.target.value })
                    }
                  />
                  <input
                    disabled={day.is_closed}
                    type="time"
                    style={input}
                    value={day.closes_at}
                    onChange={(event) =>
                      changeHour(day.weekday, { closes_at: event.target.value })
                    }
                  />
                  <label style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                    <input
                      type="checkbox"
                      checked={day.is_closed}
                      onChange={(event) =>
                        changeHour(day.weekday, {
                          is_closed: event.target.checked,
                        })
                      }
                    />{" "}
                    Fechado
                  </label>
                </div>
              ))}
            </div>
            <button disabled={saving} style={{ ...button, marginTop: 16 }}>
              Salvar horarios
            </button>
          </form>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 18,
            }}
          >
            <article style={card}>
              <h2 style={{ marginTop: 0 }}>3. Servicos e precos</h2>
              <form onSubmit={addService} style={{ display: "grid", gap: 8 }}>
                <label>
                  Nome do servico
                  <input
                    required
                    style={input}
                    value={serviceName}
                    onChange={(event) => setServiceName(event.target.value)}
                  />
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <label>
                    Valor (R$)
                    <input
                      required
                      min="0"
                      type="number"
                      step="0.01"
                      style={input}
                      value={price}
                      placeholder="Ex.: 55,00"
                      onChange={(event) => setPrice(event.target.value)}
                    />
                  </label>
                  <label>
                    Duracao (minutos)
                    <input
                      required
                      min="5"
                      type="number"
                      style={input}
                      value={duration}
                      placeholder="Ex.: 45"
                      onChange={(event) => setDuration(event.target.value)}
                    />
                  </label>
                </div>
                <button style={button}>Adicionar servico</button>
              </form>
              {services.map((item) => (
                <div
                  key={item.id}
                  style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}
                >
                  {editingService?.id === item.id ? (
                    <form
                      onSubmit={saveServiceEdit}
                      style={{
                        display: "grid",
                        gap: 8,
                        gridTemplateColumns: "minmax(0,1fr) 120px 120px",
                      }}
                    >
                      <label>
                        Nome do servico
                        <input
                          required
                          style={input}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                        />
                      </label>
                      <label>
                        Valor (R$)
                        <input
                          required
                          min="0"
                          type="number"
                          step="0.01"
                          style={input}
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                        />
                      </label>
                      <label>
                        Duracao (minutos)
                        <input
                          required
                          min="5"
                          type="number"
                          style={input}
                          value={editDuration}
                          onChange={(event) =>
                            setEditDuration(event.target.value)
                          }
                        />
                      </label>
                      <button style={{ ...button, gridColumn: "1 / 3" }}>
                        Salvar edicao
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        style={{ ...button, background: "#725b4b" }}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span>
                          <b>{item.name}</b>
                          <br />
                          <small>
                            R$ {item.price} | {item.duration_minutes} min |{" "}
                            {item.active ? "Ativo" : "Inativo"}
                          </small>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => beginServiceEdit(item)}
                          style={{ ...button, background: "#425e9b" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void toggle("services", item)}
                          style={{
                            ...button,
                            background: item.active ? "#725b4b" : "#39723f",
                          }}
                        >
                          {item.active ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </article>
            <article style={card}>
              <h2 style={{ marginTop: 0 }}>4. Profissionais</h2>
              <form
                onSubmit={addProfessional}
                style={{ display: "flex", gap: 8 }}
              >
                <input
                  required
                  style={input}
                  value={professionalName}
                  placeholder="Nome do profissional"
                  onChange={(event) => setProfessionalName(event.target.value)}
                />
                <button style={button}>Adicionar</button>
              </form>
              {professionals.map((item) => (
                <div
                  key={item.id}
                  style={{ padding: "14px 0", borderBottom: "1px solid #eee" }}
                >
                  {editingProfessional?.id === item.id ? (
                    <form
                      onSubmit={saveProfessionalEdit}
                      style={{ display: "flex", gap: 8 }}
                    >
                      <input
                        required
                        style={input}
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                      />
                      <button style={button}>Salvar</button>
                      <button
                        type="button"
                        onClick={() => setEditingProfessional(null)}
                        style={{ ...button, background: "#725b4b" }}
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <>
                      <span>
                        <b>{item.name}</b>
                        <br />
                        <small>
                          {item.active ? "Ativo para agenda" : "Inativo"}
                        </small>
                        {!item.scheduleConfigured && (
                          <>
                            <br />
                            <small
                              style={{
                                display: "inline-block",
                                marginTop: 5,
                                color: "#9a3a13",
                                fontWeight: 800,
                              }}
                            >
                              Agenda nao configurada - indisponivel para
                              agendamento
                            </small>
                          </>
                        )}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          onClick={() => beginProfessionalEdit(item)}
                          style={{ ...button, background: "#425e9b" }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => void beginProfessionalSchedule(item)}
                          style={{ ...button, background: "#4c6b45" }}
                        >
                          {item.scheduleConfigured
                            ? "Editar agenda"
                            : "Configurar agenda"}
                        </button>
                        <button
                          onClick={() => void toggle("professionals", item)}
                          style={{
                            ...button,
                            background: item.active ? "#725b4b" : "#39723f",
                          }}
                        >
                          {item.active ? "Inativar" : "Ativar"}
                        </button>
                      </div>
                      {editingProfessionalSchedule?.id === item.id && (
                        <form
                          onSubmit={saveProfessionalSchedule}
                          style={{
                            marginTop: 14,
                            padding: 12,
                            background: "#f6f2ed",
                            borderRadius: 8,
                          }}
                        >
                          <b>Agenda de {item.name}</b>
                          <p
                            style={{
                              margin: "6px 0 10px",
                              fontSize: 13,
                              color: "#6d6257",
                            }}
                          >
                            A agenda abaixo parte do horario geral da barbearia
                            e pode ser ajustada para este profissional.
                          </p>
                          <div style={{ display: "grid", gap: 7 }}>
                            {professionalSchedule.map((day) => (
                              <div
                                key={day.weekday}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "78px minmax(90px,1fr) minmax(90px,1fr) auto",
                                  gap: 6,
                                  alignItems: "center",
                                }}
                              >
                                <b style={{ fontSize: 12 }}>
                                  {days[day.weekday]}
                                </b>
                                <input
                                  name={`opens-${day.weekday}`}
                                  disabled={day.is_closed}
                                  aria-label={`Inicio ${days[day.weekday]}`}
                                  type="time"
                                  style={input}
                                  value={day.opens_at}
                                  onChange={(event) =>
                                    changeProfessionalHour(day.weekday, {
                                      opens_at: event.target.value,
                                    })
                                  }
                                />
                                <input
                                  name={`closes-${day.weekday}`}
                                  disabled={day.is_closed}
                                  aria-label={`Fim ${days[day.weekday]}`}
                                  type="time"
                                  style={input}
                                  value={day.closes_at}
                                  onChange={(event) =>
                                    changeProfessionalHour(day.weekday, {
                                      closes_at: event.target.value,
                                    })
                                  }
                                />
                                <label
                                  style={{ fontSize: 12, whiteSpace: "nowrap" }}
                                >
                                  <input
                                    name={`closed-${day.weekday}`}
                                    type="checkbox"
                                    checked={day.is_closed}
                                    onChange={(event) =>
                                      changeProfessionalHour(day.weekday, {
                                        is_closed: event.target.checked,
                                      })
                                    }
                                  />{" "}
                                  Fechado
                                </label>
                                <div style={{ gridColumn: "2 / -1", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                  <label style={{ fontSize: 12 }}>Pausa início<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.starts_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: event.target.value, ends_at: current[day.weekday]?.ends_at || "" } }))} /></label>
                                  <label style={{ fontSize: 12 }}>Pausa fim<input disabled={day.is_closed} type="time" style={input} value={professionalBreaks[day.weekday]?.ends_at || ""} onChange={event => setProfessionalBreaks(current => ({ ...current, [day.weekday]: { starts_at: current[day.weekday]?.starts_at || "", ends_at: event.target.value } }))} /></label>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div
                            style={{ display: "flex", gap: 8, marginTop: 12 }}
                          >
                            <button disabled={saving} style={button}>
                              Salvar agenda
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingProfessionalSchedule(null)
                              }
                              style={{ ...button, background: "#725b4b" }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              ))}
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
