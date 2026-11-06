# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Existing: Next.js 15 (App Router, plain JS, plain CSS) frontend on Vercel; FastAPI + TensorFlow backend on Railway.

## Users
Primary: recruiters and hiring engineers viewing the owner's ML portfolio, who will upload a sample X-ray and judge craft in under a minute. Secondary (unconfirmed): general visitors trying the demo.

## Product Purpose
Pneumonia Detector classifies a chest X-ray as NORMAL or PNEUMONIA with a DenseNet121 model, shows where the model looked (Grad-CAM heatmap), and explains the result in plain language via an LLM (Groq or Gemini). Success: a visitor completes an upload-to-result run and remembers the project.

## Positioning
Not just a label: the result is shown with visual evidence (heatmap over the X-ray) and a plain-language explanation, end to end.

## Operating Context
Visitors use the bundled sample X-rays (Testing Images/Normal, Testing Images/Pneumonia) or their own images. Backend may cold-start; first request can be slow.

## Capabilities and Constraints
- POST /predict returns label, confidence, pneumonia_probability, heatmap (data-URL PNG or null).
- POST /explain returns a short explanation; may be unavailable.
- Heatmap can be null; explanation can fail; both must degrade gracefully.
- Must keep: heatmap viewer, AI plain-language explanation.
- Model is a screening aid, not a diagnosis; a clear not-a-diagnosis notice stays on the result (safety, kept even though the owner did not list it).

## Evidence on Hand
- 94.63% validation accuracy (project README, on a re-split 20% validation set).
- Sample images in Testing Images/. No testimonials, users, or clinical validation exist; do not invent any.

## Product Principles
1. Show the evidence, not just the verdict.
2. Honest about limits: screening aid, not a diagnosis.
3. The upload-to-result run is the hero.
4. Failure states explain the problem and the recovery.
