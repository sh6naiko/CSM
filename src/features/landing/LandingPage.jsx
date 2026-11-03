import React, { useEffect, useState } from "react";
import {
  IconArrowRight,
  IconArrowUp,
  IconClose,
  IconLibrary,
  IconFlame,
  IconSparkle,
  IconPdf,
  IconProgress,
} from "./landingIcons.jsx";
export function LandingPage({ onAuthenticated = () => {} }) {
  const [activeDemo, setActiveDemo] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const initialAuthMode = null;
  const [authMode, setAuthMode] = useState(
    ["signin", "register"].includes(initialAuthMode) ? initialAuthMode : null,
  );
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const onEnter = () => openAuth("register");
  const openAuth = (mode) => {
    window.location.href = `login.html?mode=${mode}`;
  };
  const closeAuth = () => {
    if (authBusy) return;
    setAuthMode(null);
    setAuthError("");
  };
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") closeAuth();
    };
    if (authMode) {
      document.body.classList.add("csm-auth-open");
      window.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.body.classList.remove("csm-auth-open");
      window.removeEventListener("keydown", handleEscape);
    };
  }, [authMode, authBusy]);
  const handleAuthSubmit = (event) => {
    event.preventDefault();
    window.location.assign(
      `login.html?mode=${authMode === "register" ? "register" : "signin"}`,
    );
  };
  useEffect(() => {
    document.body.classList.add("csm-landing-mode");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("is-visible");
        });
      },
      {
        threshold: 0.12,
      },
    );
    document
      .querySelectorAll(".csm-reveal")
      .forEach((element) => revealObserver.observe(element));
    const demoTimer = window.setInterval(
      () => setActiveDemo((value) => (value + 1) % 3),
      3600,
    );
    return () => {
      document.body.classList.remove("csm-landing-mode");
      revealObserver.disconnect();
      window.clearInterval(demoTimer);
    };
  }, []);
  useEffect(() => {
    const loginTriggers = document.querySelectorAll(".csm-landing-login");
    const handleLoginClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openAuth("signin");
    };
    loginTriggers.forEach((trigger) => {
      trigger.setAttribute("href", "login.html?mode=signin");
      trigger.addEventListener("click", handleLoginClick, true);
    });
    return () =>
      loginTriggers.forEach((trigger) =>
        trigger.removeEventListener("click", handleLoginClick, true),
      );
  }, []);
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  const faqs = [
    [
      "What can I study with Co-StudyMaxx?",
      "Create and organize Bombcards in reviewer decks, attach PDFs, and use PDF Tools for notes and highlights. You can practice cards in Study or play timed Bombstyle Challenge sessions.",
    ],
    [
      "Can Gemini make Bombcards from my material?",
      "Yes. The AI Bombcard Maker can use notes or text extracted from a selected PDF. It suggests a set based on the material, and you choose which generated cards to add. AI generation requires a configured Gemini service.",
    ],
    [
      "How does Bombstyle Challenge work?",
      "Choose a reviewer and play a timed quiz session. Your results contribute to your activity and progress insights.",
    ],
    [
      "Can I share a reviewer?",
      "You can create a share link for others to view a reviewer. Shared access is read-only; it does not let visitors edit your original deck.",
    ],
    [
      "Do I need to install anything?",
      "No installation is needed. Co-StudyMaxx runs in a web browser. Sign in to create and manage your own reviewers and keep your progress.",
    ],
  ];
  const demoCards = [
    {
      value: "Bombcards",
      label: "Build and organize reviewers",
    },
    {
      value: "PDF + Gemini",
      label: "Turn source material into practice",
    },
    {
      value: "Challenge",
      label: "Play timed quiz sessions",
    },
  ];
  return (
    <div className="csm-landing-page">
      <header className="csm-landing-header">
        <div className="csm-landing-shell csm-landing-nav">
          <a
            className="csm-landing-brand"
            href="#top"
            aria-label="Co-StudyMaxx home"
          >
            <img src="assets/images/csm-mascot.png" alt="" />
            <span>Co-StudyMaxx</span>
          </a>
          <nav
            className="csm-landing-links"
            aria-label="Landing page navigation"
          >
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#getting-started">Get started</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="csm-landing-nav-actions">
            <a
              className="csm-landing-login"
              href="#workspace"
              onClick={(event) => {
                event.preventDefault();
                onEnter();
              }}
            >
              Sign In
            </a>
            <button
              className="csm-landing-button"
              type="button"
              onClick={onEnter}
            >
              Get Started <IconArrowRight />
            </button>
          </div>
        </div>
      </header>
      <main id="top">
        <section className="csm-landing-hero csm-reveal">
          <div className="csm-landing-shell">
            <span className="csm-landing-kicker">
              Your study materials, ready to practice
            </span>
            <h1>
              Turn your notes and PDFs into <span>Bombcards that stick.</span>
            </h1>
            <p>
              Build reviewer decks, generate Bombcards from notes or PDFs with
              Gemini, annotate source documents, and practice in timed Bombstyle
              Challenge sessions. Track your streak, accuracy, and subject mastery
              in one workspace.
            </p>
            <div className="csm-landing-hero-actions">
              <button
                className="csm-landing-button"
                type="button"
                onClick={onEnter}
              >
                Create an account <IconArrowRight />
              </button>
              <button
                className="csm-landing-button is-dark"
                type="button"
                onClick={() => scrollTo("how-it-works")}
              >
                Explore the workflow
              </button>
            </div>
            <p className="csm-landing-hero-note">
              Study in your browser. Your own workspace starts after sign-in.
            </p>
          </div>
        </section>
        <section
          className="csm-landing-proof csm-reveal"
          aria-label="Co-StudyMaxx study tools"
        >
          <div className="csm-landing-shell csm-landing-proof-grid">
            <div className="csm-landing-proof-card">
              <strong>
                <IconLibrary />
                Reviewer library
              </strong>
              <span>Keep decks and PDFs organized</span>
            </div>
            <div className="csm-landing-proof-card">
              <strong>
                <IconSparkle />
                Gemini AI
              </strong>
              <span>Generate cards from study material</span>
            </div>
            <div className="csm-landing-proof-card">
              <strong>
                <IconPdf />
                PDF study tools
              </strong>
              <span>Highlight and take notes</span>
            </div>
            <div className="csm-landing-proof-card">
              <strong>
                <IconFlame />
                Bombstyle Challenge
              </strong>
              <span>Practice with a timer</span>
            </div>
            <div className="csm-landing-proof-card">
              <strong>
                <IconProgress />
                Progress insights
              </strong>
              <span>See streaks and mastery</span>
            </div>
          </div>
        </section>
        <section className="csm-landing-section" id="how-it-works">
          <div className="csm-landing-shell">
            <div className="csm-landing-section-heading csm-reveal">
              <span className="csm-landing-section-kicker">
                From source to study session
              </span>
              <h2>Bring your material. Build your practice set.</h2>
              <p>
                Organize a reviewer, work from your notes or an attached PDF,
                then choose the Bombcards you want to study.
              </p>
            </div>
            <div
              className="csm-landing-demo-wrap csm-reveal"
              aria-label="Reviewer dashboard preview"
            >
              <div className="csm-landing-demo-bar">
                <i className="csm-landing-demo-dot" />
                <i className="csm-landing-demo-dot" />
                <i className="csm-landing-demo-dot" />
                <div className="csm-landing-demo-url">
                  app.co-studymaxx.local / overview
                </div>
              </div>
              <div className="csm-landing-demo-window">
                <aside className="csm-landing-demo-sidebar">
                  <strong>CO-STUDYMAXX</strong>
                  <span>Overview</span>
                  <i />
                  <i />
                  <i />
                  <i />
                </aside>
                <div className="csm-landing-demo-main">
                  <small>YOUR STUDY WORKSPACE</small>
                  <h3>One place for materials and practice.</h3>
                  <p>
                    Open a deck, work with its PDFs, review your Bombcards, or
                    continue into Challenge.
                  </p>
                  <div className="csm-landing-demo-cards">
                    {demoCards.map((card, index) => (
                      <div
                        key={card.label}
                        className={`csm-landing-demo-card ${activeDemo === index ? "is-active" : ""}`}
                      >
                        <b>{card.value}</b>
                        <span>{card.label}</span>
                      </div>
                    ))}
                  </div>
                  <div
                    className="csm-landing-demo-progress"
                    role="tablist"
                    aria-label="Dashboard preview slides"
                  >
                    {demoCards.map((card, index) => (
                      <button
                        key={card.label}
                        className={activeDemo === index ? "is-active" : ""}
                        type="button"
                        aria-label={`Show ${card.label}`}
                        onClick={() => setActiveDemo(index)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="csm-landing-section is-tinted" id="features">
          <div className="csm-landing-shell">
            <div className="csm-landing-section-heading csm-reveal">
              <span className="csm-landing-section-kicker">
                Tools in the workspace
              </span>
              <h2>Study from source material, then measure your progress.</h2>
            </div>
            <div className="csm-landing-feature-grid">
              <article className="csm-landing-feature-card csm-reveal">
                <div className="csm-landing-feature-icon">
                  <IconLibrary />
                </div>
                <h3>Reviewer library</h3>
                <p>
                  Create decks, organize Bombcards, attach reference PDFs, and
                  return to recent study materials.
                </p>
              </article>
              <article className="csm-landing-feature-card csm-reveal">
                <div className="csm-landing-feature-icon">
                  <IconSparkle />
                </div>
                <h3>Gemini AI Bombcard Maker</h3>
                <p>
                  Generate study questions from notes or extracted PDF text,
                  then select which cards to keep.
                </p>
              </article>
              <article className="csm-landing-feature-card csm-reveal">
                <div className="csm-landing-feature-icon">
                  <IconPdf />
                </div>
                <h3>PDF Tools</h3>
                <p>
                  Read attached documents, save notes and highlights, and turn
                  selected material into study cards.
                </p>
              </article>
              <article className="csm-landing-feature-card csm-reveal">
                <div className="csm-landing-feature-icon">
                  <IconFlame />
                </div>
                <h3>Study Bombcards</h3>
                <p>
                  Review prompts at your pace and reveal answers when you’re
                  ready to check your recall.
                </p>
              </article>
              <article className="csm-landing-feature-card csm-reveal">
                <div className="csm-landing-feature-icon">
                  <IconFlame />
                </div>
                <h3>Bombstyle Challenge</h3>
                <p>
                  Play timed quiz sessions from your decks and review your
                  session results.
                </p>
              </article>
              <article className="csm-landing-feature-card csm-reveal">
                <div className="csm-landing-feature-icon">
                  <IconProgress />
                </div>
                <h3>Progress insights</h3>
                <p>
                  Follow study streaks, average accuracy, weekly Challenge activity,
                  and subject mastery.
                </p>
              </article>
            </div>
          </div>
        </section>
        <section className="csm-landing-section" id="getting-started">
          <div className="csm-landing-shell">
            <div className="csm-landing-start-card csm-reveal">
              <div>
                <span className="csm-landing-section-kicker">
                  Getting started
                </span>
                <h2>Set up your own study workspace.</h2>
                <p>
                  Create an account to build and manage decks, save your PDF
                  notes and highlights, use the AI card maker, and track your
                  study activity.
                </p>
              </div>
              <button
                className="csm-landing-button"
                type="button"
                onClick={onEnter}
              >
                Create an account <IconArrowRight />
              </button>
            </div>
          </div>
        </section>
        <section
          className="csm-landing-section"
          aria-labelledby="library-heading"
        >
          <div className="csm-landing-shell csm-landing-split">
            <div className="csm-landing-split-copy csm-reveal">
              <span className="csm-landing-section-kicker">
                Study with your source
              </span>
              <h2 id="library-heading">
                Keep PDFs, notes, and Bombcards together.
              </h2>
              <p>
                Attach PDFs to a reviewer, annotate important passages, save
                notes, and use the material as a starting point for AI-generated
                cards.
              </p>
              <button
                className="csm-landing-button is-dark"
                type="button"
                onClick={onEnter}
              >
                Explore the workspace <IconArrowRight />
              </button>
            </div>
            <div className="csm-landing-visual csm-reveal" aria-hidden="true">
              <div className="csm-landing-visual-top">
                <span>PDF STUDY TOOLS</span>
                <span>NOTES SAVED</span>
              </div>
              <div className="csm-landing-visual-screen">
                <div className="csm-landing-visual-nav">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="csm-landing-visual-content">
                  <strong>HIS 007 Final Reviewer.pdf</strong>
                  <p>
                    Keep source documents beside the reviewer you’re studying.
                  </p>
                  <div className="csm-landing-visual-rows">
                    <div className="csm-landing-visual-row">
                      <span>Highlights</span>
                      <b>Saved</b>
                    </div>
                    <div className="csm-landing-visual-row">
                      <span>Document notes</span>
                      <b>Saved</b>
                    </div>
                    <div className="csm-landing-visual-row">
                      <span>Bombcards</span>
                      <b>Ready to review</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section
          className="csm-landing-section is-tinted"
          aria-labelledby="countdown-heading"
        >
          <div className="csm-landing-shell csm-landing-split is-reverse">
            <div className="csm-landing-split-copy csm-reveal">
              <span className="csm-landing-section-kicker">
                Practice with a pulse
              </span>
              <h2 id="countdown-heading">Play a timed Challenge session.</h2>
              <p>
                Choose a deck, answer Bombcards against the clock, and use your
                results to see where you’re gaining confidence and what to
                revisit.
              </p>
              <button
                className="csm-landing-button"
                type="button"
                onClick={onEnter}
              >
                Explore Bombstyle Challenge <IconArrowRight />
              </button>
            </div>
            <div
              className="csm-landing-visual is-light csm-reveal"
              aria-hidden="true"
            >
              <div
                className="csm-landing-visual-top"
                style={{
                  color: "#776d63",
                }}
              >
                <span>BOMBSTYLE CHALLENGE</span>
                <span>SESSION</span>
              </div>
              <div
                className="csm-landing-visual-content"
                style={{
                  marginTop: "16px",
                  minHeight: "228px",
                }}
              >
                <small
                  style={{
                    color: "#ff4d22",
                    fontWeight: 900,
                    letterSpacing: ".13em",
                  }}
                >
                  TIMED REVIEW
                </small>
                <strong
                  style={{
                    marginTop: "20px",
                  }}
                >
                  Recall first. Check your answer. Keep improving.
                </strong>
                <div className="csm-landing-visual-rows">
                  <div className="csm-landing-visual-row">
                    <span>Choose a reviewer deck</span>
                    <b>Ready</b>
                  </div>
                  <div className="csm-landing-visual-row">
                    <span>Answer under time</span>
                    <b>Play</b>
                  </div>
                  <div className="csm-landing-visual-row">
                    <span>Review your results</span>
                    <b>Track</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="csm-landing-quote csm-reveal">
          <div className="csm-landing-shell">
            <span className="csm-landing-section-kicker">
              Your next study session
            </span>
            <h2>Organize your material. Practice it. See your progress.</h2>
            <button
              className="csm-landing-button"
              type="button"
              onClick={onEnter}
            >
              Open Co-StudyMaxx <IconArrowRight />
            </button>
          </div>
        </section>
        <section className="csm-landing-section" id="faq">
          <div className="csm-landing-shell csm-landing-faq">
            <div className="csm-reveal">
              <span className="csm-landing-section-kicker">
                Questions, answered
              </span>
              <h2>Frequently asked questions.</h2>
            </div>
            <div className="csm-landing-faq-list csm-reveal">
              {faqs.map(([question, answer], index) => (
                <div
                  className={`csm-landing-faq-item ${openFaq === index ? "is-open" : ""}`}
                  key={question}
                >
                  <button
                    className="csm-landing-faq-question"
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  >
                    <span>{question}</span>
                    <span aria-hidden="true">+</span>
                  </button>
                  <div className="csm-landing-faq-answer">{answer}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="csm-landing-footer" id="workspace">
        <div className="csm-landing-shell csm-landing-footer-inner">
          <a className="csm-landing-brand" href="#top">
            <img src="assets/images/csm-mascot.png" alt="" />
            <span>Co-StudyMaxx</span>
          </a>
          <small>Made for the next focused study session.</small>
          <div className="csm-landing-footer-links">
            <a href="#features">Features</a>
            <a href="#getting-started">Get started</a>
            <a href="#faq">FAQ</a>
            <a href="#top">
              Back to top <IconArrowUp />
            </a>
          </div>
        </div>
      </footer>
      {authMode && (
        <div
          className="csm-auth-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAuth();
          }}
        >
          <section
            className="csm-auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="csm-auth-title"
          >
            <button
              className="csm-auth-modal-close"
              type="button"
              aria-label="Close authentication dialog"
              onClick={closeAuth}
            >
              <IconClose />
            </button>
            <div className="csm-auth-modal-brand">
              <img src="assets/images/csm-mascot.png" alt="" />
              <span>Co-StudyMaxx</span>
            </div>
            <span className="csm-auth-modal-kicker">
              {authMode === "signin"
                ? "WELCOME BACK"
                : "START LEARNING TOGETHER"}
            </span>
            <h2 id="csm-auth-title">
              {authMode === "signin"
                ? "Log in to your account."
                : "Create your account."}
            </h2>
            <p>
              {authMode === "signin"
                ? "Pick up where your next focused study session starts."
                : "Build reviewers, play timed quizzes, and keep your study space private."}
            </p>
            <form
              className="csm-auth-form"
              onSubmit={handleAuthSubmit}
              noValidate
            >
              <label>
                Username or email
                <input
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com"
                  autoFocus
                />
              </label>
              <label>
                Password
                <div className="csm-auth-password">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      authMode === "signin"
                        ? "current-password"
                        : "new-password"
                    }
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {authMode === "register" && (
                <label>
                  Confirm password
                  <div className="csm-auth-password">
                    <input
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              )}
              {authError && (
                <div className="csm-auth-error" role="alert">
                  {authError}
                </div>
              )}
              <button
                className="csm-auth-submit"
                type="submit"
                disabled={authBusy}
              >
                {authBusy
                  ? "Opening your workspace..."
                  : authMode === "signin"
                    ? "Sign in"
                    : "Create account"}{" "}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </form>
            <div className="csm-auth-switch">
              {authMode === "signin"
                ? "New to Co-StudyMaxx?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() =>
                  openAuth(authMode === "signin" ? "register" : "signin")
                }
              >
                {authMode === "signin" ? "Create account" : "Sign in"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
