import { CSM } from "../../services/client.js";
import {
  IconArrowLeft,
  IconArrowRight,
  IconClose,
  IconPdf,
  IconSearch,
} from "../../components/icons.jsx";
import {
  adminAvatarBackgrounds,
  getAccountInitials,
} from "../../utils/accounts.js";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
const normalizeRecentPeople = (value) =>
  Array.isArray(value)
    ? value
        .filter(
          (person) =>
            person &&
            (typeof person.id === "string" || typeof person.id === "number") &&
            typeof person.username === "string" &&
            typeof person.display_name === "string",
        )
        .map((person) => ({ ...person, id: String(person.id) }))
        .slice(0, 6)
    : [];
export function PeopleScreen({ onPlayDeck, currentUsername }) {
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState([]);
  const recentStorageKey = currentUsername
    ? `csm-recent-people:${currentUsername}`
    : null;
  const [recentPeople, setRecentPeople] = useState(() => {
    if (!recentStorageKey) return [];
    try {
      return normalizeRecentPeople(
        JSON.parse(localStorage.getItem(recentStorageKey) || "[]"),
      );
    } catch {
      return [];
    }
  });
  const [recentPeopleModalOpen, setRecentPeopleModalOpen] = useState(false);
  const [suggestedPeople, setSuggestedPeople] = useState([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckError, setDeckError] = useState("");
  const [revealedCards, setRevealedCards] = useState([]);
  const [previewStudyMode, setPreviewStudyMode] = useState(false);
  const [previewStudyIndex, setPreviewStudyIndex] = useState(0);
  const [previewStudyRevealed, setPreviewStudyRevealed] = useState(false);
  const [previewStudyDirection, setPreviewStudyDirection] = useState(1);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const recentPeopleModalCloseRef = useRef(null);
  const peopleSearchRequestRef = useRef(0);
  const suggestionRequestRef = useRef(0);
  useEffect(() => {
    if (!recentStorageKey) {
      setRecentPeople([]);
      return;
    }
    try {
      setRecentPeople(
        normalizeRecentPeople(
          JSON.parse(localStorage.getItem(recentStorageKey) || "[]"),
        ),
      );
    } catch {
      setRecentPeople([]);
    }
  }, [recentStorageKey]);
  useEffect(() => {
    if (!recentPeopleModalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setRecentPeopleModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    recentPeopleModalCloseRef.current?.focus();
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [recentPeopleModalOpen]);
  const loadSuggestedPeople = async () => {
    const requestId = ++suggestionRequestRef.current;
    setSuggestionsBusy(true);
    try {
      const result = await CSM.api("people/suggestions");
      if (requestId !== suggestionRequestRef.current) return;
      const candidates = Array.isArray(result.people) ? [...result.people] : [];
      for (let index = candidates.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [candidates[index], candidates[swapIndex]] = [
          candidates[swapIndex],
          candidates[index],
        ];
      }
      let next = candidates.slice(0, 3);
      const currentIds = suggestedPeople.map((person) => person.id).sort().join(",");
      if (
        candidates.length > 3 &&
        next.map((person) => person.id).sort().join(",") === currentIds
      ) {
        next = candidates.slice(1, 4);
      } else if (
        next.length > 1 &&
        next.map((person) => person.id).join(",") ===
          suggestedPeople.map((person) => person.id).join(",")
      ) {
        next = [...next.slice(1), next[0]];
      }
      setSuggestedPeople(next);
    } catch {
      if (requestId === suggestionRequestRef.current) setSuggestedPeople([]);
    } finally {
      if (requestId === suggestionRequestRef.current) setSuggestionsBusy(false);
    }
  };
  useEffect(() => {
    loadSuggestedPeople();
  }, []);
  const loadPeople = async (term, requestedPage = 0) => {
    const requestId = ++peopleSearchRequestRef.current;
    setBusy(true);
    setError("");
    setSelectedPerson(null);
    setPage(requestedPage);
    try {
      const result = await CSM.api(
        `people/search&q=${encodeURIComponent(term)}&limit=12&offset=${requestedPage * 12}`,
      );
      if (requestId !== peopleSearchRequestRef.current) return;
      const matches = Array.isArray(result.people) ? result.people : [];
      setPeople(matches);
      setTotal(Number(result.total) || 0);
    } catch (requestError) {
      if (requestId === peopleSearchRequestRef.current) {
        setError(requestError.message || "Could not search accounts.");
        setPeople([]);
        setTotal(0);
      }
    } finally {
      if (requestId === peopleSearchRequestRef.current) setBusy(false);
    }
  };
  useEffect(() => {
    const term = search.trim();
    setPage(0);
    if (term.length < 2) {
      peopleSearchRequestRef.current += 1;
      setPeople([]);
      setTotal(0);
      setError("");
      setBusy(false);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      loadPeople(term, 0);
    }, 350);
    return () => {
      window.clearTimeout(timer);
      peopleSearchRequestRef.current += 1;
    };
  }, [search]);
  const searchPeople = (event, requestedPage = 0) => {
    event?.preventDefault();
    const term = search.trim();
    if (term.length < 2) {
      setError("Enter at least 2 characters to search.");
      setPeople([]);
      setTotal(0);
      return;
    }
    loadPeople(term, requestedPage);
  };
  const clearRecentPeople = () => {
    setRecentPeople([]);
    setRecentPeopleModalOpen(false);
    if (!recentStorageKey) return;
    try {
      localStorage.removeItem(recentStorageKey);
    } catch {
      // The visible history is still cleared for this session.
    }
  };
  const rememberPerson = (person) => {
    if (!recentStorageKey || !person) return;
    const normalizedPerson = { ...person, id: String(person.id) };
    const nextRecent = [
      normalizedPerson,
      ...recentPeople.filter(
        (recent) => String(recent.id) !== normalizedPerson.id,
      ),
    ].slice(0, 6);
    setRecentPeople(nextRecent);
    try {
      localStorage.setItem(recentStorageKey, JSON.stringify(nextRecent));
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  };
  const openPerson = async (person) => {
    setRecentPeopleModalOpen(false);
    rememberPerson(person);
    setSelectedPerson({
      ...person,
      loading: true,
    });
    setSelectedDeck(null);
    setPreviewStudyMode(false);
    setError("");
    try {
      const result = await CSM.api(
        `people/profile&id=${encodeURIComponent(person.id)}`,
      );
      setSelectedPerson(result.person);
    } catch (requestError) {
      setSelectedPerson(null);
      setError(requestError.message || "Could not load this profile.");
    }
  };
  const openDeck = async (deck) => {
    setDeckBusy(true);
    setDeckError("");
    setRevealedCards([]);
    setPreviewStudyMode(false);
    setPreviewStudyIndex(0);
    setPreviewStudyRevealed(false);
    setPreviewStudyDirection(1);
    setSelectedDeck({
      ...deck,
      loading: true,
    });
    try {
      const result = await CSM.api(
        `people/deck&id=${encodeURIComponent(deck.id)}`,
      );
      setSelectedDeck(result.deck);
    } catch (requestError) {
      setSelectedDeck(null);
      setDeckError(requestError.message || "This deck is no longer available.");
    } finally {
      setDeckBusy(false);
    }
  };
  const returnToPeopleSearch = () => {
    setSelectedPerson(null);
    setSelectedDeck(null);
    setDeckError("");
    setRevealedCards([]);
    setPreviewStudyMode(false);
    setPreviewStudyIndex(0);
    setPreviewStudyRevealed(false);
    setReportModalOpen(false);
  };
  const submitDeckReport = async (event) => {
    event.preventDefault();
    const reason = reportReason.trim();
    if (!selectedDeck || reason.length < 8) {
      setReportError(
        "Please provide at least 8 characters explaining the issue.",
      );
      return;
    }
    setReportBusy(true);
    setReportError("");
    try {
      await CSM.api("people/deck/report", "POST", {
        deckId: selectedDeck.id,
        reason,
      });
      setReportModalOpen(false);
      setReportReason("");
      setReportNotice("Your report was sent to the moderation team.");
      window.setTimeout(() => setReportNotice(""), 4500);
    } catch (requestError) {
      setReportError(requestError.message || "Could not submit your report.");
    } finally {
      setReportBusy(false);
    }
  };
  const renderPersonResult = (person) => (
    <article
      className="csm-people-result"
      key={person.id}
      role="button"
      tabIndex={0}
      onClick={() => openPerson(person)}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          openPerson(person);
        }
      }}
    >
      <span
        className="csm-admin-avatar"
        style={{
          background:
            adminAvatarBackgrounds[person.avatar] ||
            adminAvatarBackgrounds.ember,
        }}
        aria-hidden="true"
      >
        {getAccountInitials({
          username: person.username,
          display_name: person.display_name,
        })}
      </span>
      <div className="csm-people-result-copy">
        <strong>{person.display_name}</strong>
        <span>@{person.username}</span>
        <small>
          {Number(person.public_deck_count) || 0} public deck
          {Number(person.public_deck_count) === 1 ? "" : "s"}
        </small>
      </div>
      <button
        type="button"
        className="csm-secondary-button"
        onClick={(event) => {
          event.stopPropagation();
          openPerson(person);
        }}
      >
        View profile
      </button>
    </article>
  );
  return (
    <div className="csm-screen csm-people-screen custom-scroll">
      <div className="csm-page-head">
        <div>
          <span className="csm-kicker">STUDY COMMUNITY</span>
          <h1>Find people</h1>
          <p>
            Discover classmates and browse the reviewer decks they’ve chosen to
            share.
          </p>
        </div>
      </div>
      {!selectedPerson && !selectedDeck && (
        <section className="csm-account-card csm-people-search-card">
          <form className="csm-people-search-form" onSubmit={searchPeople}>
            <label htmlFor="csm-people-search">
              Search by username or display name
            </label>
            <div>
              <input
                id="csm-people-search"
                value={search}
                onChange={(event) => {
                  const value = event.target.value;
                  setSearch(value);
                  setPage(0);
                  setError("");
                  setBusy(value.trim().length >= 2);
                }}
                placeholder="e.g. maya"
                maxLength={60}
              />
              <button
                type="submit"
                className="csm-primary-button"
                disabled={busy}
              >
                {busy ? (
                  "Searching…"
                ) : (
                  <>
                    <IconSearch className="w-4 h-4 text-white" /> Search
                  </>
                )}
              </button>
            </div>
          </form>
          {error && (
            <div className="csm-people-feedback is-error" role="status">
              {error}
            </div>
          )}
          {!error && !busy && total > 0 && (
            <p className="csm-people-result-count">
              {total} account{total === 1 ? "" : "s"} found · {people.length}{" "}
              shown
            </p>
          )}
          {busy ? (
            <div
              className="csm-people-loading"
              role="status"
              aria-live="polite"
            >
              <span className="csm-people-spinner" />
              <span>Searching for matching users…</span>
              <div className="csm-people-loading-lines">
                <i />
                <i />
                <i />
              </div>
            </div>
          ) : null}
          {!busy &&
            !error &&
            search.trim().length >= 2 &&
            people.length === 0 && (
              <div className="csm-people-empty">
                No matching accounts found.
              </div>
            )}
          {!busy && (
            <div className="csm-people-results">
              {people.map(renderPersonResult)}
            </div>
          )}
          {total > 12 && (
            <div className="csm-people-pagination">
              <span>
                Page {page + 1} of {Math.ceil(total / 12)}
              </span>
              <button
                type="button"
                className="csm-secondary-button"
                disabled={busy || page === 0}
                onClick={() => searchPeople(null, page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="csm-secondary-button"
                disabled={busy || (page + 1) * 12 >= total}
                onClick={() => searchPeople(null, page + 1)}
              >
                Next
              </button>
            </div>
          )}
          {recentPeople.length > 0 ? (
            <section className="csm-people-recent" aria-labelledby="csm-people-recent-title">
              <div className="csm-people-recent-heading">
                <h2 id="csm-people-recent-title">Recently searched</h2>
                <div className="csm-people-recent-actions">
                  <button
                    type="button"
                    className="csm-people-view-recent"
                    onClick={() => setRecentPeopleModalOpen(true)}
                  >
                    View all ({recentPeople.length})
                  </button>
                  <button type="button" onClick={clearRecentPeople}>
                    Clear history
                  </button>
                </div>
              </div>
              <div className="csm-people-results">
                {recentPeople.slice(0, 3).map(renderPersonResult)}
              </div>
            </section>
          ) : null}
          {!search.trim() && recentPeople.length === 0 && (
            <div className="csm-people-empty csm-people-hint">
              Search using at least two characters. Profiles can appear in
              results while their decks remain private.
            </div>
          )}
          <section className="csm-people-recent csm-people-discover" aria-labelledby="csm-people-discover-title">
              <div className="csm-people-recent-heading">
                <h2 id="csm-people-discover-title">Discover other users</h2>
                <button
                  type="button"
                  onClick={loadSuggestedPeople}
                  disabled={suggestionsBusy}
                >
                  {suggestionsBusy ? "Shuffling…" : "Shuffle users"}
                </button>
              </div>
              {suggestedPeople.length > 0 ? (
                <div className="csm-people-results">
                  {suggestedPeople.map(renderPersonResult)}
                </div>
              ) : (
                <div className="csm-people-empty csm-people-hint">
                  {suggestionsBusy
                    ? "Finding people to discover…"
                    : "No other users to show yet."}
                </div>
              )}
          </section>
        </section>
      )}

      {recentPeopleModalOpen && recentPeople.length > 0 &&
        ReactDOM.createPortal(
          <div
            className="csm-people-modal-backdrop csm-people-recent-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                setRecentPeopleModalOpen(false);
            }}
          >
            <section
              className="csm-people-modal csm-people-recent-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="csm-people-recent-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                ref={recentPeopleModalCloseRef}
                type="button"
                className="csm-people-modal-close"
                onClick={() => setRecentPeopleModalOpen(false)}
                aria-label="Close recently searched users"
              >
                <IconClose className="w-4 h-4" />
              </button>
              <span className="csm-kicker">DISCOVER</span>
              <h2 id="csm-people-recent-modal-title">Recently searched</h2>
              <p className="csm-people-recent-modal-description">
                Your {recentPeople.length} most recently viewed profiles.
              </p>
              <div className="csm-people-recent-modal-list">
                {recentPeople.map(renderPersonResult)}
              </div>
              <footer className="csm-people-recent-modal-actions">
                <button
                  type="button"
                  className="csm-secondary-button"
                  onClick={clearRecentPeople}
                >
                  Clear history
                </button>
                <button
                  type="button"
                  className="csm-primary-button"
                  onClick={() => setRecentPeopleModalOpen(false)}
                >
                  Done
                </button>
              </footer>
            </section>
          </div>,
          document.body,
        )}

      {(selectedPerson || selectedDeck) && (
        <>
          {selectedPerson && (
            <div className="csm-people-inline-preview">
              <section
                className="csm-account-card csm-people-profile-page"
                aria-labelledby="csm-people-profile-title"
              >
                <button
                  type="button"
                  className="csm-people-modal-close"
                  onClick={() => setSelectedPerson(null)}
                  aria-label="Close profile"
                >
                  ×
                </button>
                <div className="csm-people-profile-topline">
                  <div className="csm-people-profile-heading">
                    <span
                      className="csm-admin-avatar"
                      style={{
                        background:
                          adminAvatarBackgrounds[selectedPerson.avatar] ||
                          adminAvatarBackgrounds.ember,
                      }}
                      aria-hidden="true"
                    >
                      {getAccountInitials({
                        username: selectedPerson.username,
                        display_name: selectedPerson.display_name,
                      })}
                    </span>
                    <div>
                      <span className="csm-kicker">STUDENT PROFILE</span>
                      <h2 id="csm-people-profile-title">
                        {selectedPerson.display_name}
                      </h2>
                      <p>@{selectedPerson.username}</p>
                    </div>
                  </div>
                  <div className="csm-people-preview-nav csm-people-profile-nav">
                    <button
                      type="button"
                      className="csm-secondary-button"
                      onClick={returnToPeopleSearch}
                    >
                      <IconArrowLeft /> Back to search
                    </button>
                  </div>
                </div>
                {selectedPerson.loading ? (
                  <div className="csm-people-empty">Loading profile…</div>
                ) : (
                  <>
                    <div className="csm-people-deck-heading">
                      <div>
                        <h3>Public decks</h3>
                        <p>
                          Public decks include their Bombcards and attached
                          PDFs. Private notes and study progress remain private.
                        </p>
                      </div>
                      <span>{selectedPerson.decks?.length || 0}</span>
                    </div>
                    {deckError && (
                      <div
                        className="csm-people-feedback is-error"
                        role="status"
                      >
                        {deckError}
                      </div>
                    )}
                    {selectedPerson.decks?.length ? (
                      <div className="csm-people-decks">
                        {selectedPerson.decks.map((deck) => (
                          <article className="csm-people-deck" key={deck.id}>
                            <div>
                              <strong>{deck.title}</strong>
                              <span>
                                {deck.subject || "No subject"} ·{" "}
                                {deck.card_count} Bombcards
                              </span>
                            </div>
                            <button
                              type="button"
                              className="csm-secondary-button"
                              disabled={deckBusy}
                              onClick={() => openDeck(deck)}
                            >
                              {deckBusy ? (
                                "Loading..."
                              ) : (
                                <>
                                  View deck <IconArrowRight />
                                </>
                              )}
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="csm-people-empty">
                        This user hasn’t shared any decks.
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          )}

          {selectedDeck && (
            <div className="csm-people-inline-preview">
              <section
                className="csm-account-card csm-people-deck-page"
                aria-labelledby="csm-people-deck-title"
              >
                <button
                  type="button"
                  className="csm-people-modal-close"
                  onClick={() => setSelectedDeck(null)}
                  aria-label="Close deck"
                >
                  ×
                </button>
                <div className="csm-people-deck-title-block">
                  <div className="csm-people-deck-title-copy">
                    <span className="csm-kicker">PUBLIC REVIEWER</span>
                    <h2 id="csm-people-deck-title">{selectedDeck.title}</h2>
                    <p className="csm-people-deck-subject">
                      {selectedDeck.subject || "No subject"} &middot;{" "}
                      {selectedDeck.cards?.length || 0} Bombcards
                    </p>
                  </div>
                  <div
                    className="csm-people-deck-creator"
                    aria-label="Deck creation date"
                  >
                    <span className="csm-people-deck-creator-copy">
                      <small>
                        Created{" "}
                        {selectedDeck.created_at
                          ? new Date(
                              String(selectedDeck.created_at).replace(" ", "T"),
                            ).toLocaleDateString()
                          : "date unavailable"}
                      </small>
                    </span>
                  </div>
                </div>
                {selectedDeck.loading && (
                  <div className="csm-people-loading" role="status">
                    <span className="csm-people-spinner" />
                    <span>Loading shared deck…</span>
                  </div>
                )}
                {deckError && (
                  <div className="csm-people-feedback is-error">
                    {deckError}
                  </div>
                )}
                <div className="csm-people-deck-actions">
                  <button
                    type="button"
                    className="csm-secondary-button csm-people-report-trigger"
                    onClick={() => {
                      setReportReason("");
                      setReportError("");
                      setReportModalOpen(true);
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      aria-hidden="true"
                    >
                      <path d="M5 21V5m0 0c5-4 9 4 14 0v10c-5 4-9-4-14 0" />
                    </svg>
                    Report deck
                  </button>
                  <button
                    type="button"
                    className="csm-primary-button"
                    disabled={!selectedDeck.cards?.length}
                    onClick={() => {
                      setSelectedDeck(null);
                      setSelectedPerson(null);
                      onPlayDeck?.(selectedDeck);
                    }}
                  >
                    <IconArrowRight /> Play this deck in Challenge
                  </button>
                </div>
                {!previewStudyMode && selectedDeck.documents?.length > 0 && (
                  <section
                    className="csm-people-public-documents"
                    aria-label="Public PDFs"
                  >
                    <h3>
                      PDF materials <span>{selectedDeck.documents.length}</span>
                    </h3>
                    <div>
                      {selectedDeck.documents.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <IconPdf />
                          <span>
                            <strong>{file.title}</strong>
                            <small>
                              {(Number(file.size) / 1048576).toFixed(2)} MB ·
                              Opens in a new tab
                            </small>
                          </span>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            aria-hidden="true"
                          >
                            <path d="M14 4h6v6m0-6-9 9" />
                            <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  </section>
                )}
                {previewStudyMode &&
                  selectedDeck.cards?.length > 0 &&
                  (() => {
                    const card = selectedDeck.cards[previewStudyIndex];
                    const togglePreviewAnswer = () =>
                      setPreviewStudyRevealed((value) => !value);
                    return (
                      <section
                        className="csm-people-study-preview"
                        aria-label="Temporary study preview"
                      >
                        <div className="csm-people-study-preview-heading">
                          <div>
                            <span className="csm-kicker">STUDY PREVIEW</span>
                            <h3>{selectedDeck.title}</h3>
                            <p>
                              This is a preview only. Your study progress and
                              decks won’t be changed.
                            </p>
                          </div>
                          <button
                            type="button"
                            className="csm-secondary-button"
                            onClick={() => {
                              setPreviewStudyMode(false);
                              setPreviewStudyRevealed(false);
                            }}
                          >
                            Back to deck preview
                          </button>
                        </div>
                        <div className="csm-people-study-preview-count">
                          Card {previewStudyIndex + 1} of{" "}
                          {selectedDeck.cards.length}
                        </div>
                        <article
                          key={previewStudyIndex}
                          className={`csm-people-public-card csm-people-study-preview-card slide-${previewStudyDirection > 0 ? "next" : "previous"}${previewStudyRevealed ? " is-flipped" : ""}`}
                        >
                          <div className="csm-people-flip-inner">
                            <div className="csm-people-flip-face csm-people-flip-front">
                              <span className="csm-people-card-type">
                                BOMB CARD {previewStudyIndex + 1} ·{" "}
                                {String(card.type || "").replaceAll("_", " ")}
                              </span>
                              <button
                                type="button"
                                className="csm-people-question-face"
                                onClick={togglePreviewAnswer}
                                disabled={previewStudyRevealed}
                                aria-pressed={previewStudyRevealed}
                                aria-label={`Show answer for card ${previewStudyIndex + 1}`}
                              >
                                <span className="csm-people-question-label">
                                  QUESTION
                                </span>
                                <strong>{card.prompt}</strong>
                                {card.options?.length > 0 && (
                                  <ol>
                                    {card.options.map((option, i) => (
                                      <li key={`${card.id}-${i}`}>{option}</li>
                                    ))}
                                  </ol>
                                )}
                                <span className="csm-people-flip-hint">
                                  Click to reveal answer
                                </span>
                              </button>
                            </div>
                            <div
                              className="csm-people-flip-face csm-people-flip-back"
                              aria-hidden={!previewStudyRevealed}
                              onClick={(event) => {
                                if (
                                  previewStudyRevealed &&
                                  !event.target.closest(
                                    ".csm-people-answer-clickable, button",
                                  )
                                )
                                  togglePreviewAnswer();
                              }}
                            >
                              <span className="csm-people-question-label">
                                ANSWER
                              </span>
                              <div
                                className="csm-people-answer csm-people-answer-clickable"
                                role="button"
                                tabIndex={previewStudyRevealed ? 0 : -1}
                                aria-label="Flip back to question"
                                onClick={() =>
                                  previewStudyRevealed && togglePreviewAnswer()
                                }
                                onKeyDown={(event) => {
                                  if (
                                    previewStudyRevealed &&
                                    (event.key === "Enter" || event.key === " ")
                                  ) {
                                    event.preventDefault();
                                    togglePreviewAnswer();
                                  }
                                }}
                              >
                                <strong>{card.correctAnswer}</strong>
                                {card.explanation && (
                                  <small>{card.explanation}</small>
                                )}
                              </div>
                              <button
                                type="button"
                                className="csm-people-reveal"
                                onClick={togglePreviewAnswer}
                                disabled={!previewStudyRevealed}
                              >
                                Back to question
                              </button>
                            </div>
                          </div>
                        </article>
                        <div className="csm-people-study-preview-controls">
                          <button
                            type="button"
                            className="csm-secondary-button"
                            disabled={previewStudyIndex === 0}
                            onClick={() => {
                              setPreviewStudyDirection(-1);
                              setPreviewStudyIndex((index) => index - 1);
                              setPreviewStudyRevealed(false);
                            }}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className="csm-primary-button"
                            disabled={
                              previewStudyIndex >= selectedDeck.cards.length - 1
                            }
                            onClick={() => {
                              setPreviewStudyDirection(1);
                              setPreviewStudyIndex((index) => index + 1);
                              setPreviewStudyRevealed(false);
                            }}
                          >
                            Next card <IconArrowRight />
                          </button>
                        </div>
                      </section>
                    );
                  })()}
                {!previewStudyMode && (
                  <div className="csm-people-preview-limited">
                    <div className="csm-people-public-cards">
                      {selectedDeck.cards?.slice(0, 3).map((card, index) => {
                        const flipped = revealedCards.includes(card.id);
                        const toggleCard = () =>
                          setRevealedCards((current) =>
                            flipped
                              ? current.filter((id) => id !== card.id)
                              : [...current, card.id],
                          );
                        return (
                          <article
                            className={`csm-people-public-card${flipped ? " is-flipped" : ""}`}
                            key={card.id}
                          >
                            <div className="csm-people-flip-inner">
                              <div className="csm-people-flip-face csm-people-flip-front">
                                <span className="csm-people-card-type">
                                  BOMB CARD {index + 1} ·{" "}
                                  {String(card.type || "").replaceAll("_", " ")}
                                </span>
                                <button
                                  type="button"
                                  className="csm-people-question-face"
                                  onClick={toggleCard}
                                  disabled={flipped}
                                  aria-pressed={flipped}
                                  aria-label={`Show answer for card ${index + 1}`}
                                >
                                  <span className="csm-people-question-label">
                                    QUESTION
                                  </span>
                                  <strong>{card.prompt}</strong>
                                  {card.options?.length > 0 && (
                                    <ol>
                                      {card.options.map((option, i) => (
                                        <li key={`${card.id}-${i}`}>
                                          {option}
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                  <span className="csm-people-flip-hint">
                                    Click to reveal answer
                                  </span>
                                </button>
                              </div>
                              <div
                                className="csm-people-flip-face csm-people-flip-back"
                                aria-hidden={!flipped}
                              >
                                <span className="csm-people-question-label">
                                  ANSWER
                                </span>
                                <div
                                  className="csm-people-answer csm-people-answer-clickable"
                                  role="button"
                                  tabIndex={flipped ? 0 : -1}
                                  aria-label={`Flip card ${index + 1} back to question`}
                                  onClick={() => flipped && toggleCard()}
                                  onKeyDown={(event) => {
                                    if (
                                      flipped &&
                                      (event.key === "Enter" ||
                                        event.key === " ")
                                    ) {
                                      event.preventDefault();
                                      toggleCard();
                                    }
                                  }}
                                >
                                  <strong>{card.correctAnswer}</strong>
                                  {card.explanation && (
                                    <small>{card.explanation}</small>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="csm-people-reveal"
                                  onClick={toggleCard}
                                  disabled={!flipped}
                                >
                                  Back to question
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                    {selectedDeck.cards?.length > 3 && (
                      <div className="csm-people-preview-gate">
                        <div
                          className="csm-people-preview-teaser"
                          aria-hidden="true"
                        >
                          {selectedDeck.cards.slice(3, 6).map((card, index) => (
                            <article
                              className="csm-people-preview-teaser-card"
                              key={card.id}
                            >
                              <span>BOMB CARD {index + 4}</span>
                              <strong>{card.prompt}</strong>
                            </article>
                          ))}
                        </div>
                        <div className="csm-people-preview-gate-content">
                          <span>Continue studying</span>
                          <p>
                            Study the remaining {selectedDeck.cards.length - 3}{" "}
                            Bombcards in a temporary preview. Your progress
                            won’t be saved.
                          </p>
                          <button
                            type="button"
                            className="csm-primary-button"
                            onClick={() => {
                              setPreviewStudyIndex(3);
                              setPreviewStudyRevealed(false);
                              setPreviewStudyMode(true);
                            }}
                          >
                            Continue to study <IconArrowRight />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {reportNotice && (
            <div
              className="csm-people-report-toast"
              role="status"
              aria-live="polite"
            >
              {reportNotice}
            </div>
          )}
          {reportModalOpen &&
            selectedDeck &&
            ReactDOM.createPortal(
              <div
                className="csm-modal-backdrop csm-people-report-backdrop"
                role="presentation"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !reportBusy)
                    setReportModalOpen(false);
                }}
              >
                <section
                  className="csm-people-report-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="csm-people-report-title"
                >
                  <button
                    type="button"
                    className="csm-people-modal-close"
                    onClick={() => !reportBusy && setReportModalOpen(false)}
                    aria-label="Close report dialog"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>
                  <span className="csm-kicker">COMMUNITY MODERATION</span>
                  <h2 id="csm-people-report-title">Report this deck</h2>
                  <p>
                    Tell us why {selectedDeck.title} should be reviewed. Reports
                    are sent to the moderation team.
                  </p>
                  <form onSubmit={submitDeckReport}>
                    <label htmlFor="csm-people-report-reason">
                      Reason for report
                    </label>
                    <textarea
                      id="csm-people-report-reason"
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      maxLength={1000}
                      minLength={8}
                      required
                      placeholder="Describe the issue with this deck..."
                      autoFocus
                    />
                    <small>{reportReason.length}/1000 characters</small>
                    {reportError && (
                      <div
                        className="csm-people-feedback is-error"
                        role="alert"
                      >
                        {reportError}
                      </div>
                    )}
                    <div className="csm-people-report-actions">
                      <button
                        type="button"
                        className="csm-secondary-button"
                        disabled={reportBusy}
                        onClick={() => setReportModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="csm-primary-button"
                        disabled={reportBusy || reportReason.trim().length < 8}
                      >
                        {reportBusy ? "Sending..." : "Submit report"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}
