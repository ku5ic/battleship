# AI Project Instructions

## Purpose

You are assisting with a take home assignment for a Senior Frontend Engineer role. The target outcome is a production minded React and TypeScript implementation of a partial Battleship game, with strong engineering quality, clear architecture, excellent readability, solid testing, and accessibility compliance.

This is not a prompt to generate a quick demo. This is a prompt to help produce a clean, defensible codebase that can hold up in pair programming review.

## High level goals

The solution must:

- use TypeScript
- use React
- use Tailwind CSS for styling
- be easy to read, test, maintain, and extend
- follow KISS, DRY, YAGNI, and SOLID pragmatically
- keep components as dumb as possible
- move logic into hooks or pure service layers based on complexity
- clearly separate UI, state orchestration, and domain logic
- document architectural and engineering decisions in markdown
- prioritize accessibility, specifically WCAG 2.2 AA
- include strong linting and testing

The solution must not:

- look AI spammed or minimally generated
- contain unexplained abstractions
- overengineer the assignment
- hide game rules inside UI components
- use weak typing like `any`
- contain large, multipurpose components
- introduce unnecessary global state libraries

## Assignment scope

Build a partial Battleship game.

Expected functionality:

- render a 10x10 board
- consume the provided ship layout data as the source of truth
- allow users to click cells to fire shots
- indicate hit and miss states
- detect sunk ships
- indicate when the game is over after all ships are sunk
- support small mobile screens, including iPhone 5 width, up to desktop
- use provided assets where appropriate

Out of scope unless trivially justified:

- player ship placement
- opponent turns
- persistence
- multiplayer
- authentication
- backend integration
- unnecessary animations or visual effects

## Core engineering approach

Treat the game rules as a pure domain problem and the React app as a thin UI shell around it.

That means:

- components render state and emit user intent
- hooks orchestrate feature level interaction and expose view friendly data
- service modules contain pure Battleship rules and calculations
- data modules parse and validate the provided configuration
- selectors and helpers remain pure and deterministic

The code should feel like a small product slice built by a careful senior engineer.

## Architectural rules

### 1. Separation of concerns

Components should:

- receive props
- render UI
- emit callbacks
- remain easy to understand in isolation

Components should not:

- contain core Battleship rules
- calculate sunk ships internally
- own data parsing or validation
- mix rendering with domain logic

Hooks should:

- orchestrate local feature state
- manage interaction flow
- expose derived state needed by UI
- stay focused and reasonably small

Services should:

- be pure when possible
- implement hit detection, miss detection, sunk logic, game over logic, and validation
- be easy to unit test independently from React

### 2. State design

Persist only what needs to be persisted.

Good persisted state candidates:

- shots fired
- optional last shot result
- optional sunk ship ids
- optional game over flag

Prefer deriving instead of storing when possible.

Good derived state candidates:

- whether a specific cell is hit or miss
- whether a ship is sunk
- whether all ships are sunk
- status labels

Avoid duplicated sources of truth.

### 3. Domain modeling

Define clear types for:

- ship type
- coordinate
- ship
- cell state
- shot result
- game state

Normalize coordinates into a stable string key, for example `"x,y"`.

Do not scatter raw tuples across the app. Parse the input data once into a typed model.

### 4. File and module design

Prefer a feature centered structure with explicit boundaries.

Recommended shape:

```txt
src/
  app/
  components/
    board/
    game/
    layout/
    ui/
  features/
    battleship/
      components/
      hooks/
      services/
      data/
      types/
      utils/
      constants/
  lib/
  styles/
  test/
```

This is guidance, not a rigid rule. The main goal is clear ownership.

## Recommended implementation details

### React and state management

Use local feature state.

Do not use Redux, Zustand, or Context unless there is a real need. For this scope, there usually is not.

A custom hook with `useState` is enough if the model stays clean.

A reducer is acceptable if actions remain clear and most rule logic is delegated to pure service functions.

### Styling

Use Tailwind CSS.

Keep styling readable:

- avoid huge unreadable class strings
- use a `cn` helper for conditional class composition
- use small reusable presentational components where it improves clarity
- avoid inline style hacks unless there is a strong reason

### Accessibility, WCAG 2.2 AA

Accessibility is a hard requirement.

Must include:

- semantic interactive elements, especially real `button` elements for board cells
- full keyboard access
- visible focus states
- accessible labels for cells, such as row and column plus state
- `aria-live="polite"` for result updates like hit, miss, sunk, and game over
- contrast that meets AA expectations
- communication that does not rely on color alone
- touch friendly targets on smaller screens

### Responsiveness

Support from narrow mobile widths to desktop.

The board and surrounding layout should remain usable at around 320px width.

### Testing

Testing must be taken seriously.

Prioritize unit tests around pure domain logic:

- coordinate normalization
- layout validation
- hit detection
- miss detection
- sunk ship detection
- game over detection
- repeated shot handling

Add component tests for:

- board rendering
- firing a shot
- hit and miss rendering
- sunk message display
- game over display

Accessibility related tests are a plus and should be included where practical.

Optional, if time allows:

- one lightweight end to end smoke test

### Linting and formatting

Set up:

- ESLint
- Prettier
- strict TypeScript configuration

The codebase should pass linting, testing, and build cleanly.

### Documentation

Update or create markdown documentation.

Recommended files:

- `README.md`
- `ARCHITECTURE.md`
- `AI_USAGE.md`

`README.md` should cover:

- setup
- scripts
- overview
- architecture summary
- testing
- accessibility notes

`ARCHITECTURE.md` should explain:

- why logic is separated from UI
- why local state was chosen
- folder structure rationale
- tradeoffs and intentional omissions

`AI_USAGE.md` should explain:

- where AI was used
- which parts were reviewed and rewritten
- what was rejected or changed
- that final responsibility belongs to the author

## Quality bar

The recruiter explicitly warned that low effort or obviously AI generated submissions are rejected.

So every generated suggestion must be treated as draft material, not final code.

The final code should:

- read naturally
- look manually reviewed
- use consistent naming
- avoid suspiciously generic comments
- avoid unnecessary abstractions
- reflect clear technical intent

## Decision making rules

When helping with implementation:

- prefer clarity over cleverness
- prefer explicit over magical
- prefer pure functions for game rules
- prefer small focused modules over giant files
- prefer a narrow, strong architecture over ambitious extras
- implement only what is needed, but structure it so future extension is clean

When uncertain, choose the option that is easier to explain and defend in a pair programming discussion.

## Expected discussion points during review

The engineer reviewing the task may ask about:

- why state was shaped a certain way
- what is persisted vs derived
- why logic lives in hooks vs services
- how the code could be extended
- how accessibility was handled
- why a reducer was or was not used
- how tests are prioritized
- what would be improved with more time

Design the implementation so these answers are straightforward.

## Preferred style of generated output

When producing code or advice:

- keep it concrete
- keep naming consistent
- keep examples realistic
- do not overcomment obvious code
- do not invent requirements not present in the task
- keep components presentational where possible
- place logic in hooks or services based on responsibility
- make testing first class, not decorative

## Final standard

The assignment is small, but the solution should demonstrate senior level judgment.

Aim for a codebase that is:

- calm
- clear
- robust
- easy to modify
- easy to test
- easy to discuss and defend
