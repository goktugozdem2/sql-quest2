# MCP (Model Context Protocol) Plan for SQL Quest

## What is MCP?

MCP (Model Context Protocol) is an open standard by Anthropic that lets AI models (like Claude) connect to external tools, data sources, and services through a unified protocol. Think of it as a **plugin system for AI** — you build an MCP server that exposes "tools" and "resources", and any MCP-compatible AI client can use them.

**Key concepts:**
- **MCP Server** — A lightweight process that exposes tools/resources over stdio or HTTP (SSE)
- **MCP Client** — An AI app (Claude Desktop, Claude Code, Cursor, etc.) that connects to servers
- **Tools** — Functions the AI can call (e.g., `run_sql_query`, `get_challenge`)
- **Resources** — Read-only data the AI can access (e.g., schema info, challenge catalog)
- **Prompts** — Reusable prompt templates the server can offer

---

## What Can We Use MCP For in SQL Quest?

### 1. AI-Powered SQL Tutor MCP Server

**Purpose:** Replace the current `/api/chat.js` proxy with a richer MCP server that gives the AI tutor direct access to SQL Quest's data and execution engine.

**Tools to expose:**
| Tool | Description |
|------|-------------|
| `run_sql_query` | Execute a SQL query against the practice dataset (via sql.js) and return results |
| `validate_answer` | Check a user's SQL answer against the expected output for a challenge |
| `get_hint` | Generate a progressive hint for a specific challenge (hint 1 → hint 2 → solution) |
| `explain_query` | Break down a SQL query into plain English steps |
| `suggest_next_challenge` | Recommend the next challenge based on user progress/weaknesses |

**Resources to expose:**
| Resource | Description |
|----------|-------------|
| `challenge_catalog` | List of all 200+ challenges with metadata (difficulty, topic, company) |
| `user_progress` | Current user's XP, completed challenges, weak areas |
| `dataset_schemas` | Table schemas for all practice datasets |
| `curriculum_map` | The structured learning path and where the user is |

**Value:** The AI tutor becomes much smarter — it can actually run queries, see user progress, and give targeted help instead of generic advice.

---

### 2. Challenge Management MCP Server

**Purpose:** Let content creators and developers manage SQL Quest challenges through AI assistants.

**Tools to expose:**
| Tool | Description |
|------|-------------|
| `create_challenge` | Add a new SQL challenge with schema, seed data, solution, and tests |
| `validate_challenge` | Run validation checks on a challenge (solution works, edge cases pass) |
| `list_challenges` | Filter/search challenges by topic, difficulty, company |
| `update_challenge` | Modify an existing challenge's description, hints, or solution |
| `generate_test_cases` | Auto-generate edge case test queries for a challenge |

**Value:** Speeds up content creation — an AI assistant can help write, validate, and organize challenges directly.

---

### 3. Analytics & Progress MCP Server

**Purpose:** Expose SQL Quest analytics data so AI can help with user insights and platform improvements.

**Tools to expose:**
| Tool | Description |
|------|-------------|
| `get_user_stats` | Retrieve aggregated user statistics |
| `get_challenge_analytics` | See completion rates, avg time, common mistakes per challenge |
| `get_streak_data` | User streak and engagement metrics |
| `query_supabase` | Run read-only analytics queries against Supabase |

**Value:** Use AI to analyze learning patterns, identify difficult challenges, and optimize the curriculum.

---

## How to Create an MCP Server

### Architecture Overview

```
┌──────────────────┐     stdio/SSE      ┌─────────────────────┐
│   MCP Client     │◄──────────────────►│   MCP Server         │
│ (Claude Desktop, │                     │ (Node.js/TypeScript)  │
│  Claude Code,    │                     │                       │
│  Cursor, etc.)   │                     │  Tools:               │
└──────────────────┘                     │  - run_sql_query      │
                                         │  - validate_answer    │
                                         │  - get_hint           │
                                         │                       │
                                         │  Resources:           │
                                         │  - challenge_catalog  │
                                         │  - dataset_schemas    │
                                         └───────┬───────────────┘
                                                 │
                                         ┌───────▼───────────────┐
                                         │  SQL Quest Data       │
                                         │  - challenges.js      │
                                         │  - datasets.js        │
                                         │  - Supabase DB        │
                                         └───────────────────────┘
```

### Step-by-Step Implementation

#### Step 1: Set Up the MCP Server Project

```bash
# Create MCP server directory inside SQL Quest
mkdir -p mcp-server
cd mcp-server
npm init -y
npm install @modelcontextprotocol/sdk
npm install sql.js    # For running SQL queries locally
```

#### Step 2: Create the Server Entry Point

```typescript
// mcp-server/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "sql-quest",
  version: "1.0.0",
});

// --- TOOLS ---

server.tool(
  "run_sql_query",
  "Execute a SQL query against a practice dataset and return the results",
  {
    query: { type: "string", description: "The SQL query to execute" },
    dataset: { type: "string", description: "Which dataset to query against" },
  },
  async ({ query, dataset }) => {
    // Load the dataset, execute with sql.js, return results
    const results = await executeSql(query, dataset);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

server.tool(
  "validate_answer",
  "Check if a user's SQL query produces the correct output for a challenge",
  {
    challengeId: { type: "string", description: "The challenge ID" },
    userQuery: { type: "string", description: "The user's SQL query" },
  },
  async ({ challengeId, userQuery }) => {
    const result = await validateChallenge(challengeId, userQuery);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "get_hint",
  "Get a progressive hint for a challenge",
  {
    challengeId: { type: "string", description: "The challenge ID" },
    hintLevel: { type: "number", description: "Hint level (1=subtle, 2=direct, 3=solution)" },
  },
  async ({ challengeId, hintLevel }) => {
    const hint = getHint(challengeId, hintLevel);
    return {
      content: [{ type: "text", text: hint }],
    };
  }
);

// --- RESOURCES ---

server.resource(
  "challenge_catalog",
  "challenges://catalog",
  async () => {
    const challenges = loadChallenges();
    return {
      contents: [{
        uri: "challenges://catalog",
        mimeType: "application/json",
        text: JSON.stringify(challenges),
      }],
    };
  }
);

server.resource(
  "dataset_schemas",
  "schemas://all",
  async () => {
    const schemas = loadSchemas();
    return {
      contents: [{
        uri: "schemas://all",
        mimeType: "application/json",
        text: JSON.stringify(schemas),
      }],
    };
  }
);

// --- START ---

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### Step 3: Implement the SQL Execution Layer

```typescript
// mcp-server/sql-engine.ts
import initSqlJs from "sql.js";

export async function executeSql(query: string, datasetName: string) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Load dataset schema and seed data
  const dataset = getDataset(datasetName);
  db.run(dataset.createTableSQL);
  db.run(dataset.seedDataSQL);

  // Execute user query
  try {
    const results = db.exec(query);
    return { success: true, results };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    db.close();
  }
}
```

#### Step 4: Configure Clients to Use the Server

**Claude Desktop (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "sql-quest": {
      "command": "node",
      "args": ["./mcp-server/index.js"],
      "cwd": "/path/to/sql-quest2"
    }
  }
}
```

**Claude Code (`.mcp.json` in project root):**
```json
{
  "mcpServers": {
    "sql-quest": {
      "command": "node",
      "args": ["./mcp-server/index.js"]
    }
  }
}
```

#### Step 5: Test the Server

```bash
# Test with MCP Inspector (official debugging tool)
npx @modelcontextprotocol/inspector node mcp-server/index.js
```

---

## Recommended Implementation Order

| Phase | What | Why | Effort |
|-------|------|-----|--------|
| **Phase 1** | SQL Tutor MCP Server (run_sql_query + validate_answer) | Core value — makes AI tutor actually useful | 2-3 days |
| **Phase 2** | Add resources (challenge catalog, schemas) | Gives AI full context about available content | 1 day |
| **Phase 3** | Challenge Management tools | Speeds up content creation workflow | 2 days |
| **Phase 4** | Analytics server | Data-driven curriculum improvements | 2 days |
| **Phase 5** | HTTP/SSE transport | Enables web-based MCP clients (not just local) | 1-2 days |

---

## Key Benefits for SQL Quest

1. **Smarter AI Tutor** — Instead of generic chat, the tutor can run queries, check answers, and see exactly where a student is stuck
2. **Faster Content Creation** — AI assistants can create, validate, and test new challenges
3. **Platform Interoperability** — Works with Claude Desktop, Claude Code, Cursor, and any future MCP client
4. **Separation of Concerns** — AI logic lives in the MCP server, keeping the main app clean
5. **Future-Proof** — MCP is becoming the standard for AI tool integration; early adoption pays off

---

## File Structure After Implementation

```
sql-quest2/
├── mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── index.ts              # Server entry point
│   ├── tools/
│   │   ├── sql-executor.ts   # run_sql_query tool
│   │   ├── validator.ts      # validate_answer tool
│   │   ├── hint-engine.ts    # get_hint tool
│   │   └── challenge-mgmt.ts # CRUD tools for challenges
│   ├── resources/
│   │   ├── challenges.ts     # Challenge catalog resource
│   │   ├── schemas.ts        # Dataset schemas resource
│   │   └── progress.ts       # User progress resource
│   └── lib/
│       ├── sql-engine.ts     # sql.js wrapper
│       └── data-loader.ts    # Loads SQL Quest data files
├── .mcp.json                 # MCP client config for Claude Code
└── ... (existing files)
```
