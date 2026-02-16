# Post-MVP Features

## Style-Based Script Engine

### Vision

Allow users to select a creator style when generating scripts. Style modifies prompt structure, tone, pacing, and rhetorical devices.

### MVP+ Implementation Plan

1. Add `script_style` column to `content` table (nullable text).

2. Create enum-like allowed values:
   - `hormozi`
   - `gadzhi`
   - `becker`
   - `abdaal`
   - `mr_beast`
   - `custom`

3. Update AI prompt builder to inject style-specific system instructions.

4. Add dropdown in UI on content detail page.

5. Persist selection to DB.

6. Log style in `ai_generation_logs`.

### Prompt Architecture Strategy

Use the base retention structure (hook, curiosity loop, core value, pattern interrupt, payoff, CTA) and overlay a style modifier block.

Style modifier examples:

- **Hormozi** — Aggressive clarity, short punchy sentences, direct claims.
- **Gadzhi** — Aspirational authority tone.
- **Becker** — Sarcastic, blunt, contrarian.
- **Abdaal** — Calm, structured, educational.
- **Mr Beast** — High energy, escalation loops.

### Future Enhancements

- Allow custom style training via example scripts.
- Fine-tuned style embeddings.
- Style slider (0–100%).
