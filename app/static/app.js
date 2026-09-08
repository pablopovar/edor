let library = {
  roles: [],
  modes: [],
  steps: [],
};

let selectedStepIds = [];
let renderedTraceSteps = [];

const byId = (id) => document.getElementById(id);

class RequestFailure extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "RequestFailure";
    Object.assign(this, details);
  }
}

async function request(url, options = {}) {
  const method = String(
    options.method || "GET"
  ).toUpperCase();
  let response;

  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (cause) {
    throw new RequestFailure(
      "Connection lost before EdOr returned a response.",
      {
        kind: "transport",
        method,
        url,
        causeName:
          cause?.name || "NetworkError",
        causeMessage:
          cause?.message || String(cause),
      },
    );
  }

  if (response.status === 204) {
    return null;
  }

  const rawBody = await response.text();
  let body = null;

  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = { detail: rawBody };
    }
  }

  if (!response.ok) {
    const detail = body?.detail ?? body;
    let message;

    if (
      detail &&
      typeof detail === "object" &&
      typeof detail.error === "string"
    ) {
      message = detail.error;
    } else if (typeof detail === "string") {
      message = detail;
    } else {
      message =
        JSON.stringify(detail ?? body) ||
        `Request failed with HTTP ${response.status}.`;
    }

    throw new RequestFailure(
      message,
      {
        kind: "http",
        method,
        url,
        status: response.status,
        detail,
        body,
      },
    );
  }

  return body;
}

function activateTab(tabName) {
  for (
    const button of
    document.querySelectorAll(".tab-button")
  ) {
    const active =
      button.dataset.tab === tabName;

    button.classList.toggle(
      "active",
      active,
    );

    button.setAttribute(
      "aria-selected",
      String(active),
    );
  }

  for (
    const panel of
    document.querySelectorAll(".tab-panel")
  ) {
    const active =
      panel.id === `tab-${tabName}`;

    panel.classList.toggle(
      "active",
      active,
    );

    panel.hidden = !active;
  }
}

for (
  const button of
  document.querySelectorAll(".tab-button")
) {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
  });
}

function enabledObjects(bucket) {
  return library[bucket].filter(
    (item) => item.enabled
  );
}

function fillSelect(
  select,
  objects,
  includeBlank = false,
) {
  select.innerHTML = "";

  if (includeBlank) {
    const blank =
      document.createElement("option");

    blank.value = "";
    blank.textContent = "— Select —";

    select.appendChild(blank);
  }

  for (const object of objects) {
    const option =
      document.createElement("option");

    option.value = object.object_id;
    option.textContent = object.name;

    select.appendChild(option);
  }
}

async function loadModels() {
  const select = byId("model");

  const defaultModel =
    select.dataset.defaultModel || "";

  const previousValue =
    select.value || defaultModel;

  try {
    const response =
      await request("/api/models");

    const models =
      Array.isArray(response.models)
        ? response.models
        : [];

    const values = [
      ...new Set(
        [
          response.default_model,
          ...models,
        ].filter(Boolean)
      ),
    ];

    select.innerHTML = "";

    for (const model of values) {
      const option =
        document.createElement("option");

      option.value = model;
      option.textContent = model;

      select.appendChild(option);
    }

    if (values.includes(previousValue)) {
      select.value = previousValue;
    } else if (
      values.includes(defaultModel)
    ) {
      select.value = defaultModel;
    }
  } catch (error) {
    select.title =
      `Model list unavailable: ${error.message}`;

    if (
      !select.options.length &&
      defaultModel
    ) {
      const option =
        document.createElement("option");

      option.value = defaultModel;
      option.textContent = defaultModel;

      select.appendChild(option);
    }
  }
}

async function loadLibrary() {
  library =
    await request("/api/library");

  fillSelect(
    byId("role-select"),
    enabledObjects("roles"),
  );

  fillSelect(
    byId("mode-select"),
    enabledObjects("modes"),
  );

  fillSelect(
    byId("available-step-select"),
    enabledObjects("steps"),
  );

  selectedStepIds =
    selectedStepIds.filter((stepId) =>
      library.steps.some(
        (step) =>
          step.object_id === stepId
      )
    );

  refreshEditorObjectSelect();
  renderSelectedSteps();
}

function renderSelectedSteps() {
  const list =
    byId("selected-steps");

  list.innerHTML = "";

  for (
    const [index, stepId] of
    selectedStepIds.entries()
  ) {
    const object =
      library.steps.find(
        (step) =>
          step.object_id === stepId
      );

    if (!object) {
      continue;
    }

    const item =
      document.createElement("li");

    const row =
      document.createElement("div");

    row.className = "step-row";

    const name =
      document.createElement("span");

    name.textContent = object.name;

    const controls =
      document.createElement("span");

    controls.className =
      "step-buttons";

    controls.innerHTML = `
      <button
        type="button"
        data-action="up"
        data-index="${index}"
        aria-label="Move up"
      >↑</button>

      <button
        type="button"
        data-action="down"
        data-index="${index}"
        aria-label="Move down"
      >↓</button>

      <button
        type="button"
        data-action="remove"
        data-index="${index}"
        aria-label="Remove"
      >×</button>
    `;

    row.append(name, controls);
    item.appendChild(row);
    list.appendChild(item);
  }
}

byId("add-step").addEventListener(
  "click",
  () => {
    const id =
      byId("available-step-select").value;

    if (
      id &&
      !selectedStepIds.includes(id)
    ) {
      selectedStepIds.push(id);
      renderSelectedSteps();
    }
  }
);

byId("selected-steps").addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) {
      return;
    }

    const index =
      Number(button.dataset.index);

    const action =
      button.dataset.action;

    if (action === "remove") {
      selectedStepIds.splice(index, 1);
    }

    if (
      action === "up" &&
      index > 0
    ) {
      [
        selectedStepIds[index - 1],
        selectedStepIds[index],
      ] = [
        selectedStepIds[index],
        selectedStepIds[index - 1],
      ];
    }

    if (
      action === "down" &&
      index < selectedStepIds.length - 1
    ) {
      [
        selectedStepIds[index + 1],
        selectedStepIds[index],
      ] = [
        selectedStepIds[index],
        selectedStepIds[index + 1],
      ];
    }

    renderSelectedSteps();
  }
);

function directChild(parent, tagName) {
  return Array.from(parent.children).find(
    (element) =>
      element.tagName === tagName
  ) || null;
}

function cleanXmlBlock(value) {
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .split("\n");

  while (
    normalized.length &&
    !normalized[0].trim()
  ) {
    normalized.shift();
  }

  while (
    normalized.length &&
    !normalized[
      normalized.length - 1
    ].trim()
  ) {
    normalized.pop();
  }

  const nonblank = normalized.filter(
    (line) => line.trim()
  );

  if (!nonblank.length) {
    return "";
  }

  const indentation = nonblank.map(
    (line) => {
      const match = line.match(/^[ \t]*/);
      return match ? match[0].length : 0;
    }
  );

  const commonIndent = Math.min(
    ...indentation
  );

  return normalized
    .map((line) =>
      line.slice(commonIndent)
    )
    .join("\n");
}

function requiredXmlChild(
  parent,
  tagName,
) {
  const element =
    directChild(parent, tagName);

  if (!element) {
    throw new Error(
      `Missing <${tagName}> in Structured Input XML.`
    );
  }

  return element;
}

function resolveObjectByName(
  bucket,
  suppliedName,
) {
  const normalizedName =
    suppliedName.trim().toLocaleLowerCase();

  const matches = library[bucket].filter(
    (object) =>
      object.name
        .trim()
        .toLocaleLowerCase() ===
      normalizedName
  );

  if (!matches.length) {
    throw new Error(
      `${bucket.slice(0, -1)} not found in Library: ` +
      suppliedName
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `Multiple ${bucket} objects match: ` +
      suppliedName
    );
  }

  if (!matches[0].enabled) {
    throw new Error(
      `${matches[0].name} is disabled in the Library.`
    );
  }

  return matches[0];
}

function parseStructuredInputXml(
  xmlText,
) {
  const documentObject =
    new DOMParser().parseFromString(
      xmlText,
      "application/xml",
    );

  const parserError =
    documentObject.querySelector(
      "parsererror"
    );

  if (parserError) {
    const message =
      parserError.textContent
        .replace(/\s+/g, " ")
        .trim();

    throw new Error(
      `Invalid XML: ${message}`
    );
  }

  const root =
    documentObject.documentElement;

  if (
    !root ||
    root.tagName !== "structured_input"
  ) {
    throw new Error(
      "The XML root must be <structured_input>."
    );
  }

  const contextualData =
    cleanXmlBlock(
      requiredXmlChild(
        root,
        "contextual_data",
      ).textContent
    );

  const instructionsDefinition =
    cleanXmlBlock(
      requiredXmlChild(
        root,
        "instructions_definition",
      ).textContent
    );

  const goalsSuccessDefinition =
    cleanXmlBlock(
      requiredXmlChild(
        root,
        "goals_success_definition",
      ).textContent
    );

  const payload =
    cleanXmlBlock(
      requiredXmlChild(
        root,
        "payload",
      ).textContent
    );

  const sessionDirectives =
    requiredXmlChild(
      root,
      "session_directives",
    );

  const roleName =
    cleanXmlBlock(
      requiredXmlChild(
        sessionDirectives,
        "role",
      ).textContent
    );

  const modeName =
    cleanXmlBlock(
      requiredXmlChild(
        sessionDirectives,
        "mode",
      ).textContent
    );

  const stepsElement =
    requiredXmlChild(
      sessionDirectives,
      "steps",
    );

  let stepNames;

  if (stepsElement.children.length) {
    stepNames = Array.from(
      stepsElement.children
    )
      .map((element) =>
        cleanXmlBlock(
          element.textContent
        )
      )
      .filter(Boolean);
  } else {
    stepNames =
      cleanXmlBlock(
        stepsElement.textContent
      )
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean);
  }

  if (!stepNames.length) {
    throw new Error(
      "Structured Input XML contains no Steps."
    );
  }

  const loopsText =
    cleanXmlBlock(
      requiredXmlChild(
        sessionDirectives,
        "loops",
      ).textContent
    );

  const loops = Number(loopsText);

  if (
    !Number.isInteger(loops) ||
    loops < 1
  ) {
    throw new Error(
      "<loops> must contain a positive integer."
    );
  }

  const modelElement =
    directChild(
      sessionDirectives,
      "model",
    );

  const model = modelElement
    ? cleanXmlBlock(
        modelElement.textContent
      )
    : "";

  return {
    contextualData,
    instructionsDefinition,
    goalsSuccessDefinition,
    payload,
    roleName,
    modeName,
    stepNames,
    loops,
    model,
  };
}

function applyStructuredInput(
  parsed,
) {
  const role =
    resolveObjectByName(
      "roles",
      parsed.roleName,
    );

  const mode =
    resolveObjectByName(
      "modes",
      parsed.modeName,
    );

  const steps =
    parsed.stepNames.map(
      (stepName) =>
        resolveObjectByName(
          "steps",
          stepName,
        )
    );

  byId("contextual-data").value =
    parsed.contextualData;

  byId(
    "instructions-definition"
  ).value =
    parsed.instructionsDefinition;

  byId(
    "goals-success-definition"
  ).value =
    parsed.goalsSuccessDefinition;

  byId("payload").value =
    parsed.payload;

  byId("role-select").value =
    role.object_id;

  byId("mode-select").value =
    mode.object_id;

  byId("loops").value =
    String(parsed.loops);

  selectedStepIds = steps.map(
    (step) => step.object_id
  );

  renderSelectedSteps();

  if (parsed.model) {
    const modelSelect =
      byId("model");

    const existingOption =
      Array.from(
        modelSelect.options
      ).find(
        (option) =>
          option.value === parsed.model
      );

    if (!existingOption) {
      const option =
        document.createElement(
          "option"
        );

      option.value = parsed.model;
      option.textContent =
        parsed.model;

      modelSelect.appendChild(option);
    }

    modelSelect.value =
      parsed.model;
  }
}

const ACTIVE_RUN_STORAGE_KEY =
  "edor.activeRunId";
const RUN_POLL_INTERVAL_MS = 2000;
let runPollGeneration = 0;

const wait = (milliseconds) =>
  new Promise((resolve) =>
    window.setTimeout(resolve, milliseconds)
  );

function createRunId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto
      .randomUUID()
      .replaceAll("-", "");
  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );
}

function unwrapRunRecord(record) {
  return record?.result || record;
}

function describeCurrentStep(result) {
  if (!result?.current_step_name) {
    return "Preparing the run";
  }

  const phase = result.current_phase || "run";
  const loop = result.current_loop;
  const parts = [phase];

  if (Number.isInteger(loop) && loop > 0) {
    parts.push(`loop ${loop}`);
  }

  parts.push(result.current_step_name);
  return parts.join(" · ");
}

function failureReport(result) {
  const lines = [
    result.status === "interrupted"
      ? "Run interrupted"
      : "Run failed",
    "",
    `Run ID: ${result.run_id || "Unknown"}`,
    `Status: ${result.status || "failed"}`,
    `Model: ${result.model || "Unknown"}`,
    `Completed calls: ${(result.steps || []).length}`,
  ];

  if (result.current_step_name) {
    lines.push(
      `Failure location: ${describeCurrentStep(result)}`
    );
  }

  if (result.current_call_index) {
    lines.push(
      `Call: ${result.current_call_index}`
    );
  }

  if (result.error_type) {
    lines.push(`Error type: ${result.error_type}`);
  }

  if (result.error) {
    lines.push("", "Error:", result.error);
  }

  if (result.final_session_payload) {
    lines.push(
      "",
      "Last persisted material:",
      result.final_session_payload,
    );
  }

  return lines.join("\n");
}

function transportReport(error, runId) {
  return [
    "Connection lost before EdOr reported the outcome",
    "",
    "Outcome: Unknown",
    `Run ID: ${runId}`,
    `Request: ${error.method || "GET"} ${error.url || ""}`,
    `Browser error: ${error.causeMessage || error.message}`,
    "",
    "EdOr will continue server-side if the run was accepted.",
    "This page will keep trying to reconnect.",
  ].join("\n");
}

async function pollRun(runId) {
  const generation = ++runPollGeneration;
  const button = byId("run-sequence");
  const status = byId("run-status");
  const finalOutput = byId("final-output");

  localStorage.setItem(
    ACTIVE_RUN_STORAGE_KEY,
    runId,
  );
  button.disabled = true;
  finalOutput.classList.remove("empty");

  while (generation === runPollGeneration) {
    let record;

    try {
      record = await request(
        `/api/runs/${encodeURIComponent(runId)}`
      );
    } catch (error) {
      if (
        error instanceof RequestFailure &&
        error.kind === "transport"
      ) {
        status.textContent =
          "Connection lost · reconnecting…";
        finalOutput.textContent =
          transportReport(error, runId);
        await wait(3000);
        continue;
      }

      localStorage.removeItem(
        ACTIVE_RUN_STORAGE_KEY
      );
      button.disabled = false;

      if (
        error instanceof RequestFailure &&
        error.status === 404
      ) {
        status.textContent = "Run not found.";
        finalOutput.textContent = [
          "Run could not be recovered",
          "",
          `Run ID: ${runId}`,
          "EdOr has no persisted record for this run.",
          "The original submission may not have reached the server.",
        ].join("\n");
        return null;
      }

      status.textContent = error.message;
      finalOutput.textContent = [
        "Could not retrieve the run",
        "",
        `Run ID: ${runId}`,
        error.message,
      ].join("\n");
      return null;
    }

    const result = unwrapRunRecord(record);
    const steps = result.steps || [];
    renderTrace(steps);

    if (
      result.status === "queued" ||
      result.status === "running"
    ) {
      const location = describeCurrentStep(result);
      status.textContent =
        `${result.status === "queued" ? "Queued" : "Running"}` +
        ` · ${location}` +
        ` · ${steps.length} completed`;

      const progressLines = [
        "Run continues server-side",
        "",
        `Run ID: ${runId}`,
        `Status: ${result.status}`,
        `Current: ${location}`,
        `Completed calls: ${steps.length}`,
        "",
        "You may close this page and return later.",
      ];

      if (steps.length && result.final_session_payload) {
        progressLines.push(
          "",
          "Latest persisted material:",
          result.final_session_payload,
        );
      }

      finalOutput.textContent =
        progressLines.join("\n");
      await wait(RUN_POLL_INTERVAL_MS);
      continue;
    }

    localStorage.removeItem(
      ACTIVE_RUN_STORAGE_KEY
    );
    button.disabled = false;

    if (result.status === "completed") {
      finalOutput.textContent =
        result.final_session_payload;
      status.textContent =
        `Completed · ${steps.length} model call` +
        `${steps.length === 1 ? "" : "s"}`;
      return result;
    }

    finalOutput.textContent =
      failureReport(result);
    status.textContent =
      result.status === "interrupted"
        ? "Run interrupted."
        : `Run failed · ${describeCurrentStep(result)}`;
    return result;
  }

  return null;
}

async function resumeDurableRun() {
  let runId = localStorage.getItem(
    ACTIVE_RUN_STORAGE_KEY
  );

  if (!runId) {
    try {
      const response = await request(
        "/api/runs?limit=1"
      );
      runId = response?.runs?.[0]?.run_id || null;
    } catch {
      return;
    }
  }

  if (runId) {
    await pollRun(runId);
  }
}

async function runSequence() {
  const button =
    byId("run-sequence");

  const status =
    byId("run-status");

  const payload =
    byId("payload").value;

  const loops =
    Number(byId("loops").value);

  if (!selectedStepIds.length) {
    status.textContent =
      "Add at least one Step.";

    throw new Error(
      "Add at least one Step."
    );
  }

  if (!payload.trim()) {
    status.textContent =
      "Material is required.";

    throw new Error(
      "Material is required."
    );
  }

  if (
    !Number.isInteger(loops) ||
    loops < 1
  ) {
    status.textContent =
      "Loops must be a positive integer.";

    throw new Error(
      "Loops must be a positive integer."
    );
  }

  button.disabled = true;
  status.textContent = "Submitting…";

  byId("final-output").textContent = "";
  byId("step-trace").innerHTML = "";

  const runId = createRunId();
  localStorage.setItem(
    ACTIVE_RUN_STORAGE_KEY,
    runId,
  );

  try {
    const accepted =
      await request("/api/runs", {
        method: "POST",

        body: JSON.stringify({
          run_id: runId,

          role_id:
            byId("role-select").value,

          mode_id:
            byId("mode-select").value,

          step_ids:
            selectedStepIds,

          loops,

          model:
            byId("model").value ||
            null,

          structured_input: {
            contextual_data:
              byId(
                "contextual-data"
              ).value,

            instructions_definition:
              byId(
                "instructions-definition"
              ).value,

            goals_success_definition:
              byId(
                "goals-success-definition"
              ).value,

            payload,
          },
        }),
      });
    return await pollRun(
      accepted.run_id || runId
    );
  } catch (error) {
    if (
      error instanceof RequestFailure &&
      error.kind === "transport"
    ) {
      status.textContent =
        "Submission response lost · checking run…";
      byId("final-output").textContent =
        transportReport(error, runId);
      await wait(1000);
      return await pollRun(runId);
    }

    localStorage.removeItem(
      ACTIVE_RUN_STORAGE_KEY
    );
    button.disabled = false;
    status.textContent = error.message;
    byId("final-output").textContent = [
      "Run was rejected before execution",
      "",
      error.message,
    ].join("\n");
    throw error;
  }
}

byId("run-sequence").addEventListener(
  "click",
  async () => {
    try {
      await runSequence();
    } catch {
      // runSequence already displays the error.
    }
  }
);

byId(
  "structured-input-file"
).addEventListener(
  "change",
  async (event) => {
    const input = event.target;

    const status =
      byId("xml-upload-status");

    const file =
      input.files &&
      input.files[0];

    if (!file) {
      return;
    }

    status.textContent =
      `Loading ${file.name}…`;

    try {
      const xmlText =
        await file.text();

      const parsed =
        parseStructuredInputXml(
          xmlText
        );

      applyStructuredInput(parsed);

      status.textContent =
        `${file.name} loaded. Review the setup, then click Run sequence.`;
    } catch (error) {
      status.textContent =
        error.message;
    } finally {
      input.value = "";
    }
  }
);

function parseTraceMarkdown(markdown) {
  const root = {
    level: 0,
    title: "",
    body: [],
    children: [],
  };
  const stack = [root];
  let inFence = false;

  for (const line of String(markdown || "").split("\n")) {
    const fence = /^\s*(```|~~~)/.test(line);

    if (fence) {
      stack[stack.length - 1].body.push(line);
      inFence = !inFence;
      continue;
    }

    const match = !inFence
      ? /^(#{1,6})[ \t]+(.+?)\s*#*\s*$/.exec(line)
      : null;

    if (!match) {
      stack[stack.length - 1].body.push(line);
      continue;
    }

    const node = {
      level: Math.min(5, match[1].length),
      title: match[2].trim(),
      body: [],
      children: [],
    };

    while (
      stack.length > 1
      && stack[stack.length - 1].level >= node.level
    ) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  return root.children;
}

function traceHeading(level, title) {
  const heading =
    document.createElement(`h${level}`);

  heading.textContent = title;
  return heading;
}

function renderTraceNode(node, open = false) {
  const details =
    document.createElement("details");

  details.className =
    `trace-section trace-level-${node.level}`;
  details.open = open;

  const summary =
    document.createElement("summary");

  summary.appendChild(
    traceHeading(node.level, node.title),
  );

  const body =
    document.createElement("div");

  body.className =
    "trace-section-body";

  const text =
    node.body.join("\n").trim();

  if (text) {
    const pre =
      document.createElement("pre");

    pre.textContent = text;
    body.appendChild(pre);
  }

  for (const child of node.children) {
    body.appendChild(
      renderTraceNode(child),
    );
  }

  details.append(summary, body);
  return details;
}

function renderTraceDataSection(
  parent,
  title,
  value,
  open = false,
) {
  const node = {
    level: 2,
    title,
    body: [value || ""],
    children: [],
  };

  parent.appendChild(
    renderTraceNode(node, open),
  );
}

function traceTranscriptFallback(step) {
  const title =
    `Call ${step.call_index} · ` +
    `Loop ${step.loop_number} · ` +
    `Step ${step.step_index}: ` +
    `${step.step_name}`;

  return [
    `# ${title}`,
    "",
    "## Model trace",
    "",
    step.trace_output || "No visible trace returned.",
  ].join("\n");
}

function buildTraceTranscript(steps) {
  return (steps || []).map((step) => {
    const sections = [
      step.trace_markdown || traceTranscriptFallback(step),
      "",
      "## Material before this task",
      "",
      step.input_session_payload || "",
      "",
      step.payload_returned === false
        ? "## Material handoff failed"
        : "## Replacement material returned",
      "",
      step.output_session_payload || "",
      "",
      "## Handoff",
      "",
      step.payload_returned === false
        ? "The model did not return complete Material. EdOr stopped before the next task."
        : "EdOr handed this material to the next task.",
    ];

    return sections.join("\n");
  }).join("\n\n---\n\n");
}

async function copyTraceTranscript() {
  const status =
    byId("trace-copy-status");
  const transcript =
    buildTraceTranscript(renderedTraceSteps);

  if (!transcript) {
    status.textContent = "No trace to copy.";
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(transcript);
    } else {
      const textarea =
        document.createElement("textarea");

      textarea.value = transcript;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      if (!document.execCommand("copy")) {
        throw new Error("Clipboard copy was rejected.");
      }

      textarea.remove();
    }

    status.textContent = "Copied.";
    window.setTimeout(() => {
      status.textContent = "";
    }, 2000);
  } catch (error) {
    status.textContent =
      `Copy failed: ${error.message}`;
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest("#copy-trace-transcript")) {
    copyTraceTranscript();
  }
});

function renderTrace(steps) {
  renderedTraceSteps = steps || [];

  const trace =
    byId("step-trace");

  trace.innerHTML = "";

  steps.forEach((step, index) => {
    const title =
      `Call ${step.call_index} · ` +
      `Loop ${step.loop_number} · ` +
      `Step ${step.step_index}: ` +
      `${step.step_name}`;
    const fallback = [
      `# ${title}`,
      "",
      "## Model trace",
      "",
      step.trace_output || "No visible trace returned.",
    ].join("\n");
    const nodes = parseTraceMarkdown(
      step.trace_markdown || fallback,
    );
    const root = nodes.find(
      (node) => node.level === 1,
    ) || {
      level: 1,
      title,
      body: [],
      children: [],
    };
    const section = renderTraceNode(
      root,
      index === steps.length - 1,
    );

    section.classList.add("trace-step");

    const sectionBody =
      section.querySelector(":scope > .trace-section-body");

    renderTraceDataSection(
      sectionBody,
      "Material before this task",
      step.input_session_payload,
    );
    renderTraceDataSection(
      sectionBody,
      step.payload_returned === false
        ? "Material handoff failed"
        : "Replacement material returned",
      step.output_session_payload,
    );
    renderTraceDataSection(
      sectionBody,
      "Handoff",
      step.payload_returned === false
        ? "The model did not return complete Material. EdOr stopped before the next task."
        : "EdOr handed this material to the next task.",
      false,
    );

    trace.appendChild(section);
  });
}

/* EDOR_MARKDOWN_TURNS_UI_V1 */
(function installPublicInputLabels() {
  const fields = [
    {
      id: "contextual-data",
      title: "What EdOr Should Know",
      hint: "Provide the background needed to understand the work.",
      placeholder: "Audience, circumstances, constraints, references, relevant facts…",
    },
    {
      id: "instructions-definition",
      title: "What EdOr Should Do",
      hint: "Describe the work EdOr should perform.",
      placeholder: "Create, revise, analyze, translate, extract, compare…",
    },
    {
      id: "goals-success-definition",
      title: "Desired Outcome and What Success Looks Like",
      hint: "Explain what the work should accomplish and how a good result should be judged.",
      placeholder: "Desired outcome:\n\nWhat success looks like:",
    },
    {
      id: "payload",
      title: "Material EdOr Should Work With",
      hint: "Provide the source material for this run.",
      placeholder: "Paste your notes, document, draft, transcript, data, or idea…",
    },
  ];

  function applyFieldCopy(fieldCopy) {
    const field = byId(fieldCopy.id);
    if (!field) {
      return;
    }

    field.placeholder = fieldCopy.placeholder;

    const container =
      field.closest("details") ||
      field.closest("section") ||
      field.parentElement;
    const summary = container?.querySelector("summary");
    const label =
      document.querySelector(`label[for="${fieldCopy.id}"]`);

    if (summary) {
      summary.textContent = fieldCopy.title;
    } else if (label) {
      label.textContent = fieldCopy.title;
    }

    if (
      field.previousElementSibling?.dataset
        ?.edorFieldHint === "true"
    ) {
      return;
    }

    const hint = document.createElement("p");
    hint.dataset.edorFieldHint = "true";
    hint.textContent = fieldCopy.hint;
    hint.style.margin = "0 0 0.5rem";
    hint.style.color = "#666";
    field.before(hint);
  }

  function install() {
    for (const fieldCopy of fields) {
      applyFieldCopy(fieldCopy);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      install,
      { once: true },
    );
  } else {
    install();
  }
})();

/* EDOR_EDITOR_SECTION_MENU_V1 */
(() => {
  const installEditorSectionMenu = () => {
    const fields = [
      ...document.querySelectorAll(".editor-workspace .editor-field"),
    ];
    const buttons = [
      ...document.querySelectorAll(
        ".editor-section-menu [data-editor-target]",
      ),
    ];

    if (!fields.length || !buttons.length) {
      return;
    }

    for (const button of buttons) {
      button.addEventListener("click", () => {
        for (const candidate of fields) {
          candidate.open = Boolean(
            candidate.querySelector(
              `#${button.dataset.editorTarget}`,
            ),
          );
        }

        for (const candidate of buttons) {
          const active = candidate === button;
          candidate.classList.toggle("active", active);

          if (active) {
            candidate.setAttribute("aria-current", "true");
          } else {
            candidate.removeAttribute("aria-current");
          }
        }
      });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      installEditorSectionMenu,
      { once: true },
    );
  } else {
    installEditorSectionMenu();
  }
})();

/* EDOR_EXPANDABLE_WORKSPACE_V1 */
(() => {
  const installExpandableWorkspace = () => {
    const setup = document.querySelector(".setup-details");
    const workbench = document.querySelector(".workbench-grid");
    const setupLabel = setup?.querySelector(".setup-toggle-label");
    const outputPanel = document.querySelector(".output-panel");
    const result = outputPanel?.querySelector(".result-details");
    const trace = outputPanel?.querySelector(".trace-details");

    const refreshSetup = () => {
      if (!setup || !workbench || !setupLabel) {
        return;
      }

      const collapsed = !setup.open;
      workbench.classList.toggle("setup-collapsed", collapsed);
      setupLabel.textContent = collapsed ? "Expand" : "Collapse";
    };

    const refreshOutputs = () => {
      if (!outputPanel || !result || !trace) {
        return;
      }

      outputPanel.classList.toggle(
        "result-only",
        result.open && !trace.open,
      );
      outputPanel.classList.toggle(
        "trace-only",
        trace.open && !result.open,
      );
      outputPanel.classList.toggle(
        "both-open",
        result.open && trace.open,
      );
    };

    setup?.addEventListener("toggle", refreshSetup);
    result?.addEventListener("toggle", refreshOutputs);
    trace?.addEventListener("toggle", refreshOutputs);

    refreshSetup();
    refreshOutputs();
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      installExpandableWorkspace,
      { once: true },
    );
  } else {
    installExpandableWorkspace();
  }
})();

function refreshEditorObjectSelect() {
  const bucket =
    byId("editor-bucket").value;

  fillSelect(
    byId("editor-object"),
    library[bucket],
    true,
  );
}

function clearEditor() {
  byId("editor-object").value = "";
  byId("editor-id").value = "";
  byId("editor-id").disabled = false;
  byId("editor-name").value = "";

  byId(
    "editor-description"
  ).value = "";

  byId("editor-enabled").checked = true;
  byId("editor-content").value = "";

  byId(
    "editor-status"
  ).textContent =
    "Creating a new object.";
}

function populateEditor() {
  const bucket =
    byId("editor-bucket").value;

  const id =
    byId("editor-object").value;

  const object =
    library[bucket].find(
      (item) =>
        item.object_id === id
    );

  if (!object) {
    clearEditor();
    return;
  }

  byId("editor-id").value =
    object.object_id;

  byId("editor-id").disabled = true;

  byId("editor-name").value =
    object.name;

  byId("editor-description").value =
    object.description;

  byId("editor-enabled").checked =
    object.enabled;

  byId("editor-content").value =
    object.content;

  byId("editor-status").textContent = "";
}

byId("editor-bucket").addEventListener(
  "change",
  () => {
    refreshEditorObjectSelect();
    clearEditor();
  }
);

byId("editor-object").addEventListener(
  "change",
  populateEditor
);

byId("new-object").addEventListener(
  "click",
  clearEditor
);

byId("save-object").addEventListener(
  "click",
  async () => {
    const status =
      byId("editor-status");

    const bucket =
      byId("editor-bucket").value;

    const id =
      byId("editor-id").value.trim();

    if (!id) {
      status.textContent =
        "Object ID is required.";

      return;
    }

    try {
      await request(
        `/api/library/${bucket}/` +
        `${encodeURIComponent(id)}`,
        {
          method: "PUT",

          body: JSON.stringify({
            name:
              byId("editor-name").value,

            description:
              byId(
                "editor-description"
              ).value,

            enabled:
              byId(
                "editor-enabled"
              ).checked,

            content:
              byId(
                "editor-content"
              ).value,
          }),
        },
      );

      await loadLibrary();

      byId("editor-bucket").value =
        bucket;

      refreshEditorObjectSelect();

      byId("editor-object").value =
        id;

      populateEditor();

      status.textContent = "Saved.";
    } catch (error) {
      status.textContent =
        error.message;
    }
  }
);

byId("delete-object").addEventListener(
  "click",
  async () => {
    const status =
      byId("editor-status");

    const bucket =
      byId("editor-bucket").value;

    const id =
      byId("editor-id").value.trim();

    if (
      !id ||
      !byId("editor-id").disabled
    ) {
      status.textContent =
        "Select an existing object first.";

      return;
    }

    try {
      await request(
        `/api/library/${bucket}/` +
        `${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );

      await loadLibrary();
      clearEditor();

      status.textContent = "Deleted.";
    } catch (error) {
      status.textContent =
        error.message;
    }
  }
);

Promise.all([
  loadLibrary(),
  loadModels(),
]).then(() => {
  window.__edorRestoreSavedRunSetup?.();
  return resumeDurableRun();
}).catch((error) => {
  byId("run-status").textContent =
    error.message;
});

/* EDOR_RUN_BUILDER_UI_V2 */
(() => {
    "use strict";

    if (window.__edorRunBuilderUiInstalled) {
        return;
    }

    window.__edorRunBuilderUiInstalled = true;

    const originalFetch = window.fetch.bind(window);

    const phaseState = {
        pre: [],
        post: [],
    };

    const phaseControls = {
        pre: null,
        post: null,
    };

    const summaryValues = {
        loops: null,
        model: null,
        role: null,
        mode: null,
    };

    let mainEmpty = null;
    const SAVED_RUN_SETUP_STORAGE_KEY =
        "edor.savedRunSetup";

    function setupStepIds(value) {
        const ids = Array.isArray(value)
            ? value
            : [];

        return ids.filter((stepId) =>
            library.steps.some(
                (step) => step.object_id === stepId,
            )
        );
    }

    function setRunSetupStatus(message) {
        const status = document.getElementById(
            "run-setup-status",
        );

        if (status) {
            status.textContent = message;
        }
    }

    function captureRunSetup() {
        return {
            version: 1,
            saved_at: new Date().toISOString(),
            loops: byId("loops").value,
            model: byId("model").value,
            role_id: byId("role-select").value,
            mode_id: byId("mode-select").value,
            pre_step_ids: [...phaseState.pre],
            step_ids: [...selectedStepIds],
            post_step_ids: [...phaseState.post],
            contextual_data: byId("contextual-data").value,
            instructions_definition:
                byId("instructions-definition").value,
            goals_success_definition:
                byId("goals-success-definition").value,
            payload: byId("payload").value,
        };
    }

    function restoreSavedRunSetup() {
        let setup;

        try {
            const saved = localStorage.getItem(
                SAVED_RUN_SETUP_STORAGE_KEY,
            );

            if (!saved) {
                return;
            }

            setup = JSON.parse(saved);
        } catch (error) {
            setRunSetupStatus(
                `Saved setup could not be read: ${error.message}`,
            );
            return;
        }

        if (!setup || setup.version !== 1) {
            setRunSetupStatus("Saved setup has an unsupported format.");
            return;
        }

        for (const [id, value] of Object.entries({
            "contextual-data": setup.contextual_data,
            "instructions-definition": setup.instructions_definition,
            "goals-success-definition": setup.goals_success_definition,
            payload: setup.payload,
        })) {
            if (typeof value === "string" && byId(id)) {
                byId(id).value = value;
            }
        }

        if (Number.isInteger(Number(setup.loops)) && Number(setup.loops) > 0) {
            byId("loops").value = String(setup.loops);
        }

        for (const [id, value] of Object.entries({
            "role-select": setup.role_id,
            "mode-select": setup.mode_id,
        })) {
            const select = byId(id);

            if (
                select
                && typeof value === "string"
                && Array.from(select.options).some(
                    (option) => option.value === value,
                )
            ) {
                select.value = value;
            }
        }

        if (typeof setup.model === "string" && setup.model) {
            const model = byId("model");

            if (
                !Array.from(model.options).some(
                    (option) => option.value === setup.model,
                )
            ) {
                const option = document.createElement("option");
                option.value = setup.model;
                option.textContent = setup.model;
                model.appendChild(option);
            }

            model.value = setup.model;
        }

        selectedStepIds = setupStepIds(setup.step_ids);
        phaseState.pre = setupStepIds(setup.pre_step_ids);
        phaseState.post = setupStepIds(setup.post_step_ids);

        renderSelectedSteps();
        renderPhaseSequence("pre");
        renderPhaseSequence("post");
        refreshSummaryValues();
        refreshMainEmpty();
        setRunSetupStatus("Saved setup restored.");
    }

    function saveRunSetup() {
        try {
            localStorage.setItem(
                SAVED_RUN_SETUP_STORAGE_KEY,
                JSON.stringify(captureRunSetup()),
            );
            setRunSetupStatus("Run setup saved.");
        } catch (error) {
            setRunSetupStatus(
                `Run setup could not be saved: ${error.message}`,
            );
        }
    }

    function installRunSetupPersistence() {
        const button = byId("save-run-setup");

        if (!button || button.dataset.bound === "true") {
            return;
        }

        button.dataset.bound = "true";
        button.addEventListener("click", saveRunSetup);
    }

    window.__edorRestoreSavedRunSetup =
        restoreSavedRunSetup;

    function normalizeText(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function requestUrl(input) {
        if (typeof input === "string") {
            return input;
        }

        if (input instanceof URL) {
            return input.toString();
        }

        if (input instanceof Request) {
            return input.url;
        }

        return "";
    }

    function requestMethod(input, init) {
        if (init && init.method) {
            return String(init.method).toUpperCase();
        }

        if (input instanceof Request) {
            return input.method.toUpperCase();
        }

        return "GET";
    }

    /* Extend the existing run request with pre/post Step sequences. */
    window.fetch = async function edorFetch(input, init) {
        const url = requestUrl(input);
        const method = requestMethod(input, init);

        if (
            method === "POST"
            && /\/api\/runs(?:\?|$)/.test(url)
            && init
            && typeof init.body === "string"
        ) {
            try {
                const body = JSON.parse(init.body);

                body.pre_step_ids = [...phaseState.pre];
                body.post_step_ids = [...phaseState.post];

                init = {
                    ...init,
                    body: JSON.stringify(body),
                };
            } catch (error) {
                console.error(
                    "EdOr run builder could not extend the run request.",
                    error,
                );
            }
        }

        return originalFetch(input, init);
    };

    function exactTextElement(root, text) {
        if (!root) {
            return null;
        }

        return [
            ...root.querySelectorAll(
                "label, legend, strong, h1, h2, h3, h4, span, div",
            ),
        ].find(
            (element) =>
                element.children.length === 0
                && normalizeText(element.textContent) === text,
        ) || null;
    }

    function findExistingStepsBlock() {
        const candidates = [
            ...document.querySelectorAll(
                "label, legend, strong, h1, h2, h3, h4, span, div",
            ),
        ].filter(
            (element) =>
                element.children.length === 0
                && normalizeText(element.textContent) === "Steps",
        );

        for (const candidate of candidates) {
            let current = candidate.parentElement;

            for (
                let depth = 0;
                current && depth < 6;
                depth += 1,
                current = current.parentElement
            ) {
                const select = current.querySelector(
                    "#available-step-select",
                );

                const addButton = current.querySelector(
                    "#add-step",
                );

                if (select && addButton) {
                    return current;
                }
            }
        }

        return null;
    }

    function addStyles() {
        if (document.getElementById("edor-run-builder-ui-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "edor-run-builder-ui-styles";
        style.textContent = `
            .edor-phase-block {
                margin: 12px 0;
            }

            .edor-phase-title {
                display: block;
                margin-bottom: 6px;
                font-weight: 600;
            }

            .edor-phase-picker {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 8px;
                align-items: center;
            }

            .edor-phase-picker select {
                width: 100%;
                min-width: 0;
            }

            .edor-phase-picker button {
                white-space: nowrap;
            }

            .edor-run-summary {
                margin: 22px 0 8px;
                padding: 18px;
                border: 1px solid #d8d8d8;
                border-radius: 6px;
                background: #fafafa;
            }

            .edor-run-summary h3,
            .edor-run-it-title {
                margin: 0 0 14px;
            }

            .edor-run-summary-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px 18px;
                margin-bottom: 18px;
            }

            .edor-run-summary-field {
                min-width: 0;
            }

            .edor-run-summary-field strong {
                display: block;
                margin-bottom: 3px;
            }

            .edor-run-summary-value {
                display: block;
                overflow-wrap: anywhere;
            }

            .edor-run-summary-phase + .edor-run-summary-phase {
                margin-top: 14px;
            }

            .edor-run-summary-label {
                display: block;
                margin-bottom: 6px;
                font-weight: 600;
            }

            .edor-phase-sequence,
            .edor-main-sequence {
                min-height: 42px;
                padding: 7px;
                border: 1px dashed #d5d5d5;
                border-radius: 4px;
                background: #fff;
            }

            .edor-phase-empty {
                padding: 6px 4px;
                color: #777;
                font-size: 0.92em;
            }

            .edor-phase-item {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 8px;
                align-items: center;
                padding: 4px 3px;
            }

            .edor-phase-item + .edor-phase-item {
                border-top: 1px solid #eee;
            }

            .edor-phase-item-name {
                min-width: 0;
                overflow-wrap: anywhere;
            }

            .edor-phase-item-actions {
                display: flex;
                gap: 4px;
            }

            .edor-phase-item-actions button {
                min-width: 28px;
                padding-left: 6px;
                padding-right: 6px;
            }

            .edor-main-sequence #selected-steps {
                margin-top: 0;
                margin-bottom: 0;
            }

            @media (max-width: 850px) {
                .edor-run-summary-grid {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
        `;

        document.head.appendChild(style);
    }

    function actionButton(label, title, disabled, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.title = title;
        button.disabled = disabled;
        button.addEventListener("click", handler);
        return button;
    }

    function movePhaseItem(phase, index, offset) {
        const sequence = phaseState[phase];
        const target = index + offset;

        if (target < 0 || target >= sequence.length) {
            return;
        }

        [sequence[index], sequence[target]] = [
            sequence[target],
            sequence[index],
        ];

        renderPhaseSequence(phase);
    }

    function removePhaseItem(phase, index) {
        phaseState[phase].splice(index, 1);
        renderPhaseSequence(phase);
    }

    function renderPhaseSequence(phase) {
        const control = phaseControls[phase];

        if (!control) {
            return;
        }

        const { sequenceElement, stepsById } = control;
        const sequence = phaseState[phase];
        sequenceElement.replaceChildren();

        if (sequence.length === 0) {
            const empty = document.createElement("div");
            empty.className = "edor-phase-empty";
            empty.textContent = "No Steps selected.";
            sequenceElement.appendChild(empty);
            return;
        }

        sequence.forEach((stepId, index) => {
            const step = stepsById.get(stepId);
            const row = document.createElement("div");
            row.className = "edor-phase-item";

            const name = document.createElement("div");
            name.className = "edor-phase-item-name";
            name.textContent = `${index + 1}. ${
                step ? step.name : stepId
            }`;

            const actions = document.createElement("div");
            actions.className = "edor-phase-item-actions";
            actions.append(
                actionButton(
                    "↑",
                    "Move up",
                    index === 0,
                    () => movePhaseItem(phase, index, -1),
                ),
                actionButton(
                    "↓",
                    "Move down",
                    index === sequence.length - 1,
                    () => movePhaseItem(phase, index, 1),
                ),
                actionButton(
                    "×",
                    "Remove",
                    false,
                    () => removePhaseItem(phase, index),
                ),
            );

            row.append(name, actions);
            sequenceElement.appendChild(row);
        });
    }

    function createPhasePicker(phase, title, steps) {
        const stepsById = new Map(
            steps.map((step) => [step.object_id, step]),
        );

        const block = document.createElement("div");
        block.className = "edor-phase-block";
        block.dataset.edorPhase = phase;

        const label = document.createElement("label");
        label.className = "edor-phase-title";
        label.textContent = title;

        const picker = document.createElement("div");
        picker.className = "edor-phase-picker";

        const select = document.createElement("select");

        for (const step of steps) {
            const option = document.createElement("option");
            option.value = step.object_id;
            option.textContent = step.name || step.object_id;
            select.appendChild(option);
        }

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.textContent = "Add";

        const sequenceElement = document.createElement("div");
        sequenceElement.className = "edor-phase-sequence";

        phaseControls[phase] = {
            select,
            sequenceElement,
            stepsById,
        };

        addButton.addEventListener("click", () => {
            const stepId = select.value;

            if (!stepId || phaseState[phase].includes(stepId)) {
                return;
            }

            phaseState[phase].push(stepId);
            renderPhaseSequence(phase);
        });

        picker.append(select, addButton);
        block.append(label, picker);
        renderPhaseSequence(phase);
        return block;
    }

    function selectedText(element) {
        if (!element) {
            return "—";
        }

        if (element.tagName === "SELECT") {
            return normalizeText(
                element.selectedOptions[0]?.textContent
                || element.value,
            ) || "—";
        }

        return normalizeText(element.value) || "—";
    }

    function refreshSummaryValues() {
        if (!summaryValues.loops) {
            return;
        }

        summaryValues.loops.textContent = selectedText(
            document.getElementById("loops"),
        );

        summaryValues.model.textContent = selectedText(
            document.getElementById("model"),
        );

        summaryValues.role.textContent = selectedText(
            document.getElementById("role-select"),
        );

        summaryValues.mode.textContent = selectedText(
            document.getElementById("mode-select"),
        );
    }

    function refreshMainEmpty() {
        if (!mainEmpty) {
            return;
        }

        mainEmpty.hidden = selectedStepIds.length > 0;
    }

    function summaryField(label, key) {
        const field = document.createElement("div");
        field.className = "edor-run-summary-field";

        const heading = document.createElement("strong");
        heading.textContent = `${label}:`;

        const value = document.createElement("span");
        value.className = "edor-run-summary-value";
        summaryValues[key] = value;

        field.append(heading, value);
        return field;
    }

    function summaryPhase(label, content) {
        const phase = document.createElement("div");
        phase.className = "edor-run-summary-phase";

        const heading = document.createElement("div");
        heading.className = "edor-run-summary-label";
        heading.textContent = label;

        phase.append(heading, content);
        return phase;
    }

    function createRunSummary(selectedSteps) {
        const summary = document.createElement("section");
        summary.className = "edor-run-summary";

        const title = document.createElement("h3");
        title.textContent = "Run Summary";

        const grid = document.createElement("div");
        grid.className = "edor-run-summary-grid";
        grid.append(
            summaryField("Loops", "loops"),
            summaryField("Model", "model"),
            summaryField("Role", "role"),
            summaryField("Mode", "mode"),
        );

        const mainSequence = document.createElement("div");
        mainSequence.className = "edor-main-sequence";

        mainEmpty = document.createElement("div");
        mainEmpty.className = "edor-phase-empty";
        mainEmpty.textContent = "No Steps selected.";

        mainSequence.append(mainEmpty, selectedSteps);

        summary.append(
            title,
            grid,
            summaryPhase(
                "Pre-step",
                phaseControls.pre.sequenceElement,
            ),
            summaryPhase("Sequence", mainSequence),
            summaryPhase(
                "Post-step",
                phaseControls.post.sequenceElement,
            ),
        );

        return summary;
    }

    function installLiveBindings() {
        const inputs = [
            document.getElementById("loops"),
            document.getElementById("model"),
            document.getElementById("role-select"),
            document.getElementById("mode-select"),
        ].filter(Boolean);

        for (const input of inputs) {
            input.addEventListener("input", refreshSummaryValues);
            input.addEventListener("change", refreshSummaryValues);

            new MutationObserver(refreshSummaryValues).observe(
                input,
                {
                    childList: true,
                    subtree: true,
                },
            );
        }

        const originalRenderSelectedSteps = renderSelectedSteps;

        renderSelectedSteps = function edorRenderSelectedSteps(...args) {
            const result = originalRenderSelectedSteps(...args);
            refreshMainEmpty();
            return result;
        };

        const originalApplyStructuredInput = applyStructuredInput;

        applyStructuredInput = function edorApplyStructuredInput(...args) {
            const result = originalApplyStructuredInput(...args);
            refreshSummaryValues();
            refreshMainEmpty();
            return result;
        };
    }

    function installRunItHeading() {
        const button = document.getElementById("run-sequence");
        const actionRow = button?.parentElement;
        const container = actionRow?.parentElement;

        if (
            !button
            || !actionRow
            || !container
            || container.querySelector(".edor-run-it-title")
        ) {
            return;
        }

        const title = document.createElement("h3");
        title.className = "edor-run-it-title";
        title.textContent = "Run It!";
        container.insertBefore(title, actionRow);
    }

    async function loadEnabledSteps() {
        const response = await originalFetch("/api/library");

        if (!response.ok) {
            throw new Error(
                `Library request failed with HTTP ${response.status}`,
            );
        }

        const loadedLibrary = await response.json();

        return (loadedLibrary.steps || [])
            .filter((step) => step.enabled !== false)
            .sort((left, right) =>
                String(left.name || left.object_id).localeCompare(
                    String(right.name || right.object_id),
                    undefined,
                    { sensitivity: "base" },
                )
            );
    }

    async function installUi() {
        if (document.querySelector(".edor-run-summary")) {
            return;
        }

        const stepsBlock = findExistingStepsBlock();
        const parent = stepsBlock?.parentElement;
        const selectedSteps = document.getElementById("selected-steps");

        if (!stepsBlock || !parent || !selectedSteps) {
            console.error(
                "EdOr run builder could not locate the existing Steps UI.",
            );
            return;
        }

        addStyles();

        let steps;

        try {
            steps = await loadEnabledSteps();
        } catch (error) {
            console.error(
                "EdOr run builder could not load the Step library.",
                error,
            );
            return;
        }

        const stepsLabel = exactTextElement(stepsBlock, "Steps");

        if (stepsLabel) {
            stepsLabel.textContent = "Choose Steps";
        }

        const oldSequenceLabel = exactTextElement(
            selectedSteps.parentElement,
            "Sequence",
        );

        if (oldSequenceLabel) {
            oldSequenceLabel.remove();
        }

        const prePicker = createPhasePicker(
            "pre",
            "Choose Pre-Step",
            steps,
        );

        const postPicker = createPhasePicker(
            "post",
            "Choose Post-Step",
            steps,
        );

        parent.insertBefore(prePicker, stepsBlock);
        parent.insertBefore(postPicker, stepsBlock.nextSibling);

        const summary = createRunSummary(selectedSteps);
        parent.insertBefore(summary, postPicker.nextSibling);

        installLiveBindings();
        installRunSetupPersistence();
        installRunItHeading();
        refreshSummaryValues();
        refreshMainEmpty();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            installUi,
            { once: true },
        );
    } else {
        installUi();
    }
})();
