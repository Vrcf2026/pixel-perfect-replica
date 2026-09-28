import { Component, type ReactNode } from "react";
import { reportPlayerError } from "./lib/errors";

/** Se uma zona rebentar, as outras continuam; tenta de novo passado um minuto. */
export class ZoneErrorBoundary extends Component<
  { name: string; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    reportPlayerError(
      `Zona "${this.props.name}": ${error instanceof Error ? error.message : String(error)}`,
    );
    this.timer = setTimeout(() => this.setState({ failed: false }), 60_000);
  }

  override componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
