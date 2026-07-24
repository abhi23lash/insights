# Product

## Register

product

## Users

People training seriously (lifters, general fitness users past the beginner phase) who want evidence-based training and nutrition guidance without needing to read the literature themselves. They come to Pramana with a specific question (what should I do given my age, training age, goal, and available days) and want an answer they can trust and, if they choose, verify.

## Product Purpose

Pramana takes a user's context (age, training age, goal, days per week) and returns a recommendation backed by a traceable evidence chain: the recommendation itself, the reasoning behind it, a confidence score, and what would change the recommendation. Every output is grounded in the layered knowledge base and confidence architecture described in `app/docs/framework.md`. Success looks like a user understanding *why* they got a recommendation and *how sure* Pramana is, not just receiving an answer.

## Brand Personality

Clinical, precise, calm. Pramana reads like a well-run lab report, not a coach hyping you up. It states what it knows, states what it doesn't, and never inflates confidence to seem more useful. No strong external aesthetic reference; the direction is original rather than modeled on an existing product.

## Anti-references

- Typical fitness-app hype: hero gradients, motivational bro-copy, streaks/badges/gamification, fake urgency, countdown timers.
- Generic SaaS dashboard cliches: hero-metric tiles, gradient text, glassmorphism, identical icon+heading card grids.

## Design Principles

- Show the reasoning, not just the answer: every recommendation surfaces its evidence chain and confidence, matching the product's traceability requirement.
- Uncertainty is a first-class citizen: low confidence is displayed plainly, never smoothed over or hidden behind polish.
- Restraint over persuasion: the interface should never try to make the user feel more confident than the evidence warrants.
- Self-sufficiency over dependency: design for a user who wants to understand and eventually reason for themselves, not one being sold a subscription.
- Original over derivative: no template SaaS or fitness-app visual language.

## Accessibility & Inclusion

Standard WCAG AA: solid color contrast, full keyboard navigation, readable type sizes at default zoom. No population-specific accommodations identified yet; revisit as real users are onboarded.
