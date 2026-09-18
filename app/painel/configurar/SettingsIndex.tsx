import Link from "next/link";

export default function SettingsIndex() {
  return (
    <nav className="ios-settings-group management-settings-index" aria-label="Áreas de configuração">
      <a href="#dados-barbearia" className="ios-settings-item">
        <div className="ios-settings-item-left">
          <div>
            <div className="ios-settings-item-title">Dados da barbearia</div>
            <div className="ios-settings-item-sub">Endereço, contato e perfil público</div>
          </div>
        </div>
        <span className="ios-settings-chevron">›</span>
      </a>
      <a href="#servicos" className="ios-settings-item">
        <div className="ios-settings-item-left">
          <div>
            <div className="ios-settings-item-title">Serviços</div>
            <div className="ios-settings-item-sub">Preços e duração</div>
          </div>
        </div>
        <span className="ios-settings-chevron">›</span>
      </a>
      <a href="#profissionais" className="ios-settings-item">
        <div className="ios-settings-item-left">
          <div>
            <div className="ios-settings-item-title">Profissionais</div>
            <div className="ios-settings-item-sub">Equipe que atende</div>
          </div>
        </div>
        <span className="ios-settings-chevron">›</span>
      </a>
      <a href="#agenda-horarios" className="ios-settings-item">
        <div className="ios-settings-item-left">
          <div>
            <div className="ios-settings-item-title">Agenda e horários</div>
            <div className="ios-settings-item-sub">Expediente e disponibilidade</div>
          </div>
        </div>
        <span className="ios-settings-chevron">›</span>
      </a>
      <Link href="/painel/relatorios" className="ios-settings-item">
        <div className="ios-settings-item-left"><div><div className="ios-settings-item-title">Relatórios e comissões</div><div className="ios-settings-item-sub">Resultados, equipe e repasses</div></div></div>
        <span className="ios-settings-chevron">›</span>
      </Link>
      <Link href="/painel/assinatura" className="ios-settings-item">
        <div className="ios-settings-item-left">
          <div>
            <div className="ios-settings-item-title">Assinatura e plano</div>
            <div className="ios-settings-item-sub">Plano atual e cobrança</div>
          </div>
        </div>
        <span className="ios-settings-chevron">›</span>
      </Link>
    </nav>
  );
}
