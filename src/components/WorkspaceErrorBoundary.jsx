import React from "react";
export class WorkspaceErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
    };
  }
  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }
  componentDidCatch(error, info) {
    console.error("Workspace render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            margin: "auto",
            padding: 24,
            maxWidth: 620,
            border: "1px solid #dbe3ee",
            borderRadius: 16,
            background: "#fff",
            color: "#18233a",
            font: "14px system-ui",
            boxShadow: "0 12px 32px #17243a12",
          }}
          role="alert"
        >
          <h1
            style={{
              margin: "0 0 8px",
              fontSize: 21,
            }}
          >
            The workspace hit a rendering error
          </h1>
          <p
            style={{
              margin: "0 0 18px",
              color: "#64748b",
              lineHeight: 1.55,
              overflowWrap: "anywhere",
            }}
          >
            {this.state.error.message ||
              "An unexpected rendering error occurred."}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 14px",
              border: 0,
              borderRadius: 9,
              background: "#f04824",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload workspace
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
