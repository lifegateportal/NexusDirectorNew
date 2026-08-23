export const READER_NORMALIZATION_RULES = `READER NORMALIZATION (book-first):
- Convert live-audience delivery to reader-facing prose.
- Never address a live audience anywhere in the book.
- Remove room-control cues and response prompts (e.g., "say amen", "look at your neighbor", applause cues, altar-response directives).
- Rewrite stage/location references ("in this room", "as you sit here today") into direct reader language.
- Remove calendar, service, and sermon-series framing such as "this month," "this week," "today's service," and "in this series." Replace it with timeless book context only when the source supplies a clear subject; otherwise delete the framing.
- Preserve the author's pastoral direct address, exhortations, declarations, and relational warmth. Remove oral setup such as "I want you to understand," "let me explain," and "I want to show you" only when the following sentence can deliver the same teaching directly.
- Preserve meaning, doctrine, and argument sequence exactly; only change delivery mode.`;

export const SOURCE_LOCK_RULES = `════════════════════════════════════════════
SOURCE-LOCK — THE MOST IMPORTANT RULE IN THIS PROMPT
════════════════════════════════════════════
This book contains ONLY what this preacher taught in this transcript. Nothing else.

THE GHOST-TEST: Before writing any sentence, ask: "Did this specific preacher say this specific thing in the provided excerpts?" If the answer is anything other than YES, that sentence must not exist.

WHAT IS FORBIDDEN — be precise about each category:

1. THEOLOGICAL EXTENSIONS: The preacher made point A. You know that point A logically implies point B. Point B is not in the transcript. → Do not write point B. It doesn't matter how obvious or correct point B is. The preacher didn't teach it here.

2. SUPPORTING SCRIPTURE YOU KNOW: The preacher quoted Psalm 91. You know of five other passages that reinforce the same theme. → Do not cite them. Only scripture the preacher explicitly quoted or referenced may appear.

3. DOCTRINAL BACKGROUND: You know the historical context, systematic theology category, Greek/Hebrew etymology, or church tradition behind what the preacher said. The preacher didn't mention any of it. → Do not include it. Your training data about theology is not source material.

4. LOGICAL COMPLETIONS: The preacher started an argument but didn't fully close it. You can see how it ends. → Do not complete it. Write what was said; leave the rest out.

5. CONSISTENT-SOUNDING CONTENT: An idea isn't in the transcript, but it "fits" the author's message, theology, or style. → Fitting is not the same as present. Do not include it.

6. APPLICATIONS AND IMPLICATIONS: The preacher taught a principle. You can derive practical applications from it. The preacher didn't state those applications. → Do not add them. Applications must come from the preacher's own words.

THE CORRECT RESPONSE TO THIN SOURCE MATERIAL: Write less. A section with three accurate, transcript-faithful paragraphs is better than five paragraphs where two were invented. Short and true beats long and padded. When the transcript runs out, the prose stops.

WHAT YOU MAY DO: Improve sentence structure, word choice, rhythm, and paragraph flow. Re-order sentences within an excerpt for logical clarity. Smooth transitions between ideas — using only the ideas present in the transcript. You own the presentation; the preacher owns every idea.`;

export const PROSE_MASTERY_RULES = `PROSE MASTERY: THE NOTEBOOKLM STANDARD (STYLE ONLY)

These rules control presentation, not content. SOURCE-LOCK, SECTION SCOPE, 
TRANSCRIPT SEQUENCE, and DUPLICATION rules always take priority.

RELATIONAL AUTHORITY (THE EXPERT GUIDE):
- Write with the warmth, focus, and absolute clarity of a master teacher speaking 
  to a smart friend across a table.
- Achieve high semantic density with low cognitive load: express deep theological or 
  textual concepts in simple, frictionless sentences.
- Strip away academic padding, religious jargon (unless intrinsic to the speaker), 
  and formal distance. Be highly authoritative but intimately accessible.

SEAMLESS SYNTHESIS (HIDE THE SEAMS):
- Never write "The speaker notes," "Another point is," "We also see," or "Later 
  in the passage."
- Weave fragmented transcript points into a single, continuous narrative arc. One 
  idea must dissolve naturally into the next without mechanical joints or bullet-point 
  structures in the prose.
- When integrating a quote, drop it directly into the flow of the sentence without 
  heavy theatrical setup (e.g., instead of "As he said, 'love is patient'", write 
  "Because love is patient, the response must change...").

THE SCRIPTURES AS TEACHING MATERIAL:
- You are turning a sermon into a book. Treat all scripture references as central, 
  authoritative teaching material.
- Use only live-verified verse text supplied in the writing prompt. Reproduce that
	text exactly and preserve its verified translation label.
- Never reconstruct, complete, correct, or paraphrase biblical text from model memory.
- If a reference has no verified text, state the reference only.
- While the prose should flow seamlessly, the scripture itself must anchor the 
  teaching with weight and precision.

AUDIO-FIRST PACING:
- Write for the "inner ear." If a sentence requires the reader to pause or re-read 
  to understand its grammar, rewrite and simplify it.
- Use strategic cadence to build momentum: start with a steady explanation, accelerate 
  with shorter factual claims, and land with a definitive, resonant conclusion.
- Keep the rhythm natural. Do not vary sentence structure merely to satisfy a pattern, 
  and use fragments only when the transcript's voice clearly supports them.

ZERO-FRICTION EMPATHY & STAKES:
- When the transcript identifies a struggle, doubt, or human weakness, frame it as 
  a shared human reality, not a distant observation.
- Address the tension directly and simply. Do not add melodrama, urgency, or 
  inspiration that the transcript itself does not contain.

CLAIM-STRENGTH FIDELITY:
- Preserve the exact certainty, scope, and force of the speaker's claim.
- Never strengthen a qualified statement into an absolute promise, and never weaken an explicit declaration into cautious language.
- Words such as "always," "never," "complete," "permanent," "cannot," and "will" may appear only when that degree of certainty is explicit in the source.

LOCAL LOGIC AND REFERENTS:
- Every contrast must compare genuinely distinct ideas and preserve the speaker's intended logic.
- Every pronoun and backward reference must have a clear antecedent in the continuous chapter. Preserve references such as "this" or "the same truth" when the preceding section supplies that antecedent.
- Prefer the source-named subject over vague constructions such as "there is someone," "this thing," or "what happened with it." Never invent an actor merely to make a sentence more specific.

ANECDOTES AND ILLUSTRATIONS:
- Include a personal story only when the source provides enough setup, connection, and payoff for a reader to understand why it belongs. If essential context is absent, compress the story to its supported lesson or omit it; never invent the missing context.
- Give each illustration one clear function. Do not embellish it with new comic details, comparisons, or implications.
- For sexuality, trauma, addiction, and other sensitive subjects, preserve the author's candor while using dignified, reader-safe language.

CONCRETE ANCHORING:
- Prefer a supported action, image, event, or stated consequence over generic explanation.
- An abstract statement does not need a concrete example when the transcript provides none. 
  Keep it brief and faithful instead of manufacturing an anchor.
- Once an image or metaphor has made its point, stop explaining it.

RESTRAINT AND COMPRESSION (NO PADDING):
- Do not explain an idea twice. Delete sentences that merely repeat, intensify, or 
  summarize a point already made in slightly different words.
- Do not tell the reader what to feel, believe, notice, or apply unless the 
  transcript itself does so explicitly.
- Remove explanatory framing like "This means that," "What this shows is," or 
  "This is important." Allow a landed claim to stand alone.

FINAL NOTEBOOKLM STYLE CHECK:
Before returning the prose, remove:
- mechanical transitions that announce what the reader has already understood;
- generic explanation after a clear image or quote;
- unsupported intensifiers or decorative metaphors;
- inserted applications, consequences, or theological extensions.

The final result should feel masterfully shaped, effortlessly readable, and completely 
coherent, while remaining no more interpretive or specific than the original transcript.`;

export const PREMIUM_BOOK_STYLE_RULES = `PREMIUM BOOK STYLE STANDARDS:

STYLISTIC LIBERTY — WHAT YOU OWN:
You may improve sentence structure, word choice, rhythm, and paragraph architecture only where the transcript supports the result:
- Choose the most precise and vivid word available — not the first synonym that fits.
- Invert sentence structure for emphasis when it serves the idea.
- Preserve rhetorical questions or fragments when they belong to the speaker's voice; do not add them for drama.
- Reorder sentences within a paragraph to build better logical momentum.
- The CONTENT (every idea, argument, story, claim, and fact) is locked to the transcript. The PRESENTATION is yours. These are separate decisions. Never confuse them.
- If several phrasings are equally faithful, choose the clearest and most natural one.

EM DASH BAN (absolute — zero exceptions):
- Never use an em dash (—) for any purpose in the prose.
- Never use spaced em dashes ( — ), unspaced em dashes (—), or double hyphens (--) used as em dashes.
- Rewrite every sentence that would require an em dash: use a comma, colon, semicolon, or subordinate clause ("which," "who," "although," "because," "while," "since") instead. Only split into two sentences when both halves are genuinely strong standalone thoughts — not just because the em dash is gone.

PARAGRAPH CRAFT:
- No paragraph should exceed 5 sentences. Short paragraphs (1–2 sentences) are not weakness; they are emphasis.
- Avoid conspicuously repetitive openings, but never rewrite a clear sentence merely to vary its first word.
- End where the paragraph's assigned teaching advance naturally lands. Do not manufacture a question or dramatic close.
- Use a fragment only when it preserves a source-supported feature of the speaker's voice.

SENTENCE RHYTHM & FLOW (global literary standards):
- Let sentence length follow meaning. Revise only when repetition makes the passage difficult or monotonous to read aloud.
- When a thought would have used an em dash, prefer a subordinate clause over a period. "She left. She was afraid." → "She left, afraid of what she might find." Use "although," "because," "while," "since," "which," and "who" to bind related ideas before reaching for a full stop.
- Do not impose a sentence-pattern quota. Prefer direct syntax unless a more complex construction genuinely clarifies the relationship between ideas.
- Use semicolons only when they improve comprehension.
- Colons introduce conclusions and explanations — prefer them where an em dash would have appeared.
- Avoid passive constructions. Rewrite every "it was found that" and "there is a sense in which" into direct active claims.
- Use contractions where they occur naturally in prose (it's, you're, that's, don't, isn't, won't). They read human; stiff formal constructions read robotic.

PASSIVE VOICE:
Prefer active voice when the transcript identifies the actor and the rewrite preserves meaning. Passive voice is valid when the actor is unknown, irrelevant, or absent from the source.

BANNED PASSIVE PATTERNS (rewrite all of these):
- "is/are/was/were + past participle": "is seen," "was found," "are called," "were given" → find the actor and make them the subject.
- "there is/there are/there was/there were": "There is a tendency to" → "Writers tend to"; "There was a moment when" → name the moment directly.
- "it is/it was + adjective/past participle": "It is important to note," "It was decided that," "It is believed that" → delete or recast.
- "God is known as," "Jesus is referred to as," "Paul is considered" → "God is," "Jesus serves as," "Paul functions as."
- "we are called to," "we are meant to," "believers are told to" → "the call is," "the imperative is," "the text commands."
- "can be seen," "can be found," "should be noted" → show it; do not narrate that it can be seen.

ACTIVE REWRITE METHOD: Ask "Who is doing what?" and make the doer the subject only when the transcript supplies that doer. Never invent an actor to avoid passive voice.

TENSE CONSISTENCY (enforce in every paragraph before returning):
- Use PRESENT TENSE for teaching, principles, theological claims, and application: "Faith works through love," not "Faith worked through love." "Paul argues," not "Paul argued."
- Use PAST TENSE only for historical narrative events and specific stories: "Moses parted the sea," "When Peter walked on water."
- Never mix tenses within the same paragraph when discussing the same subject. If you begin expounding a scripture in present tense, every sentence of that exposition stays present tense.
- Scripture exposition is always present tense: the text "says," "teaches," "commands," "warns" — never "said," "taught," "commanded."
- Consistency check: scan every paragraph for tense shifts before finalizing. A drift from present to past in the same paragraph is an error.

FORBIDDEN PHRASES (hard ban — delete or rewrite every instance):
"In conclusion" | "It's important to note" | "It is crucial to remember" | "Let's delve into" | "A tapestry of" | "Navigating the landscape" | "In today's fast-paced world" | "Furthermore" | "Moreover" | "It is worth noting" | "At the end of the day" | "Game-changer" | "Paradigm shift" | "Deep dive" | "Unpack" | "Moving forward" | "Robust" | "Leverage" | "Synergy" | "It goes without saying" | "The truth is," | "The fact of the matter is" | "Indeed," | "Certainly," | "Ultimately," | "At its core," | "In essence," | "Simply put," | "Not just...but" | "Not merely...but" | "This is not merely" | "profoundly" | "deeply meaningful" | "transformative" | "journey" (used metaphorically) | "vibrant" | "fostering" | "crucial" | "vital" (overused)

PAIRED INTENSIFIER BAN:
- Never join two adjectives with "and" when either alone would be stronger: "clear and compelling" → "compelling"; "rich and complex" → "complex"; "deep and meaningful" → choose one word.

OPENING SENTENCES:
- Never open a paragraph with a direct re-statement of the section heading just used.
- Never open with a generalization when a specific detail from the transcript is available.
- Avoid opening with "This chapter", "This section", or "In this passage" — drop the reader into the idea, not a table of contents.

CHAPTER OPENINGS:
- Open with the strongest source-supported Scripture, tension, declaration, or image that establishes the chapter's governing question. State the central distinction within the first two or three paragraphs.
- Do not invent a story, rhetorical question, dramatic scene, or inspirational hook when the source already supplies a strong opening.
- Do not force a fashionable hook ahead of a controlling Scripture. When the Scripture creates the chapter's tension and establishes its premise, let it lead.
- Replace vague developmental language such as "another level," "a higher place," or "a new dimension" with the specific source-supported change. Do not add specificity the source does not provide.

TRANSITIONS:
- Transitions must create logical pull toward the next idea, not summarize what just happened.
- Mid-chapter summary transitions ("So, as we have seen...", "To summarize...") are forbidden.
- Never stack two rhetorical questions in back-to-back sentences.

HUMANIZATION RULES (anti-AI detection — enforce rigorously):
- Prefer natural syntax over conspicuous formula. Do not intentionally damage clear parallel structure merely to appear human.
- Avoid "X is not just A; it is B" and "X is not merely A, it is B" sentence frames — these are AI signatures.
- Avoid the double-comma appositive: "Love, the foundation of all things, is..." — rewrite as a separate sentence.
- Never follow a big claim with "This means that..." or "What this tells us is..." — land the implication directly.
- Avoid ending three or more consecutive paragraphs with a question.
- Do not summarize what a scripture quote says immediately after quoting it. Trust the reader.

KEY TERM CONSISTENCY:
- Identify the author's preferred term for key concepts from the Voice DNA preferredTerminology. Use that exact term throughout — never swap in a synonym for variety.
- If the author says "agape love," every reference in the chapter uses "agape love," not "God's love," "divine love," or "unconditional love."
- Inconsistent terminology is a mark of unpolished writing. Standardize on the author's own words.

HOUSE-STYLE CONSISTENCY:
- Apply one consistent divine-pronoun capitalization style to original prose, inferred from the dominant source usage. Never alter capitalization inside verified Scripture text.
- Use concise, idiomatic book language for titles and headings. Preserve the source thesis while removing unnecessary helper verbs and oral setup. If a title sounds like a sermon sentence rather than a published heading, compress it without changing its meaning.

FINAL PRODUCTION PROOFREAD:
Before returning prose, silently correct unclear referents, faulty contrasts, incomplete anecdotes, residual sermon context, inconsistent divine-pronoun capitalization, malformed citations, unmatched quotation marks, and doubled or missing punctuation. Correct presentation only; never add, remove, reinterpret, or theologically revise the speaker's teaching.

DIALOGUE AND CONVERSATION FORMATTING:
When the author recounts a conversation, exchange, or paraphrased dialogue (including conversations with God, prayers, or interpersonal exchanges from the transcript), apply these formatting rules:

- PARAPHRASED CONVERSATIONS: Keep them in flowing prose. Do not use theatrical dialogue tags or quotation marks for paraphrased speech. Instead, use indirect reported speech: "He told her it would be okay" not "He said, 'It will be okay.'"
- DIRECT QUOTES FROM SCRIPTURE OR A REAL SOURCE: Use standard quotation marks. Only use direct quotes when the transcript provides the verbatim wording.
- AVOID PLAY-SCRIPT FORMAT: Never format a conversation as "Person A: [text]" and "Person B: [text]" — this is a devotional book, not a transcript.
- AVOID REPEATED "SAID/TOLD" TAGS: Never stack multiple "I said… He said… I told him… She told me" structures in adjacent sentences. Vary with action beats, indirect speech, and narrative transitions.
- PRAYER CONVERSATIONS: When the author recounts praying or hearing from God, keep the voice intimate but avoid putting words in God's mouth unless the transcript contains the author's explicit phrasing.
`;

const AUDIENCE_PATTERNS = [
	/\blook at your neighbor\b/gi,
	/\bsay amen\b/gi,
	/\bclap your hands\b/gi,
	/\blift your hands\b/gi,
	/\btell them how good they look\b/gi,
	/\bas you sit here today\b/gi,
	/\bin this room today\b/gi,
	/\bright here in this place\b/gi,
	/\bthe person next to you\b/gi,
	/\byour neighbor\b/gi,
	/\bthis audience\b/gi,
];

const NON_BOOK_PATTERNS = [
	/\bgood\s+(morning|afternoon|evening),?\s+(church|everyone|family|saints)\b/gi,
	/\bwelcome\s+(to\s+church|everyone|family)\b/gi,
	/\bi\s+(just\s+)?want\s+to\s+thank\s+(you|everyone|all\s+of\s+you)\b/gi,
	/\bthank\s+you\s+(everyone|all|so\s+much|for\s+coming|for\s+joining|for\s+being\s+here)\b/gi,
	/\bwe\s+thank\s+you\s+for\s+coming\b/gi,
	/\blet\s+us\s+appreciate\b/gi,
	/\bput\s+your\s+hands\s+together\b/gi,
	/\bgive\s+the\s+lord\s+a\s+hand\b/gi,
	/\byou\s+may\s+be\s+seated\b/gi,
	/\btoday,?\s+we\s+are\s+looking\s+at\b/gi,
	/\blet\s+me\s+start\s+with\s+the\s+big\s+one\s+first\b/gi,
	/\bwell,?\s+we\s+never\s+have\s+enough\s+time\s+to\s+share\b/gi,
	/\bi\s+advance\s+in\s+love\b/gi,
	// F3 — oral padding prefixes (strip the filler prefix, keep the content clause)
	/\bi\s+want\s+you\s+to\s+understand\s+that\s*/gi,
	/\bi\s+need\s+you\s+to\s+hear\s+this[,.]?\s*/gi,
	/\blet\s+me\s+say\s+this\s+again[,.]?\s*/gi,
	/\byou\s+know\s+what\s+i('m|\s+am)\s+saying[,?]?\s*/gi,
	/\bdo\s+you\s+understand\s+what\s+i('m|\s+am)\s+saying[?.]?\s*/gi,
];

const NON_BOOK_SENTENCE_PATTERNS = [
	/\b(that\s+hand\s+clap\s+was\s+for\s+me|let'?s\s+do\s+it\s+for\s+jesus\s+christ|what\s+a\s+mighty\s+god\s+we\s+serve)\b/i,
	/\b(father,?\s+we\s+thank\s+you|thank\s+you,?\s+holy\s+spirit|blessed\s+be\s+the\s+name\s+of\s+the\s+lord|you\s+deserve\s+all\s+glory|you\s+deserve\s+all\s+adoration|we\s+bless\s+your\s+holy\s+name|great\s+is\s+your\s+faithfulness)\b/i,
	/\b(the\s+spirit\s+of\s+god\s+was\s+ministering\s+to\s+me|god\s+is\s+healing\s+you\s+today|that\s+issue\s+will\s+not\s+repeat\s+itself|he'?s\s+touching\s+you)\b/i,
	/\b(some\s+of\s+you\b|someone\s+here\b|the\s+lord\s+is\s+touching\s+someone\b)\b/i,
	// F3 — standalone oral padding sentences
	/^\s*are\s+you\s+following\s+me\??\s*$/i,
	/^\s*can\s+i\s+tell\s+you\s+something\??\s*$/i,
	/^\s*if\s+you\s+can\s+hear\s+me\s+(say|type)\s+amen\b.*$/i,
	/^\s*say\s+amen\s+if\s+you\s+(hear|receive|believe)\b.*$/i,
	/^\s*somebody\s+shout\b.*$/i,
	/^\s*give\s+god\s+a\s+(praise|shout|hand)\b.*$/i,
];

// F6 — altar call and salvation appeal sentences (mid-sermon or tail)
const ALTAR_CALL_PATTERNS: RegExp[] = [
	/\bif\s+you\s+want\s+to\s+accept\s+(jesus|christ|the\s+lord)\b/i,
	/\braise\s+your\s+hand\s+(right\s+now|if\s+you\b)/i,
	/\brepeat\s+after\s+me\b/i,
	/\bcome\s+to\s+the\s+(front|altar)\b/i,
	/\bsinner'?s\s+prayer\b/i,
	/\bgive\s+your\s+(life|heart)\s+to\s+(jesus|god|christ|the\s+lord)\b/i,
	/\baccept\s+(jesus|christ|the\s+lord)\s+(as\s+your|today)\b/i,
	/\byou\s+can\s+be\s+saved\s+today\b/i,
	/\bprayer\s+of\s+salvation\b/i,
	/\bif\s+you\s+(prayed|said)\s+that\s+prayer\b/i,
	/\bwelcome\s+(you\s+)?to\s+the\s+(family\s+of\s+god|kingdom)\b/i,
];

const RECAP_CUE_RE = /\b(this\s+month'?s\s+theme|our\s+monthly\s+theme|series\s+theme|theme\s+for\s+the\s+month|as\s+i\s+said\s+last\s+(week|message|time)|from\s+our\s+last\s+message|in\s+the\s+previous\s+message|continuing\s+this\s+series|part\s+\d+\s+of\s+this\s+series|welcome\s+back\s+to\s+this\s+series)\b/i;

export const NON_BOOK_CUE_RE = /\b(say amen|look at your neighbor|clap your hands|lift your hands|as you sit here today|in this room today|right here in this place|the person next to you|your neighbor|this audience|good\s+(morning|afternoon|evening),?\s+(church|everyone|family|saints)|welcome\s+(to\s+church|everyone|family)|i\s+(just\s+)?want\s+to\s+thank\s+(you|everyone|all\s+of\s+you)|thank\s+you\s+(everyone|all|so\s+much|for\s+coming|for\s+joining|for\s+being\s+here)|let\s+us\s+appreciate|put\s+your\s+hands\s+together|give\s+the\s+lord\s+a\s+hand|you\s+may\s+be\s+seated|that\s+hand\s+clap\s+was\s+for\s+me|let'?s\s+do\s+it\s+for\s+jesus\s+christ|what\s+a\s+mighty\s+god\s+we\s+serve|father,?\s+we\s+thank\s+you|thank\s+you,?\s+holy\s+spirit|blessed\s+be\s+the\s+name\s+of\s+the\s+lord|you\s+deserve\s+all\s+glory|you\s+deserve\s+all\s+adoration|we\s+bless\s+your\s+holy\s+name|great\s+is\s+your\s+faithfulness|the\s+spirit\s+of\s+god\s+was\s+ministering\s+to\s+me|god\s+is\s+healing\s+you\s+today|that\s+issue\s+will\s+not\s+repeat\s+itself|he'?s\s+touching\s+you|some\s+of\s+you|someone\s+here|today,?\s+we\s+are\s+looking\s+at|well,?\s+we\s+never\s+have\s+enough\s+time\s+to\s+share|i\s+advance\s+in\s+love)\b/gi;

// ── F7: Strip ASR/transcript artifacts before any other pass ─────────────────
function stripTranscriptArtifacts(input: string): string {
	return input
		// Timestamps: [00:12:34], (0:12), bare 0:12:34 at line start or standalone
		.replace(/\[?\(?\d{1,2}:\d{2}(?::\d{2})?\)?\]?\s*/g, "")
		// Speaker diarization labels: SPEAKER_01:  Speaker 1:  Host:  Pastor John:
		.replace(/^[A-Z][A-Za-z0-9 _-]{0,28}:\s*/gm, "")
		// ASR confidence/event tags: [inaudible] [crosstalk] [music] [applause] etc.
		.replace(/\[(inaudible|crosstalk|noise|laughter|music|applause|unclear|indistinct)\]/gi, "")
		// Numeric confidence scores: (0.92)
		.replace(/\(\d+\.\d+\)/g, "")
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// ── F2: Strip ASR filler words, stutters, and false-start repetitions ─────────
function stripASRNoise(input: string): string {
	return input
		// Standalone filler tokens: um, uh, er, hmm, erm (with optional comma)
		.replace(/\b(um|uh|er|hmm|hm|erm),?\s*/gi, "")
		// Word stutters: "the the the" → "the", "so so" → "so" (2–4 consecutive repeats)
		.replace(/\b(\w{2,})\s+(\1\s*){1,3}/gi, "$1 ")
		// False-start phrase repetitions: "what I mean is, what I mean is" → keep once
		.replace(/([^,.!?]{15,55}),\s*\1[,.]?/gi, "$1")
		.replace(/[ \t]{2,}/g, " ")
		.trim();
}

// ── F5: Collapse consecutive near-duplicate sentences (>80% token overlap) ───
function collapseNearDuplicateSentences(input: string): string {
	const paragraphs = input.split(/\n{2,}/);
	const result = paragraphs.map((para) => {
		const sentences = para.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
		if (sentences.length <= 1) return para;
		const kept: string[] = [sentences[0]];
		for (let i = 1; i < sentences.length; i++) {
			const prev = kept[kept.length - 1];
			const curr = sentences[i];
			const prevTokens = new Set(
				prev.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2)
			);
			const currTokens = curr.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
			if (prevTokens.size === 0 || currTokens.length === 0) { kept.push(curr); continue; }
			let shared = 0;
			for (const w of currTokens) { if (prevTokens.has(w)) shared++; }
			const overlap = shared / Math.min(prevTokens.size, currTokens.length);
			if (overlap < 0.8) kept.push(curr);
			// else: ≥80% duplicate of the previous sentence — drop it
		}
		return kept.join(" ");
	});
	return result.filter(Boolean).join("\n\n");
}

// ── F6: Excise mid-sermon altar calls and salvation appeals ──────────────────
function exciseMidSermonAltarCalls(input: string): string {
	const paragraphs = input.split(/\n{2,}/);
	const result = paragraphs.map((para) => {
		const sentences = para.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
		const kept = sentences.filter((s) => !ALTAR_CALL_PATTERNS.some((p) => p.test(s)));
		return kept.join(" ");
	});
	return result.filter(Boolean).join("\n\n");
}

// ── F4: Tag slots where >70% of sentences are non-book language ───────────────
function tagNonTeachingSlots(input: string): string {
	// Split on [Slot-N] boundaries, keeping the header at the front of each block
	const blocks = input.split(/(?=\[Slot-\d+\])/);
	return blocks.map((block) => {
		if (!/^\[Slot-\d+\]/.test(block)) return block;
		const body = block.replace(/^\[Slot-\d+\]\s*/, "");
		const sentences = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
		if (sentences.length < 3) return block; // too short to classify reliably
		const nonBookCount = sentences.filter((s) =>
			NON_BOOK_SENTENCE_PATTERNS.some((p) => p.test(s)) ||
			AUDIENCE_PATTERNS.some((p) => p.test(s)) ||
			NON_BOOK_PATTERNS.some((p) => p.test(s)) ||
			ALTAR_CALL_PATTERNS.some((p) => p.test(s))
		).length;
		if (nonBookCount / sentences.length > 0.7) {
			return block.replace(/\[Slot-(\d+)\]/, "[NON-TEACHING-SLOT-$1]");
		}
		return block;
	}).join("");
}

function cleanBookText(input: string): string {
	return input
		.replace(/\b(Amen|hallelujah|praise the lord|my god)\b/gi, "")
		// Remove em dashes: replace with comma for mid-sentence, period+space before capital
		.replace(/\s*\u2014\s*([A-Z])/g, ". $1")
		.replace(/\s*\u2014\s*/g, ", ")
		// Clean up double commas or comma-period sequences left after em dash removal
		.replace(/,\s*,/g, ",")
		.replace(/\.\s*,/g, ".")
		.replace(/,\s*\./g, ".")
		.replace(/[ \t]{2,}/g, " ")  // Only collapse horizontal whitespace — never newlines
		.replace(/\n{3,}/g, "\n\n")
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.trim();
}

function pruneNonBookSentences(input: string): string {
	// Preserve paragraph boundaries — process each paragraph independently
	const paragraphs = input.split(/\n{2,}/);
	const cleaned = paragraphs.map((paragraph) => {
		const parts = paragraph
			.split(/(?<=[.!?])\s+/)
			.map((part) => part.trim())
			.filter(Boolean);
		const kept = parts.filter((part) => !NON_BOOK_SENTENCE_PATTERNS.some((pattern) => pattern.test(part)));
		return kept.join(" ");
	}).filter(Boolean);
	return cleanBookText(cleaned.join("\n\n"));
}

function normalizeForRecapMatch(input: string): string[] {
	return input
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.filter((token) => token.length > 2);
}

function jaccardSimilarity(a: string[], b: string[]): number {
	if (a.length === 0 || b.length === 0) return 0;
	const aSet = new Set(a);
	const bSet = new Set(b);
	let intersection = 0;
	for (const token of aSet) {
		if (bSet.has(token)) intersection += 1;
	}
	const union = aSet.size + bSet.size - intersection;
	return union > 0 ? intersection / union : 0;
}

export function pruneRedundantSeriesRecaps(input: string): string {
	// Preserve paragraph boundaries — process each paragraph independently
	const paragraphs = input.split(/\n{2,}/);
	const cleanedParagraphs = paragraphs.map((paragraph) => {
		const sentences = paragraph
			.split(/(?<=[.!?])\s+/)
			.map((sentence) => sentence.trim())
			.filter(Boolean);

		const kept: string[] = [];
		const recapSignatures: string[][] = [];

		for (const sentence of sentences) {
			if (!RECAP_CUE_RE.test(sentence)) {
				kept.push(sentence);
				continue;
			}
			const signature = normalizeForRecapMatch(sentence);
			const isDuplicate = recapSignatures.some((existing) => jaccardSimilarity(existing, signature) >= 0.7);
			if (!isDuplicate) {
				recapSignatures.push(signature);
				kept.push(sentence);
			}
		}
		return kept.join(" ");
	}).filter(Boolean);

	return cleanBookText(cleanedParagraphs.join("\n\n"));
}

export function stripNonBookLanguage(input: string): string {
	let output = pruneNonBookSentences(input);
	for (const pattern of AUDIENCE_PATTERNS) {
		output = output.replace(pattern, "");
	}
	for (const pattern of NON_BOOK_PATTERNS) {
		output = output.replace(pattern, "");
	}
	return pruneNonBookSentences(pruneRedundantSeriesRecaps(cleanBookText(output)));
}

export function stripAudienceLanguage(input: string): string {
	return stripNonBookLanguage(input);
}

/**
 * cleanTranscriptForBook — full 7-pass deterministic filter pipeline.
 * Run on each raw slot transcript before LLM stages touch the text.
 *
 * Pass order:
 *   F7 → strip ASR/timestamp artifacts
 *   F2 → strip filler words, stutters, false-start repetitions
 *   F6 → excise mid-sermon altar calls and salvation appeals
 *   F1/F3 → sentence-level and phrase-level non-book language removal
 *   F5 → collapse consecutive near-duplicate sentences
 *   F4 → tag slots where >70% of sentences are non-book
 *       (content-map skips [NON-TEACHING-SLOT-N] blocks automatically)
 *   existing → prune redundant series recaps + clean typography
 */
export function cleanTranscriptForBook(input: string): string {
	let text = input;
	text = stripTranscriptArtifacts(text);
	text = stripASRNoise(text);
	text = exciseMidSermonAltarCalls(text);
	text = stripNonBookLanguage(text);
	text = collapseNearDuplicateSentences(text);
	text = tagNonTeachingSlots(text);
	text = pruneRedundantSeriesRecaps(text);
	return cleanBookText(text);
}

type HarmonizeManifestInput = {
	frontMatter: {
		preface: string;
		introduction: string;
		conclusion: string;
		aboutAuthor: string | null;
		resourcesList: string[];
	};
	chapters: Array<{
		number: number;
		title: string;
		intro: string;
		conclusion: string;
		keyTakeaways: string[];
		reflectionQuestions: string[];
		totalWordCount: number;
		sections: Array<{
			body: string;
			wordCount: number;
		}>;
	}>;
};

function countWords(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function harmonizeBookManifest<T extends HarmonizeManifestInput>(manifest: T): T {
	const chapters = manifest.chapters.map((chapter) => {
		const sections = chapter.sections.map((section) => {
			const body = stripNonBookLanguage(section.body ?? "");
			return {
				...section,
				body,
				wordCount: countWords(body),
			};
		});

		const intro = stripNonBookLanguage(chapter.intro ?? "");
		const conclusion = stripNonBookLanguage(chapter.conclusion ?? "");
		const keyTakeaways = (chapter.keyTakeaways ?? [])
			.map((item) => stripNonBookLanguage(item))
			.filter(Boolean);
		const reflectionQuestions = (chapter.reflectionQuestions ?? [])
			.map((item) => stripNonBookLanguage(item))
			.filter(Boolean);

		const totalWordCount =
			sections.reduce((sum, section) => sum + section.wordCount, 0) +
			countWords([intro, conclusion, ...keyTakeaways, ...reflectionQuestions].join(" "));

		return {
			...chapter,
			intro,
			conclusion,
			sections,
			keyTakeaways,
			reflectionQuestions,
			totalWordCount,
		};
	});

	const frontMatter = {
		...manifest.frontMatter,
		preface: stripNonBookLanguage(manifest.frontMatter.preface ?? ""),
		introduction: stripNonBookLanguage(manifest.frontMatter.introduction ?? ""),
		conclusion: stripNonBookLanguage(manifest.frontMatter.conclusion ?? ""),
		aboutAuthor: manifest.frontMatter.aboutAuthor ? stripNonBookLanguage(manifest.frontMatter.aboutAuthor) : null,
		resourcesList: (manifest.frontMatter.resourcesList ?? []).map((item) => stripNonBookLanguage(item)).filter(Boolean),
	};

	return {
		...manifest,
		frontMatter,
		chapters,
	};
}
