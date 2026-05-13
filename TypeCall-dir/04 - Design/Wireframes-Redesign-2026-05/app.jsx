// App entry — composes all TypeCall wireframes into a design canvas.

function App() {
  const { useState } = React;
  return (
    <DesignCanvas>
      <DCSection id="intro" title="TypeCall — Redesign Premium B2B" subtitle="Wireframes · cada tela em 2 variações. Aprovado este passo → hi-fi com dark green + ouro.">
      </DCSection>

      <DCSection id="auth" title="01 · Login & Onboarding" subtitle="Como o operador entra e configura.">
        <DCArtboard id="auth-a" label="A · Editorial split" width={1280} height={820}>
          <AuthSplit />
        </DCArtboard>
        <DCArtboard id="auth-b" label="B · Centered stepper (onboarding)" width={1280} height={820}>
          <AuthOnboarding />
        </DCArtboard>
      </DCSection>

      <DCSection id="dashboard" title="02 · Sales Dashboard" subtitle="O que o SDR lead abre toda manhã.">
        <DCArtboard id="dash-a" label="A · Editorial hero + side context" width={1440} height={900}>
          <DashboardEditorial />
        </DCArtboard>
        <DCArtboard id="dash-b" label="B · Operator dense (mais dados)" width={1440} height={900}>
          <DashboardOperator />
        </DCArtboard>
      </DCSection>

      <DCSection id="builder" title="03 · Form Builder" subtitle="Drag-and-drop do funil conversacional.">
        <DCArtboard id="build-a" label="A · Lista linear (3 painéis)" width={1440} height={860}>
          <BuilderClassic />
        </DCArtboard>
        <DCArtboard id="build-b" label="B · Node graph (branches visuais)" width={1440} height={860}>
          <BuilderNodeGraph />
        </DCArtboard>
      </DCSection>

      <DCSection id="calendar" title="04 · Calendário / Reuniões" subtitle="A agenda fundida com o funil.">
        <DCArtboard id="cal-a" label="A · Semana + detail rail" width={1440} height={900}>
          <CalendarWeek />
        </DCArtboard>
        <DCArtboard id="cal-b" label="B · Pipeline kanban" width={1440} height={900}>
          <CalendarPipeline />
        </DCArtboard>
      </DCSection>

      <DCSection id="public" title="05 · Página pública do funil" subtitle="O que o lead vê. A primeira impressão da marca do cliente.">
        <DCArtboard id="pub-a" label="A · Conversacional editorial" width={1280} height={820}>
          <PublicConversational />
        </DCArtboard>
        <DCArtboard id="pub-b" label="B · Card de agendamento" width={1280} height={820}>
          <PublicScheduleCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="settings" title="06 · Settings & Integrações" subtitle="A camada que vende para o head de RevOps.">
        <DCArtboard id="set-a" label="A · Hub de integrações (grid)" width={1440} height={900}>
          <SettingsHub />
        </DCArtboard>
        <DCArtboard id="set-b" label="B · Detalhe de integração (Salesforce)" width={1440} height={900}>
          <SettingsIntegrationDetail />
        </DCArtboard>
      </DCSection>

      <DCSection id="landing" title="07 · Landing marketing typecall.io" subtitle="A aquisição. Tom premium B2B.">
        <DCArtboard id="land-a" label="A · Editorial (Stripe / Linear)" width={1440} height={1700}>
          <LandingEditorial />
        </DCArtboard>
        <DCArtboard id="land-b" label="B · Product-first com tabela comparativa" width={1440} height={1700}>
          <LandingProductFirst />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
