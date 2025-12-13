# Klara — A Lightweight AI Companion for Everyday Clarity

## Overview

Klara is a lightweight, quiet, and non-intrusive AI companion designed to help users see their priorities clearly, discover what they truly want to do, and act with intention. Klara does not try to manage the user’s life or overwhelm them with features. Instead, Klara appears only when needed, offering gentle guidance, clarity, and subtle suggestions for improvement.

Klara is not a to-do app. It is a clarity companion.

## Core Philosophy

- Light, calm, quiet — never interrupts or demands.
- Helps users understand themselves, not force productivity.
- Offers clarity rather than control.
- Appears only when needed, disappears when not.
- Learns the user’s preferences and adapts gently.
- Encourages growth with soft, human-like presence.
- Keeps interactions short, minimal, and helpful.
- **ADHD Friendly**: Reduces friction, decision paralysis, and shame.

## Primary Goals

1. Help users see what truly matters.
2. Prevent blind spots and oversights in tasks.
3. Provide simple, intelligent suggestions (including time estimation).
4. Sort tasks by importance and urgency.
5. Capture fleeting ideas (Brain Dump) and transform them into actionable steps.
6. Track small progress over time in a gentle, non-judgmental way.
7. Build a sense of partnership and companionship in daily living.

## Key Features

### 1. AI Blind-Spot Completion (Lightweight)

When a user writes a task (e.g., “prepare Friday presentation”), Klara quietly suggests missing steps.
  The suggestions appear only when the user wants to view them.
  **New**: AI also provides a gentle time estimation (e.g., "5-10 min") to help combat time blindness.

### 2. Importance × Urgency Matrix & Magic Pick

Klara automatically classifies tasks based on importance and urgency.

- **Magic Pick**: Stuck in analysis paralysis? Klara can randomly highlight one manageable task for you, blurring the rest to reduce cognitive load.
- **Focus Mode**: Double-tap any quadrant to go full-screen, blocking out other distractions.

### 3. Habit Learning (Adaptive, Gentle)

Klara observes:

- when the user tends to complete tasks
- what types of tasks are often delayed
- preferred working styles
  Klara uses this knowledge to provide minimal, context-aware guidance.

### 4. Light Planning Mode

Once a week, Klara gently offers a simple reflection prompt.
Klara returns a one-sentence summary and one actionable micro-suggestion.

### 5. Idea Capture → Smart Suggest

Klara includes a lightweight input box for fleeting ideas.

- Short text only
- No formatting or long notes
- Klara suggests: “Convert this to a task?” if appropriate

### 6. Privacy and Local-First Data

- Local storage first (localStorage / IndexedDB)
- Cloud backup only if the user opts in
- Data is always portable (simple JSON export)

### 7. Web-first, Mobile-friendly (PWA)

Klara starts as a web app, optimized for mobile.
Users can add Klara to their homescreen as a PWA.

### 8. Gentle Visual Insights

Small, minimal charts such as:

- completion trends
- common task categories
- behavior patterns
  Klara explains insights in short, soft micro-messages.

## What Klara Avoids

- No heavy dashboards
- No aggressive reminders
- **No red "Overdue" badges** (shame-free design, uses warm amber instead)
- No complex project management
- No gamification that punishes breaks (No streaks)
- No overwhelming settings
- No push notifications unless explicitly toggled

## Target Users

- People who feel overwhelmed by traditional to-do apps
- Individuals seeking clarity rather than productivity pressure
- Students, creatives, independent workers, and self-reflective users
- Anyone who appreciates quiet digital tools (flomo-like vibe)

## Technical Approach

- Next.js Web App hosted under cyvisuals.ca (e.g., cyvisuals.ca/klara)
- Gemini Flash for lightweight AI tasks
- Optionally Gemini Pro for deep reasoning on longer inputs
- Token costs remain low due to short, concise interactions
- PWA support for mobile usage
- Local-first architecture for privacy and speed

## Future Possibilities

- Personalized daily micro-prompts
- Mood-aware suggestions (if user opts in)
- Multi-device sync
- Optional native mobile app
- Multi-language support
- Soft persona customization

## Why Klara Matters

Klara is not here to maximize productivity.
Klara is here to help users see, understand, and gently move toward what matters.

A quiet companion for everyday clarity.
