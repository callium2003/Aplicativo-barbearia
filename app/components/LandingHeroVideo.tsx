"use client";

import { useRef, useState } from "react";
import styles from "./landing-hero-video.module.css";

export default function LandingHeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div className={styles.wrapper}>
      {/* Badges flutuantes em movimento sutil */}
      <div className={`${styles.badge} ${styles.badgeTopLeft}`}>
        <span className={styles.badgeIcon}>⚡</span>
        <div>
          <strong>Agendamento 24h</strong>
          <small>Zero clientes perdidos</small>
        </div>
      </div>

      <div className={`${styles.badge} ${styles.badgeBottomRight}`}>
        <span className={styles.badgeIcon}>🔔</span>
        <div>
          <strong>Lembretes Automáticos</strong>
          <small>Reduz até 70% das faltas</small>
        </div>
      </div>

      <div className={`${styles.badge} ${styles.badgeBottomLeft}`}>
        <span className={styles.badgeIcon}>📱</span>
        <div>
          <strong>100% no Navegador</strong>
          <small>Cliente não baixa nada</small>
        </div>
      </div>

      {/* Mockup de Smartphone Moderno */}
      <div className={styles.phoneFrame}>
        <div className={styles.phoneSpeaker} />
        <div className={styles.phoneCamera} />

        <div className={styles.videoContainer}>
          <video
            ref={videoRef}
            className={styles.videoElement}
            src="/videos/barbeariasp-apresentacao.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
            aria-label="Demonstração em vídeo do aplicativo web BarbeariaSP"
          />

          <div className={styles.videoControlsOverlay}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pausar vídeo" : "Reproduzir vídeo"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={toggleMute}
              aria-label={isMuted ? "Ativar som" : "Desativar som"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

