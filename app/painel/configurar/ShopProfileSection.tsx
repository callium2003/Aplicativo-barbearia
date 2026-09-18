import NextImage from "next/image";
import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from "react";

import ActionFeedback from "../ActionFeedback";
import type { Shop } from "./settings-shared";

type PhotoPresentation = {
  source: string | null;
  alt: string;
  initials: string;
};

type ShopProfileSectionProps = {
  shop: Shop;
  setShop: Dispatch<SetStateAction<Shop | null>>;
  savedShop: Shop | null;
  imageInputRef: RefObject<HTMLInputElement | null>;
  uploadingImage: boolean;
  selectImage: (file: File | null) => void;
  photoPresentation: PhotoPresentation;
  setFailedPhotoSource: Dispatch<SetStateAction<string | null>>;
  selectedImage: File | null;
  clearSelectedImage: () => void;
  uploadSelectedImage: () => Promise<void>;
  imageMessage: string;
  imageValidationMessage: string;
  saveProfile: FormEventHandler<HTMLFormElement>;
  profileDirty: boolean;
  saving: boolean;
  profileMessage: string;
  publicLink: string;
  displayPublicLink: string;
  setupRequirements: string[];
  copyPublicLink: () => Promise<void>;
  whatsappLink: string;
  mapsLink: string;
  publicLinkMessage: string;
};

export default function ShopProfileSection({
  shop,
  setShop,
  savedShop,
  imageInputRef,
  uploadingImage,
  selectImage,
  photoPresentation,
  setFailedPhotoSource,
  selectedImage,
  clearSelectedImage,
  uploadSelectedImage,
  imageMessage,
  imageValidationMessage,
  saveProfile,
  profileDirty,
  saving,
  profileMessage,
  publicLink,
  displayPublicLink,
  setupRequirements,
  copyPublicLink,
  whatsappLink,
  mapsLink,
  publicLinkMessage,
}: ShopProfileSectionProps) {
  return (
    <section className="management-shop-profile" id="dados-barbearia">
      <header className="management-shop-profile-heading">
        <p>PERFIL PÚBLICO</p>
        <h2>{shop.name}</h2>
        <span>Estas informações aparecem para seus clientes.</span>
      </header>
      <form className="management-shop-form" onSubmit={saveProfile}>
        <div className="management-shop-profile-card">
          <section className="management-shop-photo-section" aria-labelledby="barbershop-photo-title">
            <h3 id="barbershop-photo-title">Foto da barbearia</h3>
            <input
              id="barbershop-image-input"
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              aria-describedby="barbershop-image-help"
              disabled={uploadingImage}
              className="management-shop-file-input"
              onChange={(event) => selectImage(event.target.files?.[0] || null)}
            />
            <div className="management-shop-photo-row">
              <div className="management-shop-photo">
                {photoPresentation.source ? (
                  <NextImage
                    src={photoPresentation.source}
                    unoptimized
                    alt={photoPresentation.alt}
                    width={120}
                    height={120}
                    sizes="120px"
                    onError={() => setFailedPhotoSource(photoPresentation.source)}
                  />
                ) : (
                  <span aria-label={photoPresentation.alt}>{photoPresentation.initials}</span>
                )}
              </div>
              <label
                htmlFor="barbershop-image-input"
                aria-disabled={uploadingImage}
                className="management-shop-secondary-action"
              >
                Trocar foto
              </label>
            </div>
            <p id="barbershop-image-help">
              Esta foto aparece no perfil público da barbearia. Use JPG, PNG ou WebP, com no máximo 3 MB.
              No celular, escolha na galeria/Fotos ou em Arquivos. A prévia ainda não publica a foto.
            </p>
            {selectedImage && (
              <div className="management-shop-photo-pending">
                <p>
                  Nova imagem: <b>{selectedImage.name}</b> ({(selectedImage.size / 1024 / 1024).toFixed(2)} MB).
                </p>
                <div>
                  <button
                    type="button"
                    disabled={uploadingImage}
                    className="management-shop-secondary-action"
                    onClick={clearSelectedImage}
                  >
                    Descartar seleção
                  </button>
                  <button
                    type="button"
                    disabled={uploadingImage}
                    className="management-shop-primary-action"
                    onClick={() => void uploadSelectedImage()}
                  >
                    {uploadingImage ? "Enviando e salvando foto..." : "Enviar e salvar foto"}
                  </button>
                </div>
              </div>
            )}
            {imageMessage && (
              <p
                role="status"
                className={imageMessage === imageValidationMessage || imageMessage.startsWith("Não foi") ? "management-shop-feedback error" : "management-shop-feedback success"}
              >
                {imageMessage}
              </p>
            )}
          </section>

          <div className="management-shop-fields">
            <label>
              Nome da barbearia
              <input
                required
                value={shop.name}
                onChange={(event) => setShop({ ...shop, name: event.target.value })}
              />
            </label>
            <div className="management-shop-field-grid">
              <label>
                Telefone
                <input
                  value={shop.phone || ""}
                  placeholder="(11) 3333-3333"
                  onChange={(event) => setShop({ ...shop, phone: event.target.value })}
                />
              </label>
              <label>
                WhatsApp
                <input
                  value={shop.whatsapp || ""}
                  placeholder="5511999999999"
                  onChange={(event) => setShop({ ...shop, whatsapp: event.target.value })}
                />
              </label>
            </div>
            <label>
              E-mail para notificações
              <input
                required
                type="email"
                value={shop.notification_email || ""}
                placeholder="contato@barbearia.com"
                onChange={(event) => setShop({ ...shop, notification_email: event.target.value })}
              />
            </label>

            <div className="management-shop-fields-divider">
              <span>LOCALIZAÇÃO E PERFIL</span>
            </div>

            <label>
              Endereço completo
              <input
                value={shop.address || ""}
                placeholder="Rua, número, bairro, cidade"
                onChange={(event) => setShop({ ...shop, address: event.target.value })}
              />
            </label>
            <label>
              Descrição curta
              <textarea
                value={shop.description || ""}
                onChange={(event) => setShop({ ...shop, description: event.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="management-shop-form-actions">
          <button
            className="management-shop-primary-action"
            disabled={!profileDirty || saving || uploadingImage}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            className="management-shop-secondary-action"
            disabled={!profileDirty || saving || uploadingImage}
            onClick={() => savedShop && setShop(savedShop)}
          >
            Descartar alterações
          </button>
        </div>
        <ActionFeedback message={profileMessage} tone={profileMessage.startsWith("Não foi") ? "error" : "success"} />
      </form>

      <aside className="management-shop-public-tools" aria-labelledby="management-shop-public-tools-title">
        <div>
          <p>VISUALIZAÇÃO PÚBLICA</p>
          <h3 id="management-shop-public-tools-title">Link público da barbearia</h3>
          <span>Confira como seus clientes veem a barbearia.</span>
          {publicLink && <code>{displayPublicLink}</code>}
        </div>
        {!!setupRequirements.length && (
          <div className="management-public-booking-warning" role="status">
            <b>Agendamento online indisponível</b>
            <p>Configure as informações de agenda, profissionais e serviços na aba Mais para começar a usufruir da sua nova ferramenta de gestão da barbearia.</p>
          </div>
        )}
        <div className="management-shop-public-actions">
          {publicLink && (
            <>
              <a href={publicLink} target="_blank" rel="noreferrer">
                Ver página pública
              </a>
              <button type="button" onClick={() => void copyPublicLink()}>
                Copiar link público
              </button>
            </>
          )}
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              Testar WhatsApp
            </a>
          )}
          {mapsLink && (
            <a href={mapsLink} target="_blank" rel="noreferrer">
              Testar Google Maps
            </a>
          )}
        </div>
        {publicLinkMessage && (
          <p
            role="status"
            className={publicLinkMessage === "Link copiado com sucesso." ? "management-shop-feedback success" : "management-shop-feedback error"}
          >
            {publicLinkMessage}
          </p>
        )}
      </aside>
    </section>
  );
}
