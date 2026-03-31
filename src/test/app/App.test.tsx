import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";

// Deterministic layout so the game components can mount without errors.
vi.mock("@/features/battleship/services/placement", async () => {
  const { parseLayout } = await import("@/features/battleship/data/layout");
  const { RAW_GAME_CONFIG } = await import("@/features/battleship/data/config");
  return {
    generateRandomLayout: vi.fn(() => parseLayout(RAW_GAME_CONFIG, 10)),
  };
});

describe("App", () => {
  it("renders the page-level heading", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Battleship" }),
    ).toBeInTheDocument();
  });
});
