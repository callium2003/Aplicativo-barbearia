"use client";

import { useState } from "react";

const services = [
  "Corte masculino · R$ 55",
  "Barba completa · R$ 40",
  "Corte + barba · R$ 85",
];
const days = ["Hoje, 31 Jul", "Sex, 1 Ago", "Sáb, 2 Ago", "Seg, 4 Ago", "Ter, 5 Ago"];
const times = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const professionals: Record<string, string[]> = {
  "09:00": ["João Martins", "Rafael Souza"],
  "10:00": ["João Martins", "Lucas Costa"],
  "11:00": ["Rafael Souza"],
  "14:00": ["João Martins", "Rafael Souza", "Lucas Costa"],
  "15:00": ["João Martins", "Lucas Costa"],
  "16:00": ["Rafael Souza", "Lucas Costa"],
  "17:00": ["João Martins", "Rafael Souza"],
  "18:00": ["Lucas Costa"],
};

const baseButton = { border: "1px solid #e6ddd4", background: "white" };
const selectedButton = { border: "2px solid #e4773a", background: "#fff5ef" };

export default function Page() {
  const [service, setService] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [professional, setProfessional] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setService(""); setDay(""); setTime(""); setProfessional(""); setShowCustomerForm(false);
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone(""); setSubmitted(false);
  };

  return (
    <main style={{ fontFamily: "Arial, sans-serif", background: "#f5f1eb", minHeight: "100vh", color: "#191512" }}>
      <header style={{ background: "#171310", color: "white", padding: "24px 10vw 68px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#cbbfb1" }}>
          <a href="/" style={{ color: "white", textDecoration: "none", fontWeight: 800 }}>BARBEARIA<span style={{ color: "#e99358" }}>SP</span></a>
          <span>São Paulo, SP</span>
        </div>
        <div style={{ maxWidth: 1000, margin: "60px auto 0" }}>
          <p style={{ color: "#e99358", fontWeight: 800, fontSize: 11, letterSpacing: 2 }}>PÁGINA DA BARBEARIA</p>
          <h1 style={{ font: "bold clamp(48px,7vw,88px)/.9 Georgia,serif", margin: 0 }}>Barbearia <i style={{ color: "#e99358", fontWeight: 400 }}>do João.</i></h1>
          <p style={{ color: "#cbbfb1" }}>Cortes, barba e estilo. Agende online em poucos passos.</p>
        </div>
      </header>

      <section style={{ maxWidth: 1000, margin: "-28px auto 0", padding: "0 24px 70px", display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 22 }}>
        <div style={{ background: "white", padding: 32, borderRadius: 9, boxShadow: "0 12px 30px #291b1020" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "45px 0" }}>
              <div style={{ fontSize: 44 }}>✓</div>
              <h2 style={{ font: "bold 42px Georgia,serif" }}>Pedido de agendamento enviado.</h2>
              <p>Quando o sistema estiver conectado, a confirmação será enviada para {customerEmail}.</p>
              <button onClick={reset} style={{ padding: 14, border: 0, background: "#e4773a", color: "white", fontWeight: 800 }}>Fazer outro agendamento</button>
            </div>
          ) : (
            <>
              <p style={{ color: "#d7612c", fontWeight: 800, fontSize: 11, letterSpacing: 2 }}>AGENDAMENTO ONLINE</p>
              <h2 style={{ font: "bold clamp(32px,4vw,52px)/.96 Georgia,serif", margin: "0 0 24px" }}>Escolha seu horário.</h2>
              <div style={{ display: "grid", gap: 26 }}>
                <div>
                  <b>1. Serviço</b>
                  <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                    {services.map((item) => <button key={item} onClick={() => { setService(item); setTime(""); setProfessional(""); setShowCustomerForm(false); }} style={{ ...baseButton, ...(service === item ? selectedButton : {}), padding: 14, textAlign: "left", cursor: "pointer", fontWeight: 700 }}>{item}</button>)}
                  </div>
                </div>
                {service && <div>
                  <b>2. Data</b>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {days.map((item) => <button key={item} onClick={() => { setDay(item); setTime(""); setProfessional(""); setShowCustomerForm(false); }} style={{ ...baseButton, ...(day === item ? selectedButton : {}), padding: "12px 10px", cursor: "pointer" }}>{item}</button>)}
                  </div>
                </div>}
                {day && <div>
                  <b>3. Horário disponível</b>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {times.map((item) => <button key={item} onClick={() => { setTime(item); setProfessional(""); setShowCustomerForm(false); }} style={{ ...baseButton, ...(time === item ? selectedButton : {}), padding: "12px 16px", cursor: "pointer", fontWeight: 700 }}>{item}</button>)}
                  </div>
                </div>}
                {time && <div>
                  <b>4. Profissionais disponíveis às {time}</b>
                  <p style={{ color: "#73685e", margin: "7px 0" }}>Aparecem apenas profissionais que estão livres nesse horário.</p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {professionals[time].map((item) => <button key={item} onClick={() => { setProfessional(item); setShowCustomerForm(false); }} style={{ ...baseButton, ...(professional === item ? selectedButton : {}), padding: 15, textAlign: "left", cursor: "pointer", fontWeight: 700 }}>{item} <small style={{ color: "#71685f", marginLeft: 8 }}>Disponível</small></button>)}
                  </div>
                </div>}
                {professional && !showCustomerForm && <button onClick={() => setShowCustomerForm(true)} style={{ padding: 16, border: 0, background: "#e4773a", color: "white", fontWeight: 800, cursor: "pointer" }}>Continuar para seus dados</button>}
                {showCustomerForm && <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} style={{ display: "grid", gap: 12, borderTop: "1px solid #e6ddd4", paddingTop: 24 }}>
                  <b>5. Seus dados</b>
                  <p style={{ color: "#73685e", margin: 0 }}>Usaremos seu e-mail para enviar a confirmação do agendamento.</p>
                  <label>Nome completo<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Seu nome" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 13, border: "1px solid #d9d0c8", borderRadius: 4 }} /></label>
                  <label>E-mail<input required type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="voce@email.com" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 13, border: "1px solid #d9d0c8", borderRadius: 4 }} /></label>
                  <label>Celular<input required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="(11) 99999-9999" style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, padding: 13, border: "1px solid #d9d0c8", borderRadius: 4 }} /></label>
                  <div style={{ background: "#fff5ef", padding: 14, lineHeight: 1.6 }}><b>Resumo:</b><br />{service}<br />{day}, {time} · {professional}</div>
                  <button type="submit" style={{ padding: 16, border: 0, background: "#e4773a", color: "white", fontWeight: 800, cursor: "pointer" }}>Confirmar pedido de agendamento</button>
                </form>}
              </div>
            </>
          )}
        </div>
        <aside style={{ background: "#fff", padding: 26, borderRadius: 9, height: "max-content" }}>
          <b>BARBEARIA DO JOÃO</b>
          <p style={{ color: "#6d6257", lineHeight: 1.7 }}>Rua Augusta, 1520<br />Consolação — São Paulo<br /><br />(11) 99999-0000<br />@barbeariadojoao</p>
          <hr style={{ border: 0, borderTop: "1px solid #eee" }} />
          <b>HORÁRIOS</b>
          <p style={{ color: "#6d6257", lineHeight: 1.7 }}>Seg a Sex · 9h às 20h<br />Sábado · 9h às 18h</p>
        </aside>
      </section>
    </main>
  );
}
