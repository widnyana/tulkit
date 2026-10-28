// Diagram templates for the "New diagram" picker. Visual templates are written
// in the canonical form that `serialize` emits, so picking one and editing it
// does not reformat the text.
export type DiagramTemplate = {
  key: string;
  label: string;
  blurb: string;
  visual: boolean;
  code: string;
};

export const DIAGRAM_TEMPLATES: readonly DiagramTemplate[] = [
  {
    key: "flowchart",
    label: "Flowchart",
    blurb: "Boxes and arrows for decisions and flows.",
    visual: true,
    code: `flowchart TD
    A[Start]
    B{Is it?}
    C[OK]
    D[End]
    A --> B
    B -->|Yes| C
    B -->|No| D`,
  },
  {
    key: "sequence",
    label: "Sequence",
    blurb: "Messages passed between participants over time.",
    visual: true,
    code: `sequenceDiagram
    participant Alice
    participant Bob
    Alice ->> Bob: Hello Bob
    Bob -->> Alice: Hello Alice`,
  },
  {
    key: "class",
    label: "Class",
    blurb: "Classes with members and relationships.",
    visual: false,
    code: `classDiagram
    class Animal {
      +String name
      +eat()
    }
    Animal <|-- Dog`,
  },
  {
    key: "state",
    label: "State",
    blurb: "States and transitions of a machine.",
    visual: false,
    code: `stateDiagram-v2
    [*] --> Idle
    Idle --> Running: start
    Running --> [*]: stop`,
  },
  {
    key: "er",
    label: "ER",
    blurb: "Entities and how they relate.",
    visual: false,
    code: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains`,
  },
  {
    key: "gantt",
    label: "Gantt",
    blurb: "Tasks on a timeline with dates.",
    visual: false,
    code: `gantt
    title Project plan
    dateFormat YYYY-MM-DD
    section Phase 1
    Design :a1, 2026-01-01, 7d
    Build :after a1, 14d`,
  },
  {
    key: "pie",
    label: "Pie",
    blurb: "Shares of a whole as slices.",
    visual: false,
    code: `pie title What I did today
    "Code" : 42
    "Meetings" : 25
    "Reading" : 33`,
  },
  {
    key: "mindmap",
    label: "Mindmap",
    blurb: "A topic branching into ideas.",
    visual: false,
    code: `mindmap
  root((Tulkit))
    Editors
      Mermaid
    Tools
      CLI`,
  },
  {
    key: "timeline",
    label: "Timeline",
    blurb: "Events grouped over periods.",
    visual: false,
    code: `timeline
    title History
    2024 : First release
    2025 : Visual mode
    2026 : Templates`,
  },
  {
    key: "gitgraph",
    label: "Git graph",
    blurb: "Branches and merges of a repo.",
    visual: false,
    code: `gitGraph
    commit id: "init"
    branch feature
    commit
    checkout main
    merge feature`,
  },
];
