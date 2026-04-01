import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GameStatus } from "@/battleship/components/GameStatus";

describe("GameStatus", () => {
  // ---------------------------------------------------------------------------
  // In-progress display
  // ---------------------------------------------------------------------------

  it("shows an instruction when no shots have been fired", () => {
    render(<GameStatus isGameOver={false} shotCount={0} />);
    expect(screen.getByText("Select a cell to fire.")).toBeInTheDocument();
  });

  it("shows a singular shot count after one shot", () => {
    render(<GameStatus isGameOver={false} shotCount={1} />);
    // Confirm exact singular form — "1 shot fired." not "1 shots fired."
    expect(screen.getByText("1 shot fired.")).toBeInTheDocument();
  });

  it("shows a plural shot count after multiple shots", () => {
    render(<GameStatus isGameOver={false} shotCount={7} />);
    expect(screen.getByText("7 shots fired.")).toBeInTheDocument();
  });

  it("does not render game-over content while the game is in progress", () => {
    render(<GameStatus isGameOver={false} shotCount={3} />);
    expect(screen.queryByText("All ships sunk!")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Game-over display
  // ---------------------------------------------------------------------------

  it("shows the victory message when the game is over", () => {
    render(<GameStatus isGameOver={true} shotCount={30} />);
    expect(screen.getByText("All ships sunk!")).toBeInTheDocument();
  });

  it("includes the final shot count in the game-over message", () => {
    render(<GameStatus isGameOver={true} shotCount={30} />);
    expect(screen.getByText(/Finished in 30 shots\./)).toBeInTheDocument();
  });

  it("uses singular 'shot' in the game-over message when exactly one shot was fired", () => {
    render(<GameStatus isGameOver={true} shotCount={1} />);
    expect(screen.getByText(/Finished in 1 shot\./)).toBeInTheDocument();
    expect(screen.queryByText(/1 shots/)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  it("renders a live region when the game is over so assistive tech is notified", () => {
    render(<GameStatus isGameOver={true} shotCount={20} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not replace in-progress text with game-over content before all ships are sunk", () => {
    render(<GameStatus isGameOver={false} shotCount={5} />);
    // No role="status" wrapping the shot count — that element only appears at game over.
    // The paragraph is present but not wrapped in a live region.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
