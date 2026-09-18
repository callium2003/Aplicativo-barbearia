import type { Dispatch, FormEventHandler, SetStateAction } from "react";

import ActionFeedback from "../ActionFeedback";
import { input, type Item } from "./settings-shared";

type ServicesSectionProps = {
  showServiceCreate: boolean;
  setShowServiceCreate: Dispatch<SetStateAction<boolean>>;
  addService: FormEventHandler<HTMLFormElement>;
  serviceName: string;
  setServiceName: Dispatch<SetStateAction<string>>;
  price: string;
  setPrice: Dispatch<SetStateAction<string>>;
  duration: string;
  setDuration: Dispatch<SetStateAction<string>>;
  actionMessage: string;
  serviceFilter: "active" | "inactive";
  setServiceFilter: Dispatch<SetStateAction<"active" | "inactive">>;
  filteredServices: Item[];
  editingService: Item | null;
  saveServiceEdit: FormEventHandler<HTMLFormElement>;
  editName: string;
  setEditName: Dispatch<SetStateAction<string>>;
  editPrice: string;
  setEditPrice: Dispatch<SetStateAction<string>>;
  editDuration: string;
  setEditDuration: Dispatch<SetStateAction<string>>;
  setEditingService: Dispatch<SetStateAction<Item | null>>;
  beginServiceEdit: (item: Item) => void;
  toggle: (table: "services" | "professionals", item: Item) => Promise<void>;
};

export default function ServicesSection({
  showServiceCreate,
  setShowServiceCreate,
  addService,
  serviceName,
  setServiceName,
  price,
  setPrice,
  duration,
  setDuration,
  actionMessage,
  serviceFilter,
  setServiceFilter,
  filteredServices,
  editingService,
  saveServiceEdit,
  editName,
  setEditName,
  editPrice,
  setEditPrice,
  editDuration,
  setEditDuration,
  setEditingService,
  beginServiceEdit,
  toggle,
}: ServicesSectionProps) {
  return (
    <article className="configuration-card management-services-catalog" id="servicos">
      <div className="management-services-heading"><p className="product-eyebrow">Catálogo</p><h2>Serviços oferecidos</h2><p>Defina preço, duração e o que aparece para os clientes.</p></div>
      <button className="management-service-new" type="button" onClick={() => setShowServiceCreate((current) => !current)} aria-expanded={showServiceCreate} aria-controls="new-service-form">{showServiceCreate ? "Fechar novo serviço" : "Novo serviço"}</button>
      {showServiceCreate && <div id="new-service-form">
        <form className="management-service-create" onSubmit={addService}>
          <h3>Novo serviço</h3>
          <label>
            Nome do serviço
            <input
              required
              style={input}
              value={serviceName}
              onChange={(event) => setServiceName(event.target.value)}
            />
          </label>
          <div className="management-service-create-fields">
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
              Duração (minutos)
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
          <button className="management-primary-action management-service-create-action">Adicionar serviço</button>
          <ActionFeedback message={actionMessage} tone={actionMessage.startsWith("Não foi") ? "error" : "success"} />
        </form>
      </div>}
      <div className="management-services-tabs" role="tablist" aria-label="Filtrar serviços">
        <button type="button" role="tab" aria-selected={serviceFilter === "active"} onClick={() => setServiceFilter("active")}>Ativos</button>
        <button type="button" role="tab" aria-selected={serviceFilter === "inactive"} onClick={() => setServiceFilter("inactive")}>Inativos</button>
      </div>
      <div className="management-services-list">
        {filteredServices.map((item) => (
          <div
            className="management-service-card"
            key={item.id}
          >
            {editingService?.id === item.id ? (
              <form
                className="management-service-edit"
                onSubmit={saveServiceEdit}
              >
                <p className="management-service-edit-eyebrow">CATÁLOGO · EDITAR SERVIÇO</p>
                <label>
                  Nome do serviço
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
                  Duração (minutos)
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
                <button className="management-primary-action management-service-edit-save">
                  Salvar edição
                </button>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="management-secondary-action"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <>
                <div className="management-service-summary">
                  <span>
                    <b>{item.name}</b>
                    <br />
                    <small>
                      {item.duration_minutes} min · {Number(item.price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </small>
                  </span>
                  <span className={`management-service-status ${item.active ? "active" : "inactive"}`}>{item.active ? "Ativo" : "Inativo"}</span>
                </div>
                <div className="management-service-actions">
                  <button
                    onClick={() => beginServiceEdit(item)}
                    className="management-secondary-action"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => void toggle("services", item)}
                    className={item.active ? "management-secondary-action" : "management-primary-action"}
                  >
                    {item.active ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {!filteredServices.length && <p className="product-empty">Nenhum serviço {serviceFilter === "active" ? "ativo" : "inativo"} cadastrado.</p>}
      </div>
      <ActionFeedback message={!showServiceCreate ? actionMessage : ""} tone={actionMessage.startsWith("Não foi") ? "error" : "success"} />
      <p className="management-services-note">Serviços inativos não aparecem para novos agendamentos. O histórico é preservado.</p>
    </article>
  );
}
