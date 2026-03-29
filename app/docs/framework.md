# Pramana Knowledge Framework

## Purpose
A structured methodology for evaluating and storing fitness and nutrition evidence. 
Every recommendation Pramana makes traces back to this framework.

---

## The Layered Brain

### Layer 1 — Static Knowledge Base
Manually curated, personally verified, highest confidence entries only.
The foundation. Conservative, defensible, never wrong.

### Layer 2 — Dynamic Retrieval
Real time search via OpenAlex/Semantic Scholar APIs.
Scored against this framework automatically.
Runs in parallel with Layer 1.
Lower confidence by default, explicitly labeled.

### Layer 3 — User Personal Context
Individual history, logged data, response patterns over time.

### Layer 4 — Practitioner Consensus
Curated coach evidence. Tagged separately from research.
Credible coaches with documented track records and large sample sizes.

---

## Confidence Architecture

### Evidence Quality Score (EQS)
Combines GRADE rating with population match score.
```
EQS = GRADE score × Population Match Score
```

### GRADE Rating (base)
- High — multiple replications, strong mechanistic understanding: 0.80-1.0
- Moderate — good evidence, some limitations: 0.55-0.79
- Low — limited replication or conflicting studies: 0.30-0.54
- Very low — early research or mechanistic theory only: 0.05-0.29

### Population Match Score
Priority variables in order of importance:
1. Natural status — highest weight
2. Training age
3. Health status
4. Goal alignment
5. Sex — neutral in training domain, minor weight in nutrition
6. Age range — lowest weight

Scoring bands:
- Exact match: 0.90-1.0 — natural + trained + healthy + matching goal
- Close match: 0.70-0.89 — matches on key variables, minor differences
- Partial match: 0.40-0.69 — trained but wrong tier, or natural status unknown
- Poor match: 0.10-0.39 — enhanced population, untrained, or clinical

Automatic disqualifiers from Layer 1:
- Enhanced athlete population
- Clinical or diseased population
- Natural status unreported in enhancement-common sport

### Sex and population matching
Sex is not a penalising variable in training domain.
Sex carries minor weight in nutrition domain.
Always noted in entry metadata regardless.

---

## Layer 1 Entry Review Process

### Step 0 — Biological Plausibility Check
Does this claim make mechanistic sense in human physiology?
Is there a known mechanism — mTOR, androgen receptors, myostatin, etc?
If no plausible mechanism exists, flag for extreme skepticism regardless of sources.

### Step 1 — Claim Proposed

### Step 2 — Literature Search
Minimum for Layer 1 status:
- At least one meta-analysis or systematic review, OR
- Three independent RCTs
All from peer reviewed journals.

### Step 3 — Full Text Review
Abstracts only is not sufficient.
Results tables and limitations sections are mandatory reading.

### Step 4 — Population Match Assessment
Score against population match criteria above.
Note all population descriptors explicitly.

### Step 5 — Effect Size Check
Statistical significance alone is not sufficient.
Cohen's d or equivalent must be reported or calculable.
Practically invisible effects do not qualify for Layer 1.

### Step 6 — Conflict and Bias Audit
Two components:
- Contradicting evidence search — actively look for studies that disagree
- COI/funding audit — was the study funded by a company selling the ingredient or device?
Industry funded studies flagged and weighted lower.

### Step 7 — GRADE Rating Assigned

### Step 8 — Population Match Score Assigned

### Step 9 — EQS Calculated

### Step 10 — Practical Translation Written
Structured format:
"Study population was [X].
Effect observed was [Y].
This translates to [Z] for [population]
because [mechanistic reason].
Confidence in this translation: [high/moderate/low]
because [specific reason]."

This is a structured logical inference from the data — not personal opinion.
Anyone can challenge the translation by challenging the reasoning chain.

### Step 11 — Falsifiability Statement
What would change this recommendation?
Identify explicit boundary conditions.
Example: "This claim only holds if protein intake exceeds 1.6g/kg"

### Step 12 — Approval and Date
Approved by: [name]
Date: [date]
Next review: [date]

### Step 13 — Review Cycle
Default: 12 months
Contested claims: 6 months
Triggered review: Immediately on major new publication in:
- American Journal of Clinical Nutrition (AJCN)
- Journal of the International Society of Sports Nutrition (JISSN)
- Sports Medicine
- Journal of Strength and Conditioning Research (JSCR)
- European Journal of Sport Science (EJSS)
Or any meta-analysis directly addressing a Layer 1 claim.

---

## Layer Conflict Resolution

### When Layer 2 contradicts Layer 1:

Step 1 — Score the Layer 2 paper against the full framework
Step 2 — Compare new EQS to Layer 1 entry EQS

If new EQS < Layer 1 EQS:
- Layer 1 stands
- Layer 2 noted as lower quality
- No confidence adjustment unless direct contradiction

If new EQS > Layer 1 EQS:
- Flag Layer 1 entry for review
- Surface conflict to user honestly
- Confidence adjusts based on conflict type
- Manual review triggered

If new EQS roughly equal:
- Treat as direct contradiction
- Both surfaced to user
- Confidence drops
- Review triggered

### Conflict Types and Confidence Adjustments:

Type 1 — Direct contradiction:
EQS × 0.6
User sees: "This claim is actively contested by recent research."

Type 2 — Boundary condition conflict:
EQS × 0.85
User sees: "This claim holds generally but recent evidence suggests a boundary condition."

Type 3 — Population specific conflict:
If user matches subpopulation — Layer 2 EQS × population match score
If user doesn't match — Layer 1 stands, exception noted

---

## Adverse Event Process

### Detection
- Flag button on every recommendation output
- Check-in questions surfacing pain, discomfort, negative outcomes
- Anomaly detection in logged data

### Immediate Response
- Recommendation tagged "under review" immediately
- User acknowledged within 24 hours — personally at MVP scale
- Full context pulled — recommendation, confidence score, layer source, user profile

### Entry Level Response
If recommendation was plausible cause:
- Entry immediately flagged in Layer 1
- Confidence dropped to lowest tier
- Entry removed from active recommendations pending review
- Full review triggered immediately
- All users who received that recommendation notified

### Stance
Pramana takes responsibility for the quality of reasoning.
Not for individual outcomes that cannot be fully predicted.
Conservative recommendations at MVP — high confidence entries only.

### Public Adverse Event Log
Anonymised, aggregated, published.
Demonstrates accountability not just claims it.

---

## Supplement Policy
Supplements recommended only when:
- Evidence clearly supports it
- Fits user personal context
- Fits user lifestyle
- Fits user budget

Never recommended:
- PEDs
- Steroids
- Hormone protocols
- Supplements without clear evidence

---

## Open Methodology
This framework is open source.
Anyone can challenge any entry by challenging the reasoning chain.
Changes are logged with reasons.
Version history maintained.