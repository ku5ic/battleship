import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import type { Difficulty } from "@/features/battleship/types";
import type { LineReader } from "@/cli/input";
import { DIFFICULTY_CONFIG } from "@/features/battleship/constants";
import { RAW_GAME_CONFIG } from "@/features/battleship/data/config";
import { generateRandomLayout } from "@/features/battleship/services/placement";
import { runSinglePlayer, runVsComputer } from "@/cli/loop";

// ---------------------------------------------------------------------------
// Node readline
// ---------------------------------------------------------------------------

interface ClosableLineReader extends LineReader {
  close: () => void;
}

function createLineReader(): ClosableLineReader {
  return createInterface({ input: stdin, output: stdout });
}

// ---------------------------------------------------------------------------
// Menu prompt helper
// ---------------------------------------------------------------------------

interface MenuOption<K extends string> {
  key: K;
  label: string;
}

function promptChoice<K extends string>(
  rl: LineReader,
  prompt: string,
  options: readonly MenuOption<K>[],
): Promise<K> {
  return new Promise((resolve) => {
    const menu =
      options.map((opt, i) => `  ${String(i + 1)}) ${opt.label}`).join("\n") +
      "\n";

    const ask = (): void => {
      rl.question(`${prompt}\n${menu}> `, (answer: string) => {
        const index = Number(answer.trim()) - 1;
        if (index >= 0 && index < options.length) {
          resolve(options[index].key);
          return;
        }
        console.log("Invalid choice. Try again.");
        ask();
      });
    };
    ask();
  });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

type GameMode = "single" | "vs-computer";

const MODE_OPTIONS: readonly MenuOption<GameMode>[] = [
  { key: "single", label: "Single Player" },
  { key: "vs-computer", label: "Vs Computer" },
];

const DIFFICULTY_OPTIONS: readonly MenuOption<Difficulty>[] = [
  { key: "easy", label: "Easy (10\u00d710)" },
  { key: "moderate", label: "Moderate (15\u00d715)" },
  { key: "hard", label: "Hard (20\u00d720)" },
];

async function main(): Promise<void> {
  const rl = createLineReader();

  try {
    console.log("\n\u2693  BATTLESHIP  \u2693\n");

    const mode = await promptChoice(rl, "Select mode:", MODE_OPTIONS);
    const difficulty = await promptChoice(
      rl,
      "Select difficulty:",
      DIFFICULTY_OPTIONS,
    );

    const { boardSize, columnLabels } = DIFFICULTY_CONFIG[difficulty];

    if (mode === "single") {
      const ships = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
      await runSinglePlayer(rl, ships, columnLabels, boardSize);
    } else {
      const playerShips = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
      const computerShips = generateRandomLayout(RAW_GAME_CONFIG, boardSize);
      await runVsComputer(
        rl,
        playerShips,
        computerShips,
        columnLabels,
        boardSize,
      );
    }
  } finally {
    rl.close();
  }
}

main().catch(console.error);
