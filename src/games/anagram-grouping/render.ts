import {
  escapeHtml,
  renderItemFeed,
  type ChallengeActionOption,
  type ChallengePrompt,
  type CodeListing,
  type DiagnosticEntry,
  type ItemFeedState,
  type StageLegendItem,
} from "../../shared/game-ui";
import { formatGroups, type TraceSnapshot } from "./algorithm";
import type { ChallengeAction, ChallengeDecision } from "./game";

export const PSEUDOCODE = [
  { id: "initialize", code: "groups = []; signatureToGroup = {}" },
  { id: "inspect", code: "for each word in input order:" },
  { id: "build-signature", code: "signature = sortCharacters(word)" },
  { id: "lookup", code: "look up signature in signatureToGroup" },
  {
    id: "create-group",
    code: "if absent: map signature to a new group containing word",
  },
  { id: "append-word", code: "otherwise: append word to its existing group" },
  { id: "complete", code: "return groups in first-seen order" },
] as const satisfies CodeListing;

export const PYTHON_CODE = [
  {
    id: "python-signature",
    code: "def group_anagrams(words: list[str]) -> list[list[str]]:",
  },
  {
    id: "initialize",
    code: "    groups: list[list[str]] = []",
  },
  {
    id: "python-signature-map",
    code: "    signature_to_group: dict[str, int] = {}",
  },
  { id: "inspect", code: "    for word in words:" },
  {
    id: "build-signature",
    code: '        signature = "".join(sorted(word))',
  },
  {
    id: "lookup",
    code: "        group_index = signature_to_group.get(signature)",
  },
  {
    id: "python-new-condition",
    code: "        if group_index is None:",
  },
  {
    id: "create-group",
    code: "            signature_to_group[signature] = len(groups); groups.append([word])",
  },
  { id: "python-existing-branch", code: "        else:" },
  {
    id: "append-word",
    code: "            groups[group_index].append(word)",
  },
  { id: "complete", code: "    return groups" },
  {
    id: "python-example",
    code: '# group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]) == [["eat", "tea", "ate"], ["tan", "nat"], ["bat"]]',
  },
] as const satisfies CodeListing;

export const STAGE_LEGEND = [
  { label: "INCOMING WORD", markerClass: "anagram-legend-incoming" },
  { label: "SORTED SIGNATURE", markerClass: "anagram-legend-signature" },
  { label: "KNOWN SIGNATURE", markerClass: "anagram-legend-known" },
  { label: "ORDERED GROUP", markerClass: "anagram-legend-group" },
] as const satisfies readonly StageLegendItem[];

export const CHALLENGE_ACTIONS = [
  { action: "create", cue: "NOT FOUND", label: "CREATE NEW GROUP" },
  { action: "append", cue: "FOUND", label: "APPEND TO GROUP" },
] as const satisfies readonly ChallengeActionOption<ChallengeAction>[];

export function renderStageBody(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return `
    <div class="assembly-layout">
      <section class="signature-workbench" aria-label="Signature scanner">
        ${renderWordFeed(snapshot)}
        <div class="signature-scanner">
          <div class="scanner-word"><span>INCOMING WORD</span><strong>${renderCurrentWord(snapshot)}</strong></div>
          <div class="scanner-arrow" aria-hidden="true">&gt;&gt;</div>
          <div class="scanner-signature"><span>SORTED SIGNATURE</span><strong>${renderCurrentSignature(snapshot)}</strong></div>
          <div class="lookup-status"><span>DIRECTORY LOOKUP</span><strong>${renderLookupStatus(snapshot, hideDecision)}</strong></div>
        </div>
        ${renderSignatureDirectory(snapshot)}
      </section>
      ${renderGroupBays(snapshot)}
    </div>
  `;
}

export function operationLabel(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "lookup" && hideDecision) return "LOOKUP // ???";
  switch (snapshot.kind) {
    case "start":
      return "ASSEMBLY READY";
    case "inspect":
      return "INSPECT WORD";
    case "build-signature":
      return "SORT LETTERS";
    case "lookup":
      return snapshot.decision === "create"
        ? "LOOKUP // NEW"
        : "LOOKUP // FOUND";
    case "create-group":
      return `CREATE BAY ${String(snapshot.groupIndex + 1).padStart(2, "0")}`;
    case "append-word":
      return `APPEND BAY ${String(snapshot.groupIndex + 1).padStart(2, "0")}`;
    case "complete":
      return "ASSEMBLY COMPLETE";
  }
}

export function stageExplanation(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  return hideDecision
    ? "Compare the sorted signature with the visible directory, then choose whether to create a group or append to one."
    : snapshot.explanation;
}

export function getDiagnostics(
  snapshot: TraceSnapshot,
): readonly DiagnosticEntry[] {
  return [
    { label: "INSPECTED", value: pad(snapshot.counts.inspections) },
    { label: "SIGNATURES", value: pad(snapshot.counts.signatures) },
    { label: "LOOKUPS", value: pad(snapshot.counts.lookups) },
    { label: "GROUPS", value: pad(snapshot.counts.groupsCreated) },
    { label: "APPENDS", value: pad(snapshot.counts.appends) },
  ];
}

export function renderChallengePrompt(
  _snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  decisionNumber: number,
): ChallengePrompt {
  return {
    label: `SIGNATURE DECISION ${String(decisionNumber)}`,
    heading: `WORD ${JSON.stringify(decision.word)} // SIGNATURE ${JSON.stringify(decision.signature)}`,
    question:
      "Does this signature need a new ordered group, or should the word append to an existing group?",
  };
}

export function explainChallengeAnswer(
  snapshot: TraceSnapshot,
  decision: ChallengeDecision,
  _answer: ChallengeAction,
  isCorrect: boolean,
): string {
  if (snapshot.kind !== "lookup") {
    throw new Error("Challenge answer requires a lookup snapshot.");
  }

  const signature = JSON.stringify(decision.signature);
  if (decision.expectedAction === "create") {
    return isCorrect
      ? `Correct: signature ${signature} is absent from the directory, so create the next ordered group.`
      : `Try again: signature ${signature} is absent from the directory. There is no matching group to append to, so create one.`;
  }

  if (snapshot.decision !== "append") {
    throw new Error("Append challenge decision references a create lookup.");
  }
  const groupIndex = snapshot.groupIndex;
  return isCorrect
    ? `Correct: signature ${signature} already maps to group ${String(groupIndex + 1)}, so append the word there.`
    : `Try again: signature ${signature} already maps to group ${String(groupIndex + 1)}. Reuse that group to keep all anagrams together.`;
}

function renderWordFeed(snapshot: TraceSnapshot): string {
  return renderItemFeed({
    heading: "WORD FEED",
    summary: "INPUT ORDER >",
    scrollLabel: "Scrollable input word feed",
    items: snapshot.words.map((word, index) => ({
      label: `WORD ${String(index + 1).padStart(2, "0")}`,
      text: word,
      status: wordStatus(snapshot, index),
      state: wordFeedState(snapshot, index),
    })),
  });
}

function renderCurrentWord(snapshot: TraceSnapshot): string {
  if (snapshot.kind === "complete") return "DONE";
  if (snapshot.activeWordIndex === null) return "READY";
  return escapeHtml(wordAt(snapshot, snapshot.activeWordIndex));
}

function renderCurrentSignature(snapshot: TraceSnapshot): string {
  if (snapshot.kind === "complete") return "DONE";
  return snapshot.signature === null
    ? "PENDING"
    : escapeHtml(snapshot.signature);
}

function renderLookupStatus(
  snapshot: TraceSnapshot,
  hideDecision: boolean,
): string {
  if (snapshot.kind === "lookup") {
    if (hideDecision) return "CHECK DIRECTORY";
    return snapshot.decision === "create"
      ? "NOT FOUND // CREATE"
      : `FOUND // BAY ${String(snapshot.groupIndex + 1).padStart(2, "0")}`;
  }
  if (snapshot.kind === "create-group") return "NEW BAY OPEN";
  if (snapshot.kind === "append-word") return "MATCH FILED";
  if (snapshot.kind === "complete") return "ALL WORDS FILED";
  return "STANDBY";
}

function renderSignatureDirectory(snapshot: TraceSnapshot): string {
  const entries = snapshot.signatureEntries
    .map(
      (entry) => `
        <li>
          <span>${escapeHtml(entry.signature)}</span>
          <strong>BAY ${String(entry.groupIndex + 1).padStart(2, "0")}</strong>
        </li>
      `,
    )
    .join("");
  return `
    <section class="signature-directory" aria-labelledby="signature-directory-heading">
      <div><span>HASH TABLE</span><h3 id="signature-directory-heading">SIGNATURE DIRECTORY</h3></div>
      ${entries ? `<ol>${entries}</ol>` : '<p class="empty-directory">NO SIGNATURES STORED</p>'}
    </section>
  `;
}

function renderGroupBays(snapshot: TraceSnapshot): string {
  const bays = snapshot.groups
    .map((group, groupIndex) => {
      const isLatest =
        (snapshot.kind === "create-group" || snapshot.kind === "append-word") &&
        snapshot.groupIndex === groupIndex;
      return `
        <li class="group-bay ${isLatest ? "is-latest" : ""}" data-group-index="${String(groupIndex)}">
          <div><span>ORDER ${String(groupIndex + 1).padStart(2, "0")}</span><strong>GROUP BAY ${String(groupIndex + 1).padStart(2, "0")}</strong></div>
          <div class="group-words">${group.map((word) => `<span>${escapeHtml(word)}</span>`).join("")}</div>
        </li>
      `;
    })
    .join("");
  const result =
    snapshot.kind === "complete"
      ? `<p class="assembly-result"><span>FINAL OUTPUT</span><strong>${escapeHtml(formatGroups(snapshot.result))}</strong></p>`
      : "";
  return `
    <aside class="group-bay-console" aria-label="Ordered anagram groups">
      <div class="group-bay-heading"><span>OUTPUT ARRAY</span><strong>${String(snapshot.groups.length).padStart(2, "0")} GROUPS</strong></div>
      ${bays ? `<ol class="group-bay-list">${bays}</ol>` : '<div class="empty-bays"><strong>NO GROUPS YET</strong><p>First-seen signatures open bays here.</p></div>'}
      ${result}
    </aside>
  `;
}

function wordStatus(snapshot: TraceSnapshot, index: number): string {
  if (index < snapshot.processedCount) return "FILED";
  if (index === snapshot.activeWordIndex) return "INCOMING";
  return "QUEUED";
}

function wordFeedState(snapshot: TraceSnapshot, index: number): ItemFeedState {
  if (index === snapshot.activeWordIndex) {
    return index < snapshot.processedCount ? "latest" : "current";
  }
  return index < snapshot.processedCount ? "processed" : "pending";
}

function wordAt(snapshot: TraceSnapshot, index: number): string {
  const word = snapshot.words[index];
  if (word === undefined) {
    throw new Error("Trace references a word outside the input feed.");
  }
  return word;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
