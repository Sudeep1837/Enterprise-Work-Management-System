import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./components/UI";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page render failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 shadow-sm dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-100">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">This page hit a rendering error.</h2>
            <p className="mt-1 text-sm opacity-80">
              Your session is still active. Try reopening the page after the data refreshes.
            </p>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => this.setState({ error: null })}
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
