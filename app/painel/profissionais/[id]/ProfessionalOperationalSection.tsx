import ActionFeedback from "../../ActionFeedback";
import type { FeedbackValue } from "./professional-detail-shared";

type Props = {
  active: boolean;
  futureCount: number;
  toggleOperational: () => Promise<void>;
  feedback: FeedbackValue;
};

export default function ProfessionalOperationalSection({ active, futureCount, toggleOperational, feedback }: Props) {
  return (
    <details className="product-card management-professional-section management-professional-danger">
      <summary>
        <span>
          <b>{active ? "Inativação" : "Reativação"}</b>
          <small>{active ? "Bloqueia novas reservas e acesso sem apagar histórico" : "Reativa somente o cadastro operacional"}</small>
        </span>
        <span>＋</span>
      </summary>
      <p>{futureCount > 0 ? `${futureCount} compromisso(s) futuro(s) serão preservado(s) para revisão.` : "Nenhum compromisso futuro ativo foi encontrado."}</p>
      <button className={`product-button ${active ? "danger" : ""}`} type="button" onClick={() => void toggleOperational()}>
        {active ? "Inativar profissional" : "Reativar profissional"}
      </button>
      <ActionFeedback {...feedback} />
    </details>
  );
}
