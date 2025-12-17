import React from "react";
import { renderHook } from "@testing-library/react";
import { AppProvider } from "../../../contexts";
import { useDeepLinkSync } from "../../../hooks/useDeepLinkSync";
import { useActiveDataset, useFeedback } from "../../../contexts";
import { Study } from "../../../types";

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

/**
 * Integration test for Researcher component deep linking functionality
 *
 * This test verifies that the useDeepLinkSync hook properly integrates with
 * the Researcher component's context providers (AppProvider) to:
 * - Extract datasetId from URL
 * - Set active dataset via context
 * - Display error feedback via context
 * - Navigate to information page
 */
describe("Researcher - Deep Link Integration", () => {
  const mockDatasets: Study[] = [
    {
      id: "dataset-1",
      tenant: { id: "t1", name: "Tenant 1", system: "" },
      tokenStudyCode: "test-code-1",
      schemaName: "schema1",
      type: "omop",
      visibilityStatus: "active",
      publicKey: "key1",
      dataModel: "omop",
      plugin: "plugin1",
      databaseCode: "db1",
      paConfigId: "config1",
      studyDetail: { name: "Dataset 1" },
    } as Study,
    {
      id: "dataset-2",
      tenant: { id: "t1", name: "Tenant 1", system: "" },
      tokenStudyCode: "test-code-2",
      schemaName: "schema2",
      type: "omop",
      visibilityStatus: "active",
      publicKey: "key2",
      dataModel: "omop",
      plugin: "plugin2",
      databaseCode: "db2",
      paConfigId: "config2",
      studyDetail: { name: "Dataset 2" },
    } as Study,
  ];

  beforeEach(() => {
    // Reset window location
    delete (window as any).location;
    (window as any).location = { href: "http://localhost:3000/researcher" };

    // Clear localStorage to reset persisted context state
    localStorage.clear();

    // Clear mock navigate
    mockNavigate.mockClear();
  });

  it("should integrate with AppProvider to set active dataset from URL", () => {
    // Setup: URL with datasetId parameter
    (window as any).location = { href: "http://localhost:3000/researcher?datasetId=dataset-1" };

    // Wrapper with AppProvider to test context integration
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

    // Render hook with loading=true first (simulates initial data fetch)
    const { result, rerender } = renderHook(
      ({ datasets, loading }) => {
        useDeepLinkSync(datasets, loading);
        return {
          activeDataset: useActiveDataset(),
          feedback: useFeedback(),
        };
      },
      { wrapper, initialProps: { datasets: mockDatasets, loading: true } }
    );

    // Then transition to loading=false (simulates data loaded)
    rerender({ datasets: mockDatasets, loading: false });

    // Verify dataset was set via context
    expect(result.current.activeDataset.activeDataset.id).toBe("dataset-1");

    // Verify navigation was triggered (no PA params, so no query string)
    expect(mockNavigate).toHaveBeenCalledWith("/researcher/information", {
      state: { tenantId: "t1" },
    });
  });

  it("should integrate with AppProvider to show error for invalid datasetId", () => {
    // Setup: URL with non-existent datasetId
    (window as any).location = { href: "http://localhost:3000/researcher?datasetId=non-existent" };

    // Wrapper with AppProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

    // Render hook with loading=true first (simulates initial data fetch)
    const { result, rerender } = renderHook(
      ({ datasets, loading }) => {
        useDeepLinkSync(datasets, loading);
        return {
          feedback: useFeedback(),
        };
      },
      { wrapper, initialProps: { datasets: mockDatasets, loading: true } }
    );

    // Then transition to loading=false (simulates data loaded)
    rerender({ datasets: mockDatasets, loading: false });

    // Verify error feedback was set via context
    const feedback = result.current.feedback.getFeedback();
    expect(feedback?.type).toBe("error");
    expect(feedback?.message).toBe("Unable to Open Dataset");

    // Verify navigation was NOT triggered
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should not process deep link while datasets are loading", () => {
    // Setup: URL with datasetId
    (window as any).location = { href: "http://localhost:3000/researcher?datasetId=dataset-1" };

    // Wrapper with AppProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

    // Render hook with loading=true
    const { result } = renderHook(
      () => {
        useDeepLinkSync(mockDatasets, true);
        return {
          activeDataset: useActiveDataset(),
        };
      },
      { wrapper }
    );

    // Dataset should not be set while loading
    // (activeDataset.id should be empty string from initial state)
    expect(result.current.activeDataset.activeDataset.id).toBe("");
  });

  it("should handle URL without datasetId parameter", () => {
    // Setup: URL without datasetId
    (window as any).location = { href: "http://localhost:3000/researcher" };

    // Wrapper with AppProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

    // Render hook
    const { result } = renderHook(
      () => {
        useDeepLinkSync(mockDatasets, false);
        return {
          activeDataset: useActiveDataset(),
          feedback: useFeedback(),
        };
      },
      { wrapper }
    );

    // No dataset should be set
    expect(result.current.activeDataset.activeDataset.id).toBe("");
    // No feedback should be shown
    expect(result.current.feedback.getFeedback()).toBeUndefined();
  });

  it("should show error when user has zero datasets but URL has datasetId", () => {
    // Setup: URL with datasetId but user has no datasets
    (window as any).location = { href: "http://localhost:3000/researcher?datasetId=dataset-1" };

    // Wrapper with AppProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

    // Render hook with loading=true first, then loading=false with empty datasets
    const { result, rerender } = renderHook(
      ({ datasets, loading }) => {
        useDeepLinkSync(datasets, loading);
        return {
          feedback: useFeedback(),
        };
      },
      { wrapper, initialProps: { datasets: [] as Study[], loading: true } }
    );

    // Then transition to loading=false with empty datasets
    rerender({ datasets: [] as Study[], loading: false });

    // Should show error feedback
    const feedback = result.current.feedback.getFeedback();
    expect(feedback?.type).toBe("error");
    expect(feedback?.message).toBe("Unable to Open Dataset");
  });

  it("should route to /cohort when route=cohort and pass PA params", () => {
    // Setup: URL with route=cohort and PA params (linkType, query)
    (window as any).location = {
      href: "http://localhost:3000/researcher?datasetId=dataset-2&route=cohort&linkType=cohort-definition&query=abc",
    };

    // Wrapper with AppProvider
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

    // Render hook with loading=true first (simulates initial data fetch)
    const { result, rerender } = renderHook(
      ({ datasets, loading }) => {
        useDeepLinkSync(datasets, loading);
        return {
          activeDataset: useActiveDataset(),
        };
      },
      { wrapper, initialProps: { datasets: mockDatasets, loading: true } }
    );

    // Then transition to loading=false (simulates data loaded)
    rerender({ datasets: mockDatasets, loading: false });

    // Verify correct dataset was set
    expect(result.current.activeDataset.activeDataset.id).toBe("dataset-2");

    // Verify navigation routes to /cohort with only PA params (not datasetId/route)
    expect(mockNavigate).toHaveBeenCalledWith("/researcher/cohort?linkType=cohort-definition&query=abc", {
      state: { tenantId: "t1" },
    });
  });
});
