import { CSM } from "./services/client.js";
import { sound } from "./audio/SoundEngine.js";
import { ChangeConfirmationDialog } from "./components/dialogs/ChangeConfirmationDialog.jsx";
import { DeleteConfirmationDialog } from "./components/dialogs/DeleteConfirmationDialog.jsx";
import { GuestLockedModal } from "./components/dialogs/GuestLockedModal.jsx";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { WorkspaceHeader } from "./components/layout/WorkspaceHeader.jsx";
import { AccountScreen } from "./features/account/AccountScreen.jsx";
import { PasswordErrorDialog } from "./features/account/PasswordErrorDialog.jsx";
import { PasswordResetDialog } from "./features/account/PasswordResetDialog.jsx";
import { SignOutDialog } from "./features/account/SignOutDialog.jsx";
import { AdminArchiveScreen } from "./features/admin/AdminArchiveScreen.jsx";
import { AdminHome } from "./features/admin/AdminHome.jsx";
import { AdminPanel } from "./features/admin/AdminPanel.jsx";
import { AiGeneratorDialog } from "./features/ai/AiGeneratorDialog.jsx";
import { AiReviewerDialog } from "./features/ai/AiReviewerDialog.jsx";
import { CardsAddedDialog } from "./features/ai/CardsAddedDialog.jsx";
import { createAiReviewerPdf } from "./features/ai/reviewerPdf.js";
import { UserArchiveScreen } from "./features/archive/UserArchiveScreen.jsx";
import { ArenaExitDialog } from "./features/arena/ArenaExitDialog.jsx";
import { ArenaScreen } from "./features/arena/ArenaScreen.jsx";
import { CardCreatorScreen } from "./features/cards/CardCreatorScreen.jsx";
import { CardEditorDialog } from "./features/cards/CardEditorDialog.jsx";
import { DashboardScreen } from "./features/dashboard/DashboardScreen.jsx";
import { AddMaterialDialog } from "./features/library/AddMaterialDialog.jsx";
import { ArchiveDeckDialog } from "./features/library/ArchiveDeckDialog.jsx";
import { DeckFormDialog } from "./features/library/DeckFormDialog.jsx";
import { LibraryDeckCard } from "./features/library/LibraryDeckCard.jsx";
import { DeckCardActions } from "./features/library/DeckCardActions.jsx";
import { CreateBombcardsDialog } from "./features/library/CreateBombcardsDialog.jsx";
import { LibraryScreen } from "./features/library/LibraryScreen.jsx";
import { ShareDeckDialog } from "./features/library/ShareDeckDialog.jsx";
import { PdfWorkspaceScreen } from "./features/pdf/PdfWorkspaceScreen.jsx";
import { PeopleScreen } from "./features/people/PeopleScreen.jsx";
import { StudyScreen } from "./features/study/StudyScreen.jsx";
import { canonicalDeckTitle, deckTitleKey } from "./utils/decks.js";
import { readSidebarLockPreference } from "./utils/preferences.js";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
export function App({ isGuest = false, sharedDeck = null }) {
  // Navigation: 'home' | 'library' | 'game' | 'arena' | 'account'
  const [guestLockedSection, setGuestLockedSection] = useState(null);
  const initialRole =
    window.CSM?.initial?.profile?.role || (isGuest ? "guest" : "user");
  const isStaffAccount = ["admin", "superadmin"].includes(initialRole);
  const staffRestrictedScreens = [
    "library",
    "flashcards",
    "creator",
    "highlighter",
    "game",
    "arena",
    "people",
  ];
  const initialUrlParams = new URLSearchParams(window.location.search);
  const requestedScreen = initialUrlParams.get("screen");
  const requestedPdfDocumentId = initialUrlParams.get("documentId");
  const requestedPdfPageValue = Number(initialUrlParams.get("pdfPage"));
  const requestedPdfPage =
    Number.isInteger(requestedPdfPageValue) && requestedPdfPageValue > 0
      ? requestedPdfPageValue
      : null;
  const allowedScreens = [
    "home",
    "library",
    "flashcards",
    "creator",
    "highlighter",
    "game",
    "arena",
    "people",
    "account",
    "admin",
    "archive",
  ];
  const isAdminPath = /\/admin\/?$/i.test(window.location.pathname);
  const initialScreen = isAdminPath
    ? "admin"
    : allowedScreens.includes(requestedScreen)
      ? requestedScreen
      : isGuest
        ? "library"
        : "home";
  const guestAllowedScreens = ["library", "flashcards", "arena", "game"];
  const defaultScreen = isGuest
    ? guestAllowedScreens.includes(initialScreen)
      ? initialScreen
      : "library"
    : initialScreen;
  const [activeTab, setActiveTab] = useState(
    isStaffAccount && staffRestrictedScreens.includes(defaultScreen)
      ? "home"
      : !isStaffAccount && defaultScreen === "admin"
        ? "home"
        : defaultScreen,
  );
  const [sidebarLocked, setSidebarLocked] = useState(readSidebarLockPreference);
  const [sidebarExpanded, setSidebarExpanded] = useState(
    readSidebarLockPreference,
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const libraryNavExpanded =
    mobileMenuOpen ||
    ["library", "flashcards", "creator", "highlighter"].includes(activeTab);
  const handleSidebarMouseEnter = () => {
    if (window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) {
      setSidebarExpanded(true);
    }
  };
  const handleSidebarMouseLeave = () => {
    if (
      !sidebarLocked &&
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches
    ) {
      setSidebarExpanded(false);
    }
  };
  const handleSidebarLockToggle = () => {
    const next = !sidebarLocked;
    setSidebarLocked(next);
    if (next) setSidebarExpanded(true);
    try {
      window.localStorage.setItem("csm-sidebar-locked", next ? "1" : "0");
    } catch (error) {}
  };
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsWrapRef = useRef(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signOutConfirmationOpen, setSignOutConfirmationOpen] = useState(false);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsUnread, setNotificationsUnread] = useState(0);
  const [changeConfirmation, setChangeConfirmation] = useState(null);
  const defaultProfile = {
    displayName: isGuest ? "Guest Student" : "Gavin Dave",
    username: isGuest ? "guest" : "gavin_dave",
    avatar: "ember",
    nameChangedAt: null,
  };
  const [profile, setProfile] = useState(() => ({
    ...defaultProfile,
    ...(window.CSM?.initial?.profile || {}),
  }));
  const isStaff = !isGuest && ["admin", "superadmin"].includes(profile.role);
  const openAdminAccess = (section = "") => {
    const adminUrl = window.CSM.adminUrl || "admin";
    if (["overview", "content", "reports", "users"].includes(section)) {
      const separator = adminUrl.includes("?") ? "&" : "?";
      window.location.assign(
        `${adminUrl}${separator}section=${encodeURIComponent(section)}`,
      );
      return;
    }
    window.location.assign(adminUrl);
  };
  const refreshNotifications = async () => {
    if (isGuest) return;
    try {
      const result = await CSM.api("notifications");
      setNotifications(
        Array.isArray(result.notifications) ? result.notifications : [],
      );
      setNotificationsUnread(Number(result.unreadCount) || 0);
    } catch {
      /* Session handling is surfaced by the shared API client. */
    }
  };
  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const dismissOnOutsidePointer = (event) => {
      if (!notificationsWrapRef.current?.contains(event.target))
        setNotificationsOpen(false);
    };
    const dismissOnEscape = (event) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [notificationsOpen]);
  useEffect(() => {
    if (isGuest) return;
    refreshNotifications();
    const interval = window.setInterval(refreshNotifications, 30000);
    const refreshOnNotificationChange = () => refreshNotifications();
    window.addEventListener(
      "csm:notifications-refresh",
      refreshOnNotificationChange,
    );
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(
        "csm:notifications-refresh",
        refreshOnNotificationChange,
      );
    };
  }, [isGuest]);
  useEffect(() => {
    if (
      isGuest &&
      ["home", "creator", "account", "admin"].includes(activeTab)
    ) {
      setGuestLockedSection(activeTab === "account" ? "profile" : activeTab);
      setActiveTab("library");
      return;
    }
    if (isStaff && staffRestrictedScreens.includes(activeTab))
      setActiveTab("home");
    else if (!isStaff && activeTab === "admin") setActiveTab("home");
  }, [activeTab, isStaff, isGuest]);
  const [profileNameDraft, setProfileNameDraft] = useState(
    () => profile.displayName,
  );
  const [profileClock, setProfileClock] = useState(Date.now());
  const [passwordResetModalOpen, setPasswordResetModalOpen] = useState(false);
  const [passwordErrorModal, setPasswordErrorModal] = useState(null);
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState("");
  const [newPasswordDraft, setNewPasswordDraft] = useState("");
  const [confirmPasswordDraft, setConfirmPasswordDraft] = useState("");
  const [accountSection, setAccountSection] = useState("profile");
  const [privacySaveStatus, setPrivacySaveStatus] = useState("");
  const [decks, setDecks] = useState(() => window.CSM?.initial?.decks || []);
  const [accountStats, setAccountStats] = useState(
    () => window.CSM?.initial?.stats || {},
  );
  const [earnedAchievements, setEarnedAchievements] = useState(
    () => window.CSM?.initial?.achievements || [],
  );
  const [studyProgress, setStudyProgress] = useState(
    () => window.CSM?.initial?.studyProgress || [],
  );
  const [arenaSessions, setArenaSessions] = useState(
    () => window.CSM?.initial?.sessions || [],
  );
  const [recentActivities, setRecentActivities] = useState(() => {
    if (window.CSM?.initial) return window.CSM.initial.activities || [];
    const defaultActivities = [
      {
        id: "activity-1",
        material: "ITE 292 B1",
        mode: "Reviewer library",
        accuracy: "—",
        status: "Viewed",
        timestamp: Date.now() - 2 * 60 * 60 * 1000,
        deckId: "deck-2",
        screen: "library",
      },
      {
        id: "activity-2",
        material: "ITE 083",
        mode: "Reviewer library",
        accuracy: "—",
        status: "Viewed",
        timestamp: Date.now() - 24 * 60 * 60 * 1000,
        deckId: "deck-3",
        screen: "library",
      },
      {
        id: "activity-3",
        material: "ITE 001",
        mode: "Reviewer library",
        accuracy: "—",
        status: "Viewed",
        timestamp: Date.now() - 9 * 24 * 60 * 60 * 1000,
        deckId: "deck-1",
        screen: "library",
      },
    ];
    try {
      const savedActivities = window.localStorage.getItem(
        "csm-recent-activities",
      );
      const parsedActivities = savedActivities
        ? JSON.parse(savedActivities)
        : null;
      return Array.isArray(parsedActivities)
        ? parsedActivities.filter((activity) => activity.screen === "library")
        : defaultActivities;
    } catch (error) {
      return defaultActivities;
    }
  });
  const refreshWorkspace = async () => {
    if (isGuest) return;
    const data = await CSM.api("workspace");
    setProfile(data.profile);
    setDecks(data.decks);
    setRecentActivities(data.activities);
    setAccountStats(data.stats);
    setStudyProgress(data.studyProgress);
    setArenaSessions(data.sessions);
    setEarnedAchievements(data.achievements || []);
    await refreshNotifications();
    return data;
  };

  // --- Library Workshop State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [librarySubjectFilter, setLibrarySubjectFilter] =
    useState("All subjects");
  const [libraryPage, setLibraryPage] = useState(1);
  const [selectedDeckForFolderView, setSelectedDeckForFolderView] = useState(
    () => (isGuest && sharedDeck ? sharedDeck : null),
  ); // When clicking folder
  const [libraryReturnFromPdf, setLibraryReturnFromPdf] = useState(false);
  const [deckVisibilitySaving, setDeckVisibilitySaving] = useState(false);
  const [deckVisibilityNotice, setDeckVisibilityNotice] = useState(null);
  const deckVisibilityNoticeTimerRef = useRef(null);
  const [isDeckEditorOpen, setIsDeckEditorOpen] = useState(false);
  const [editingDeck, setEditingDeck] = useState(null);

  // Add Material Popup State (VAIA Hierarchy + CSM Design Premise)
  const [isAddMaterialPopupOpen, setIsAddMaterialPopupOpen] = useState(false);
  const [targetDeckForAddMaterial, setTargetDeckForAddMaterial] =
    useState(null);
  const [isCreateBombcardsPopupOpen, setIsCreateBombcardsPopupOpen] =
    useState(false);
  const [targetDeckForCreateBombcards, setTargetDeckForCreateBombcards] =
    useState(null);
  const [isDraggingAddMaterialFile, setIsDraggingAddMaterialFile] =
    useState(false);
  const addMaterialFileInputRef = useRef(null);

  // Deck Editor Form State
  const [editorCode, setEditorCode] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorSubject, setEditorSubject] = useState("");
  const [editorCards, setEditorCards] = useState([]);
  const [editorDocuments, setEditorDocuments] = useState([]);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const pdfInputRef = useRef(null);

  // New Question sub-form inside editor
  const [newQType, setNewQType] = useState("MULTIPLE_CHOICE");
  const [newQPrompt, setNewQPrompt] = useState("");
  const [newQHint, setNewQHint] = useState("");
  const [newQOptions, setNewQOptions] = useState(["", "", "", ""]);
  const [newQCorrectIndex, setNewQCorrectIndex] = useState(0);
  const [newQAnswer, setNewQAnswer] = useState("");
  const [newQAlternates, setNewQAlternates] = useState("");

  // --- Dedicated Create Bombcards Page Form State ---
  const [creatorTargetDeckId, setCreatorTargetDeckId] = useState(
    () => window.CSM?.initial?.decks?.[0]?.id || "",
  );
  const [creatorType, setCreatorType] = useState("MULTIPLE_CHOICE");
  const [creatorPrompt, setCreatorPrompt] = useState("");
  const [creatorEditingCardId, setCreatorEditingCardId] = useState(null);
  const [creatorHint, setCreatorHint] = useState("");
  const [creatorOptions, setCreatorOptions] = useState(["", "", "", ""]);
  const [creatorCorrectIndex, setCreatorCorrectIndex] = useState(0);
  const [creatorAnswer, setCreatorAnswer] = useState("");
  const [creatorAlternates, setCreatorAlternates] = useState("");
  const [creatorStep, setCreatorStep] = useState(1); // 1 = Question, 2 = Answers & Details
  const [creatorShowHint, setCreatorShowHint] = useState(false);
  const [creatorShowAlternates, setCreatorShowAlternates] = useState(false);
  const libraryReturnScrollRef = useRef(null);
  const rememberLibraryPosition = () => {
    const libraryScreen = document.querySelector(".csm-library-screen");
    libraryReturnScrollRef.current = libraryScreen?.scrollTop ?? 0;
  };
  useLayoutEffect(() => {
    if (activeTab !== "library" || libraryReturnScrollRef.current === null) return;
    const frame = window.requestAnimationFrame(() => {
      const libraryScreen = document.querySelector(".csm-library-screen");
      if (libraryScreen) libraryScreen.scrollTop = libraryReturnScrollRef.current;
      libraryReturnScrollRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);
  const startEditingBombcard = (deck, card) => {
    if (!card?.id) {
      triggerToast(
        "This Bombcard cannot be edited because it has no saved ID.",
      );
      return;
    }
    const options = Array.isArray(card.options)
      ? card.options.slice(0, 4).map((option) => String(option ?? ""))
      : [];
    const savedCorrectIndex = Number(card.correctIndex);
    const correctAnswerIndex = options.indexOf(card.correctAnswer);
    setSelectedDeckIds([deck.id]);
    setCreatorTargetDeckId(deck.id);
    setCreatorEditingCardId(card.id);
    setCreatorType(card.type || "IDENTIFICATION");
    setCreatorPrompt(card.prompt || "");
    setCreatorHint(card.hint || "");
    setCreatorOptions([
      ...options,
      ...Array(Math.max(0, 4 - options.length)).fill(""),
    ]);
    setCreatorCorrectIndex(
      Number.isInteger(savedCorrectIndex) &&
        savedCorrectIndex >= 0 &&
        savedCorrectIndex < options.length
        ? savedCorrectIndex
        : Math.max(0, correctAnswerIndex),
    );
    setCreatorAnswer(card.correctAnswer || "");
    setCreatorAlternates(card.alternates || "");
    setCreatorShowHint(Boolean(card.hint));
    setCreatorShowAlternates(Boolean(card.alternates));
    setCreatorStep(1);
    setOpenMaterialMenuId(null);
    rememberLibraryPosition();
    setActiveTab("creator");
  };
  const prepareNewBombcard = () => {
    setCreatorEditingCardId(null);
    setCreatorType("MULTIPLE_CHOICE");
    setCreatorPrompt("");
    setCreatorHint("");
    setCreatorOptions(["", "", "", ""]);
    setCreatorCorrectIndex(0);
    setCreatorAnswer("");
    setCreatorAlternates("");
    setCreatorShowHint(false);
    setCreatorShowAlternates(false);
    setCreatorStep(1);
  };
  const handleSaveBombcard = async () => {
    if (!creatorPrompt.trim()) {
      triggerToast("Please enter a question prompt.");
      setCreatorStep(1);
      return;
    }
    if (creatorType === "MULTIPLE_CHOICE") {
      const filledOptions = creatorOptions.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
        triggerToast("Please provide at least 2 multiple choice options.");
        setCreatorStep(2);
        return;
      }
      if (!creatorOptions[creatorCorrectIndex]?.trim()) {
        triggerToast("The designated correct option cannot be blank.");
        setCreatorStep(2);
        return;
      }
    } else {
      if (!creatorAnswer.trim()) {
        triggerToast("Please enter the correct answer.");
        setCreatorStep(2);
        return;
      }
    }
    const targetDeck =
      decks.find((d) => d.id === creatorTargetDeckId) || decks[0];
    if (!targetDeck) return;
    const isEditingCard = Boolean(creatorEditingCardId);
    const newCard = {
      id: "c-" + Date.now(),
      type: creatorType,
      prompt: creatorPrompt.trim(),
      hint: creatorHint.trim() || undefined,
      ...(creatorType === "MULTIPLE_CHOICE"
        ? {
            options: creatorOptions.map(
              (opt, i) => opt.trim() || `Option ${i + 1}`,
            ),
            correctIndex: creatorCorrectIndex,
            correctAnswer:
              creatorOptions[creatorCorrectIndex]?.trim() || "Correct",
          }
        : {
            correctAnswer: creatorAnswer.trim(),
            alternates: creatorAlternates.trim() || undefined,
          }),
    };
    try {
      await CSM.api("cards", isEditingCard ? "PATCH" : "POST", {
        ...newCard,
        ...(isEditingCard
          ? {
              id: creatorEditingCardId,
            }
          : {}),
        deckId: targetDeck.id,
      });
      await refreshWorkspace();
    } catch (error) {
      triggerToast(error.message);
      return;
    }
    recordActivity({
      material: targetDeck.code || targetDeck.title,
      mode: isEditingCard ? "Bombcard Edit" : "Bombcard Creation",
      deckId: targetDeck.id,
      screen: "creator",
      status: isEditingCard ? "Edited" : "Card added",
    });
    try {
      sound.correct();
    } catch (_) {}
    triggerToast(
      isEditingCard
        ? "Bombcard changes saved."
        : `Bombcard added to ${targetDeck.code || targetDeck.title}!`,
    );
    setCreatorEditingCardId(null);
    setCreatorPrompt("");
    setCreatorHint("");
    setCreatorOptions(["", "", "", ""]);
    setCreatorAnswer("");
    setCreatorAlternates("");
    setCreatorCorrectIndex(0);
    setCreatorShowHint(false);
    setCreatorShowAlternates(false);
    setCreatorStep(1);
    if (isEditingCard) setActiveTab("library");
  };

  // --- Dedicated Gemini AI Bombcards Generator State ---
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [aiTargetDeckId, setAiTargetDeckId] = useState(
    () => window.CSM?.initial?.decks?.[0]?.id || "",
  );
  const [aiDeckLocked, setAiDeckLocked] = useState(false);
  const [aiSourceType, setAiSourceType] = useState("pdf"); // 'pdf' | 'text'
  const [aiNotes, setAiNotes] = useState("");
  const [aiFormat, setAiFormat] = useState("MIXED"); // 'MIXED' | 'MULTIPLE_CHOICE' | 'IDENTIFICATION'
  const [aiFocus, setAiFocus] = useState("comprehensive"); // 'comprehensive' | 'key_terms' | 'conceptual'
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReviewerDownloading, setAiReviewerDownloading] = useState(false);
  const [aiReviewerImporting, setAiReviewerImporting] = useState(false);
  const [aiReviewerReady, setAiReviewerReady] = useState(null);
  const [aiStage, setAiStage] = useState("input"); // 'input' | 'preview'
  const [aiGeneratedCards, setAiGeneratedCards] = useState([]);
  const [aiCardsAddedModal, setAiCardsAddedModal] = useState(null);

  // Dedicated PDF Extraction & Source Management
  const [aiPdfSourceMode, setAiPdfSourceMode] = useState("upload"); // 'upload' | 'library'
  const [aiUploadedPdfFile, setAiUploadedPdfFile] = useState(null);
  const [aiSelectedLibraryDoc, setAiSelectedLibraryDoc] = useState(null);
  const [aiPdfTotalPages, setAiPdfTotalPages] = useState(0);
  const [aiPdfPageRangeType, setAiPdfPageRangeType] = useState("all"); // 'all' | 'custom'
  const [aiPdfStartPage, setAiPdfStartPage] = useState(1);
  const [aiPdfEndPage, setAiPdfEndPage] = useState(1);
  const [aiExtractingPdf, setAiExtractingPdf] = useState(false);
  const [aiPdfExtractProgress, setAiPdfExtractProgress] = useState("");
  const [aiPdfExtractedSummary, setAiPdfExtractedSummary] = useState(null);
  const [aiShowNotesPreview, setAiShowNotesPreview] = useState(false);
  const [aiSavePdfToDeck, setAiSavePdfToDeck] = useState(true);
  const [aiPdfDragActive, setAiPdfDragActive] = useState(false);
  const aiPdfFileInputRef = useRef(null);
  const extractPdfText = async (source, pageRangeOverride = null) => {
    if (!source) return;
    setAiExtractingPdf(true);
    setAiPdfExtractProgress("Connecting to PDF reader...");
    try {
      const pdfjs = window.pdfjsLib || (await window.pdfjsReady);
      if (!pdfjs) throw new Error("PDF reader could not be initialized.");
      let loadingTask;
      let title = "Document.pdf";
      if (source.type === "file") {
        title = source.file.name;
        const arrayBuffer = await source.file.arrayBuffer();
        loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
        });
      } else {
        title = source.doc.title;
        loadingTask = pdfjs.getDocument({
          url: source.doc.url,
          withCredentials: true,
        });
      }
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;
      setAiPdfTotalPages(totalPages);
      const rangeType = pageRangeOverride?.type || aiPdfPageRangeType;
      let start = 1;
      let end = totalPages;
      if (rangeType === "custom") {
        const reqStart = Number(pageRangeOverride?.start ?? aiPdfStartPage);
        const reqEnd = Number(pageRangeOverride?.end ?? aiPdfEndPage);
        start = Math.max(1, Math.min(reqStart || 1, totalPages));
        end = Math.max(start, Math.min(reqEnd || totalPages, totalPages));
      }
      setAiPdfStartPage(start);
      setAiPdfEndPage(end);
      let extractedFullText = "";
      for (let p = start; p <= end; p++) {
        setAiPdfExtractProgress(`Extracting page ${p} of ${end}...`);
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        let pageStr = "";
        let lastY = null;
        for (const item of textContent.items) {
          if (!item.str) continue;
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageStr += "\n";
          } else if (
            pageStr.length > 0 &&
            !pageStr.endsWith(" ") &&
            !pageStr.endsWith("\n")
          ) {
            pageStr += " ";
          }
          pageStr += item.str;
          lastY = item.transform[5];
        }
        if (pageStr.trim()) {
          extractedFullText += `--- Page ${p} ---\n${pageStr.trim()}\n\n`;
        }
      }
      const cleanText = extractedFullText.trim();
      if (!cleanText) {
        triggerToast(
          "No readable text found in this PDF range. It may be a scanned image.",
        );
        setAiPdfExtractProgress("");
        return;
      }
      setAiNotes(cleanText);
      const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
      setAiPdfExtractedSummary({
        fileName: title,
        pages: end - start + 1,
        totalPages,
        startPage: start,
        endPage: end,
        wordCount,
        charCount: cleanText.length,
      });
      setAiPdfExtractProgress("");
      triggerToast(
        `✓ Extracted ${wordCount.toLocaleString()} words from ${title}!`,
      );
    } catch (err) {
      console.error(err);
      triggerToast(
        "PDF Extraction failed: " + (err.message || "Unknown error"),
      );
      setAiPdfExtractProgress("");
    } finally {
      setAiExtractingPdf(false);
    }
  };
  const handleOpenAiGenerator = (
    preferredDeckId,
    docOrFile = null,
    lockDeck = false,
  ) => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    const deckId =
      preferredDeckId ||
      creatorTargetDeckId ||
      (decks.length > 0 ? decks[0].id : "");
    setAiDeckLocked(Boolean(docOrFile || lockDeck));
    setAiTargetDeckId(deckId);
    setAiStage("input");
    setAiGeneratorOpen(true);
    if (docOrFile) {
      setAiSourceType("pdf");
      if (docOrFile instanceof File) {
        setAiPdfSourceMode("upload");
        setAiUploadedPdfFile(docOrFile);
        setAiSelectedLibraryDoc(null);
        extractPdfText({
          type: "file",
          file: docOrFile,
        });
      } else if (docOrFile.url) {
        setAiPdfSourceMode("library");
        setAiSelectedLibraryDoc(docOrFile);
        setAiUploadedPdfFile(null);
        extractPdfText({
          type: "doc",
          doc: docOrFile,
        });
      }
    } else {
      const targetDeck = decks.find((d) => d.id === deckId);
      if (targetDeck?.documents && targetDeck.documents.length > 0) {
        setAiSourceType("pdf");
        setAiPdfSourceMode("library");
        setAiSelectedLibraryDoc(targetDeck.documents[0]);
        setAiUploadedPdfFile(null);
        extractPdfText({
          type: "doc",
          doc: targetDeck.documents[0],
        });
      } else {
        setAiSourceType("pdf");
        setAiPdfSourceMode("upload");
      }
    }
  };
  const handleTargetDeckChange = (newDeckId) => {
    setAiTargetDeckId(newDeckId);
    const newDeck = decks.find((d) => d.id === newDeckId);
    if (aiSourceType === "pdf" && aiPdfSourceMode === "library") {
      if (newDeck?.documents && newDeck.documents.length > 0) {
        setAiSelectedLibraryDoc(newDeck.documents[0]);
        extractPdfText({
          type: "doc",
          doc: newDeck.documents[0],
        });
      } else {
        setAiSelectedLibraryDoc(null);
        setAiPdfSourceMode("upload");
      }
    }
  };
  const handlePdfDrop = (e) => {
    e.preventDefault();
    setAiPdfDragActive(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        setAiUploadedPdfFile(file);
        setAiPdfSourceMode("upload");
        setAiSelectedLibraryDoc(null);
        extractPdfText({
          type: "file",
          file,
        });
      } else {
        triggerToast("Please drop a valid PDF file.");
      }
    }
  };
  const handlePdfFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      ) {
        setAiUploadedPdfFile(file);
        setAiPdfSourceMode("upload");
        setAiSelectedLibraryDoc(null);
        extractPdfText({
          type: "file",
          file,
        });
      } else {
        triggerToast("Please select a valid PDF file.");
      }
    }
  };
  const handleGenerateWithAi = async () => {
    if (!aiNotes.trim()) {
      triggerToast("Please provide or extract study material first.");
      return;
    }
    setAiLoading(true);

    // If uploading a new PDF and savePdfToDeck is checked, ensure it is added to deck materials
    if (
      aiSourceType === "pdf" &&
      aiPdfSourceMode === "upload" &&
      aiUploadedPdfFile &&
      aiSavePdfToDeck &&
      aiTargetDeckId
    ) {
      try {
        const targetDeck = decks.find((d) => d.id === aiTargetDeckId);
        const alreadyExists = (targetDeck?.documents || []).some(
          (d) => d.title === aiUploadedPdfFile.name,
        );
        if (!alreadyExists) {
          await CSM.upload(aiTargetDeckId, aiUploadedPdfFile);
          await refreshWorkspace();
        }
      } catch (uploadErr) {
        console.warn("Could not auto-save PDF to deck:", uploadErr);
      }
    }
    try {
      const res = await CSM.api("ai/generate", "POST", {
        deckId: aiTargetDeckId,
        notes: aiNotes.trim(),
        format: aiFormat,
        focus: aiFocus,
        saveDirectly: false,
      });
      if (res && res.cards && res.cards.length > 0) {
        setAiGeneratedCards(
          res.cards.map((c) => ({
            ...c,
            selected: false,
          })),
        );
        setAiStage("preview");
        try {
          sound.correct();
        } catch (_) {}
        triggerToast(`Gemini forged ${res.cards.length} high-yield Bombcards!`);
      } else {
        triggerToast(
          "Could not generate flashcards. Please provide more detailed text.",
        );
      }
    } catch (err) {
      triggerToast(err.message || "AI Generation failed.");
    } finally {
      setAiLoading(false);
    }
  };
  const handleGenerateAiReviewer = async () => {
    if (aiGeneratedCards.length === 0 || aiReviewerDownloading) return;
    const targetDeck = decks.find(
      (deck) => String(deck.id) === String(aiTargetDeckId),
    );
    const deckTitle =
      targetDeck?.code || targetDeck?.title || "Gemini Generated";
    setAiReviewerDownloading(true);
    try {
      const result = await CSM.api("ai/reviewer", "POST", {
        deckTitle,
        notes: aiNotes.trim(),
        cards: aiGeneratedCards.map(
          ({ type, prompt, correctAnswer, options }) => ({
            type,
            prompt,
            correctAnswer,
            options,
          }),
        ),
      });
      if (!result?.reviewer?.sections?.length)
        throw new Error("Gemini did not return a usable study reviewer.");
      const artifact = createAiReviewerPdf(result.reviewer, deckTitle);
      setAiReviewerReady({
        ...artifact,
        deckId: targetDeck?.id || "",
        deckTitle,
      });
    } catch (downloadError) {
      triggerToast(
        downloadError.message || "Could not create the study reviewer.",
      );
    } finally {
      setAiReviewerDownloading(false);
    }
  };
  const handleImportAiReviewer = async () => {
    if (!aiReviewerReady?.deckId || aiReviewerImporting) return;
    setAiReviewerImporting(true);
    try {
      const reviewerFile = new File(
        [aiReviewerReady.blob],
        aiReviewerReady.filename,
        {
          type: "application/pdf",
        },
      );
      await CSM.upload(aiReviewerReady.deckId, reviewerFile);
      await refreshWorkspace();
      triggerToast("AI-generated reviewer added to Reference Notes.");
      setAiReviewerReady(null);
    } catch (importError) {
      triggerToast(
        importError.message || "Could not add the reviewer to Reference Notes.",
      );
    } finally {
      setAiReviewerImporting(false);
    }
  };
  const handleSaveAiCardsToDeck = async () => {
    const cardsToSave = aiGeneratedCards.filter((c) => c.selected);
    if (cardsToSave.length === 0) {
      triggerToast("Please select at least one Bombcard to add.");
      return;
    }
    const targetDeck = decks.find((d) => d.id === aiTargetDeckId) || decks[0];
    if (!targetDeck) {
      triggerToast("Please select a target deck.");
      return;
    }
    setAiLoading(true);
    try {
      for (const card of cardsToSave) {
        await CSM.api("cards", "POST", {
          deckId: targetDeck.id,
          type: card.type,
          prompt: card.prompt,
          options: card.options,
          correctIndex: card.correctIndex,
          correctAnswer: card.correctAnswer,
          alternates: card.alternates,
          hint: card.hint,
        });
      }
      await refreshWorkspace();
      try {
        sound.correct();
      } catch (_) {}
      setAiCardsAddedModal({
        count: cardsToSave.length,
        deckTitle: targetDeck.code || targetDeck.title,
      });
      setAiGeneratorOpen(false);
      setAiStage("input");
      setAiNotes("");
      setAiGeneratedCards([]);
    } catch (err) {
      triggerToast(err.message || "Failed saving cards.");
    } finally {
      setAiLoading(false);
    }
  };
  const handleLoadSampleNotes = () => {
    const sample = `Computer Network Topologies and Protocols:
1. Star Topology: In a star topology, each network host is connected to a central hub or switch with a point-to-point connection. If one cable fails, only that computer's connection is affected.
2. Mesh Topology: Every node has a direct connection to every other node (full mesh) or some nodes (partial mesh). It provides maximum redundancy and fault tolerance.
3. TCP (Transmission Control Protocol): Connection-oriented protocol providing reliable, ordered, and error-checked delivery of a stream of octets between applications. Uses a three-way handshake (SYN, SYN-ACK, ACK).
4. UDP (User Datagram Protocol): Connectionless protocol offering lightweight communication without guarantee of delivery, order, or duplicate protection. Often used for real-time video streaming, DNS, and online gaming.
5. ARP (Address Resolution Protocol): Resolves an IP address (Network Layer) to a physical MAC address (Data Link Layer).
6. DNS (Domain Name System): Operates on Port 53, translates human-readable domain names (e.g., example.com) to machine-routable IP addresses.`;
    setAiNotes(sample);
    triggerToast("Loaded sample computer networking notes.");
  };

  // --- Bombstyle Arena State Controller ---
  const [bombstylePhase, setBombstylePhase] = useState("select_deck"); // 'select_deck' | 'configure' | 'countdown' | 'gameplay' | 'results' | 'review_missed'
  const [bombstyleCountdown, setBombstyleCountdown] = useState(3);
  const [bombstyleDeckId, setBombstyleDeckId] = useState(
    () => window.CSM?.initial?.decks?.[0]?.id || "",
  );
  const [publicArenaDeck, setPublicArenaDeck] = useState(null);
  const [bombstyleDifficulty, setBombstyleDifficulty] = useState("normal"); // 'easy' | 'normal' | 'hard'
  const [bombstyleQueue, setBombstyleQueue] = useState([]);
  const [bombstyleIndex, setBombstyleIndex] = useState(0);
  const [bombstyleRevealed, setBombstyleRevealed] = useState(false);
  const [bombstyleAnswerDraft, setBombstyleAnswerDraft] = useState("");
  const [bombstyleAnswerError, setBombstyleAnswerError] = useState("");
  const bombstyleAnswerInputRef = useRef(null);
  const [bombstyleTimeRemaining, setBombstyleTimeRemaining] = useState(45);
  const [bombstyleStreak, setBombstyleStreak] = useState(0);
  const [bombstyleMaxStreak, setBombstyleMaxStreak] = useState(0);
  const [bombstyleCorrectCount, setBombstyleCorrectCount] = useState(0);
  const [bombstyleMissedCards, setBombstyleMissedCards] = useState([]);
  const [bombstyleStartTime, setBombstyleStartTime] = useState(null);
  const [bombstyleDurationSeconds, setBombstyleDurationSeconds] = useState(0);
  const [bombstyleSessionId, setBombstyleSessionId] = useState(null);
  const [bombstyleFeedback, setBombstyleFeedback] = useState(null); // 'defused' | 'exploded' | null
  const [bombstyleTimerHelpOpen, setBombstyleTimerHelpOpen] = useState(false);
  const [bombstyleExitModalOpen, setBombstyleExitModalOpen] = useState(false);
  const pendingBombstyleExitActionRef = useRef(null);
  const [selectedDeckIds, setSelectedDeckIds] = useState(() =>
    isGuest && sharedDeck
      ? [sharedDeck.id]
      : [window.CSM?.initial?.decks?.[0]?.id].filter(Boolean),
  );
  const [soundMuted, setSoundMuted] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardDragX, setFlashcardDragX] = useState(0);
  const [flashcardIsDragging, setFlashcardIsDragging] = useState(false);
  const [flashcardSwipePhase, setFlashcardSwipePhase] = useState("");
  const flashcardDragRef = useRef(null);
  const ignoreFlashcardClickRef = useRef(false);
  const flashcardMotionTimerRef = useRef(null);
  const flashcardMotionLockRef = useRef(false);
  const navigateFlashcardRef = useRef(null);
  const [highlightColor, setHighlightColor] = useState("#f5a23a");
  const [highlights, setHighlights] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const pdfRestoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (pdfPageCount > 0 && pdfPage > pdfPageCount) setPdfPage(pdfPageCount);
  }, [pdfPage, pdfPageCount]);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("screen", activeTab);
    if (activeTab === "highlighter" && activeDocument?.id) {
      url.searchParams.set("documentId", activeDocument.id);
      url.searchParams.set("pdfPage", String(pdfPage));
    } else {
      url.searchParams.delete("documentId");
      url.searchParams.delete("pdfPage");
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [activeTab, activeDocument?.id, pdfPage]);
  const [pdfSelection, setPdfSelection] = useState(null);
  const [pdfCardComposerOpen, setPdfCardComposerOpen] = useState(false);
  const [pdfSelectionRole, setPdfSelectionRole] = useState("question");
  const [pdfCounterpart, setPdfCounterpart] = useState("");
  const [pdfSaving, setPdfSaving] = useState(false);

  // PDF Learning Workspace States
  const [pdfZoom, setPdfZoom] = useState(1.0);
  const [pdfSearchOpen, setPdfSearchOpen] = useState(false);
  const [pdfSearchQuery, setPdfSearchQuery] = useState("");
  const [pdfSearchResults, setPdfSearchResults] = useState([]);
  const [pdfSearching, setPdfSearching] = useState(false);
  const [workspaceSidebarTab, setWorkspaceSidebarTab] = useState("flashcards");
  const [documentNotes, setDocumentNotes] = useState([]);
  const [documentNotesLoading, setDocumentNotesLoading] = useState(false);
  const [noteComposerOpen, setNoteComposerOpen] = useState(false);
  const [noteFormTitle, setNoteFormTitle] = useState("");
  const [noteFormContent, setNoteFormContent] = useState("");
  const [noteFormPage, setNoteFormPage] = useState(1);
  const [noteEditingId, setNoteEditingId] = useState(null);
  const [studyDecks, setStudyDecks] = useState([]);
  const [activeStudyDeckId, setActiveStudyDeckId] = useState(null);
  const [studyCards, setStudyCards] = useState([]);
  const [studyCardsLoading, setStudyCardsLoading] = useState(false);
  const [cardComposerOpen, setCardComposerOpen] = useState(false);
  const [cardFormQuestion, setCardFormQuestion] = useState("");
  const [cardFormAnswer, setCardFormAnswer] = useState("");
  const [cardFormExplanation, setCardFormExplanation] = useState("");
  const [cardFormTags, setCardFormTags] = useState("");
  const [cardFormSourcePage, setCardFormSourcePage] = useState(1);
  const [reviewingDeck, setReviewingDeck] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [aiAssistantResponse, setAiAssistantResponse] = useState(null);
  const [aiExplainLevel, setAiExplainLevel] = useState("concise");

  // Auto-save last read page with debounce
  useEffect(() => {
    if (!activeDocument?.id || isGuest || pdfPage <= 0) return;
    const timer = setTimeout(() => {
      CSM.api("documents/page", "POST", {
        documentId: activeDocument.id,
        page: pdfPage,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [activeDocument?.id, pdfPage, isGuest]);

  // Load study flashcards when active deck changes
  useEffect(() => {
    if (!activeStudyDeckId || isGuest) {
      setStudyCards([]);
      return;
    }
    setStudyCardsLoading(true);
    CSM.api("study-cards&deckId=" + encodeURIComponent(activeStudyDeckId))
      .then((res) => setStudyCards(res?.cards || []))
      .catch((err) => console.warn(err))
      .finally(() => setStudyCardsLoading(false));
  }, [activeStudyDeckId, isGuest]);

  // In-document text search
  const handlePdfSearch = async (query = pdfSearchQuery) => {
    if (!activeDocument?.id || !query.trim()) {
      setPdfSearchResults([]);
      return;
    }
    setPdfSearching(true);
    try {
      const res = await CSM.api(
        "documents/search&documentId=" +
          encodeURIComponent(activeDocument.id) +
          "&q=" +
          encodeURIComponent(query.trim()),
      );
      setPdfSearchResults(res?.results || []);
      if (!res?.results?.length) {
        triggerToast('No matches found for "' + query.trim() + '"');
      } else {
        triggerToast(`Found matches on ${res.results.length} page(s)`);
      }
    } catch (e) {
      triggerToast("Search error: " + e.message);
    } finally {
      setPdfSearching(false);
    }
  };

  // AI Assistant Handlers
  const handleAiExplain = async (text, level = aiExplainLevel) => {
    if (!text?.trim()) return triggerToast("Select text first.");
    setAiThinking(true);
    try {
      const res = await CSM.api("ai/explain", "POST", {
        text: text.trim(),
        level,
        documentId: activeDocument?.id,
        page: pdfPage,
      });
      setAiAssistantResponse({
        type: "explain",
        text: text.trim(),
        result: res.explanation,
      });
    } catch (e) {
      triggerToast("AI error: " + e.message);
    } finally {
      setAiThinking(false);
    }
  };
  const handleAiSummarize = async (text) => {
    setAiThinking(true);
    try {
      const res = await CSM.api("ai/summarize", "POST", {
        text: text ? text.trim() : "",
        documentId: activeDocument?.id,
        page: pdfPage,
      });
      setAiAssistantResponse({
        type: "summary",
        text: text || "",
        result: res.summary,
      });
    } catch (e) {
      triggerToast("AI error: " + e.message);
    } finally {
      setAiThinking(false);
    }
  };
  const handleAiQuestions = async (text) => {
    setAiThinking(true);
    try {
      const res = await CSM.api("ai/questions", "POST", {
        text: text ? text.trim() : "",
        documentId: activeDocument?.id,
        page: pdfPage,
        count: 4,
      });
      setAiAssistantResponse({
        type: "questions",
        text: text || "",
        questions: res.questions || [],
      });
    } catch (e) {
      triggerToast("AI error: " + e.message);
    } finally {
      setAiThinking(false);
    }
  };
  const handleAiNotes = async (text, saveDirectly = false) => {
    setAiThinking(true);
    setWorkspaceSidebarTab("notes");
    try {
      const res = await CSM.api("ai/notes", "POST", {
        text: text ? text.trim() : "",
        documentId: activeDocument?.id,
        page: pdfPage,
        save: saveDirectly,
      });
      if (res?.saved && activeDocument?.id) {
        CSM.api(
          "document-notes&documentId=" + encodeURIComponent(activeDocument.id),
        )
          .then((r) => setDocumentNotes(r?.notes || []))
          .catch(() => {});
        triggerToast("Saved structured note to document!");
      }
      setAiAssistantResponse({
        type: "note",
        text: text || "",
        note: res.note,
      });
    } catch (e) {
      triggerToast("AI error: " + e.message);
    } finally {
      setAiThinking(false);
    }
  };
  const handleAiFlashcards = async (text) => {
    setAiThinking(true);
    setWorkspaceSidebarTab("flashcards");
    try {
      const res = await CSM.api("ai/flashcards", "POST", {
        text: text ? text.trim() : "",
        documentId: activeDocument?.id,
        page: pdfPage,
        deckId: activeStudyDeckId,
        count: 5,
      });
      if (res?.saved && activeStudyDeckId) {
        CSM.api("study-cards&deckId=" + encodeURIComponent(activeStudyDeckId))
          .then((r) => setStudyCards(r?.cards || []))
          .catch(() => {});
        const targetDeck = decks.find((deck) => deck.id === activeStudyDeckId);
        setAiCardsAddedModal({
          count: Number(res.saved),
          deckTitle: targetDeck?.code || targetDeck?.title || "your deck",
        });
      }
      setAiAssistantResponse({
        type: "flashcards",
        text: text || "",
        cards: res.cards || [],
        saved: res.saved,
      });
    } catch (e) {
      triggerToast("AI error: " + e.message);
    } finally {
      setAiThinking(false);
    }
  };
  const handleAiAsk = async (prompt) => {
    if (!prompt?.trim()) return;
    setAiThinking(true);
    try {
      const res = await CSM.api("ai/explain", "POST", {
        text: prompt.trim(),
        level: "detailed",
        documentId: activeDocument?.id,
        page: pdfPage,
      });
      setAiAssistantResponse({
        type: "explain",
        text: prompt.trim(),
        result: res.explanation,
      });
    } catch (e) {
      triggerToast("AI error: " + e.message);
    } finally {
      setAiThinking(false);
    }
  };

  // Document Notes Handlers
  const handleSaveDocumentNote = async (noteData) => {
    if (!activeDocument?.id) return;
    try {
      if (noteData.id) {
        await CSM.api("document-notes", "PATCH", {
          id: noteData.id,
          title: noteData.title,
          content: noteData.content,
          page: noteData.page,
        });
        triggerToast("Note updated.");
      } else {
        await CSM.api("document-notes", "POST", {
          documentId: activeDocument.id,
          title: noteData.title,
          content: noteData.content,
          page: noteData.page,
        });
        triggerToast("Note created.");
      }
      const res = await CSM.api(
        "document-notes&documentId=" + encodeURIComponent(activeDocument.id),
      );
      setDocumentNotes(res?.notes || []);
    } catch (e) {
      triggerToast("Failed to save note: " + e.message);
    }
  };
  const handleDeleteDocumentNote = async (noteId) => {
    if (!activeDocument?.id || !noteId) return;
    try {
      await CSM.api("document-notes", "DELETE", {
        id: noteId,
      });
      setDocumentNotes((prev) => prev.filter((n) => n.id !== noteId));
      triggerToast("Note removed.");
    } catch (e) {
      triggerToast("Could not delete note: " + e.message);
    }
  };

  // Study Flashcards Handlers
  const handleCreateStudyDeck = async (title) => {
    const cleanTitle = canonicalDeckTitle(title);
    if (!cleanTitle) return false;
    if (
      studyDecks.some(
        (deck) => deckTitleKey(deck.title) === deckTitleKey(cleanTitle),
      )
    ) {
      triggerToast("A study deck with this title already exists.");
      return false;
    }
    try {
      const created = await CSM.api("study-decks", "POST", {
        title: cleanTitle,
        documentId: activeDocument?.id || null,
      });
      setStudyDecks((prev) => [created, ...prev]);
      setActiveStudyDeckId(created.id);
      triggerToast(`Deck "${cleanTitle}" created.`);
      return true;
    } catch (e) {
      triggerToast("Could not create deck: " + e.message);
      return false;
    }
  };
  const handleSaveStudyCard = async (cardData) => {
    try {
      await CSM.api("study-cards", "POST", cardData);
      triggerToast("Flashcard added to deck.");
      if (activeStudyDeckId) {
        const res = await CSM.api(
          "study-cards&deckId=" + encodeURIComponent(activeStudyDeckId),
        );
        setStudyCards(res?.cards || []);
      }
    } catch (e) {
      triggerToast("Could not save flashcard: " + e.message);
    }
  };
  const handleDeleteStudyCard = async (cardId) => {
    try {
      await CSM.api("study-cards", "DELETE", {
        id: cardId,
      });
      setStudyCards((prev) => prev.filter((c) => c.id !== cardId));
      triggerToast("Flashcard removed.");
    } catch (e) {
      triggerToast("Could not delete flashcard: " + e.message);
    }
  };

  // Quick action from floating selection bar (Vaia Magic Marker)
  const handleQuickAction = (action, text, color) => {
    if (action === "note") {
      setNoteFormTitle(`Note: Page ${pdfPage}`);
      setNoteFormContent(`“${text}”\n\n`);
      setNoteFormPage(pdfPage);
      setNoteEditingId(null);
      setNoteComposerOpen(true);
      setWorkspaceSidebarTab("notes");
    } else if (action === "card") {
      setCardFormQuestion(text);
      setCardFormAnswer("");
      setCardFormExplanation("");
      setCardFormTags("");
      setCardFormSourcePage(pdfPage);
      setCardComposerOpen(true);
      setWorkspaceSidebarTab("flashcards");
    } else if (action === "highlight") {
      if (color) setHighlightColor(color);
      savePdfSelection(color);
    }
  };
  useEffect(() => {
    const closeDeckMenuOnOutsideClick = (event) => {
      if (!event.target.closest(".csm-deck-actions")) {
        setOpenDeckMenuId(null);
      }
      if (!event.target.closest(".csm-material-actions")) {
        setOpenMaterialMenuId(null);
      }
      if (!event.target.closest(".csm-profile-wrap")) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeDeckMenuOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeDeckMenuOnOutsideClick);
  }, []);

  // --- Stats Computation ---
  const totalReviewers = decks.length;
  const totalBombCards = useMemo(
    () => decks.reduce((acc, d) => acc + d.cards.length, 0),
    [decks],
  );
  const totalDocuments = useMemo(
    () => decks.reduce((acc, d) => acc + (d.documents?.length || 0), 0),
    [decks],
  );
  const currentStudyStreak = Number(accountStats.studyDays) || 0;
  const bestStudyStreak = Number(accountStats.studyBestDays) || 0;
  const studyStreakLost = currentStudyStreak === 0 && bestStudyStreak > 0;
  const formatTrend = (value) =>
    `${Number(value) < 0 ? "\u2193" : "\u2191"} ${Math.abs(Number(value) || 0)}%`;
  const arenaChart = Array.isArray(accountStats.arenaChart)
    ? accountStats.arenaChart
    : [];
  const activityChartMax = Math.max(
    1,
    ...arenaChart.flatMap((day) => [
      Number(day.current) || 0,
      Number(day.previous) || 0,
    ]),
  );
  const activeFlashcardDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckIds[0]) || decks[0],
    [decks, selectedDeckIds],
  );
  const activeDeckProgress = useMemo(
    () =>
      studyProgress.filter((item) => item.deck_id === activeFlashcardDeck?.id),
    [studyProgress, activeFlashcardDeck?.id],
  );
  const activeDeckKnownAnswers = activeDeckProgress.reduce(
    (total, item) => total + (Number(item.times_known) || 0),
    0,
  );
  const activeDeckUnknownAnswers = activeDeckProgress.reduce(
    (total, item) => total + (Number(item.times_unknown) || 0),
    0,
  );
  const activeDeckAccuracy =
    activeDeckKnownAnswers + activeDeckUnknownAnswers
      ? Math.round(
          (activeDeckKnownAnswers /
            (activeDeckKnownAnswers + activeDeckUnknownAnswers)) *
            100,
        )
      : 0;
  const activeDeckMissedCount = activeDeckProgress.filter(
    (item) =>
      (Number(item.times_unknown) || 0) > (Number(item.times_known) || 0),
  ).length;
  const mostRecentDeck = useMemo(() => {
    if (recentActivities && recentActivities.length > 0) {
      const recentWithDeck = recentActivities.find(
        (a) => a.deckId && decks.some((d) => d.id === a.deckId),
      );
      if (recentWithDeck) {
        return (
          decks.find((d) => d.id === recentWithDeck.deckId) || decks[0] || null
        );
      }
    }
    return decks[0] || null;
  }, [decks, recentActivities]);
  const todayDayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date().getDay()
  ];
  const totalWeekActivity = useMemo(() => {
    return arenaChart.reduce(
      (acc, item) => acc + (Number(item.current) || 0),
      0,
    );
  }, [arenaChart]);
  const deckMasteryList = useMemo(() => {
    return decks.slice(0, 4).map((deck) => {
      const deckCards = deck.cards || [];
      const deckProgress = studyProgress.filter((p) => p.deck_id === deck.id);
      const knownCount = deckProgress.filter(
        (p) =>
          p.status === "known" ||
          (Number(p.times_known) || 0) > (Number(p.times_unknown) || 0),
      ).length;
      const masteryPct = deckCards.length
        ? Math.min(100, Math.round((knownCount / deckCards.length) * 100))
        : 0;
      return {
        ...deck,
        masteryPct,
        knownCount,
        totalCards: deckCards.length,
        hasProgress: deckProgress.length > 0,
      };
    });
  }, [decks, studyProgress]);
  const badgesList = useMemo(() => {
    const hasDecks = earnedAchievements.includes("first_deck");
    const hasStreak = earnedAchievements.includes("streak_starter");
    const hasArena = earnedAchievements.includes("arena_warrior");
    const hasDocs = earnedAchievements.includes("pdf_scholar");
    const hasAccuracy = earnedAchievements.includes("master_mind");
    return [
      {
        id: "first_deck",
        icon: <i className="bi bi-bullseye text-red-500 text-lg"></i>,
        title: "First Reviewer",
        desc: "Created a study deck",
        unlocked: hasDecks,
        progress: hasDecks ? "Unlocked" : `${totalReviewers}/1`,
      },
      {
        id: "streak_starter",
        icon: <i className="bi bi-fire text-orange-500 text-lg"></i>,
        title: "Streak Flame",
        desc: "Active study streak",
        unlocked: hasStreak,
        progress: hasStreak ? `${accountStats.studyDays || 0}d` : "0d",
      },
      {
        id: "arena_warrior",
        icon: (
          <i className="bi bi-lightning-charge-fill text-amber-500 text-lg"></i>
        ),
        title: "Challenge Champion",
        desc: "Completed Challenge match",
        unlocked: hasArena,
        progress: hasArena ? "Unlocked" : `${arenaSessions?.length || 0}/1`,
      },
      {
        id: "pdf_scholar",
        icon: (
          <i className="bi bi-journal-bookmark-fill text-blue-500 text-lg"></i>
        ),
        title: "PDF Scholar",
        desc: "Added study documents",
        unlocked: hasDocs,
        progress: hasDocs ? "Unlocked" : `${totalDocuments}/1`,
      },
      {
        id: "master_mind",
        icon: <i className="bi bi-lightbulb-fill text-purple-500 text-lg"></i>,
        title: "Sharp Recall",
        desc: "Achieved 75%+ accuracy",
        unlocked: hasAccuracy,
        progress: hasAccuracy
          ? `${accountStats.accuracy}%`
          : `${accountStats.accuracy || 0}%/75%`,
      },
    ];
  }, [
    earnedAchievements,
    totalReviewers,
    accountStats,
    arenaSessions,
    totalDocuments,
    totalBombCards,
  ]);
  const flashcards = activeFlashcardDeck?.cards || [];
  const activeFlashcard = flashcards[flashcardIndex] || flashcards[0];
  const flipFlashcard = () => {
    if (!isGuest && !flashcardFlipped && activeFlashcard?.id)
      CSM.api("study/progress", "POST", {
        bombcardId: activeFlashcard.id,
        result: "seen",
      })
        .then(() => {
          window.dispatchEvent(new Event("csm:study-reviewed"));
          return CSM.api("study/progress").then(setStudyProgress);
        })
        .catch((error) => console.warn("Study progress was not saved:", error));
    setFlashcardFlipped((value) => !value);
  };
  const navigateFlashcard = (direction) => {
    if (flashcardMotionLockRef.current) return;
    const nextIndex = Math.max(
      0,
      Math.min(Math.max(flashcards.length - 1, 0), flashcardIndex + direction),
    );
    if (nextIndex === flashcardIndex) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setFlashcardIndex(nextIndex);
      setFlashcardFlipped(false);
      return;
    }
    flashcardMotionLockRef.current = true;
    window.clearTimeout(flashcardMotionTimerRef.current);
    setFlashcardFlipped(false);
    setFlashcardSwipePhase(direction > 0 ? "exit-left" : "exit-right");
    flashcardMotionTimerRef.current = window.setTimeout(() => {
      setFlashcardIndex(nextIndex);
      setFlashcardDragX(0);
      setFlashcardSwipePhase(direction > 0 ? "enter-right" : "enter-left");
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          setFlashcardSwipePhase(
            direction > 0 ? "settle-from-right" : "settle-from-left",
          );
        }),
      );
      flashcardMotionTimerRef.current = window.setTimeout(() => {
        setFlashcardSwipePhase("");
        flashcardMotionLockRef.current = false;
      }, 240);
    }, 180);
  };
  navigateFlashcardRef.current = navigateFlashcard;
  const handleFlashcardPointerDown = (event) => {
    if (
      flashcardMotionLockRef.current ||
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    )
      return;
    flashcardDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    setFlashcardIsDragging(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (_) {}
  };
  const handleFlashcardPointerMove = (event) => {
    const start = flashcardDragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;
    setFlashcardDragX(
      Math.abs(deltaX) > Math.abs(deltaY)
        ? Math.max(-140, Math.min(140, deltaX))
        : 0,
    );
  };
  const handleFlashcardPointerUp = (event) => {
    const start = flashcardDragRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    flashcardDragRef.current = null;
    const deltaX = event.clientX - start.startX;
    const deltaY = event.clientY - start.startY;
    setFlashcardIsDragging(false);
    if (Math.abs(deltaX) >= 64 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      ignoreFlashcardClickRef.current = true;
      window.setTimeout(() => {
        ignoreFlashcardClickRef.current = false;
      }, 500);
      if (deltaX < 0 && flashcardIndex < flashcards.length - 1)
        navigateFlashcard(1);
      else if (deltaX > 0 && flashcardIndex > 0) navigateFlashcard(-1);
    }
    setFlashcardDragX(0);
  };
  const handleFlashcardPointerCancel = () => {
    flashcardDragRef.current = null;
    setFlashcardIsDragging(false);
    setFlashcardDragX(0);
  };
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";
  const displayName = profile.displayName || defaultProfile.displayName;
  const displayFirstName = displayName.trim().split(/\s+/)[0] || "there";
  const profileInitials =
    displayName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "GD";
  const nameCooldownDuration = 7 * 24 * 60 * 60 * 1000;
  const nameCooldownRemaining = profile.nameChangedAt
    ? Math.max(0, profile.nameChangedAt + nameCooldownDuration - profileClock)
    : 0;
  const nameCooldownDays = Math.ceil(
    nameCooldownRemaining / (24 * 60 * 60 * 1000),
  );
  const avatarOptions = [
    {
      id: "ember",
      label: "Ember",
      initials: profileInitials,
      background: "linear-gradient(145deg, #f47c59, #ed4e2d)",
    },
    {
      id: "ocean",
      label: "Ocean",
      initials: profileInitials,
      background: "linear-gradient(145deg, #5c8fe8, #243f86)",
    },
    {
      id: "mint",
      label: "Mint",
      initials: profileInitials,
      background: "linear-gradient(145deg, #61c7a0, #247d68)",
    },
    {
      id: "violet",
      label: "Violet",
      initials: profileInitials,
      background: "linear-gradient(145deg, #a580e8, #5b3c9a)",
    },
    {
      id: "sunset",
      label: "Sunset",
      initials: profileInitials,
      background: "linear-gradient(145deg, #f3bd56, #c85b30)",
    },
    {
      id: "slate",
      label: "Slate",
      initials: profileInitials,
      background: "linear-gradient(145deg, #718096, #263246)",
    },
  ];
  const currentAvatar =
    avatarOptions.find((avatar) => avatar.id === profile.avatar) ||
    avatarOptions[0];
  const accountSectionDetails = {
    profile: {
      title: "Your profile",
      description:
        "Manage how you appear in Co-StudyMaxx and keep your account ready for study.",
    },
    security: {
      title: "Security",
      description: "Manage password access and account security settings.",
    },
    privacy: {
      title: "Privacy & policy",
      description:
        "Review how your local profile and study activity are handled.",
    },
  }[accountSection] || {
    title: "Your profile",
    description:
      "Manage how you appear in Co-StudyMaxx and keep your account ready for study.",
  };
  useEffect(() => {
    setProfileNameDraft(profile.displayName || defaultProfile.displayName);
  }, [profile.displayName]);
  useEffect(() => {
    const profileClockTimer = window.setInterval(
      () => setProfileClock(Date.now()),
      60000,
    );
    return () => window.clearInterval(profileClockTimer);
  }, []);
  const recordActivity = ({
    material,
    mode,
    accuracy = "—",
    status = "In progress",
    deckId = null,
    screen = "library",
  }) => {
    if (isGuest) return;
    if (
      !["library", "flashcards", "highlighter", "game", "creator"].includes(
        screen,
      )
    )
      return;
    CSM.api("activity", "POST", {
      material,
      mode,
      status,
      deckId,
      screen,
    })
      .then(() => refreshWorkspace())
      .catch((error) => console.warn("Could not save study activity:", error));
  };
  const formatActivityTime = (timestamp) => {
    const elapsed = Math.max(0, Date.now() - Number(timestamp));
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (elapsed < minute) return "Just now";
    if (elapsed < hour) return `${Math.floor(elapsed / minute)} min ago`;
    if (elapsed < day) return `${Math.floor(elapsed / hour)}h ago`;
    if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d ago`;
    return new Date(Number(timestamp)).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const openRecentActivity = (activity) => {
    if (activity.deckId) {
      const activityDeck = decks.find((deck) => deck.id === activity.deckId);
      setSelectedDeckIds([activity.deckId]);
      if (activity.screen === "library")
        setSelectedDeckForFolderView(activityDeck || null);
    }
    setActiveTab(activity.screen || "library");
  };

  // --- Detail View States (Synced with decks) ---
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedBombcardIds, setSelectedBombcardIds] = useState([]);
  const currentSelectedDeck = useMemo(() => {
    if (!selectedDeckForFolderView) return null;
    return (
      decks.find((d) => d.id === selectedDeckForFolderView.id) ||
      selectedDeckForFolderView
    );
  }, [decks, selectedDeckForFolderView]);
  useEffect(() => {
    setBulkDeleteMode(false);
    setSelectedBombcardIds([]);
  }, [selectedDeckForFolderView?.id]);
  const visibleCards = useMemo(() => {
    if (!currentSelectedDeck || !currentSelectedDeck.cards) return [];
    return currentSelectedDeck.cards;
  }, [currentSelectedDeck]);
  const handleSelectDeckForDetail = (deck) => {
    setSelectedDeckForFolderView(deck);
    setBulkDeleteMode(false);
    setSelectedBombcardIds([]);
    recordActivity({
      material: deck.code || deck.title,
      mode: "Reviewer library",
      deckId: deck.id,
      screen: "library",
    });
    setActiveTab("library");
  };

  // --- Folder Info Modal State (Edits Name & Description Only, NOT Content) ---
  const [folderInfoModalOpen, setFolderInfoModalOpen] = useState(false);
  const [targetFolderForEdit, setTargetFolderForEdit] = useState(null);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [folderDescInput, setFolderDescInput] = useState("");
  const [openDeckMenuId, setOpenDeckMenuId] = useState(null);
  const [openMaterialMenuId, setOpenMaterialMenuId] = useState(null);
  const [openMasteryMenuId, setOpenMasteryMenuId] = useState(null);
  const [masteryProgressNotice, setMasteryProgressNotice] = useState(null);
  const [revealedLibraryCards, setRevealedLibraryCards] = useState([]);
  const [deleteDeckTarget, setDeleteDeckTarget] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [shareDeckTarget, setShareDeckTarget] = useState(null);
  const [shareModalData, setShareModalData] = useState(null);
  const [shareModalLoading, setShareModalLoading] = useState(false);
  const [shareModalError, setShareModalError] = useState("");
  const [shareModalCopied, setShareModalCopied] = useState(false);
  useEffect(() => {
    if (!masteryProgressNotice) return undefined;
    const timer = window.setTimeout(() => setMasteryProgressNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [masteryProgressNotice]);
  useEffect(() => {
    if (!openMasteryMenuId) return undefined;
    const closeMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (
        event.type === "pointerdown" &&
        event.target.closest?.(".csm-mastery-menu")
      )
        return;
      setOpenMasteryMenuId(null);
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [openMasteryMenuId]);

  // Section collapsing states
  const [collapseRecent, setCollapseRecent] = useState(false);
  const [collapseOlder, setCollapseOlder] = useState(false);
  const folderNameDuplicate = useMemo(() => {
    const titleKey = deckTitleKey(folderNameInput);
    if (!titleKey) return false;
    const originalKey = targetFolderForEdit
      ? deckTitleKey(targetFolderForEdit.title || targetFolderForEdit.code)
      : "";
    if (targetFolderForEdit && titleKey === originalKey) return false;
    return decks.some(
      (deck) =>
        deck.id !== targetFolderForEdit?.id &&
        deckTitleKey(deck.title || deck.code) === titleKey,
    );
  }, [decks, folderNameInput, targetFolderForEdit]);
  const handleOpenEditFolderInfo = (deck, e) => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    if (e) e.stopPropagation();
    setOpenDeckMenuId(null);
    setTargetFolderForEdit(deck);
    setFolderNameInput(deck.code || deck.title);
    setFolderDescInput(deck.subject || "");
    setFolderInfoModalOpen(true);
  };
  const handleOpenCreateFolderInfo = () => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    setOpenDeckMenuId(null);
    setTargetFolderForEdit(null);
    setFolderNameInput("");
    setFolderDescInput("");
    setFolderInfoModalOpen(true);
  };
  const handleSaveFolderInfo = async (e) => {
    if (e) e.preventDefault();
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    const title = canonicalDeckTitle(folderNameInput);
    if (!title) {
      triggerToast("Please enter a deck title");
      return;
    }
    if (folderNameDuplicate) {
      triggerToast("A deck with this title already exists.");
      return;
    }
    try {
      const savedDeck = await CSM.api(
        "decks",
        targetFolderForEdit ? "PATCH" : "POST",
        {
          ...(targetFolderForEdit
            ? {
                id: targetFolderForEdit.id,
              }
            : {}),
          title,
          subject: folderDescInput.trim(),
          category: targetFolderForEdit?.category || "Recent",
        },
      );
      await refreshWorkspace();
      if (targetFolderForEdit) {
        // Edit ONLY folder name & description (NOT content)
        triggerToast(`Updated folder "${title}"`);
        showChangeConfirmation(
          "Deck updated",
          `Your changes to "${title}" were saved.`,
        );
      } else {
        // Create new folder
        setSelectedDeckIds((prev) => [...prev, savedDeck.id]);
        triggerToast(`Created new folder "${title}"`);
        showChangeConfirmation(
          "Deck created",
          `"${title}" is ready for your study materials.`,
        );
      }
      setFolderInfoModalOpen(false);
      setTargetFolderForEdit(null);
    } catch (error) {
      triggerToast(error.message);
    }
  };
  const handleDeleteFolder = (deckId, e) => {
    if (e) e.stopPropagation();
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    const target = decks.find((d) => d.id === deckId);
    setOpenDeckMenuId(null);
    setDeleteDeckTarget(
      target || {
        id: deckId,
        code: "this deck",
        title: "this deck",
      },
    );
  };
  const handleRemoveDocument = (deckId, docId) => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    const deck = decks.find((item) => item.id === deckId);
    const document = deck?.documents?.find((item) => item.id === docId);
    if (!document) return;
    setOpenMaterialMenuId(null);
    requestDeleteConfirmation({
      title: `Remove "${document.title}"?`,
      message:
        "This PDF will be removed from the reviewer. You can upload it again later if needed.",
      confirmLabel: "Remove PDF",
      action: async () => {
        try {
          await CSM.api("documents", "DELETE", {
            id: docId,
          });
          await refreshWorkspace();
        } catch (error) {
          triggerToast(error.message);
          return;
        }
        triggerToast("Document removed from this reviewer");
        showChangeConfirmation(
          "PDF removed",
          "The document was removed from this reviewer.",
        );
      },
    });
  };
  const handleRemoveBombcard = (deck, cardId) => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    const card = deck?.cards?.find((item) => item.id === cardId);
    if (!deck || !card) return;
    setOpenMaterialMenuId(null);
    requestDeleteConfirmation({
      title: "Delete this Bombcard?",
      message: `“${card.prompt}” will be permanently removed from ${deck.code || deck.title}.`,
      confirmLabel: "Delete Bombcard",
      action: async () => {
        try {
          await CSM.api("cards", "DELETE", {
            id: cardId,
            deckId: deck.id,
          });
          setRevealedLibraryCards((current) =>
            current.filter((id) => id !== cardId),
          );
          await refreshWorkspace();
        } catch (error) {
          triggerToast(error.message);
          return;
        }
        triggerToast("Bombcard deleted");
        showChangeConfirmation(
          "Bombcard deleted",
          "The Bombcard was removed from this reviewer.",
        );
      },
    });
  };
  const handleBulkRemoveBombcards = (deck) => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    const ids = (deck?.cards || [])
      .map((card) => card.id)
      .filter((id) => selectedBombcardIds.includes(id));
    if (!deck || ids.length === 0) return;
    requestDeleteConfirmation({
      title: `Delete ${ids.length} Bombcard${ids.length === 1 ? "" : "s"}?`,
      message: `The selected Bombcards will be permanently removed from ${deck.code || deck.title}. This cannot be undone.`,
      confirmLabel: `Delete ${ids.length} card${ids.length === 1 ? "" : "s"}`,
      action: async () => {
        try {
          await CSM.api("cards/bulk-delete", "POST", {
            deckId: deck.id,
            ids,
          });
          setRevealedLibraryCards((current) =>
            current.filter((id) => !ids.includes(id)),
          );
          setSelectedBombcardIds([]);
          setBulkDeleteMode(false);
          await refreshWorkspace();
        } catch (error) {
          triggerToast(error.message);
          return;
        }
        triggerToast(
          `${ids.length} Bombcard${ids.length === 1 ? "" : "s"} deleted`,
        );
        showChangeConfirmation(
          "Bombcards deleted",
          `${ids.length} selected Bombcard${ids.length === 1 ? " was" : "s were"} removed from this reviewer.`,
        );
      },
    });
  };
  const handleOpenDeckStudy = (deck, mode = "flashcards") => {
    if (isGuest && (mode === "game" || mode === "arena")) {
      setGuestLockedSection("arena");
      return;
    }
    setSelectedDeckIds([deck.id]);
    recordActivity({
      material: deck.code || deck.title,
      mode: mode === "game" ? "BombStyle quiz" : "Flashcards",
      deckId: deck.id,
      screen: mode,
      status: "In progress",
    });
    setActiveTab(mode);
  };
  const handleOpenDocument = (deck, document, { silent = false } = {}) => {
    setSelectedDeckIds([deck.id]);
    setActiveDocument({
      ...document,
      deckId: deck.id,
    });
    setHighlights([]);
    setPdfPage(1);
    setPdfPageCount(0);
    setPdfSelection(null);
    setPdfCardComposerOpen(false);
    setPdfCounterpart("");
    setPdfZoom(1.0);
    setPdfSearchQuery("");
    setPdfSearchResults([]);
    setPdfSearchOpen(false);
    setWorkspaceSidebarTab("flashcards");
    setAiAssistantResponse(null);
    if (!isGuest) {
      CSM.api("highlights&documentId=" + encodeURIComponent(document.id))
        .then(setHighlights)
        .catch((error) => triggerToast(error.message));
      // Restore last viewed reading page
      CSM.api("documents/page&documentId=" + encodeURIComponent(document.id))
        .then((res) => {
          const hasUrlPage =
            requestedPdfDocumentId === String(document.id) &&
            requestedPdfPage !== null;
          if (!hasUrlPage && res?.last_page && Number(res.last_page) > 1) {
            setPdfPage((current) =>
              current === 1 ? Number(res.last_page) : current,
            );
          }
        })
        .catch(() => {});
      // Load document notes
      setDocumentNotesLoading(true);
      CSM.api("document-notes&documentId=" + encodeURIComponent(document.id))
        .then((res) => setDocumentNotes(res?.notes || []))
        .catch((err) => console.warn(err))
        .finally(() => setDocumentNotesLoading(false));
      // Load study flashcard decks
      CSM.api("study-decks&documentId=" + encodeURIComponent(document.id))
        .then((res) => {
          const list = res?.decks || [];
          setStudyDecks(list);
          if (list.length > 0) {
            setActiveStudyDeckId(list[0].id);
          } else {
            const defaultTitle = `${document.title.replace(/\.[^/.]+$/, "")} Flashcards`;
            CSM.api("study-decks", "POST", {
              title: defaultTitle,
              description: `Study flashcards for ${document.title}`,
              documentId: document.id,
            })
              .then((created) => {
                setStudyDecks([created]);
                setActiveStudyDeckId(created.id);
              })
              .catch(() => {});
          }
        })
        .catch((err) => console.warn(err));
    }
    if (!silent)
      recordActivity({
        material: document.title,
        mode: "PDF Tools",
        deckId: deck.id,
        screen: "highlighter",
        status: "In progress",
      });
    setActiveTab("highlighter");
    if (!silent) triggerToast(`Opening "${document.title}"...`);
  };
  const activeDocumentDeck =
    decks.find((deck) => String(deck.id) === String(activeDocument?.deckId)) ||
    (String(sharedDeck?.id) === String(activeDocument?.deckId)
      ? sharedDeck
      : null);
  const handleBackToDocumentLibrary = () => {
    if (activeDocumentDeck) setSelectedDeckForFolderView(activeDocumentDeck);
    setLibraryReturnFromPdf(true);
    setActiveTab("library");
  };
  useEffect(() => {
    if (
      pdfRestoreAttemptedRef.current ||
      activeTab !== "highlighter" ||
      !requestedPdfDocumentId ||
      !decks.length
    )
      return;
    const match = decks
      .flatMap((deck) =>
        (deck.documents || []).map((document) => ({
          deck,
          document,
        })),
      )
      .find(
        (item) => String(item.document.id) === String(requestedPdfDocumentId),
      );
    if (!match) return;
    pdfRestoreAttemptedRef.current = true;
    handleOpenDocument(match.deck, match.document, {
      silent: true,
    });
    if (requestedPdfPage) setPdfPage(requestedPdfPage);
  }, [activeTab, decks]);
  const handleOpenAccount = () => {
    setSelectedDeckForFolderView(null);
    setAccountSection("profile");
    setActiveTab("account");
  };
  const handleOpenLibrary = () => {
    recordActivity({
      material: "Reviewer Library",
      mode: "Library overview",
      screen: "library",
      status: "Viewed",
    });
    setSelectedDeckForFolderView(null);
    setActiveTab("library");
  };
  const handleOpenGameMode = (preselectedDeckId = null) => {
    if (isGuest) {
      setGuestLockedSection("arena");
      return;
    }
    if (preselectedDeckId) {
      setBombstyleDeckId(preselectedDeckId);
      setBombstylePhase("configure");
    } else {
      setBombstylePhase("select_deck");
    }
    recordActivity({
      material: "Bombstyle Challenge",
      mode: "Pressure Recall",
      deckId: preselectedDeckId || null,
      screen: "arena",
      status: "Viewed",
    });
    setActiveTab("arena");
  };
  const toggleLibraryCardAnswer = (cardId) => {
    setRevealedLibraryCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId],
    );
  };
  const archiveFolder = async (deckId, name) => {
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    try {
      await CSM.api("decks", "DELETE", {
        id: deckId,
      });
      await refreshWorkspace();
    } catch (error) {
      triggerToast(error.message);
      return;
    }
    setSelectedDeckIds((prev) => prev.filter((id) => id !== deckId));
    if (selectedDeckForFolderView && selectedDeckForFolderView.id === deckId) {
      setSelectedDeckForFolderView(null);
    }
    setDeleteDeckTarget(null);
    triggerToast(`Moved "${name}" to your archive`);
    showChangeConfirmation(
      "Deck archived",
      `“${name}” and its materials are in your archive. You can restore it later.`,
    );
  };
  const confirmDeleteFolder = () => {
    if (!deleteDeckTarget) return;
    const deckId = deleteDeckTarget.id;
    const name = deleteDeckTarget.code || deleteDeckTarget.title || "this deck";
    setDeleteDeckTarget(null);
    requestDeleteConfirmation({
      title: `Move “${name}” to your archive?`,
      message:
        "The deck and its PDFs will be hidden from your library. You can restore them from Archive later.",
      confirmLabel: "Move to archive",
      action: () => archiveFolder(deckId, name),
    });
  };
  // Filtered Decks for Library
  const visibleDecks = useMemo(() => {
    return decks.filter((d) => {
      const q = searchQuery.toLowerCase();
      const matchesSubject =
        librarySubjectFilter === "All subjects" ||
        (d.subject || "Information Technology") === librarySubjectFilter;
      return (
        matchesSubject &&
        ((d.title || "").toLowerCase().includes(q) ||
          (d.code || "").toLowerCase().includes(q) ||
          (d.subject || "").toLowerCase().includes(q))
      );
    });
  }, [decks, searchQuery, librarySubjectFilter]);
  const librarySubjectOptions = useMemo(() => {
    return [
      "All subjects",
      ...Array.from(
        new Set(decks.map((deck) => deck.subject || "Information Technology")),
      ),
    ];
  }, [decks]);
  const recentDecks = useMemo(() => {
    return visibleDecks.filter(
      (d) => d.section === "recent" || d.id === "deck-2",
    );
  }, [visibleDecks]);
  const olderDecks = useMemo(() => {
    return visibleDecks.filter(
      (d) =>
        d.section === "older" || (d.id !== "deck-2" && d.section !== "recent"),
    );
  }, [visibleDecks]);
  const orderedLibraryDecks = useMemo(
    () => [...recentDecks, ...olderDecks],
    [recentDecks, olderDecks],
  );
  const libraryPageCount = Math.max(
    1,
    Math.ceil(orderedLibraryDecks.length / 9),
  );
  const pageDecks = useMemo(
    () => orderedLibraryDecks.slice((libraryPage - 1) * 9, libraryPage * 9),
    [orderedLibraryDecks, libraryPage],
  );
  const pageRecentDecks = pageDecks.filter(
    (deck) => deck.section === "recent" || deck.id === "deck-2",
  );
  const pageOlderDecks = pageDecks.filter(
    (deck) =>
      deck.section === "older" ||
      (deck.id !== "deck-2" && deck.section !== "recent"),
  );
  useEffect(() => {
    if (libraryPage > libraryPageCount) setLibraryPage(libraryPageCount);
  }, [libraryPage, libraryPageCount]);

  // (Old game lobby summary helpers removed for Bombstyle)

  // Keep existing action handlers compatible without showing floating status toasts.
  const triggerToast = () => {};
  const showChangeConfirmation = (title, message) => {
    setChangeConfirmation({
      title,
      message,
    });
  };
  const persistProfile = async (nextProfile) => {
    try {
      const saved = await CSM.api("profile", "PATCH", {
        displayName: nextProfile.displayName,
        avatar: nextProfile.avatar,
      });
      setProfile(saved);
      return saved;
    } catch (error) {
      triggerToast(error.message);
      return null;
    }
  };
  const handleSaveDisplayName = async (event) => {
    event.preventDefault();
    const nextName = profileNameDraft.trim();
    if (!nextName) {
      triggerToast("Please enter a display name");
      return;
    }
    if (nameCooldownRemaining > 0) {
      triggerToast(
        `You can change your display name again in ${nameCooldownDays} day${nameCooldownDays === 1 ? "" : "s"}`,
      );
      return;
    }
    if (nextName === displayName) {
      triggerToast("Your display name is already up to date");
      return;
    }
    if (
      !(await persistProfile({
        ...profile,
        displayName: nextName,
      }))
    )
      return;
    showChangeConfirmation(
      "Display name updated",
      `Your name is now "${nextName}". You can change it again in 7 days.`,
    );
  };
  const handleChooseAvatar = async (avatarId) => {
    if (avatarId === profile.avatar) return;
    const avatar = avatarOptions.find((item) => item.id === avatarId);
    if (
      !(await persistProfile({
        ...profile,
        avatar: avatarId,
      }))
    )
      return;
    showChangeConfirmation(
      "Avatar updated",
      `${avatar?.label || "Your new avatar"} is now set on your profile.`,
    );
  };
  const handleProfileDeckVisibility = async (event) => {
    const deckVisibility = event.target.value;
    setPrivacySaveStatus("Saving…");
    try {
      const saved = await CSM.api("profile", "PATCH", {
        deckVisibility,
      });
      setProfile(saved);
      setPrivacySaveStatus(
        `Your default deck visibility is ${deckVisibility}.`,
      );
    } catch (error) {
      setPrivacySaveStatus(error.message || "Could not save this setting.");
    }
  };
  const handleDeckVisibility = async (deck, visibility) => {
    setDeckVisibilitySaving(true);
    setDeckVisibilityNotice(null);
    const showDeckVisibilityNotice = (notice) => {
      setDeckVisibilityNotice(notice);
      window.clearTimeout(deckVisibilityNoticeTimerRef.current);
      deckVisibilityNoticeTimerRef.current = window.setTimeout(
        () => setDeckVisibilityNotice(null),
        3600,
      );
    };
    try {
      await CSM.api("decks", "PATCH", {
        id: deck.id,
        title: deck.title || deck.code,
        subject: deck.subject || "",
        category: deck.category || "Recent",
        visibility,
      });
      await refreshWorkspace();
      const effectiveVisibility =
        visibility === "inherit"
          ? profile.deckVisibility || "private"
          : visibility;
      const message =
        visibility === "inherit"
          ? `Your deck now follows your profile default (${effectiveVisibility}).`
          : `Your deck is now ${effectiveVisibility}.`;
      showDeckVisibilityNotice({
        message,
        isError: false,
      });
    } catch (error) {
      showDeckVisibilityNotice({
        message: error.message || "Could not save deck visibility.",
        isError: true,
      });
    } finally {
      setDeckVisibilitySaving(false);
    }
  };
  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (newPasswordDraft.length < 8 || newPasswordDraft.length > 72)
      return triggerToast("Use a password between 8 and 72 characters.");
    if (newPasswordDraft !== confirmPasswordDraft)
      return setPasswordErrorModal({
        title: "Passwords don’t match",
        message:
          "The new password and confirmation are different. Check both fields and try again.",
      });
    try {
      await CSM.api("auth/password", "POST", {
        currentPassword: currentPasswordDraft,
        newPassword: newPasswordDraft,
      });
      setPasswordResetModalOpen(false);
      setCurrentPasswordDraft("");
      setNewPasswordDraft("");
      setConfirmPasswordDraft("");
      triggerToast("Password updated.");
    } catch (error) {
      if (/current password.*incorrect/i.test(error.message || "")) {
        setPasswordErrorModal({
          title: "Current password is incorrect",
          message:
            "That doesn’t match your current password. Check it and try again.",
        });
      } else triggerToast(error.message);
    }
  };
  useEffect(() => {
    if (!bombstyleExitModalOpen) return;
    const handleExitModalKeyDown = (event) => {
      if (event.key === "Escape") resumeBombstyleSession();
    };
    document.addEventListener("keydown", handleExitModalKeyDown);
    return () =>
      document.removeEventListener("keydown", handleExitModalKeyDown);
  }, [bombstyleExitModalOpen]);
  useEffect(() => {
    const handleArenaEscape = (event) => {
      if (event.key !== "Escape" || bombstyleExitModalOpen) return;
      if (
        activeTab !== "arena" ||
        !["countdown", "gameplay"].includes(bombstylePhase)
      )
        return;
      event.preventDefault();
      requestBombstyleExit();
    };
    document.addEventListener("keydown", handleArenaEscape);
    return () => document.removeEventListener("keydown", handleArenaEscape);
  }, [activeTab, bombstylePhase, bombstyleExitModalOpen]);
  const requestDeleteConfirmation = ({
    title,
    message,
    confirmLabel = "Delete",
    kicker = "CONFIRM DELETION",
    icon = "delete",
    action,
  }) => {
    setDeleteConfirmation({
      title,
      message,
      confirmLabel,
      kicker,
      icon,
      action,
    });
  };
  const handleResetDeckProgress = (deck, event) => {
    event?.stopPropagation();
    setOpenDeckMenuId(null);
    const deckName = deck.code || deck.title;
    const hasProgress = studyProgress.some(
      (progress) => String(progress.deck_id) === String(deck.id),
    );
    if (!hasProgress) {
      setMasteryProgressNotice({
        id: Date.now(),
        message: "Progress is already empty. There is nothing to reset.",
      });
      return;
    }
    requestDeleteConfirmation({
      kicker: "RESET DECK PROGRESS",
      icon: "reset",
      title: `Reset progress for ${deckName}?`,
      message:
        "This clears known/mastery progress for every Bombcard in this deck. Your cards and Challenge session history will remain.",
      confirmLabel: "Reset progress",
      action: async () => {
        try {
          const result = await CSM.api("study/progress", "DELETE", {
            deckId: deck.id,
          });
          if (!Number(result.deleted)) {
            setMasteryProgressNotice({
              id: Date.now(),
              message: "Progress is already empty. There is nothing to reset.",
            });
            return;
          }
          setStudyProgress((current) =>
            current.filter(
              (progress) => String(progress.deck_id) !== String(deck.id),
            ),
          );
          triggerToast(`Progress for ${deckName} has been reset.`);
        } catch (error) {
          setMasteryProgressNotice({
            id: Date.now(),
            message: error.message || "Could not reset deck progress.",
          });
        }
      },
    });
  };
  const confirmDeleteAction = () => {
    if (!deleteConfirmation) return;
    const action = deleteConfirmation.action;
    setDeleteConfirmation(null);
    if (action) action();
  };
  const handleClearHighlights = () => {
    if (!highlights.length) {
      triggerToast("There are no highlights to clear");
      return;
    }
    requestDeleteConfirmation({
      title: "Clear all highlights?",
      message:
        "This will remove every saved highlight from the current study page.",
      confirmLabel: "Clear highlights",
      action: () => {
        CSM.api("highlights", "DELETE", {
          documentId: activeDocument?.id,
        })
          .then(() => {
            setHighlights([]);
            showChangeConfirmation(
              "Highlights cleared",
              "All saved highlights were removed from this study page.",
            );
          })
          .catch((error) => triggerToast(error.message));
      },
    });
  };
  const handleRemoveHighlight = (highlightId) => {
    const highlight = highlights.find((item) => item.id === highlightId);
    requestDeleteConfirmation({
      title: "Delete this highlight?",
      message: `The saved note${highlight?.text ? ` “${highlight.text}”` : ""} will be removed.`,
      confirmLabel: "Delete highlight",
      action: () => {
        CSM.api("highlights", "DELETE", {
          documentId: activeDocument?.id,
          id: highlightId,
        })
          .then(() => {
            setHighlights((list) =>
              list.filter((note) => note.id !== highlightId),
            );
            showChangeConfirmation(
              "Highlight deleted",
              "The saved highlight was removed.",
            );
          })
          .catch((error) => triggerToast(error.message));
      },
    });
  };
  const handlePdfTextSelection = (selection) => {
    setPdfSelection(selection);
    setPdfSelectionRole("question");
    setPdfCounterpart("");
    setPdfCardComposerOpen(false);
  };
  const savePdfSelection = async (explicitColor = null) => {
    if (!activeDocument || !pdfSelection)
      return triggerToast("Select some PDF text first.");
    const colorToUse = explicitColor || highlightColor;
    setPdfSaving(true);
    try {
      const note = await CSM.api("highlights", "POST", {
        documentId: activeDocument.id,
        text: pdfSelection.text,
        page: pdfSelection.page,
        color: colorToUse,
        purpose: "note",
        selection: pdfSelection.selection,
      });
      setHighlights((items) => [...items, note]);
      setPdfSelection(null);
      setPdfCardComposerOpen(false);
      window.getSelection()?.removeAllRanges();
      triggerToast("Magic Marker highlight saved.");
    } catch (error) {
      triggerToast(error.message);
    } finally {
      setPdfSaving(false);
    }
  };
  const createPdfBombcard = async () => {
    if (!activeDocument || !pdfSelection)
      return triggerToast("Select some PDF text first.");
    if (!pdfCounterpart.trim())
      return triggerToast(
        pdfSelectionRole === "question"
          ? "Add the answer for this question."
          : "Add the question for this answer.",
      );
    setPdfSaving(true);
    try {
      const result = await CSM.api("highlights/card", "POST", {
        documentId: activeDocument.id,
        text: pdfSelection.text,
        page: pdfSelection.page,
        color: highlightColor,
        purpose: pdfSelectionRole,
        selection: pdfSelection.selection,
        counterpart: pdfCounterpart.trim(),
      });
      setHighlights((items) => [...items, result.highlight]);
      setPdfSelection(null);
      setPdfCardComposerOpen(false);
      setPdfCounterpart("");
      window.getSelection()?.removeAllRanges();
      try {
        await refreshWorkspace();
      } catch (refreshError) {
        console.warn(
          "The new Bombcard was saved, but the reviewer list could not refresh:",
          refreshError,
        );
      }
      const reviewerName =
        decks.find((deck) => deck.id === activeDocument.deckId)?.title ||
        "your reviewer";
      triggerToast(`Bombcard created in ${reviewerName}.`);
    } catch (error) {
      triggerToast(error.message);
    } finally {
      setPdfSaving(false);
    }
  };

  // ========================================================
  // 5. LIBRARY WORKSHOP ACTIONS (Pure Authoring & Editing)
  // ========================================================
  // Add Material Popup Actions (VAIA Hierarchy + CSM Design Premise)
  const handleOpenAddMaterialPopup = (deck, e) => {
    if (e) e.stopPropagation();
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    setTargetDeckForAddMaterial(deck);
    setIsAddMaterialPopupOpen(true);
  };
  const handleOpenCreateBombcardsPopup = (deck, e) => {
    if (e) e.stopPropagation();
    if (isGuest) {
      setGuestLockedSection("creator");
      return;
    }
    setTargetDeckForCreateBombcards(deck || currentSelectedDeck || decks[0]);
    setIsCreateBombcardsPopupOpen(true);
  };
  const handleAddMaterialDirectUpload = async (filesToUpload) => {
    const files = Array.from(filesToUpload || []).filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (files.length === 0) {
      triggerToast("Please upload PDF files");
      return;
    }
    const target = targetDeckForAddMaterial || currentSelectedDeck;
    if (!target) return;
    try {
      for (const file of files) await CSM.upload(target.id, file);
      await refreshWorkspace();
    } catch (error) {
      triggerToast(error.message);
      return;
    }
    triggerToast(
      `Uploaded ${files.length} document${files.length > 1 ? "s" : ""} to ${target.code || target.title}`,
    );
    showChangeConfirmation(
      "PDF uploaded",
      `${files.length} document${files.length > 1 ? "s were" : " was"} added to "${target.code || target.title}".`,
    );
    setIsAddMaterialPopupOpen(false);
    if (addMaterialFileInputRef.current)
      addMaterialFileInputRef.current.value = "";
  };
  const handleChooseManualCreation = () => {
    prepareNewBombcard();
    const target =
      targetDeckForCreateBombcards ||
      targetDeckForAddMaterial ||
      currentSelectedDeck ||
      decks[0];
    if (target) {
      setSelectedDeckIds([target.id]);
      setCreatorTargetDeckId(target.id);
    }
    setIsAddMaterialPopupOpen(false);
    setIsCreateBombcardsPopupOpen(false);
    setActiveTab("creator");
  };
  const handleChooseAiCreation = () => {
    const target =
      targetDeckForCreateBombcards ||
      currentSelectedDeck ||
      targetDeckForAddMaterial ||
      decks[0];
    setIsCreateBombcardsPopupOpen(false);
    handleOpenAiGenerator(target?.id);
  };
  const handlePdfUpload = (e) => {
    const files = Array.from(e.target.files || []).filter(
      (f) =>
        f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
    );
    if (files.length === 0) return;
    const newDocs = files.map((file) => ({
      id:
        "doc-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      title: file.name,
      file,
    }));
    setEditorDocuments((prev) => [...prev, ...newDocs]);
    triggerToast(
      `Imported ${files.length} PDF file${files.length > 1 ? "s" : ""}`,
    );
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };
  const handleRemoveDocFromEditor = (docId) => {
    const document = editorDocuments.find((item) => item.id === docId);
    requestDeleteConfirmation({
      title: `Remove "${document?.title || "this PDF"}"?`,
      message: "This document will be removed from the current reviewer draft.",
      confirmLabel: "Remove PDF",
      action: () => {
        setEditorDocuments((prev) => prev.filter((d) => d.id !== docId));
        triggerToast("PDF removed from the draft");
      },
    });
  };
  const handleShareDeck = async (deck, e) => {
    if (e) e.stopPropagation();
    setOpenDeckMenuId(null);
    setShareDeckTarget(deck);
    setShareModalLoading(false);
    setShareModalError("");
    setShareModalCopied(false);
    if (isGuest) {
      const shareUrl = deck?.share?.url || window.location.href;
      setShareModalData({
        isShared: true,
        isActive: true,
        token: deck?.share?.token || "",
        url: shareUrl,
      });
      return;
    }
    setShareModalLoading(true);
    setShareModalData(null);
    try {
      const result = await CSM.api("decks/share", "POST", {
        deckId: deck.id,
        action: "create",
      });
      setShareModalData(result);
      setDecks((prev) =>
        prev.map((d) =>
          d.id === deck.id
            ? {
                ...d,
                share: {
                  token: result.token,
                  isActive: result.isActive,
                  url: result.url,
                },
              }
            : d,
        ),
      );
    } catch (err) {
      setShareModalError(err.message || "Could not generate share link.");
    } finally {
      setShareModalLoading(false);
    }
  };
  const handleToggleShareActive = async (active) => {
    if (!shareDeckTarget) return;
    setShareModalLoading(true);
    setShareModalError("");
    try {
      const result = await CSM.api("decks/share", "POST", {
        deckId: shareDeckTarget.id,
        action: "toggle",
        active,
      });
      setShareModalData((prev) => ({
        ...prev,
        isActive: result.isActive,
        url: result.url,
        isShared: true,
      }));
      setDecks((prev) =>
        prev.map((d) =>
          d.id === shareDeckTarget.id
            ? {
                ...d,
                share: {
                  token: result.token,
                  isActive: result.isActive,
                  url: result.url,
                },
              }
            : d,
        ),
      );
      triggerToast(active ? "Share link enabled" : "Share link disabled");
    } catch (err) {
      setShareModalError(err.message || "Could not update share link.");
    } finally {
      setShareModalLoading(false);
    }
  };
  const handleRegenerateShareLink = async () => {
    if (!shareDeckTarget) return;
    setShareModalLoading(true);
    setShareModalError("");
    setShareModalCopied(false);
    try {
      const result = await CSM.api("decks/share", "POST", {
        deckId: shareDeckTarget.id,
        action: "regenerate",
      });
      setShareModalData(result);
      setDecks((prev) =>
        prev.map((d) =>
          d.id === shareDeckTarget.id
            ? {
                ...d,
                share: {
                  token: result.token,
                  isActive: result.isActive,
                  url: result.url,
                },
              }
            : d,
        ),
      );
      triggerToast("New share link generated");
    } catch (err) {
      setShareModalError(err.message || "Could not regenerate share link.");
    } finally {
      setShareModalLoading(false);
    }
  };
  const handleCopyShareUrl = () => {
    if (!shareModalData?.url) return;
    navigator.clipboard?.writeText(shareModalData.url);
    setShareModalCopied(true);
    triggerToast("Share link copied to clipboard!");
    setTimeout(() => setShareModalCopied(false), 2500);
  };
  const resetNewQForm = () => {
    setNewQPrompt("");
    setNewQHint("");
    setNewQOptions(["", "", "", ""]);
    setNewQCorrectIndex(0);
    setNewQAnswer("");
    setNewQAlternates("");
  };
  const handleAddQuestionToEditor = (e) => {
    e.preventDefault();
    if (!newQPrompt.trim()) return;
    if (newQType === "TRUE_FALSE" && !newQAnswer.trim()) {
      triggerToast("Choose True or False before appending this card.");
      return;
    }
    let cardObj = {
      id: "card-" + Date.now(),
      type: newQType,
      prompt: newQPrompt.trim(),
      hint:
        newQHint.trim() ||
        (newQType === "MULTIPLE_CHOICE"
          ? "Knowledge Check"
          : newQType === "TRUE_FALSE"
            ? "True / False"
            : "Identification"),
    };
    if (newQType === "MULTIPLE_CHOICE") {
      const filledOptions = newQOptions.map(
        (opt, i) => opt.trim() || `Option ${i + 1}`,
      );
      cardObj.options = filledOptions;
      cardObj.correctIndex = newQCorrectIndex;
      cardObj.correctAnswer = filledOptions[newQCorrectIndex];
    } else if (newQType === "TRUE_FALSE") {
      cardObj.options = ["True", "False"];
      cardObj.correctIndex =
        newQAnswer.trim().toLowerCase() === "false" ? 1 : 0;
      cardObj.correctAnswer = newQAnswer.trim() || "True";
    } else {
      cardObj.correctAnswer = newQAnswer.trim() || "Answer";
      cardObj.alternates =
        newQAlternates.trim() || cardObj.correctAnswer.toLowerCase();
    }
    setEditorCards((prev) => [...prev, cardObj]);
    resetNewQForm();
    triggerToast("BombCard appended to deck list");
  };
  const handleRemoveCardFromEditor = (cardId) => {
    const card = editorCards.find((item) => item.id === cardId);
    requestDeleteConfirmation({
      title: "Delete this Bombcard?",
      message: `This ${card?.type === "MULTIPLE_CHOICE" ? "multiple-choice" : card?.type === "TRUE_FALSE" ? "true/false" : "identification"} card will be removed from the current draft.`,
      confirmLabel: "Delete card",
      action: () => {
        setEditorCards((prev) => prev.filter((c) => c.id !== cardId));
        triggerToast("Bombcard removed from the draft");
      },
    });
  };
  const handleSaveDeck = async () => {
    const title = canonicalDeckTitle(
      editorTitle || editorCode || "New Reviewer",
    );
    const originalTitleKey = editingDeck
      ? deckTitleKey(editingDeck.title || editingDeck.code)
      : "";
    if (
      (!editingDeck || deckTitleKey(title) !== originalTitleKey) &&
      decks.some(
        (deck) =>
          deck.id !== editingDeck?.id &&
          deckTitleKey(deck.title || deck.code) === deckTitleKey(title),
      )
    ) {
      triggerToast("A deck with this title already exists.");
      return;
    }
    try {
      const saved = await CSM.api("decks", editingDeck ? "PATCH" : "POST", {
        ...(editingDeck
          ? {
              id: editingDeck.id,
            }
          : {}),
        title,
        subject: editorSubject || "Information Technology",
        category: editingDeck?.category || "Recent",
        cards: editorCards,
      });
      const savedDocs = new Set(
        editorDocuments.filter((doc) => !doc.file).map((doc) => doc.id),
      );
      if (editingDeck)
        for (const doc of editingDeck.documents || []) {
          if (!savedDocs.has(doc.id))
            await CSM.api("documents", "DELETE", {
              id: doc.id,
            });
        }
      for (const doc of editorDocuments)
        if (doc.file) await CSM.upload(saved.id, doc.file);
      await refreshWorkspace();
      triggerToast(
        editingDeck
          ? `Saved materials for "${title}"`
          : "Created new reviewer materials",
      );
      showChangeConfirmation(
        editingDeck ? "Materials saved" : "Reviewer created",
        `"${title}" is ready for your study materials.`,
      );
      setIsDeckEditorOpen(false);
    } catch (error) {
      triggerToast(error.message);
    }
  };

  // ========================================================
  // 6. BOMBSTYLE ARENA GAME ENGINE
  // ========================================================
  const bombstyleTimerRef = useRef(null);
  const bombstyleCountdownTimerRef = useRef(null);
  const bombstylePendingStartRef = useRef(null);
  const bombstyleCountdownStartedRef = useRef(false);
  const bombstyleDeadlineRef = useRef(null);
  const bombstyleAnswerSubmittedRef = useRef(false);
  const bombstyleWrongFeedbackTimerRef = useRef(null);
  const bombstyleTimeoutStartedRef = useRef(false);
  const bombstyleActiveDeck = useMemo(() => {
    return (
      decks.find((d) => d.id === bombstyleDeckId) ||
      (publicArenaDeck?.id === bombstyleDeckId ? publicArenaDeck : null) ||
      decks[0]
    );
  }, [decks, bombstyleDeckId, publicArenaDeck]);
  const arenaDeckChoices = useMemo(() => {
    if (
      !publicArenaDeck ||
      decks.some((deck) => deck.id === publicArenaDeck.id)
    )
      return decks;
    return [...decks, publicArenaDeck];
  }, [decks, publicArenaDeck]);
  const bombstyleAvailableCards = useMemo(() => {
    return bombstyleActiveDeck?.cards || [];
  }, [bombstyleActiveDeck]);
  const activeBombstyleCard = bombstyleQueue[bombstyleIndex] || null;
  const BOMBSTYLE_DIFFICULTIES = {
    easy: {
      label: "Easy",
      seconds: 60,
      timeLabel: "1 minute",
    },
    normal: {
      label: "Normal",
      seconds: 45,
      timeLabel: "45 seconds",
    },
    hard: {
      label: "Hard",
      seconds: 30,
      timeLabel: "30 seconds",
    },
  };
  const selectedBombstyleDifficulty =
    BOMBSTYLE_DIFFICULTIES[bombstyleDifficulty] ||
    BOMBSTYLE_DIFFICULTIES.normal;
  const isBombExploded = bombstyleFeedback === "exploded";
  const isBombWrong = bombstyleFeedback === "wrong";
  const isBombDanger =
    bombstyleTimeRemaining <= 5.0 &&
    bombstylePhase === "gameplay" &&
    !bombstyleFeedback;
  const isBombStartled =
    bombstyleTimeRemaining <= 10.0 &&
    bombstylePhase === "gameplay" &&
    !bombstyleFeedback;
  const isBombWorried =
    !isBombStartled &&
    bombstyleTimeRemaining <= selectedBombstyleDifficulty.seconds / 2 &&
    bombstylePhase === "gameplay" &&
    !bombstyleFeedback;
  const bombTimerPercent = Math.max(
    0,
    Math.min(
      100,
      (bombstyleTimeRemaining / (selectedBombstyleDifficulty.seconds || 45)) *
        100,
    ),
  );
  const handleSelectBombstyleDeck = (deckId) => {
    setBombstyleDeckId(deckId);
    setBombstylePhase("configure");
  };
  const setBombstyleClock = (remainingMs) => {
    const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
    bombstyleDeadlineRef.current = Date.now() + safeRemainingMs;
    setBombstyleTimeRemaining(safeRemainingMs / 1000);
  };
  const constrainBombstyleClock = (remainingMs) => {
    const safeRemainingMs = Math.max(0, Number(remainingMs) || 0);
    const localDeadline =
      typeof bombstyleDeadlineRef.current === "number"
        ? bombstyleDeadlineRef.current
        : Date.now() + Math.max(0, bombstyleTimeRemaining * 1000);
    // Server resyncs can correct a clock down, but must never add time back.
    bombstyleDeadlineRef.current = Math.min(
      localDeadline,
      Date.now() + safeRemainingMs,
    );
    setBombstyleTimeRemaining(
      Math.max(0, bombstyleDeadlineRef.current - Date.now()) / 1000,
    );
  };
  const currentBombstyleRemainingMs = () => {
    if (typeof bombstyleDeadlineRef.current === "number") {
      return Math.max(0, bombstyleDeadlineRef.current - Date.now());
    }
    return Math.max(0, bombstyleTimeRemaining * 1000);
  };
  const openBombstyleExitConfirmation = () => {
    setBombstyleExitModalOpen(true);
    // The exit dialog is only a confirmation layer; it must never pause or reset the round clock.
    const sessionId = bombstyleSessionId;
    if (
      activeTab === "arena" &&
      bombstylePhase === "gameplay" &&
      !isGuest &&
      sessionId
    ) {
      CSM.api("arena/session&id=" + encodeURIComponent(sessionId))
        .then(async (session) => {
          if (
            bombstyleSessionId !== sessionId ||
            activeTab !== "arena" ||
            bombstylePhase !== "gameplay"
          )
            return;
          // Clear legacy pause state, if any, without replacing the continuously running local deadline.
          if (session?.status === "active" && session.paused) {
            session = await CSM.api("arena/resume", "POST", {
              id: sessionId,
            });
          }
          if (
            session?.status === "active" &&
            Number.isFinite(Number(session.remainingMs))
          ) {
            constrainBombstyleClock(session.remainingMs);
          }
        })
        .catch((error) =>
          console.warn("Could not sync the Arena timer:", error),
        );
    }
  };
  const requestBombstyleExit = (afterExit) => {
    const sessionInProgress =
      activeTab === "arena" &&
      ["countdown", "gameplay"].includes(bombstylePhase);
    if (!sessionInProgress) {
      afterExit?.();
      return false;
    }
    pendingBombstyleExitActionRef.current = afterExit || null;
    openBombstyleExitConfirmation();
    return true;
  };
  const resumeBombstyleSession = async () => {
    pendingBombstyleExitActionRef.current = null;
    setBombstyleExitModalOpen(false);
  };
  const handleSetDifficulty = (diff) => {
    if (BOMBSTYLE_DIFFICULTIES[diff]) setBombstyleDifficulty(diff);
  };
  const handleStartBombstyle = (customCardQueue = null) => {
    const deck = bombstyleActiveDeck;
    const cardsToUse = customCardQueue
      ? [...customCardQueue]
      : deck
        ? [...(deck.cards || [])]
        : [];
    if (cardsToUse.length === 0) {
      triggerToast("Selected deck does not contain any Bombcards yet.");
      return;
    }
    if (bombstyleWrongFeedbackTimerRef.current)
      clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    bombstyleTimeoutStartedRef.current = false;
    setBombstyleAnswerError("");
    sound.init();
    bombstyleCountdownStartedRef.current = false;
    setBombstyleCountdown(3);
    bombstylePendingStartRef.current = async () => {
      let queue = cardsToUse;
      if (isGuest) {
        setBombstyleSessionId("guest-session-" + Date.now());
      } else {
        try {
          const session = await CSM.api("arena/start", "POST", {
            deckId: deck.id,
            difficulty: bombstyleDifficulty,
          });
          setBombstyleSessionId(session.id);
          queue = session.queue || queue;
        } catch (error) {
          bombstylePendingStartRef.current = null;
          setBombstylePhase("configure");
          triggerToast(error.message || "Could not start the Challenge session.");
          return;
        }
      }
      setBombstyleQueue(queue);
      setBombstyleIndex(0);
      setBombstyleRevealed(false);
      setBombstyleAnswerDraft("");
      bombstyleAnswerSubmittedRef.current = false;
      setBombstyleClock(selectedBombstyleDifficulty.seconds * 1000);
      setBombstyleStreak(0);
      setBombstyleMaxStreak(0);
      setBombstyleCorrectCount(0);
      setBombstyleMissedCards([]);
      setBombstyleFeedback(null);
      setBombstyleStartTime(Date.now());
      setBombstylePhase("gameplay");
      setActiveTab("arena");
      if (!isGuest)
        refreshWorkspace().catch((error) =>
          console.warn("Could not refresh study activity:", error),
        );
    };
    setBombstylePhase("countdown");
    setActiveTab("arena");
  };
  useEffect(() => {
    if (activeTab !== "arena" || bombstylePhase !== "countdown") {
      if (bombstyleCountdownTimerRef.current)
        clearTimeout(bombstyleCountdownTimerRef.current);
      bombstyleCountdownTimerRef.current = null;
      return;
    }
    if (bombstyleCountdown <= 0) {
      bombstyleCountdownTimerRef.current = null;
      if (bombstyleCountdownStartedRef.current) return;
      bombstyleCountdownStartedRef.current = true;
      sound.whistle();
      const startSession = bombstylePendingStartRef.current;
      bombstylePendingStartRef.current = null;
      if (startSession) startSession();
      return;
    }
    sound.tick();
    bombstyleCountdownTimerRef.current = setTimeout(() => {
      setBombstyleCountdown((count) => count - 1);
    }, 1000);
    return () => {
      if (bombstyleCountdownTimerRef.current)
        clearTimeout(bombstyleCountdownTimerRef.current);
      bombstyleCountdownTimerRef.current = null;
    };
  }, [activeTab, bombstylePhase, bombstyleCountdown]);
  const cancelBombstyleCountdown = () => {
    bombstylePendingStartRef.current = null;
    bombstyleCountdownStartedRef.current = false;
    if (bombstyleCountdownTimerRef.current)
      clearTimeout(bombstyleCountdownTimerRef.current);
    bombstyleCountdownTimerRef.current = null;
    setBombstylePhase("configure");
  };
  useEffect(() => {
    if (isGuest) return;
    CSM.api("arena/active")
      .then(async (session) => {
        if (!session || session.status !== "active") return;
        if (
          session.deckId &&
          !decks.some((deck) => deck.id === session.deckId)
        ) {
          try {
            const result = await CSM.api(
              `people/deck&id=${encodeURIComponent(session.deckId)}`,
            );
            setPublicArenaDeck(result.deck);
          } catch (error) {
            console.warn(
              "Could not restore the shared deck for this Challenge session:",
              error,
            );
          }
        }
        let restoredSession = session;
        // Older sessions may have been paused by an earlier version of the exit dialog.
        if (session.paused) {
          try {
            restoredSession = await CSM.api("arena/resume", "POST", {
              id: session.id,
            });
          } catch (_) {}
        }
        setBombstyleSessionId(restoredSession.id);
        setBombstyleDeckId(restoredSession.deckId);
        setBombstyleDifficulty(restoredSession.difficulty);
        const restoredQueue = restoredSession.queue || [];
        setBombstyleQueue(restoredQueue);
        setBombstyleIndex(restoredSession.index || 0);
        setBombstyleAnswerDraft("");
        setBombstyleRevealed(false);
        const restoredAnswers = (restoredSession.answers || []).map(
          (answer) => ({
            ...(restoredQueue[answer.position] || {}),
            result: answer.result,
          }),
        );
        setBombstyleMissedCards(
          restoredAnswers.filter((answer) => answer.result !== "correct"),
        );
        setBombstyleClock(restoredSession.remainingMs);
        setBombstyleStreak(restoredSession.streak || 0);
        setBombstyleMaxStreak(restoredSession.maxStreak || 0);
        setBombstyleCorrectCount(restoredSession.correct || 0);
        setBombstyleStartTime(Date.now() - (restoredSession.durationMs || 0));
        setBombstylePhase("gameplay");
        setActiveTab("arena");
        setBombstyleExitModalOpen(false);
      })
      .catch((error) =>
        console.warn("Could not restore the active Arena session:", error),
      );
  }, []);

  // Countdown Timer for Bombstyle
  useEffect(() => {
    if (activeTab !== "arena" || bombstylePhase !== "gameplay") {
      if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
      return;
    }
    if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
    const syncLocalClock = () => {
      const remainingMs = currentBombstyleRemainingMs();
      if (remainingMs <= 0) {
        clearInterval(bombstyleTimerRef.current);
        setBombstyleTimeRemaining(0);
        handleBombstyleTimeout();
        return;
      }
      setBombstyleTimeRemaining(remainingMs / 1000);
      if (remainingMs <= 5000 && Math.ceil(remainingMs / 100) % 10 === 0)
        sound.tick();
    };
    const syncVisibleSession = async () => {
      syncLocalClock();
      if (
        document.visibilityState !== "visible" ||
        isGuest ||
        !bombstyleSessionId
      )
        return;
      try {
        let session = await CSM.api("arena/session&id=" + bombstyleSessionId);
        if (session?.status === "active" && session.paused) {
          session = await CSM.api("arena/resume", "POST", {
            id: bombstyleSessionId,
          });
        }
        if (session?.status === "active") {
          constrainBombstyleClock(session.remainingMs);
        } else if (session?.status === "timeout") handleBombstyleTimeout();
        else if (session?.status === "completed") finishBombstyleSession();
      } catch (error) {
        console.warn("Could not resync the Arena clock:", error);
      }
    };
    syncLocalClock();
    bombstyleTimerRef.current = setInterval(syncLocalClock, 100);
    document.addEventListener("visibilitychange", syncVisibleSession);
    window.addEventListener("focus", syncVisibleSession);
    return () => {
      if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
      document.removeEventListener("visibilitychange", syncVisibleSession);
      window.removeEventListener("focus", syncVisibleSession);
    };
  }, [
    activeTab,
    bombstylePhase,
    bombstyleIndex,
    bombstyleFeedback,
    selectedBombstyleDifficulty.seconds,
    bombstyleSessionId,
    isGuest,
  ]);
  const normalizeBombstyleAnswer = (value) =>
    String(value ?? "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  const isBombstyleAnswerCorrect = (answer, card) => {
    const candidate = normalizeBombstyleAnswer(answer);
    const expected = normalizeBombstyleAnswer(card?.correctAnswer);
    if (card?.type === "TRUE_FALSE") return candidate === expected;
    if (card?.type === "MULTIPLE_CHOICE") {
      const option = Array.isArray(card.options)
        ? card.options[Number(card.correctIndex)]
        : "";
      return (
        candidate === expected ||
        (option && candidate === normalizeBombstyleAnswer(option))
      );
    }
    const accepted = [
      card?.correctAnswer,
      ...String(card?.alternates || "").split(/[,;\n]+/),
    ];
    return accepted.some(
      (value) => candidate && candidate === normalizeBombstyleAnswer(value),
    );
  };
  const handleBombstyleAnswer = async (answer) => {
    if (
      bombstyleFeedback ||
      !activeBombstyleCard ||
      bombstyleAnswerSubmittedRef.current
    )
      return;
    const submittedAnswer = String(answer ?? "").trim();
    if (!submittedAnswer) {
      setBombstyleAnswerError("Please enter an answer before submitting.");
      requestAnimationFrame(() => bombstyleAnswerInputRef.current?.focus());
      return;
    }
    setBombstyleAnswerError("");
    bombstyleAnswerSubmittedRef.current = true;
    let serverResult = {
      status: "active",
      remainingMs: 0,
    };
    let isCorrect = false;
    if (isGuest) {
      isCorrect = isBombstyleAnswerCorrect(
        submittedAnswer,
        activeBombstyleCard,
      );
      const delta = isCorrect ? 8 : -5;
      const nextRemainingMs = Math.max(
        0,
        currentBombstyleRemainingMs() + delta * 1000,
      );
      serverResult.remainingMs = nextRemainingMs;
      setBombstyleClock(nextRemainingMs);
    } else {
      try {
        serverResult = await CSM.api("arena/answer", "POST", {
          id: bombstyleSessionId,
          position: bombstyleIndex,
          answer: submittedAnswer,
        });
      } catch (error) {
        bombstyleAnswerSubmittedRef.current = false;
        triggerToast(error.message);
        return;
      }
      isCorrect = serverResult.answerResult === "correct";
      setBombstyleClock(serverResult.remainingMs);
    }
    setBombstyleAnswerDraft(submittedAnswer);
    setBombstyleRevealed(true);
    if (isCorrect) {
      sound.arenaCorrect();
      setBombstyleFeedback("defused");
      const nextStreak = bombstyleStreak + 1;
      setBombstyleStreak(nextStreak);
      if (nextStreak > bombstyleMaxStreak) setBombstyleMaxStreak(nextStreak);
      setBombstyleCorrectCount((c) => c + 1);
      setTimeout(() => advanceBombstyleCard(), 600);
    } else {
      sound.arenaWrong();
      setBombstyleFeedback("wrong");
      setBombstyleStreak(0);
      setBombstyleMissedCards((prev) => [
        ...prev,
        {
          ...activeBombstyleCard,
          resultReason: "did_not_know",
        },
      ]);
      if (bombstyleWrongFeedbackTimerRef.current)
        clearTimeout(bombstyleWrongFeedbackTimerRef.current);
      bombstyleWrongFeedbackTimerRef.current = setTimeout(() => {
        bombstyleWrongFeedbackTimerRef.current = null;
        if (currentBombstyleRemainingMs() <= 0) return;
        advanceBombstyleCard();
      }, 1100);
    }
  };
  const handleBombstyleTimeout = async () => {
    const waitingAfterWrongAnswer = bombstyleFeedback === "wrong";
    if (
      bombstyleTimeoutStartedRef.current ||
      (bombstyleFeedback && !waitingAfterWrongAnswer) ||
      !activeBombstyleCard ||
      (bombstyleAnswerSubmittedRef.current && !waitingAfterWrongAnswer)
    )
      return;
    bombstyleTimeoutStartedRef.current = true;
    if (bombstyleWrongFeedbackTimerRef.current)
      clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    bombstyleAnswerSubmittedRef.current = true;
    if (!waitingAfterWrongAnswer) sound.arenaWrong();
    sound.detonation();
    if (!isGuest && bombstyleSessionId) {
      try {
        await CSM.api("arena/session&id=" + bombstyleSessionId);
      } catch (error) {
        console.warn(error);
      }
    }
    setBombstyleFeedback("exploded");
    setBombstyleRevealed(true);
    setBombstyleClock(0);
    setBombstyleStreak(0);
    if (!waitingAfterWrongAnswer)
      setBombstyleMissedCards((prev) => [
        ...prev,
        {
          ...activeBombstyleCard,
          resultReason: "timed_out",
        },
      ]);
    setTimeout(() => {
      finishBombstyleSession();
    }, 1300);
  };
  const advanceBombstyleCard = () => {
    if (bombstyleWrongFeedbackTimerRef.current)
      clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    bombstyleTimeoutStartedRef.current = false;
    setBombstyleFeedback(null);
    setBombstyleRevealed(false);
    setBombstyleAnswerDraft("");
    setBombstyleAnswerError("");
    bombstyleAnswerSubmittedRef.current = false;
    if (bombstyleIndex + 1 < bombstyleQueue.length) {
      setBombstyleIndex((i) => i + 1);
    } else {
      finishBombstyleSession();
    }
  };
  const finishBombstyleSession = () => {
    if (bombstyleTimerRef.current) clearInterval(bombstyleTimerRef.current);
    if (bombstyleWrongFeedbackTimerRef.current)
      clearTimeout(bombstyleWrongFeedbackTimerRef.current);
    bombstyleWrongFeedbackTimerRef.current = null;
    pendingBombstyleExitActionRef.current = null;
    setBombstyleExitModalOpen(false);
    const duration = bombstyleStartTime
      ? Math.round((Date.now() - bombstyleStartTime) / 1000)
      : 0;
    setBombstyleDurationSeconds(duration);
    setBombstyleFeedback(null);
    setBombstylePhase("results");
    refreshWorkspace().catch((error) =>
      console.warn("Could not refresh Arena results:", error),
    );
  };
  const handleStudyMissedDeck = () => {
    setSelectedDeckIds([bombstyleDeckId]);
    setSelectedDeckForFolderView(null);
    setActiveTab("flashcards");
  };

  // Keyboard Controls for Bombstyle & Flashcards
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (activeTab === "arena") {
        if (bombstylePhase === "gameplay" && !bombstyleFeedback) {
          if (e.key === "Escape") {
            openBombstyleExitConfirmation();
            return;
          }
          if (!bombstyleRevealed) {
            if (
              activeBombstyleCard?.type === "TRUE_FALSE" &&
              (e.key === "1" || e.key === "2")
            ) {
              e.preventDefault();
              handleBombstyleAnswer(e.key === "1" ? "True" : "False");
            } else if (
              activeBombstyleCard?.type === "MULTIPLE_CHOICE" &&
              /^[1-8]$/.test(e.key)
            ) {
              e.preventDefault();
              const option = activeBombstyleCard.options?.[Number(e.key) - 1];
              if (option) handleBombstyleAnswer(option);
            }
          }
        }
      }
      if (activeTab === "flashcards") {
        if (flashcardMotionLockRef.current) return;
        if (e.code === "Space") {
          e.preventDefault();
          flipFlashcard();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          navigateFlashcardRef.current?.(-1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          navigateFlashcardRef.current?.(1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    bombstylePhase,
    bombstyleRevealed,
    bombstyleFeedback,
    activeBombstyleCard,
    flashcards.length,
  ]);
  const renderLibraryDeckCard = (deck) => (
    <LibraryDeckCard
      key={deck.id}
      deck={deck}
      onOpen={handleSelectDeckForDetail}
      isGuest={isGuest}
      studyProgress={studyProgress}
      actions={
        <DeckCardActions
          deck={deck}
          handleDeleteFolder={handleDeleteFolder}
          handleOpenEditFolderInfo={handleOpenEditFolderInfo}
          handleResetDeckProgress={handleResetDeckProgress}
          handleShareDeck={handleShareDeck}
          isGuest={isGuest}
          openDeckMenuId={openDeckMenuId}
          setOpenDeckMenuId={setOpenDeckMenuId}
        />
      }
    />
  );
  return (
    <div className="app-shell w-full h-full flex items-stretch overflow-hidden">
      {/* ========================================================
              LEFT CAPSULE SIDEBAR
              ======================================================== */}
      {mobileMenuOpen && (
        <button
          type="button"
          className="csm-mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <Sidebar
        activeDocument={activeDocument}
        activeTab={activeTab}
        decks={decks}
        handleOpenAccount={handleOpenAccount}
        handleOpenAiGenerator={handleOpenAiGenerator}
        handleOpenDocument={handleOpenDocument}
        handleSidebarLockToggle={handleSidebarLockToggle}
        handleSidebarMouseEnter={handleSidebarMouseEnter}
        handleSidebarMouseLeave={handleSidebarMouseLeave}
        isGuest={isGuest}
        isStaff={isStaff}
        libraryNavExpanded={libraryNavExpanded}
        mobileMenuOpen={mobileMenuOpen}
        openAdminAccess={openAdminAccess}
        prepareNewBombcard={prepareNewBombcard}
        profile={profile}
        requestBombstyleExit={requestBombstyleExit}
        setActiveTab={setActiveTab}
        setBombstylePhase={setBombstylePhase}
        setFlashcardFlipped={setFlashcardFlipped}
        setFlashcardIndex={setFlashcardIndex}
        setGuestLockedSection={setGuestLockedSection}
        setMobileMenuOpen={setMobileMenuOpen}
        setSelectedDeckForFolderView={setSelectedDeckForFolderView}
        setSidebarExpanded={setSidebarExpanded}
        sharedDeck={sharedDeck}
        sidebarExpanded={sidebarExpanded}
        sidebarLocked={sidebarLocked}
      />

      {/* ========================================================
              MAIN LIGHT CANVAS SHELL
              ======================================================== */}
      <main className="flex-1 bg-[#f6f8fb] border-l border-[#dce5ee] overflow-hidden flex flex-col relative">
        {masteryProgressNotice && (
          <div
            key={masteryProgressNotice.id}
            className="csm-mastery-progress-toast"
            role="alert"
            aria-live="assertive"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5m0 3h.01" />
            </svg>
            <span>{masteryProgressNotice.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setMasteryProgressNotice(null)}
            >
              ×
            </button>
          </div>
        )}

        {/* Unified fintech-inspired application header - hidden during active arena drill */}
        <WorkspaceHeader
          accountMenuOpen={accountMenuOpen}
          activeTab={activeTab}
          bombstyleActiveDeck={bombstyleActiveDeck}
          bombstylePhase={bombstylePhase}
          currentAvatar={currentAvatar}
          currentSelectedDeck={currentSelectedDeck}
          defaultProfile={defaultProfile}
          displayName={displayName}
          handleOpenAccount={handleOpenAccount}
          isGuest={isGuest}
          isStaff={isStaff}
          mobileMenuOpen={mobileMenuOpen}
          notifications={notifications}
          notificationsOpen={notificationsOpen}
          notificationsUnread={notificationsUnread}
          notificationsWrapRef={notificationsWrapRef}
          profile={profile}
          refreshNotifications={refreshNotifications}
          requestBombstyleExit={requestBombstyleExit}
          requestDeleteConfirmation={requestDeleteConfirmation}
          selectedDeckForFolderView={selectedDeckForFolderView}
          setAccountMenuOpen={setAccountMenuOpen}
          setActiveTab={setActiveTab}
          setBombstylePhase={setBombstylePhase}
          setMobileMenuOpen={setMobileMenuOpen}
          setNotifications={setNotifications}
          setNotificationsOpen={setNotificationsOpen}
          setNotificationsUnread={setNotificationsUnread}
          setSelectedDeckForFolderView={setSelectedDeckForFolderView}
          setSignOutConfirmationOpen={setSignOutConfirmationOpen}
          setSignOutError={setSignOutError}
          sharedDeck={sharedDeck}
          triggerToast={triggerToast}
        />

        {activeTab === "home" && isStaff && (
          <AdminHome profile={profile} onOpenAdmin={openAdminAccess} />
        )}
        {activeTab === "admin" && isStaff && <AdminPanel profile={profile} />}
        {activeTab === "archive" && isStaff && (
          <AdminArchiveScreen profile={profile} />
        )}
        {activeTab === "archive" && !isStaff && !isGuest && (
          <UserArchiveScreen onWorkspaceRefresh={refreshWorkspace} />
        )}
        {activeTab === "people" && !isStaff && !isGuest && (
          <PeopleScreen
            currentUsername={profile.username}
            onPlayDeck={(deck) => {
              setPublicArenaDeck(deck);
              handleOpenGameMode(deck.id);
            }}
          />
        )}

        {/* ========================================================
                VIEW A: HOME DASHBOARD
                ======================================================== */}
        {activeTab === "home" && !isStaff && (
          <DashboardScreen
            accountStats={accountStats}
            activityChartMax={activityChartMax}
            arenaChart={arenaChart}
            arenaSessions={arenaSessions}
            badgesList={badgesList}
            bestStudyStreak={bestStudyStreak}
            currentStudyStreak={currentStudyStreak}
            deckMasteryList={deckMasteryList}
            displayFirstName={displayFirstName}
            formatActivityTime={formatActivityTime}
            formatTrend={formatTrend}
            greeting={greeting}
            handleOpenCreateFolderInfo={handleOpenCreateFolderInfo}
            handleOpenGameMode={handleOpenGameMode}
            handleOpenLibrary={handleOpenLibrary}
            handleShareDeck={handleShareDeck}
            mostRecentDeck={mostRecentDeck}
            openMasteryMenuId={openMasteryMenuId}
            openRecentActivity={openRecentActivity}
            recentActivities={recentActivities}
            requestDeleteConfirmation={requestDeleteConfirmation}
            setActiveTab={setActiveTab}
            setMasteryProgressNotice={setMasteryProgressNotice}
            setOpenMasteryMenuId={setOpenMasteryMenuId}
            setSelectedDeckForFolderView={setSelectedDeckForFolderView}
            setSelectedDeckIds={setSelectedDeckIds}
            setStudyProgress={setStudyProgress}
            studyStreakLost={studyStreakLost}
            todayDayName={todayDayName}
            totalBombCards={totalBombCards}
            totalReviewers={totalReviewers}
            totalWeekActivity={totalWeekActivity}
            triggerToast={triggerToast}
          />
        )}

        {activeTab === "account" && (
          <AccountScreen
            accountSection={accountSection}
            accountSectionDetails={accountSectionDetails}
            avatarOptions={avatarOptions}
            currentAvatar={currentAvatar}
            defaultProfile={defaultProfile}
            displayName={displayName}
            handleChooseAvatar={handleChooseAvatar}
            handleProfileDeckVisibility={handleProfileDeckVisibility}
            handleSaveDisplayName={handleSaveDisplayName}
            nameCooldownDays={nameCooldownDays}
            nameCooldownRemaining={nameCooldownRemaining}
            privacySaveStatus={privacySaveStatus}
            profile={profile}
            profileNameDraft={profileNameDraft}
            setAccountSection={setAccountSection}
            setActiveTab={setActiveTab}
            setPasswordResetModalOpen={setPasswordResetModalOpen}
            setProfileNameDraft={setProfileNameDraft}
            totalBombCards={totalBombCards}
            totalDocuments={totalDocuments}
            totalReviewers={totalReviewers}
            triggerToast={triggerToast}
          />
        )}

        {/* ========================================================
                VIEW B: REVIEWER LIBRARY (Pure Creation & Management)
                ======================================================== */}
        {activeTab === "library" && (
          <LibraryScreen
            bulkDeleteMode={bulkDeleteMode}
            collapseOlder={collapseOlder}
            collapseRecent={collapseRecent}
            currentSelectedDeck={currentSelectedDeck}
            deckVisibilitySaving={deckVisibilitySaving}
            handleBulkRemoveBombcards={handleBulkRemoveBombcards}
            handleDeckVisibility={handleDeckVisibility}
            handleDeleteFolder={handleDeleteFolder}
            handleOpenAddMaterialPopup={handleOpenAddMaterialPopup}
            handleOpenAiGenerator={handleOpenAiGenerator}
            handleOpenCreateBombcardsPopup={handleOpenCreateBombcardsPopup}
            handleOpenCreateFolderInfo={handleOpenCreateFolderInfo}
            handleOpenDeckStudy={handleOpenDeckStudy}
            handleOpenDocument={handleOpenDocument}
            handleOpenEditFolderInfo={handleOpenEditFolderInfo}
            handleRemoveBombcard={handleRemoveBombcard}
            handleRemoveDocument={handleRemoveDocument}
            handleResetDeckProgress={handleResetDeckProgress}
            handleShareDeck={handleShareDeck}
            isGuest={isGuest}
            libraryPage={libraryPage}
            libraryPageCount={libraryPageCount}
            libraryReturnFromPdf={libraryReturnFromPdf}
            librarySubjectFilter={librarySubjectFilter}
            librarySubjectOptions={librarySubjectOptions}
            olderDecks={olderDecks}
            openDeckMenuId={openDeckMenuId}
            openMaterialMenuId={openMaterialMenuId}
            orderedLibraryDecks={orderedLibraryDecks}
            pageOlderDecks={pageOlderDecks}
            pageRecentDecks={pageRecentDecks}
            profile={profile}
            recentDecks={recentDecks}
            renderLibraryDeckCard={renderLibraryDeckCard}
            revealedLibraryCards={revealedLibraryCards}
            searchQuery={searchQuery}
            selectedBombcardIds={selectedBombcardIds}
            selectedDeckForFolderView={selectedDeckForFolderView}
            setActiveTab={setActiveTab}
            setBulkDeleteMode={setBulkDeleteMode}
            setCollapseOlder={setCollapseOlder}
            setCollapseRecent={setCollapseRecent}
            setGuestLockedSection={setGuestLockedSection}
            setLibraryPage={setLibraryPage}
            setLibrarySubjectFilter={setLibrarySubjectFilter}
            setOpenDeckMenuId={setOpenDeckMenuId}
            setOpenMaterialMenuId={setOpenMaterialMenuId}
            setSearchQuery={setSearchQuery}
            setSelectedBombcardIds={setSelectedBombcardIds}
            setSelectedDeckForFolderView={setSelectedDeckForFolderView}
            setSelectedDeckIds={setSelectedDeckIds}
            startEditingBombcard={startEditingBombcard}
            toggleLibraryCardAnswer={toggleLibraryCardAnswer}
            totalBombCards={totalBombCards}
            totalDocuments={totalDocuments}
            totalReviewers={totalReviewers}
            visibleCards={visibleCards}
          />
        )}

        {/* ========================================================
                VIEW B2: STUDY (Active Review of Bombcards)
                ======================================================== */}
        {activeTab === "flashcards" && (
          <StudyScreen
            activeDeckAccuracy={activeDeckAccuracy}
            activeDeckMissedCount={activeDeckMissedCount}
            activeFlashcard={activeFlashcard}
            activeFlashcardDeck={activeFlashcardDeck}
            decks={decks}
            flashcardDragX={flashcardDragX}
            flashcardFlipped={flashcardFlipped}
            flashcardIndex={flashcardIndex}
            flashcardIsDragging={flashcardIsDragging}
            flashcardMotionLockRef={flashcardMotionLockRef}
            flashcardMotionTimerRef={flashcardMotionTimerRef}
            flashcardSwipePhase={flashcardSwipePhase}
            flashcards={flashcards}
            flipFlashcard={flipFlashcard}
            handleFlashcardPointerCancel={handleFlashcardPointerCancel}
            handleFlashcardPointerDown={handleFlashcardPointerDown}
            handleFlashcardPointerMove={handleFlashcardPointerMove}
            handleFlashcardPointerUp={handleFlashcardPointerUp}
            handleOpenGameMode={handleOpenGameMode}
            ignoreFlashcardClickRef={ignoreFlashcardClickRef}
            isGuest={isGuest}
            navigateFlashcard={navigateFlashcard}
            prepareNewBombcard={prepareNewBombcard}
            setActiveTab={setActiveTab}
            setCreatorTargetDeckId={setCreatorTargetDeckId}
            setFlashcardDragX={setFlashcardDragX}
            setFlashcardFlipped={setFlashcardFlipped}
            setFlashcardIndex={setFlashcardIndex}
            setFlashcardSwipePhase={setFlashcardSwipePhase}
            setGuestLockedSection={setGuestLockedSection}
            setSelectedDeckIds={setSelectedDeckIds}
          />
        )}

        {/* ========================================================
                VIEW B3: BOMBCARD CREATION STUDIO
                ======================================================== */}
        {activeTab === "creator" && (
          <CardCreatorScreen
            creatorAlternates={creatorAlternates}
            creatorAnswer={creatorAnswer}
            creatorCorrectIndex={creatorCorrectIndex}
            creatorEditingCardId={creatorEditingCardId}
            creatorHint={creatorHint}
            creatorOptions={creatorOptions}
            creatorPrompt={creatorPrompt}
            creatorShowAlternates={creatorShowAlternates}
            creatorShowHint={creatorShowHint}
            creatorStep={creatorStep}
            creatorTargetDeckId={creatorTargetDeckId}
            creatorType={creatorType}
            decks={decks}
            handleSaveBombcard={handleSaveBombcard}
            setActiveTab={setActiveTab}
            setCreatorAlternates={setCreatorAlternates}
            setCreatorAnswer={setCreatorAnswer}
            setCreatorCorrectIndex={setCreatorCorrectIndex}
            setCreatorEditingCardId={setCreatorEditingCardId}
            setCreatorHint={setCreatorHint}
            setCreatorOptions={setCreatorOptions}
            setCreatorPrompt={setCreatorPrompt}
            setCreatorShowAlternates={setCreatorShowAlternates}
            setCreatorShowHint={setCreatorShowHint}
            setCreatorStep={setCreatorStep}
            setCreatorTargetDeckId={setCreatorTargetDeckId}
            setCreatorType={setCreatorType}
            setSelectedDeckForFolderView={setSelectedDeckForFolderView}
            setSelectedDeckIds={setSelectedDeckIds}
            selectedDeckForFolderView={selectedDeckForFolderView}
            triggerToast={triggerToast}
          />
        )}

        {/* ========================================================
                VIEW B4: PDF HIGHLIGHTER
                ======================================================== */}
        {activeTab === "highlighter" && (
          <PdfWorkspaceScreen
            activeDocument={activeDocument}
            activeDocumentDeck={activeDocumentDeck}
            activeStudyDeckId={activeStudyDeckId}
            aiAssistantResponse={aiAssistantResponse}
            aiExplainLevel={aiExplainLevel}
            aiThinking={aiThinking}
            cardComposerOpen={cardComposerOpen}
            cardFormAnswer={cardFormAnswer}
            cardFormExplanation={cardFormExplanation}
            cardFormQuestion={cardFormQuestion}
            cardFormSourcePage={cardFormSourcePage}
            cardFormTags={cardFormTags}
            createPdfBombcard={createPdfBombcard}
            decks={decks}
            documentNotes={documentNotes}
            documentNotesLoading={documentNotesLoading}
            handleAiAsk={handleAiAsk}
            handleAiExplain={handleAiExplain}
            handleAiFlashcards={handleAiFlashcards}
            handleAiNotes={handleAiNotes}
            handleAiQuestions={handleAiQuestions}
            handleAiSummarize={handleAiSummarize}
            handleBackToDocumentLibrary={handleBackToDocumentLibrary}
            handleClearHighlights={handleClearHighlights}
            handleCreateStudyDeck={handleCreateStudyDeck}
            handleDeleteDocumentNote={handleDeleteDocumentNote}
            handleDeleteStudyCard={handleDeleteStudyCard}
            handleOpenAiGenerator={handleOpenAiGenerator}
            handleOpenDocument={handleOpenDocument}
            handlePdfSearch={handlePdfSearch}
            handlePdfTextSelection={handlePdfTextSelection}
            handleQuickAction={handleQuickAction}
            handleRemoveHighlight={handleRemoveHighlight}
            handleSaveDocumentNote={handleSaveDocumentNote}
            handleSaveStudyCard={handleSaveStudyCard}
            highlightColor={highlightColor}
            highlights={highlights}
            isGuest={isGuest}
            noteComposerOpen={noteComposerOpen}
            noteEditingId={noteEditingId}
            noteFormContent={noteFormContent}
            noteFormPage={noteFormPage}
            noteFormTitle={noteFormTitle}
            pdfCardComposerOpen={pdfCardComposerOpen}
            pdfCounterpart={pdfCounterpart}
            pdfPage={pdfPage}
            pdfPageCount={pdfPageCount}
            pdfSaving={pdfSaving}
            pdfSearchOpen={pdfSearchOpen}
            pdfSearchQuery={pdfSearchQuery}
            pdfSearchResults={pdfSearchResults}
            pdfSearching={pdfSearching}
            pdfSelection={pdfSelection}
            pdfSelectionRole={pdfSelectionRole}
            pdfZoom={pdfZoom}
            recordActivity={recordActivity}
            reviewingDeck={reviewingDeck}
            savePdfSelection={savePdfSelection}
            setActiveStudyDeckId={setActiveStudyDeckId}
            setAiAssistantResponse={setAiAssistantResponse}
            setAiExplainLevel={setAiExplainLevel}
            setCardComposerOpen={setCardComposerOpen}
            setCardFormAnswer={setCardFormAnswer}
            setCardFormExplanation={setCardFormExplanation}
            setCardFormQuestion={setCardFormQuestion}
            setCardFormSourcePage={setCardFormSourcePage}
            setCardFormTags={setCardFormTags}
            setHighlightColor={setHighlightColor}
            setNoteComposerOpen={setNoteComposerOpen}
            setNoteEditingId={setNoteEditingId}
            setNoteFormContent={setNoteFormContent}
            setNoteFormPage={setNoteFormPage}
            setNoteFormTitle={setNoteFormTitle}
            setPdfCardComposerOpen={setPdfCardComposerOpen}
            setPdfCounterpart={setPdfCounterpart}
            setPdfPage={setPdfPage}
            setPdfPageCount={setPdfPageCount}
            setPdfSearchOpen={setPdfSearchOpen}
            setPdfSearchQuery={setPdfSearchQuery}
            setPdfSearchResults={setPdfSearchResults}
            setPdfSelection={setPdfSelection}
            setPdfSelectionRole={setPdfSelectionRole}
            setPdfZoom={setPdfZoom}
            setReviewingDeck={setReviewingDeck}
            setStudyCards={setStudyCards}
            setWorkspaceSidebarTab={setWorkspaceSidebarTab}
            studyCards={studyCards}
            studyCardsLoading={studyCardsLoading}
            studyDecks={studyDecks}
            triggerToast={triggerToast}
            workspaceSidebarTab={workspaceSidebarTab}
          />
        )}

        {/* ========================================================
                VIEW C: BOMBSTYLE ARENA (CO-STUDYMAXX SYSTEM-CONSISTENT)
                ======================================================== */}
        {(activeTab === "arena" || activeTab === "game") && (
          <ArenaScreen
            BOMBSTYLE_DIFFICULTIES={BOMBSTYLE_DIFFICULTIES}
            activeBombstyleCard={activeBombstyleCard}
            arenaDeckChoices={arenaDeckChoices}
            bombTimerPercent={bombTimerPercent}
            bombstyleActiveDeck={bombstyleActiveDeck}
            bombstyleAnswerDraft={bombstyleAnswerDraft}
            bombstyleAnswerError={bombstyleAnswerError}
            bombstyleAnswerInputRef={bombstyleAnswerInputRef}
            bombstyleAvailableCards={bombstyleAvailableCards}
            bombstyleCorrectCount={bombstyleCorrectCount}
            bombstyleCountdown={bombstyleCountdown}
            bombstyleDeckId={bombstyleDeckId}
            bombstyleDifficulty={bombstyleDifficulty}
            bombstyleDurationSeconds={bombstyleDurationSeconds}
            bombstyleFeedback={bombstyleFeedback}
            bombstyleIndex={bombstyleIndex}
            bombstyleMaxStreak={bombstyleMaxStreak}
            bombstyleMissedCards={bombstyleMissedCards}
            bombstylePhase={bombstylePhase}
            bombstyleQueue={bombstyleQueue}
            bombstyleRevealed={bombstyleRevealed}
            bombstyleStreak={bombstyleStreak}
            bombstyleTimeRemaining={bombstyleTimeRemaining}
            bombstyleTimerHelpOpen={bombstyleTimerHelpOpen}
            cancelBombstyleCountdown={cancelBombstyleCountdown}
            decks={decks}
            handleBombstyleAnswer={handleBombstyleAnswer}
            handleSelectBombstyleDeck={handleSelectBombstyleDeck}
            handleSetDifficulty={handleSetDifficulty}
            handleStartBombstyle={handleStartBombstyle}
            handleStudyMissedDeck={handleStudyMissedDeck}
            isBombDanger={isBombDanger}
            isBombExploded={isBombExploded}
            isBombStartled={isBombStartled}
            isBombWorried={isBombWorried}
            isBombWrong={isBombWrong}
            publicArenaDeck={publicArenaDeck}
            requestBombstyleExit={requestBombstyleExit}
            selectedBombstyleDifficulty={selectedBombstyleDifficulty}
            setBombstyleAnswerDraft={setBombstyleAnswerDraft}
            setBombstyleAnswerError={setBombstyleAnswerError}
            setBombstylePhase={setBombstylePhase}
            setBombstyleTimerHelpOpen={setBombstyleTimerHelpOpen}
            setSoundMuted={setSoundMuted}
            soundMuted={soundMuted}
            triggerToast={triggerToast}
          />
        )}
      </main>

      {bombstyleExitModalOpen && (
        <ArenaExitDialog
          bombstyleAnswerSubmittedRef={bombstyleAnswerSubmittedRef}
          bombstyleSessionId={bombstyleSessionId}
          isGuest={isGuest}
          pendingBombstyleExitActionRef={pendingBombstyleExitActionRef}
          refreshWorkspace={refreshWorkspace}
          resumeBombstyleSession={resumeBombstyleSession}
          setBombstyleExitModalOpen={setBombstyleExitModalOpen}
          setBombstyleFeedback={setBombstyleFeedback}
          setBombstylePhase={setBombstylePhase}
          setBombstyleRevealed={setBombstyleRevealed}
          triggerToast={triggerToast}
        />
      )}

      {folderInfoModalOpen && (
        <DeckFormDialog
          folderDescInput={folderDescInput}
          folderNameDuplicate={folderNameDuplicate}
          folderNameInput={folderNameInput}
          handleSaveFolderInfo={handleSaveFolderInfo}
          setFolderDescInput={setFolderDescInput}
          setFolderInfoModalOpen={setFolderInfoModalOpen}
          setFolderNameInput={setFolderNameInput}
          targetFolderForEdit={targetFolderForEdit}
        />
      )}

      {deleteDeckTarget && (
        <ArchiveDeckDialog
          confirmDeleteFolder={confirmDeleteFolder}
          deleteDeckTarget={deleteDeckTarget}
          setDeleteDeckTarget={setDeleteDeckTarget}
        />
      )}

      {signOutConfirmationOpen && (
        <SignOutDialog
          setSignOutBusy={setSignOutBusy}
          setSignOutConfirmationOpen={setSignOutConfirmationOpen}
          setSignOutError={setSignOutError}
          signOutBusy={signOutBusy}
          signOutError={signOutError}
        />
      )}

      {deckVisibilityNotice && (
        <div
          className={`csm-deck-visibility-toast ${deckVisibilityNotice.isError ? "is-error" : ""}`}
          role={deckVisibilityNotice.isError ? "alert" : "status"}
          aria-live="polite"
        >
          {!deckVisibilityNotice.isError && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>
          )}
          <span>{deckVisibilityNotice.message}</span>
        </div>
      )}

      {deleteConfirmation && (
        <DeleteConfirmationDialog
          confirmDeleteAction={confirmDeleteAction}
          deleteConfirmation={deleteConfirmation}
          setDeleteConfirmation={setDeleteConfirmation}
        />
      )}

      {changeConfirmation && (
        <ChangeConfirmationDialog
          changeConfirmation={changeConfirmation}
          setChangeConfirmation={setChangeConfirmation}
        />
      )}

      {aiCardsAddedModal && (
        <CardsAddedDialog
          aiCardsAddedModal={aiCardsAddedModal}
          setAiCardsAddedModal={setAiCardsAddedModal}
        />
      )}

      {shareDeckTarget && (
        <ShareDeckDialog
          handleCopyShareUrl={handleCopyShareUrl}
          handleRegenerateShareLink={handleRegenerateShareLink}
          handleShareDeck={handleShareDeck}
          handleToggleShareActive={handleToggleShareActive}
          isGuest={isGuest}
          setShareDeckTarget={setShareDeckTarget}
          shareDeckTarget={shareDeckTarget}
          shareModalCopied={shareModalCopied}
          shareModalData={shareModalData}
          shareModalError={shareModalError}
          shareModalLoading={shareModalLoading}
        />
      )}

      {passwordResetModalOpen && (
        <PasswordResetDialog
          confirmPasswordDraft={confirmPasswordDraft}
          currentPasswordDraft={currentPasswordDraft}
          handleChangePassword={handleChangePassword}
          newPasswordDraft={newPasswordDraft}
          setConfirmPasswordDraft={setConfirmPasswordDraft}
          setCurrentPasswordDraft={setCurrentPasswordDraft}
          setNewPasswordDraft={setNewPasswordDraft}
          setPasswordResetModalOpen={setPasswordResetModalOpen}
        />
      )}

      {passwordErrorModal && (
        <PasswordErrorDialog
          passwordErrorModal={passwordErrorModal}
          setPasswordErrorModal={setPasswordErrorModal}
        />
      )}

      {/* ========================================================
              POPUP: ADD MATERIAL (VAIA Hierarchy + CSM Design Premise)
              ======================================================== */}
      {isAddMaterialPopupOpen && (
        <AddMaterialDialog
          addMaterialFileInputRef={addMaterialFileInputRef}
          handleAddMaterialDirectUpload={handleAddMaterialDirectUpload}
          isDraggingAddMaterialFile={isDraggingAddMaterialFile}
          setIsAddMaterialPopupOpen={setIsAddMaterialPopupOpen}
          setIsDraggingAddMaterialFile={setIsDraggingAddMaterialFile}
          targetDeckForAddMaterial={targetDeckForAddMaterial}
        />
      )}

      {isCreateBombcardsPopupOpen && (
        <CreateBombcardsDialog
          handleChooseAiCreation={handleChooseAiCreation}
          handleChooseManualCreation={handleChooseManualCreation}
          setIsCreateBombcardsPopupOpen={setIsCreateBombcardsPopupOpen}
          targetDeckForCreateBombcards={targetDeckForCreateBombcards}
        />
      )}

      {/* ========================================================
              MODAL: GEMINI AI BOMBCARD GENERATOR
              ======================================================== */}
      {aiGeneratorOpen && (
        <AiGeneratorDialog
          aiDeckLocked={aiDeckLocked}
          aiExtractingPdf={aiExtractingPdf}
          aiFocus={aiFocus}
          aiFormat={aiFormat}
          aiGeneratedCards={aiGeneratedCards}
          aiLoading={aiLoading}
          aiNotes={aiNotes}
          aiPdfDragActive={aiPdfDragActive}
          aiPdfEndPage={aiPdfEndPage}
          aiPdfExtractProgress={aiPdfExtractProgress}
          aiPdfExtractedSummary={aiPdfExtractedSummary}
          aiPdfFileInputRef={aiPdfFileInputRef}
          aiPdfPageRangeType={aiPdfPageRangeType}
          aiPdfSourceMode={aiPdfSourceMode}
          aiPdfStartPage={aiPdfStartPage}
          aiPdfTotalPages={aiPdfTotalPages}
          aiReviewerDownloading={aiReviewerDownloading}
          aiSavePdfToDeck={aiSavePdfToDeck}
          aiSelectedLibraryDoc={aiSelectedLibraryDoc}
          aiShowNotesPreview={aiShowNotesPreview}
          aiSourceType={aiSourceType}
          aiStage={aiStage}
          aiTargetDeckId={aiTargetDeckId}
          aiUploadedPdfFile={aiUploadedPdfFile}
          decks={decks}
          extractPdfText={extractPdfText}
          handleGenerateAiReviewer={handleGenerateAiReviewer}
          handleGenerateWithAi={handleGenerateWithAi}
          handleLoadSampleNotes={handleLoadSampleNotes}
          handlePdfDrop={handlePdfDrop}
          handlePdfFileSelect={handlePdfFileSelect}
          handleSaveAiCardsToDeck={handleSaveAiCardsToDeck}
          handleTargetDeckChange={handleTargetDeckChange}
          setAiFocus={setAiFocus}
          setAiFormat={setAiFormat}
          setAiGeneratedCards={setAiGeneratedCards}
          setAiGeneratorOpen={setAiGeneratorOpen}
          setAiNotes={setAiNotes}
          setAiPdfDragActive={setAiPdfDragActive}
          setAiPdfEndPage={setAiPdfEndPage}
          setAiPdfPageRangeType={setAiPdfPageRangeType}
          setAiPdfSourceMode={setAiPdfSourceMode}
          setAiPdfStartPage={setAiPdfStartPage}
          setAiSavePdfToDeck={setAiSavePdfToDeck}
          setAiSelectedLibraryDoc={setAiSelectedLibraryDoc}
          setAiShowNotesPreview={setAiShowNotesPreview}
          setAiSourceType={setAiSourceType}
          setAiStage={setAiStage}
        />
      )}

      {aiReviewerReady && (
        <AiReviewerDialog
          aiReviewerImporting={aiReviewerImporting}
          aiReviewerReady={aiReviewerReady}
          handleImportAiReviewer={handleImportAiReviewer}
          setAiReviewerReady={setAiReviewerReady}
        />
      )}

      {/* ========================================================
              DRAWER / MODAL: BOMBCARD & DECK AUTHORING WORKSHOP
              ======================================================== */}
      {isDeckEditorOpen && (
        <CardEditorDialog
          editingDeck={editingDeck}
          editorCards={editorCards}
          editorDocuments={editorDocuments}
          handleAddQuestionToEditor={handleAddQuestionToEditor}
          handlePdfUpload={handlePdfUpload}
          handleRemoveCardFromEditor={handleRemoveCardFromEditor}
          handleRemoveDocFromEditor={handleRemoveDocFromEditor}
          handleSaveDeck={handleSaveDeck}
          isDraggingPdf={isDraggingPdf}
          newQAlternates={newQAlternates}
          newQAnswer={newQAnswer}
          newQCorrectIndex={newQCorrectIndex}
          newQHint={newQHint}
          newQOptions={newQOptions}
          newQPrompt={newQPrompt}
          newQType={newQType}
          pdfInputRef={pdfInputRef}
          setEditorDocuments={setEditorDocuments}
          setIsDeckEditorOpen={setIsDeckEditorOpen}
          setIsDraggingPdf={setIsDraggingPdf}
          setNewQAlternates={setNewQAlternates}
          setNewQAnswer={setNewQAnswer}
          setNewQCorrectIndex={setNewQCorrectIndex}
          setNewQHint={setNewQHint}
          setNewQOptions={setNewQOptions}
          setNewQPrompt={setNewQPrompt}
          setNewQType={setNewQType}
          triggerToast={triggerToast}
        />
      )}

      {guestLockedSection && (
        <GuestLockedModal
          section={guestLockedSection}
          onClose={() => setGuestLockedSection(null)}
        />
      )}
    </div>
  );
}
