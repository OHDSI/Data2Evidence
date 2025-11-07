import React, { Component, ErrorInfo, ReactNode } from "react";
import { ErrorDetail } from "./ErrorDetail";

interface ErrorBoundaryProps {
  name?: string;
  children?: ReactNode;
}

interface ErrorBoundaryState {
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: undefined, errorInfo: undefined };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
  }

  override render(): React.ReactNode {
    if (this.state.errorInfo) {
      if (this.state.error) {
        console.error(this.state.error.toString());
      }

      return (
        <ErrorDetail
          title={`Something went wrong with ${this.props.name || `the page you're trying to access`}`}
          subtitle="Please try again. To report the error, please send an email to help@data4life.care."
        />
      );
    }

    return this.props.children;
  }
}
