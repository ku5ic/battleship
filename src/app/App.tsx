import { useCallback, useState } from "react";
import { SinglePlayerGame } from "@/components/game/SinglePlayerGame";
import { VsComputerGame } from "@/components/game/VsComputerGame";
import {
  AppShell,
  AppShellBody,
  AppShellHeader,
  AppShellMain,
  Divider,
  Heading,
  Radio,
  RadioGroup,
  SkipLink,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toaster,
} from "@nuka-ui/core";
import {
  GameStatus,
  VsComputerGameStatus,
  PlacementScreen,
} from "@/battleship/components";
import type { Difficulty, HeaderGameStatus, Ship } from "@/battleship/types";

type Mode = "single" | "vsComputer";
type VsComputerPhase = "placement" | "battle";

export function App() {
  const [mode, setMode] = useState<Mode>("single");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [headerGameStatus, setHeaderGameStatus] =
    useState<HeaderGameStatus | null>(null);
  const [vsComputerPhase, setVsComputerPhase] =
    useState<VsComputerPhase>("placement");
  const [confirmedPlayerShips, setConfirmedPlayerShips] = useState<
    Ship[] | null
  >(null);

  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    setHeaderGameStatus(null);
    setVsComputerPhase("placement");
    setConfirmedPlayerShips(null);
  }, []);

  const handleDifficultyChange = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    setHeaderGameStatus(null);
    setVsComputerPhase("placement");
    setConfirmedPlayerShips(null);
  }, []);

  const handleSingleStatusChange = useCallback(
    (status: HeaderGameStatus & { mode: "single" }) => {
      setHeaderGameStatus(status);
    },
    [],
  );

  const handleVsComputerStatusChange = useCallback(
    (status: HeaderGameStatus & { mode: "vsComputer" }) => {
      setHeaderGameStatus(status);
    },
    [],
  );

  return (
    <AppShell className="bg-slate-900 text-white">
      <SkipLink targetId="game-content">Skip to game</SkipLink>
      <Tabs
        value={mode}
        onValueChange={(v) => {
          handleModeChange(v as Mode);
        }}
      >
        <AppShellHeader border className="backdrop-blur-sm bg-slate-900/95">
          <div className="flex items-center justify-between gap-4 px-4 py-2 max-w-screen-xl mx-auto w-full flex-wrap">
            <Heading
              as="h1"
              size="xl"
              weight="semibold"
              className="tracking-wide"
            >
              Battleship
            </Heading>

            <div className="flex-1 flex justify-center px-4 min-w-0">
              {headerGameStatus?.mode === "single" && (
                <GameStatus
                  isGameOver={headerGameStatus.isGameOver}
                  shotCount={headerGameStatus.shotCount}
                />
              )}
              {headerGameStatus?.mode === "vsComputer" && (
                <VsComputerGameStatus
                  winner={headerGameStatus.winner}
                  activeTurn={headerGameStatus.activeTurn}
                  isAiThinking={headerGameStatus.isAiThinking}
                />
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <TabsList variant="pill">
                <TabsTrigger value="single">Single player</TabsTrigger>
                <TabsTrigger value="vsComputer">vs Computer</TabsTrigger>
              </TabsList>

              <Divider orientation="vertical" />

              <RadioGroup
                name="difficulty"
                orientation="horizontal"
                value={difficulty}
                onChange={(v) => {
                  handleDifficultyChange(v as Difficulty);
                }}
              >
                <Radio value="easy">Easy</Radio>
                <Radio value="moderate">Moderate</Radio>
                <Radio value="hard">Hard</Radio>
              </RadioGroup>
            </div>
          </div>
        </AppShellHeader>

        <AppShellBody>
          <AppShellMain
            id="game-content"
            padded={false}
            className="flex flex-col items-center justify-start pt-6 pb-8 px-2 sm:px-4"
          >
            <TabsContent value="single" className="mt-0 w-full">
              <SinglePlayerGame
                key={`single-${difficulty}`}
                difficulty={difficulty}
                onStatusChange={handleSingleStatusChange}
              />
            </TabsContent>

            <TabsContent value="vsComputer" className="mt-0 w-full">
              {vsComputerPhase === "placement" && (
                <PlacementScreen
                  difficulty={difficulty}
                  onConfirm={(ships) => {
                    setConfirmedPlayerShips(ships);
                    setVsComputerPhase("battle");
                  }}
                  onRandomise={() => {
                    setConfirmedPlayerShips(null);
                    setVsComputerPhase("battle");
                  }}
                />
              )}
              {vsComputerPhase === "battle" && (
                <VsComputerGame
                  key={`vsComputer-${difficulty}`}
                  difficulty={difficulty}
                  playerShips={confirmedPlayerShips ?? undefined}
                  onStatusChange={handleVsComputerStatusChange}
                />
              )}
            </TabsContent>
          </AppShellMain>
        </AppShellBody>
      </Tabs>
      <Toaster position="bottom-right" />
    </AppShell>
  );
}
