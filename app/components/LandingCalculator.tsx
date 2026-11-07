"use client";

import { useState } from "react";
import styles from "./landing-calculator.module.css";

export default function LandingCalculator() {
  const [barbers, setBarbers] = useState(3);

  // Estimativas reais do setor:
  // - 12h gastas respondendo WhatsApp e agendando manualmente por mês por barbeiro
  // - 5 faltas evitadas por mês por barbeiro com lembretes automáticos
  // - Ticket médio estimado de R$ 50,00 por corte/barba
  const hoursSaved = barbers * 12;
  const missedCutsPrevented = barbers * 5;
  const estimatedRevenueRecovered = missedCutsPrevented * 50;

  return (
    <div className={styles.calculatorCard}>
      <div className={styles.header}>
        <span className={styles.badge}>SIMULE SEUS GANHOS</span>
        <h3>Quanto a BarbeariaSP economiza para você todo mês?</h3>
        <p>Arraste para selecionar a quantidade de profissionais na sua barbearia:</p>
      </div>

      <div className={styles.sliderSection}>
        <div className={styles.sliderHeader}>
          <span>Profissionais na equipe:</span>
          <strong className={styles.barberCount}>{barbers} {barbers === 1 ? "barbeiro" : "barbeiros"}</strong>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={barbers}
          onChange={(e) => setBarbers(Number(e.target.value))}
          className={styles.slider}
          aria-label="Quantidade de barbeiros"
        />
        <div className={styles.sliderScale}>
          <span>1</span>
          <span>3</span>
          <span>5</span>
          <span>7</span>
          <span>10+</span>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricItem}>
          <span className={styles.metricIcon}>⏱️</span>
          <strong className={styles.metricValue}>+{hoursSaved}h</strong>
          <span className={styles.metricLabel}>Horas livres sem responder WhatsApp todo mês</span>
        </div>

        <div className={styles.metricItem}>
          <span className={styles.metricIcon}>🚫</span>
          <strong className={styles.metricValue}>~{missedCutsPrevented}</strong>
          <span className={styles.metricLabel}>Faltas evitadas com lembretes automáticos</span>
        </div>

        <div className={`${styles.metricItem} ${styles.metricHighlight}`}>
          <span className={styles.metricIcon}>💵</span>
          <strong className={styles.metricValue}>R$ {estimatedRevenueRecovered.toLocaleString("pt-BR")},00</strong>
          <span className={styles.metricLabel}>Faturamento recuperado que seria perdido em faltas</span>
        </div>
      </div>

      <div className={styles.footerNote}>
        <p>
          Enquanto a assinatura custa a partir de <strong>R$ 49,90/mês</strong>, o sistema se paga logo no primeiro final de semana.
        </p>
      </div>
    </div>
  );
}

