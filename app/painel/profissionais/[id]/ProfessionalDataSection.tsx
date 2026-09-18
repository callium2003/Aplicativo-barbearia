import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

import ActionFeedback from "../../ActionFeedback";
import { professionalInitials } from "../presentation.mjs";
import type { FeedbackValue, FormSubmit, InputRef } from "./professional-detail-shared";

type Props = {
  safePhoto: string | null;
  photoPreview: string;
  photo: File | null;
  removePhoto: boolean;
  name: string;
  phone: string;
  contactEmail: string;
  instagram: string;
  saving: boolean;
  photoInputRef: InputRef;
  setPhoto: Dispatch<SetStateAction<File | null>>;
  setRemovePhoto: Dispatch<SetStateAction<boolean>>;
  setName: Dispatch<SetStateAction<string>>;
  setPhone: Dispatch<SetStateAction<string>>;
  setContactEmail: Dispatch<SetStateAction<string>>;
  setInstagram: Dispatch<SetStateAction<string>>;
  selectPhoto: (file: File | null) => void;
  saveData: FormSubmit;
  feedback: FeedbackValue;
};

export default function ProfessionalDataSection({
  safePhoto,
  photoPreview,
  photo,
  removePhoto,
  name,
  phone,
  contactEmail,
  instagram,
  saving,
  photoInputRef,
  setPhoto,
  setRemovePhoto,
  setName,
  setPhone,
  setContactEmail,
  setInstagram,
  selectPhoto,
  saveData,
  feedback,
}: Props) {
  return (
    <details className="product-card management-professional-section" open>
      <summary>
        <span>
          <b>Dados profissionais</b>
          <small>Contato e perfil público</small>
        </span>
        <span>＋</span>
      </summary>
      <form onSubmit={saveData} className="management-professional-fields">
        <div className="management-professional-photo-editor">
          <div
            className="management-professional-photo-preview"
            style={photoPreview ? { backgroundImage: `url(${photoPreview})` } : undefined}
          >
            {!photoPreview && !removePhoto && safePhoto ? (
              <Image src={safePhoto} alt="" fill sizes="112px" unoptimized />
            ) : !photoPreview && (removePhoto || !safePhoto) ? (
              professionalInitials(name)
            ) : null}
          </div>
          <div>
            <label className="product-button secondary management-photo-picker">
              Escolher nova foto
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectPhoto(event.target.files?.[0] || null)}
              />
            </label>
            {(photo || safePhoto) && !removePhoto && (
              <button
                className="management-text-button"
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setRemovePhoto(Boolean(safePhoto));
                  if (photoInputRef.current) photoInputRef.current.value = "";
                }}
              >
                Remover foto
              </button>
            )}
            <small>JPG, PNG ou WebP; até 2 MB.</small>
          </div>
        </div>
        <label className="product-field">
          <span>Nome</span>
          <input className="product-input" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="product-field">
          <span>Telefone</span>
          <input className="product-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label className="product-field">
          <span>E-mail de contato</span>
          <input className="product-input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          <small>Independente do e-mail de acesso.</small>
        </label>
        <label className="product-field">
          <span>Instagram</span>
          <input className="product-input" type="url" placeholder="https://instagram.com/perfil" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </label>
        <div className="management-action-area">
          <button className="product-button" disabled={saving}>{saving ? "Salvando..." : "Salvar dados"}</button>
          <ActionFeedback {...feedback} />
        </div>
      </form>
    </details>
  );
}
