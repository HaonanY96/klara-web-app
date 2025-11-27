# Kino — A Lightweight AI Companion for Everyday Clarity

## Overview

Kino is a lightweight, quiet, and non-intrusive AI companion designed to help users see their priorities clearly, discover what they truly want to do, and act with intention. Kino does not try to manage the user’s life or overwhelm them with features. Instead, Kino appears only when needed, offering gentle guidance, clarity, and subtle suggestions for improvement.

Kino is not a to-do app. It is a clarity companion.

## Core Philosophy

- Light, calm, quiet — never interrupts or demands.
- Helps users understand themselves, not force productivity.
- Offers clarity rather than control.
- Appears only when needed, disappears when not.
- Learns the user’s preferences and adapts gently.
- Encourages growth with soft, human-like presence.
- Keeps interactions short, minimal, and helpful.

## Primary Goals

1. Help users see what truly matters.
2. Prevent blind spots and oversights in tasks.
3. Provide simple, intelligent suggestions.
4. Sort tasks by importance and urgency.
5. Capture fleeting ideas and transform them into actionable steps.
6. Track small progress over time in a gentle, non-judgmental way.
7. Build a sense of partnership and companionship in daily living.

## Key Features

### 1. AI Blind-Spot Completion (Lightweight)

When a user writes a task (e.g., “prepare Friday presentation”), Kino quietly suggests missing steps such as:

- gather materials
- draft outline
- rehearse once
  The suggestions appear only when the user wants to view them.

### 2. Importance × Urgency Matrix

Kino automatically classifies tasks based on importance and urgency.

- No manual sorting needed.
- Kino provides one-line explanations for classification when hovered.

### 3. Habit Learning (Adaptive, Gentle)

Kino observes:

- when the user tends to complete tasks
- what types of tasks are often delayed
- preferred working styles
  Kino uses this knowledge to provide minimal, context-aware guidance.

### 4. Light Planning Mode

Once a week, Kino gently offers a simple reflection prompt.
Kino returns a one-sentence summary and one actionable micro-suggestion.

### 5. Idea Capture → Smart Suggest

Kino includes a lightweight input box for fleeting ideas.

- Short text only
- No formatting or long notes
- Kino suggests: “Convert this to a task?” if appropriate

### 6. Privacy and Local-First Data

- Local storage first (localStorage / IndexedDB)
- Cloud backup only if the user opts in
- Data is always portable (simple JSON export)

### 7. Web-first, Mobile-friendly (PWA)

Kino starts as a web app, optimized for mobile.
Users can add Kino to their homescreen as a PWA.

### 8. Gentle Visual Insights

Small, minimal charts such as:

- completion trends
- common task categories
- behavior patterns
  Kino explains insights in short, soft micro-messages.

## What Kino Avoids

- No heavy dashboards
- No aggressive reminders
- No complex project management
- No gamification
- No long AI responses
- No overwhelming settings
- No push notifications unless explicitly toggled

## Target Users

- People who feel overwhelmed by traditional to-do apps
- Individuals seeking clarity rather than productivity pressure
- Students, creatives, independent workers, and self-reflective users
- Anyone who appreciates quiet digital tools (flomo-like vibe)

## Technical Approach

- Next.js Web App hosted under cyvisuals.ca (e.g., cyvisuals.ca/kino)
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

## Why Kino Matters

Kino is not here to maximize productivity.
Kino is here to help users see, understand, and gently move toward what matters.

A quiet companion for everyday clarity.
