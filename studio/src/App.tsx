import { useContractStore } from './store/contract-store';
import { Header, StageNav } from './components/layout';
import { FramingScreen, InputsScreen, OutputsScreen, PoliciesScreen, RulesScreen, SimulationScreen } from './components/screens';

function App() {
  const { session, goToStage, isStageAccessible } = useContractStore();

  const renderCurrentScreen = () => {
    switch (session.current_stage) {
      case 'FRAMING':
        return <FramingScreen />;
      case 'INPUTS':
        return <InputsScreen />;
      case 'OUTPUTS':
        return <OutputsScreen />;
      case 'POLICIES':
        return <PoliciesScreen />;
      case 'RULES':
        return <RulesScreen />;
      case 'SIMULATION_FINALIZATION':
        return <SimulationScreen />;
      default:
        return <FramingScreen />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <StageNav
          currentStage={session.current_stage}
          stageStates={session.stage_states}
          onStageClick={goToStage}
          isStageAccessible={isStageAccessible}
        />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            {renderCurrentScreen()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
