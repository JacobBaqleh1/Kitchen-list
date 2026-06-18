import { writeFileSync } from "fs";
import { randomBytes } from "crypto";

const id = () => randomBytes(8).toString("hex").slice(0, 16);
let seedCounter = 100000;

function rect(x, y, w, h, label, opts = {}) {
  const rid = id();
  const tid = id();
  const {
    bg = "#a5d8ff",
    stroke = "#1e1e1e",
    fontSize = 16,
    textAlign = "center",
  } = opts;
  seedCounter += 1;
  return [
    {
      id: rid,
      type: "rectangle",
      x,
      y,
      width: w,
      height: h,
      angle: 0,
      strokeColor: stroke,
      backgroundColor: bg,
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 3 },
      seed: seedCounter,
      version: 1,
      versionNonce: seedCounter,
      isDeleted: false,
      boundElements: [{ type: "text", id: tid }],
      updated: Date.now(),
      link: null,
      locked: false,
    },
    {
      id: tid,
      type: "text",
      x: x + 8,
      y: y + h / 2 - fontSize / 2,
      width: w - 16,
      height: fontSize * 1.25,
      angle: 0,
      strokeColor: stroke,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: null,
      seed: seedCounter + 1,
      version: 1,
      versionNonce: seedCounter + 1,
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      text: label,
      fontSize,
      fontFamily: 5,
      textAlign,
      verticalAlign: "middle",
      containerId: rid,
      originalText: label,
      autoResize: true,
      lineHeight: 1.25,
    },
  ];
}

function text(x, y, content, opts = {}) {
  const tid = id();
  const { fontSize = 20, textAlign = "left", color = "#1e1e1e" } = opts;
  seedCounter += 1;
  return {
    id: tid,
    type: "text",
    x,
    y,
    width: content.length * fontSize * 0.55,
    height: fontSize * 1.25,
    angle: 0,
    strokeColor: color,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 1,
    opacity: 100,
    groupIds: [],
    frameId: null,
    roundness: null,
    seed: seedCounter,
    version: 1,
    versionNonce: seedCounter,
    isDeleted: false,
    boundElements: [],
    updated: Date.now(),
    link: null,
    locked: false,
    text: content,
    fontSize,
    fontFamily: 5,
    textAlign,
    verticalAlign: "top",
    containerId: null,
    originalText: content,
    autoResize: true,
    lineHeight: 1.25,
  };
}

function arrow(x1, y1, x2, y2, label) {
  const aid = id();
  const dx = x2 - x1;
  const dy = y2 - y1;
  seedCounter += 1;
  const elements = [
    {
      id: aid,
      type: "arrow",
      x: x1,
      y: y1,
      width: dx,
      height: dy,
      angle: 0,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      roundness: { type: 2 },
      seed: seedCounter,
      version: 1,
      versionNonce: seedCounter,
      isDeleted: false,
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false,
      startBinding: null,
      endBinding: null,
      lastCommittedPoint: null,
      startArrowhead: null,
      endArrowhead: "arrow",
      points: [
        [0, 0],
        [dx, dy],
      ],
    },
  ];
  if (label) {
    elements.push(
      text(x1 + dx / 2 - 40, y1 + dy / 2 - 20, label, {
        fontSize: 14,
        textAlign: "center",
        color: "#495057",
      })
    );
  }
  return elements;
}

function groupFrame(x, y, w, h, title, bg = "#f8f9fa") {
  const elements = rect(x, y, w, h, "", { bg, stroke: "#868e96" });
  elements[0].boundElements = [];
  elements.pop();
  elements.push(text(x + 12, y + 8, title, { fontSize: 18, color: "#343a40" }));
  return elements;
}

const elements = [];

// Title
elements.push(
  text(40, 20, "MyKitchenList — System Design", { fontSize: 32, color: "#1864ab" })
);
elements.push(
  text(
    40,
    60,
    "React SPA + Express API | Neon Postgres | AWS Bedrock Nova | Box Storage",
    { fontSize: 16, color: "#495057" }
  )
);

// User
elements.push(...rect(420, 120, 120, 60, "User\n(Browser)", { bg: "#ffe8cc" }));

// Client layer frame
elements.push(...groupFrame(40, 220, 520, 520, "Client — React SPA (Vercel)", "#e7f5ff"));

elements.push(...rect(80, 280, 200, 50, "App.jsx\nRouter + Auth Provider", { bg: "#d0ebff", fontSize: 14 }));
elements.push(...rect(300, 280, 220, 50, "Neon Auth UI\nGoogle / GitHub OAuth", { bg: "#d0ebff", fontSize: 14 }));
elements.push(...rect(80, 360, 440, 50, "api.js — Bearer JWT fetch wrapper + token sync", { bg: "#d0ebff", fontSize: 14 }));

elements.push(...rect(80, 440, 130, 70, "FridgeView\n/", { bg: "#a5d8ff", fontSize: 14 }));
elements.push(...rect(230, 440, 130, 70, "MealSuggest\n/meal", { bg: "#a5d8ff", fontSize: 14 }));
elements.push(...rect(380, 440, 130, 70, "Settings\n/settings", { bg: "#a5d8ff", fontSize: 14 }));

elements.push(...rect(80, 540, 130, 60, "AddItemForm", { bg: "#bee3f8", fontSize: 13 }));
elements.push(...rect(230, 540, 130, 60, "PhotoScan", { bg: "#bee3f8", fontSize: 13 }));
elements.push(...rect(380, 540, 130, 60, "ItemCard", { bg: "#bee3f8", fontSize: 13 }));
elements.push(...rect(80, 620, 130, 60, "MealCard", { bg: "#bee3f8", fontSize: 13 }));

elements.push(
  text(80, 700, "Local: localStorage (sort) · sessionStorage (meal cache)", {
    fontSize: 13,
    color: "#495057",
  })
);

// Server layer frame
elements.push(...groupFrame(620, 220, 560, 520, "Server — Express API (Render)", "#fff3bf"));

elements.push(...rect(660, 280, 480, 45, "index.js — CORS · JWT auth middleware · rate limits", { bg: "#ffec99", fontSize: 14 }));

elements.push(...rect(660, 350, 110, 80, "/api/items\nCRUD + bulk", { bg: "#ffd43b", fontSize: 13 }));
elements.push(...rect(790, 350, 110, 80, "/api/photos\nscan", { bg: "#ffd43b", fontSize: 13 }));
elements.push(...rect(920, 350, 110, 80, "/api/meal\nsuggest", { bg: "#ffd43b", fontSize: 13 }));
elements.push(...rect(1050, 350, 90, 80, "/api/prefs", { bg: "#ffd43b", fontSize: 13 }));

elements.push(...rect(660, 460, 160, 70, "itemMerge.js\ndedup / upsert", { bg: "#ffe066", fontSize: 13 }));
elements.push(...rect(840, 460, 160, 70, "nova.js\nBedrock invoke", { bg: "#ffe066", fontSize: 13 }));
elements.push(...rect(1020, 460, 120, 70, "recipeContext\nFTS search", { bg: "#ffe066", fontSize: 13 }));

elements.push(...rect(660, 560, 480, 45, "GET /health — DB ping (UptimeRobot keep-alive)", { bg: "#ffec99", fontSize: 14 }));

elements.push(
  text(660, 630, "Rate limits: meal 20/10min · photos 30/10min per user", {
    fontSize: 13,
    color: "#495057",
  })
);

// Database frame
elements.push(...groupFrame(620, 780, 560, 280, "Database — Neon Postgres (Drizzle ORM)", "#d3f9d8"));

elements.push(...rect(660, 840, 120, 90, "items\ninventory", { bg: "#8ce99a", fontSize: 13 }));
elements.push(...rect(800, 840, 120, 90, "preferences\nallergies", { bg: "#8ce99a", fontSize: 13 }));
elements.push(...rect(940, 840, 120, 90, "receipts\nphoto meta", { bg: "#8ce99a", fontSize: 13 }));
elements.push(...rect(1080, 840, 80, 90, "recipes\nRAG corpus", { bg: "#8ce99a", fontSize: 13 }));

elements.push(
  text(660, 950, "All tables scoped by userId (JWT sub) · FTS GIN index on recipes", {
    fontSize: 13,
    color: "#495057",
  })
);

// External services frame
elements.push(...groupFrame(1240, 220, 340, 840, "External Services", "#f3d9fa"));

elements.push(...rect(1280, 280, 260, 70, "Neon Auth\nJWT + JWKS verify", { bg: "#e599f7", fontSize: 14 }));
elements.push(...rect(1280, 380, 260, 70, "AWS Bedrock\nNova Lite / Pro", { bg: "#e599f7", fontSize: 14 }));
elements.push(...rect(1280, 480, 260, 70, "Box Storage\nscanned photos", { bg: "#e599f7", fontSize: 14 }));
elements.push(...rect(1280, 580, 260, 70, "Apify (optional)\nrecipe seeding", { bg: "#e599f7", fontSize: 14 }));
elements.push(...rect(1280, 680, 260, 70, "UptimeRobot\n/health pings", { bg: "#e599f7", fontSize: 14 }));
elements.push(...rect(1280, 780, 260, 70, "Vercel Analytics\nSpeed Insights", { bg: "#e599f7", fontSize: 14 }));

// Data flows frame
elements.push(...groupFrame(40, 780, 540, 280, "Key User Flows", "#fff0f6"));

const flows = [
  "1. Add item: AddItemForm → POST /api/items → upsert → items table",
  "2. Photo scan: PhotoScan → POST /api/photos/scan → Box + Nova vision",
  "   → user confirms → POST /api/items/bulk",
  "3. Meal ideas: MealSuggest → POST /api/meal/suggest → FTS recipes",
  "   + inventory → Nova → MealCard (recipe + shopping list)",
  "4. Auth: Neon Auth OAuth → JWT → all API calls (Bearer token)",
];
flows.forEach((line, i) => {
  elements.push(text(60, 830 + i * 28, line, { fontSize: 13, color: "#495057" }));
});

// Arrows - User to Client
elements.push(...arrow(480, 150, 300, 220, ""));

// Client to Server
elements.push(...arrow(560, 400, 620, 400, "REST + JWT"));

// Server to DB
elements.push(...arrow(920, 740, 920, 780, "Drizzle"));

// Server to External
elements.push(...arrow(1180, 320, 1240, 320, "OAuth"));
elements.push(...arrow(1180, 500, 1240, 500, "AI"));
elements.push(...arrow(1180, 520, 1240, 520, "upload"));
elements.push(...arrow(1180, 600, 1240, 600, "seed"));

// Auth flow label
elements.push(
  text(1240, 120, "Auth: Client ↔ Neon Auth ↔ JWT verified via JWKS on server", {
    fontSize: 14,
    color: "#862e9c",
  })
);

// Legend
elements.push(...groupFrame(1240, 1100, 340, 160, "Legend", "#f8f9fa"));
elements.push(...rect(1260, 1150, 30, 20, "", { bg: "#e7f5ff" }));
elements.push(text(1300, 1148, "Client layer", { fontSize: 13 }));
elements.push(...rect(1260, 1180, 30, 20, "", { bg: "#fff3bf" }));
elements.push(text(1300, 1178, "API layer", { fontSize: 13 }));
elements.push(...rect(1260, 1210, 30, 20, "", { bg: "#d3f9d8" }));
elements.push(text(1300, 1208, "Database", { fontSize: 13 }));
elements.push(...rect(1420, 1150, 30, 20, "", { bg: "#f3d9fa" }));
elements.push(text(1460, 1148, "External", { fontSize: 13 }));

const excalidraw = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements,
  appState: {
    gridSize: 20,
    gridStep: 5,
    gridModeEnabled: false,
    viewBackgroundColor: "#ffffff",
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 0.8 },
  },
  files: {},
};

const outPath = new URL("../docs/system-design.excalidraw", import.meta.url);
writeFileSync(outPath, JSON.stringify(excalidraw, null, 2));
console.log(`Wrote ${outPath.pathname}`);
