import { CSM } from "../../services/client.js";
import { IconDownload } from "../../components/icons.jsx";
import React from "react";
export function AccountScreen({
  accountSection,
  accountSectionDetails,
  avatarOptions,
  currentAvatar,
  defaultProfile,
  displayName,
  handleChooseAvatar,
  handleProfileDeckVisibility,
  handleSaveDisplayName,
  nameCooldownDays,
  nameCooldownRemaining,
  privacySaveStatus,
  profile,
  profileNameDraft,
  setAccountSection,
  setActiveTab,
  setPasswordResetModalOpen,
  setProfileNameDraft,
  totalBombCards,
  totalDocuments,
  totalReviewers,
  triggerToast,
}) {
  return (
    <div className="csm-screen csm-account-screen custom-scroll">
      <div className="csm-page-head">
        <div>
          <span className="csm-kicker">ACCOUNT SETTINGS</span>
          <h1>{accountSectionDetails.title}</h1>
          <p>{accountSectionDetails.description}</p>
        </div>
        <div className="csm-page-actions">
          <button
            type="button"
            className="csm-secondary-button"
            onClick={() => setActiveTab("home")}
          >
            Back to dashboard
          </button>
        </div>
      </div>

      <div
        className="csm-account-tabs"
        role="tablist"
        aria-label="Account sections"
      >
        {[
          ["profile", "Profile"],
          ["security", "Security"],
          ["privacy", "Privacy & policy"],
        ].map(([sectionId, label]) => (
          <button
            key={sectionId}
            type="button"
            role="tab"
            aria-selected={accountSection === sectionId}
            className={accountSection === sectionId ? "active" : ""}
            onClick={() => setAccountSection(sectionId)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={`csm-account-layout account-section-${accountSection}`}>
        <section className="csm-account-card csm-account-summary">
          <div className="csm-account-summary-top">
            <span
              className="csm-account-avatar-large"
              style={{
                background: currentAvatar.background,
              }}
            >
              {currentAvatar.initials}
            </span>
            <div>
              <span className="csm-kicker">STUDY PROFILE</span>
              <h2>{displayName}</h2>
              <p>@{profile.username || defaultProfile.username}</p>
            </div>
          </div>
          <div className="csm-account-summary-note">
            <span>Discoverable profile</span>
            <p>
              Classmates can find your username and display name. Your reviewer
              decks are shared only according to your privacy settings.
            </p>
          </div>
          <div className="csm-account-summary-stats">
            <div>
              <strong>{totalReviewers}</strong>
              <span>reviewers</span>
            </div>
            <div>
              <strong>{totalBombCards}</strong>
              <span>Bombcards</span>
            </div>
            <div>
              <strong>{totalDocuments}</strong>
              <span>PDF notes</span>
            </div>
          </div>
        </section>

        <section className="csm-account-card csm-account-identity-card">
          <div className="csm-account-card-heading">
            <div>
              <span className="csm-kicker">IDENTITY</span>
              <h2>Display name</h2>
            </div>
            <span className="csm-account-status">Visible to classmates</span>
          </div>
          <div className="csm-account-username-row">
            <span>Username</span>
            <strong>@{profile.username || defaultProfile.username}</strong>
          </div>
          <form
            className="csm-account-name-form"
            onSubmit={handleSaveDisplayName}
          >
            <label className="csm-account-field">
              Name
              <input
                type="text"
                value={profileNameDraft}
                onChange={(event) => setProfileNameDraft(event.target.value)}
                maxLength="40"
                aria-describedby="display-name-help"
              />
            </label>
            <button
              type="submit"
              className="csm-primary-button"
              disabled={
                nameCooldownRemaining > 0 ||
                !profileNameDraft.trim() ||
                profileNameDraft.trim() === displayName
              }
            >
              Save name
            </button>
          </form>
          <div
            id="display-name-help"
            className={`csm-account-help ${nameCooldownRemaining > 0 ? "is-locked" : ""}`}
          >
            {nameCooldownRemaining > 0
              ? `Name changes are locked for ${nameCooldownDays} more day${nameCooldownDays === 1 ? "" : "s"}.`
              : "You can change your display name once every 7 days."}
          </div>
        </section>

        <section className="csm-account-card csm-account-avatar-card">
          <div className="csm-account-card-heading">
            <div>
              <span className="csm-kicker">PROFILE IMAGE</span>
              <h2>Choose an avatar</h2>
            </div>
            <span className="csm-account-status">Preset collection</span>
          </div>
          <div className="csm-account-avatar-grid">
            {avatarOptions.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                className={`csm-account-avatar-option ${profile.avatar === avatar.id ? "selected" : ""}`}
                onClick={() => handleChooseAvatar(avatar.id)}
                aria-label={`Use ${avatar.label} avatar`}
                aria-pressed={profile.avatar === avatar.id}
              >
                <span
                  style={{
                    background: avatar.background,
                  }}
                >
                  {avatar.initials}
                </span>
                <small>{avatar.label}</small>
              </button>
            ))}
          </div>
          <p className="csm-account-help">
            Choose one of the pre-made avatars. A database-backed upload option
            can be added later.
          </p>
        </section>

        <section className="csm-account-card csm-account-security-card">
          <div className="csm-account-card-heading">
            <div>
              <span className="csm-kicker">SECURITY</span>
              <h2>Password</h2>
            </div>
            <span className="csm-account-placeholder-badge">Protected</span>
          </div>
          <div className="csm-account-security-row">
            <span className="csm-account-security-icon">•••</span>
            <div>
              <strong>Change your password</strong>
              <p>
                Verify your current password to set a new one. Email recovery
                requires the server mail service to be configured.
              </p>
            </div>
            <button
              type="button"
              className="csm-secondary-button"
              onClick={() => setPasswordResetModalOpen(true)}
            >
              Change password
            </button>
          </div>
        </section>
        <section className="csm-account-card csm-account-policy-card">
          <div className="csm-account-card-heading">
            <div>
              <span className="csm-kicker">PRIVACY &amp; POLICY</span>
              <h2>Your data in Co-StudyMaxx</h2>
            </div>
            <span className="csm-account-placeholder-badge">Account data</span>
          </div>
          <div className="csm-policy-list">
            <div className="csm-policy-item">
              <strong>Account data</strong>
              <p>
                Your account, profile, reviewer content, uploaded materials, and
                study results are stored in the private workspace database.
              </p>
            </div>
            <div className="csm-policy-item">
              <strong>Study activity</strong>
              <p>
                The Home activity list only records the Library materials you
                open so you can return to your latest study work.
              </p>
            </div>
            <div className="csm-policy-item">
              <strong>Privacy notice and data controls</strong>
              <p>
                The privacy policy is available below. You can export your
                account data here; account deletion and terms are not yet
                available in the app.
              </p>
            </div>
          </div>
          <div className="csm-public-deck-setting">
            <div>
              <strong>Default deck visibility</strong>
              <p>
                Your profile remains discoverable by username and display name.
                This setting controls decks set to “Use profile default”; you
                can override it for each deck. People search shows Bombcards
                only. Active share links remain separate and should be disabled
                from the deck’s Share menu if you want to revoke link access.
              </p>
            </div>
            <label>
              <span className="sr-only">Default deck visibility</span>
              <select
                value={profile.deckVisibility || "private"}
                onChange={handleProfileDeckVisibility}
              >
                <option value="private">Private decks</option>
                <option value="public">Public decks</option>
              </select>
            </label>
            {privacySaveStatus && (
              <small role="status">{privacySaveStatus}</small>
            )}
          </div>
          <div className="csm-policy-actions">
            <a
              className="csm-secondary-button"
              href="output/pdf/privacy-policy.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              View privacy policy
            </a>
            <button
              type="button"
              className="csm-secondary-button"
              onClick={async () => {
                try {
                  CSM.download(
                    await CSM.api("account/export"),
                    "co-studymaxx-export.json",
                  );
                } catch (error) {
                  triggerToast(error.message);
                }
              }}
            >
              <IconDownload />
              Export my data
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
