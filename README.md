# Wavelength

UofTHacks 13

## Inspiration
In an increasingly competitive landscape, the hiring process has been reduced to a cold exchange of commodities and static job descriptions, sacrificing the most vital predictor of success: a shared identity between the individual and the organization. We built Wavelength to move beyond the checklist; by using AI to find the shared frequency between a company’s core values and a candidate’s authentic professional persona, Wavelength finds the resonance between who a company is and who a candidate wants to be; with one goal in mind: every hire becomes a meaningful connection rather than just a transaction.

## What it does
Wavelength replaces the tedious job application with an intelligent discovery engine that prioritizes who people are, not just what they’ve done. Wavelength is the recruitment engine that truly knows who you are.

Candidates simply provide a LinkedIn URL or resume. Gemini generates profiles for candidates. Wavelength Crawl then scours the web: personal portfolios, GitHub repositories, socials etc. in order to synthesize a rich, 360-degree professional persona that goes far deeper than a static resume. Candidates then participate in customized AI interviews. These sessions are designed to find shared "frequency" between a candidate’s personal identity and an employer’s core values.

Gemini helps employers automatically generate tailored job postings in seconds, perfectly tuned to their company's unique voice. Wavelength then instantly surfaces the candidates whose personal and professional identities most closely aligns with the company’s identity.

## How we built it
To start, a candidate simply provides a resume or LinkedIn URL. Gemini 3 Flash then parses documents to auto-fill profiles while simultaneously powering our autonomous scraping agents. These agents navigate the web, analyzing portfolios and external links to build a rich, contextual profile of the candidate’s professional identity. For recruiters, Gemini empowers them with tools to help them easily create job postings, allowing them to either upload a document they already have with the job description, or describing the changes they want. Gemini will automatically fill in fields, making the lives of recruiters way easier

Once the profile is established, the candidate enters a live, conversational interview powered by Gemini Live. This allows for a natural, back-and-forth dialogue that uncovers work-style and personality traits that a static form could never capture. These recordings are ingested by our TwelveLabs analysis pipeline, which indexes the footage and generates high-dimensional video embeddings. A deep semantic analysis is then performed on the indexed candidate interview. For each interview, a multi-dimensional alignment score is calculated using numeric weights to measure how closely a candidate’s responses resonate with specific company values.

The entire ecosystem is built on Vultr infrastructure. We containerized the application and deployed it on Vultr Cloud Compute, using the Vultr Container Registry to manage and ship our images. All relational data, including our complex identity-matching logic, is managed via Vultr Managed Postgres. To handle heavy media assets, Wavelength uses Vultr Object Storage to securely store resumes and interview recordings.

## Challenges we ran into
- Implementing Gemini Live API had its set of struggles. During long interview sessions, the model would occasionally lose its "recruiter" guardrails. We overcame this by simulating a System Instruction layer and implementing session management to keep the Gemini on task.
- Gemini-2.5-flash had trouble adapting edge cases. For example when a candidate was "hesitant" or "confused", should we have had the time, we would've like to tailor the model's behavior such that it attempts to respond naturally and adapt to such cases.
- TwelveLabs API blog examples were inconsistent with the documentation, make them confusing to follow.
- Firecrawl had low rate limits, making it difficult for us to perform more than a few crawls per minute.

## Accomplishments that we're proud of
- building an engine that quantifies resonance between two entities through numeric weights and video embeddings.
- using Gemini Live API to orchestrate interviews, followed  TwelveLabs’ video processing to create an efficient pipeline
- we successfully built and hosted Wavelength using a microservices architecture on Vultr. We used Vultr’s global infrastructure as much as possible to handle our services and large quantities of data store.

## What we learned
- We learned that a resume only tells a fraction of the story. By synthesizing web-crawled data with live sentiment and video context, we realized how much hidden talent is overlooked by traditional keyword-based systems.
- We experimented and learned how to integrate a number of Vultr's services including Managed Postgres & Object Storage into our app. Having this setup helped offload database and storage management so we could focus on other features.
- Using Gemini for conversation and TwelveLabs for video analysis taught us how to build agentic systems.

## What's next for Wavelength
- We'd like to integrate no-hire & post-hire data back into the loop to train the system on which "identity markers" are working well, improving Wavelength's self-improvement loop.
- A feature that abstracts a candidate's physical appearance and demographic data during the initial review, meaning recruiters can focus purely on the weighted resonance score and professional persona.
- Having already containerized our microservices, we'd like to migrate our deployment to Vultr Kubernetes Engine. It'll help with keeping Wavelength's services i.e. Gemini Live interview sessions low-latency, regardless of traffic.