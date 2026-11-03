from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output" / "pdf" / "privacy-policy.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#17243A")
INK = colors.HexColor("#243248")
MUTED = colors.HexColor("#64748B")
ORANGE = colors.HexColor("#F04D2B")
PALE = colors.HexColor("#F4F7FB")
LINE = colors.HexColor("#DCE4EE")
WHITE = colors.white

PAGE_W, PAGE_H = A4
LEFT = 20 * mm
RIGHT = 20 * mm
TOP = 23 * mm
BOTTOM = 20 * mm


class PolicyDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(
            str(filename),
            pagesize=A4,
            leftMargin=LEFT,
            rightMargin=RIGHT,
            topMargin=TOP,
            bottomMargin=BOTTOM,
            title="Co-StudyMaxx Privacy Policy",
            author="Co-StudyMaxx Project",
            subject="Privacy and data handling notice for Co-StudyMaxx",
        )
        frame = Frame(LEFT, BOTTOM, PAGE_W - LEFT - RIGHT, PAGE_H - TOP - BOTTOM, id="body")
        self.addPageTemplates([PageTemplate(id="policy", frames=[frame], onPage=self.draw_page)])

    def draw_page(self, canvas, doc):
        canvas.saveState()
        if doc.page == 1:
            canvas.setFillColor(NAVY)
            canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, fill=1, stroke=0)
            canvas.setFillColor(ORANGE)
            canvas.rect(0, PAGE_H - 12 * mm, 5 * mm, 12 * mm, fill=1, stroke=0)
        else:
            canvas.setFillColor(NAVY)
            canvas.rect(0, PAGE_H - 9 * mm, PAGE_W, 9 * mm, fill=1, stroke=0)
            canvas.setFillColor(WHITE)
            canvas.setFont("Helvetica-Bold", 8)
            canvas.drawString(LEFT, PAGE_H - 6.2 * mm, "CO-STUDYMAXX  /  PRIVACY POLICY")
            canvas.setFillColor(ORANGE)
            canvas.rect(PAGE_W - 22 * mm, PAGE_H - 9 * mm, 22 * mm, 1.4 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(LEFT, 14 * mm, PAGE_W - RIGHT, 14 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 8)
        canvas.drawString(LEFT, 9.5 * mm, "Version 1.0  |  Effective 29 October 2026")
        canvas.drawRightString(PAGE_W - RIGHT, 9.5 * mm, f"Co-StudyMaxx  |  {doc.page}")
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="Eyebrow", fontName="Helvetica-Bold", fontSize=8.5, leading=11,
    textColor=ORANGE, spaceAfter=5, tracking=1.2,
))
styles.add(ParagraphStyle(
    name="PolicyTitle", fontName="Helvetica-Bold", fontSize=27, leading=31,
    textColor=NAVY, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Lead", fontName="Helvetica", fontSize=11, leading=16,
    textColor=MUTED, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="Section", fontName="Helvetica-Bold", fontSize=15, leading=19,
    textColor=NAVY, spaceBefore=5, spaceAfter=7, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="Subhead", fontName="Helvetica-Bold", fontSize=10.2, leading=13,
    textColor=INK, spaceBefore=6, spaceAfter=3, keepWithNext=True,
))
styles.add(ParagraphStyle(
    name="BodyPolicy", fontName="Helvetica", fontSize=9.1, leading=13.2,
    textColor=INK, spaceAfter=6, alignment=TA_LEFT,
))
styles.add(ParagraphStyle(
    name="SmallPolicy", fontName="Helvetica", fontSize=8, leading=11,
    textColor=MUTED, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="BulletPolicy", fontName="Helvetica", fontSize=9.1, leading=13,
    textColor=INK, leftIndent=12, firstLineIndent=-8, bulletIndent=0,
    spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="CalloutTitle", fontName="Helvetica-Bold", fontSize=9.4, leading=12,
    textColor=NAVY, spaceAfter=3,
))
styles.add(ParagraphStyle(
    name="CalloutBody", fontName="Helvetica", fontSize=8.6, leading=12,
    textColor=INK,
))
styles.add(ParagraphStyle(
    name="LinkPolicy", fontName="Helvetica", fontSize=8.1, leading=11,
    textColor=INK, spaceAfter=3, splitLongWords=1,
))


def P(text, style="BodyPolicy"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph("- " + text, styles["BulletPolicy"])


def callout(title, body, background=PALE, accent=ORANGE):
    t = Table([[P(title, "CalloutTitle")], [P(body, "CalloutBody")]], colWidths=[PAGE_W - LEFT - RIGHT - 12 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


story = []

# PAGE 1 - policy scope and information collected
story += [
    Spacer(1, 9 * mm),
    P("PRIVACY AND DATA NOTICE", "Eyebrow"),
    P("Co-StudyMaxx Privacy Policy", "PolicyTitle"),
    P("How the study workspace handles account details, study content, device data, and optional connected services.", "Lead"),
    callout(
        "Who is responsible for your instance?",
        "Co-StudyMaxx can be installed on different servers. The school, organization, or project operator that hosts the instance controls its database, file storage, and operational retention. Ask that operator for its legal name and privacy contact. Before real students use a school-hosted instance, the operator should publish those details and confirm its local requirements.",
        background=colors.HexColor("#FFF5F1"),
    ),
    Spacer(1, 5 * mm),
    P("1. What this policy covers", "Section"),
    P("This notice describes the current Co-StudyMaxx application as of 29 October 2026. It covers the web workspace, account settings, reviewer library, Bombcards, study progress, PDF workspace, Bombstyle Arena, public discovery and share links, password recovery, and the admin tools present in the project. A school or other operator may add a local notice for its own hosting, users, and retention rules.", "BodyPolicy"),
    P("2. Information the app handles", "Section"),
    bullet("<b>Account and profile:</b> username, email address when provided, password hash, role, display name, first/middle/last name when provided, selected avatar, and profile/deck visibility preferences."),
    bullet("<b>Study workspace:</b> reviewer/deck titles and organization, Bombcard prompts, choices and answers, study flashcards, tags, notes, highlights, source excerpts, and PDFs that you upload."),
    bullet("<b>Learning records:</b> review counts and outcomes, daily study history, Arena sessions and answers, activity history, achievements, and related timestamps."),
    bullet("<b>Security and service data:</b> server session records, browser/tab identifiers used to manage active sessions, login attempts and rate limits, and security audit events. Audit IP addresses are stored as SHA-256 hashes rather than readable IP addresses."),
    bullet("<b>Reports and notices:</b> reports about public decks, reasons submitted with a report, moderation actions, and account notifications."),
    P("Do not upload information you do not have permission to store. Study PDFs and notes may contain personal information about you or other people.", "SmallPolicy"),
    P("At a glance", "Section"),
    Table(
        [[
            P("WHAT IS STORED", "CalloutTitle"),
            P("WHEN IT IS SHARED", "CalloutTitle"),
            P("YOUR CONTROLS", "CalloutTitle"),
        ], [
            P("Account details, study content, uploaded files, and learning records are stored by the instance operator.", "CalloutBody"),
            P("Public deck settings and active share links make selected content available to others. AI and reset email use external providers when requested.", "CalloutBody"),
            P("Set visibility, manage share links, avoid optional AI, and use Account Export. Contact the operator for account-level requests.", "CalloutBody"),
        ]],
        colWidths=[(PAGE_W - LEFT - RIGHT) / 3] * 3,
        style=TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 0.6, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]),
    ),
]

story += [PageBreak()]

# PAGE 2 - use, visibility and AI
story += [
    Spacer(1, 2 * mm),
    P("HOW INFORMATION IS USED", "Eyebrow"),
    P("3. Purposes of processing", "Section"),
    bullet("Create and protect accounts, authenticate sign-ins, maintain sessions, recover or change passwords, and keep the service available."),
    bullet("Save and display the reviewers, cards, documents, notes, study progress, Arena results, and activity that you choose to create."),
    bullet("Apply your privacy settings, operate public deck discovery and share links, respond to deck reports, and send related notices."),
    bullet("Detect abuse, rate-limit repeated requests, investigate security events, and administer the service."),
    bullet("Provide optional features that you request, such as AI-generated study material and password-recovery email."),
    P("The operator must identify the lawful basis for processing in its deployment. For a Philippines deployment, applicable requirements may include Republic Act No. 10173 and its Implementing Rules and Regulations. This project notice is not a determination that a particular operator is legally compliant.", "BodyPolicy"),
    P("4. Public profiles, decks, and share links", "Section"),
    P("Your username and display name can be discoverable in the People area. A deck is discoverable only when it is set to public directly or inherits a public profile setting. Public deck pages can show the deck title, owner display details, Bombcards, and attached PDFs. Your private notes and personal study progress are not part of a public deck view.", "BodyPolicy"),
    P("A separate active share link can be opened by anyone who has that link. Depending on the shared deck, it can expose its Bombcards and attached PDFs. You can deactivate or regenerate a share link from the deck's Share controls. Treat a link as public while it is active and shared.", "BodyPolicy"),
    P("5. Optional AI features", "Section"),
    P("When you choose an AI feature, the app sends the material needed for that request to Google's Gemini API from the PHP server. Depending on the feature, this can include notes you submit, a deck title, and Bombcard prompts, options, or answers. The app uses the response to return generated cards or study text. Do not submit confidential or sensitive material unless you are authorized and accept the provider's processing terms.", "BodyPolicy"),
    P("Gemini is an independent provider. Its own terms, privacy information, processing locations, and retention practices apply to data it receives. The Co-StudyMaxx operator should review those terms and configure the AI feature only when appropriate for its users.", "BodyPolicy"),
    callout("You control whether to use AI", "The core account and study features do not require you to use AI. Only send source text to an AI feature when you intentionally request that processing.", background=PALE),
]

story += [PageBreak()]

# PAGE 3 - disclosure, security, cookies, retention
story += [
    Spacer(1, 2 * mm),
    P("ACCESS, SECURITY, AND RETENTION", "Eyebrow"),
    P("6. When information is shared", "Section"),
    bullet("<b>Instance operator and authorized administrators:</b> the hosting operator maintains the service. Authorized staff tools can provide a read-only preview of reviewer content and attached PDFs for moderation; those accesses are recorded in the security audit log."),
    bullet("<b>Other users:</b> only profile information, public decks, attached public PDFs, and content accessible through an active share link are available through those public features."),
    bullet("<b>Service providers you enable:</b> Gemini receives the content required for an AI request. The configured email provider receives a password-recovery email address and one-time reset link when recovery email is enabled."),
    bullet("<b>Hosting and infrastructure providers:</b> the operator's hosting, database, backup, and network providers may process data to run the instance. Their identity depends on where that copy of Co-StudyMaxx is hosted."),
    P("The app does not implement advertising profiles or sale of personal data. The browser loads the PDF.js viewer library from cdnjs; that provider may receive ordinary connection metadata when the library is downloaded. PDF files are fetched from the Co-StudyMaxx host, not from cdnjs.", "BodyPolicy"),
    P("7. Password recovery and session storage", "Section"),
    P("Passwords are stored as password hashes. Reset tokens are stored in hashed form in the application database; a reset link is single-use and expires after 30 minutes. Recovery email is sent only when the operator has configured the mail service. The app uses a session cookie and browser/tab identifiers to keep a sign-in active and prevent stale sessions from replacing another tab. These identifiers support the service and security functions; they are not used for advertising.", "BodyPolicy"),
    P("8. Security safeguards", "Section"),
    P("The project uses password hashing, parameterized database queries, server-side sessions, same-origin and CSRF checks on state-changing API requests, access checks for user-owned records, rate limits, and audit logging. Uploaded PDFs are configured for storage outside the public project directory, and PDF routes check access before serving files. These are safeguards, not a guarantee that any deployment is immune to security incidents. The operator is responsible for its hosting, credentials, backups, access controls, updates, and incident response.", "BodyPolicy"),
    P("9. Retention and deletion", "Section"),
    P("The project does not define one universal retention period because each instance is hosted and administered separately. Account, profile, study, and audit records are retained in the operator's database until they are removed under that operator's retention schedule or applicable requirements. Archived decks can be restored or permanently deleted through the available controls; permanent deck deletion also removes its attached PDF files from the configured upload directory. System backups and third-party provider records may persist for their configured rotation or provider retention period.", "BodyPolicy"),
    P("The current app provides an Export my data action that downloads an account JSON export. It does not provide self-service account deletion. Contact the instance operator to ask about correction, restriction, or deletion requests and the applicable retention schedule.", "BodyPolicy"),
]

story += [PageBreak()]

# PAGE 4 - rights, contact and legal references
story += [
    Spacer(1, 2 * mm),
    P("YOUR CHOICES AND CONTACT", "Eyebrow"),
    P("10. Your privacy choices and rights", "Section"),
    P("Available controls include changing profile details and visibility, deciding whether to make decks public, disabling or regenerating share links, and exporting available account data. You can choose not to use optional AI features and can avoid uploading a document.", "BodyPolicy"),
    P("Depending on applicable law and the facts of a request, you may have rights to be informed, request access to or correction of data, object to certain processing, request erasure or blocking, obtain data portability, and lodge a complaint. For a Philippines deployment, refer to the rights under the Data Privacy Act of 2012 and guidance from the National Privacy Commission. Some rights may be subject to legal exceptions.", "BodyPolicy"),
    bullet("Ask whether and how your personal information is being processed, and request access to a copy."),
    bullet("Request correction of inaccurate or incomplete information."),
    bullet("Object to processing or request erasure/blocking when the applicable legal conditions are met."),
    bullet("Request a portable electronic copy where applicable, or complain to the National Privacy Commission."),
    P("11. How to make a request", "Section"),
    P("Contact the administrator or school that operates the Co-StudyMaxx instance and ask for its privacy officer or Data Protection Officer. Identify the account and describe the request. The operator may need to verify your identity before responding. The contact details are instance-specific and are not supplied by the software itself.", "BodyPolicy"),
    callout(
        "For school deployment",
        "Before inviting students, the school or organization should add its legal name, privacy/DPO contact, applicable retention periods, hosting providers, incident-reporting channel, and any required student/parent notice. If students may be minors, the operator should determine what approvals and notices are required before use.",
        background=colors.HexColor("#FFF5F1"),
    ),
    P("12. Changes to this notice", "Section"),
    P("A new version should be published when the application or its data practices materially change. The instance operator should notify users when a change affects the information or purposes described here. The effective date on this copy is 29 October 2026.", "BodyPolicy"),
    P("13. Philippine privacy references", "Section"),
    P('Republic Act No. 10173, Data Privacy Act of 2012: <link href="https://privacy.gov.ph/data-privacy-act-/" color="#F04D2B">privacy.gov.ph/data-privacy-act-/</link>', "LinkPolicy"),
    P('National Privacy Commission, Data Subject Rights: <link href="https://privacy.gov.ph/data-subject-rights/" color="#F04D2B">privacy.gov.ph/data-subject-rights/</link>', "LinkPolicy"),
    P('Implementing Rules and Regulations: <link href="https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/" color="#F04D2B">privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/</link>', "LinkPolicy"),
    Spacer(1, 3 * mm),
    P("This document describes the current Co-StudyMaxx project behavior and is general information, not legal advice or a compliance certification. The organization operating a live instance remains responsible for identifying its controller, lawful bases, providers, retention schedule, contact channel, and any additional notices required for its deployment.", "SmallPolicy"),
]


class NumberedCanvas:
    """Canvas wrapper that adds accurate page totals after the document is built."""

    def __init__(self, *args, **kwargs):
        from reportlab.pdfgen import canvas
        self._canvas = canvas.Canvas(*args, **kwargs)
        self._saved_page_states = []

    def __getattr__(self, name):
        return getattr(self._canvas, name)

    def showPage(self):
        self._saved_page_states.append(dict(self._canvas.__dict__))
        self._canvas._startPage()

    def save(self):
        page_count = len(self._saved_page_states)
        for state in self._saved_page_states:
            self._canvas.__dict__.update(state)
            self._canvas.saveState()
            self._canvas.setFillColor(MUTED)
            self._canvas.setFont("Helvetica", 8)
            self._canvas.drawRightString(PAGE_W - RIGHT, 5.5 * mm, f"Page {self._canvas._pageNumber} of {page_count}")
            self._canvas.restoreState()
            self._canvas.showPage()
        self._canvas.save()


doc = PolicyDoc(OUT)
doc.build(story, canvasmaker=NumberedCanvas)
print(OUT)
