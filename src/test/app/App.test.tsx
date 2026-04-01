import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";

// Deterministic layout so the game components can mount without errors.
vi.mock("@/battleship/services/placement", async () => {
  const { parseLayout } = await import("@/battleship/data/layout");
  const { RAW_GAME_CONFIG } = await import("@/battleship/data/config");
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
