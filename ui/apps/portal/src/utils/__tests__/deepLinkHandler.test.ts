import { extractDatasetIdFromUrl, isValidDatasetId, syncDatasetFromUrl } from "../deepLinkHandler";
import * as deepLinkStorage from "../deepLinkStorage";

// Mock sessionStorage
const mockSessionStorage: { [key: string]: string } = {};

beforeAll(() => {
  // Mock sessionStorage implementation
  Object.defineProperty(window, "sessionStorage", {
    value: {
      getItem: (key: string) => {
        return key in mockSessionStorage ? mockSessionStorage[key] : null;
      },
      setItem: (key: string, value: string) => {
        mockSessionStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockSessionStorage[key];
      },
      clear: () => {
        Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
      },
    },
    writable: true,
  });
});

describe("deepLinkHandler", () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  });

  describe("extractDatasetIdFromUrl", () => {
    it("should extract datasetId from URL with query params", () => {
      const url = "http://example.com?datasetId=test-dataset-123";
      expect(extractDatasetIdFromUrl(url)).toBe("test-dataset-123");
    });

    it("should extract datasetId from URL with multiple query params", () => {
      const url = "http://example.com?linkType=cohort-definition&datasetId=test-dataset-123&query=abc";
      expect(extractDatasetIdFromUrl(url)).toBe("test-dataset-123");
    });

    it("should return null if no datasetId parameter", () => {
      const url = "http://example.com?linkType=cohort-definition";
      expect(extractDatasetIdFromUrl(url)).toBeNull();
    });

    it("should return null if URL has no query params", () => {
      const url = "http://localhost:3000/researcher/pa";
      expect(extractDatasetIdFromUrl(url)).toBeNull();
    });

    it("should handle empty datasetId value", () => {
      const url = "http://example.com?datasetId=";
      expect(extractDatasetIdFromUrl(url)).toBeNull();
    });

    it("should decode URL-encoded datasetId", () => {
      const url = "http://example.com?datasetId=test%20dataset";
      expect(extractDatasetIdFromUrl(url)).toBe("test dataset");
    });

    it("should work with hash-based URLs", () => {
      const url = "http://localhost:3000/researcher/pa#?datasetId=test-dataset-123";
      // Hash params are not automatically parsed by URLSearchParams, should return null
      expect(extractDatasetIdFromUrl(url)).toBeNull();
    });

    it("should extract datasetId when hash comes after query params", () => {
      const url = "http://example.com?datasetId=test-123#hash";
      expect(extractDatasetIdFromUrl(url)).toBe("test-123");
    });

    it("should handle multiple values for same param (takes first value)", () => {
      const url = "http://example.com?datasetId=first&datasetId=second";
      // URL.searchParams.get() returns the first value
      expect(extractDatasetIdFromUrl(url)).toBe("first");
    });

    it("should handle case sensitivity (exact match only)", () => {
      const url = "http://example.com?DatasetId=test-123";
      // Parameter name is case-sensitive, should not match
      expect(extractDatasetIdFromUrl(url)).toBeNull();
    });

    it("should handle special characters in datasetId", () => {
      const url = "http://example.com?datasetId=test%2Fdata%3Aset";
      // Should decode to "test/data:set"
      expect(extractDatasetIdFromUrl(url)).toBe("test/data:set");
    });

    it("should handle complex special characters", () => {
      const url = "http://example.com?datasetId=test%20%26%20data";
      // Should decode to "test & data"
      expect(extractDatasetIdFromUrl(url)).toBe("test & data");
    });

    it("should fallback to sessionStorage when URL has no datasetId", () => {
      // Simulate saved params from initial page load
      deepLinkStorage.saveDeepLinkParams({ datasetId: "stored-dataset-123" });

      const url = "http://localhost:3000/researcher/pa";
      expect(extractDatasetIdFromUrl(url)).toBe("stored-dataset-123");
    });

    it("should prefer URL datasetId over sessionStorage", () => {
      // Simulate saved params from initial page load
      deepLinkStorage.saveDeepLinkParams({ datasetId: "stored-dataset-123" });

      const url = "http://example.com?datasetId=url-dataset-456";
      expect(extractDatasetIdFromUrl(url)).toBe("url-dataset-456");
    });

    it("should return null when neither URL nor sessionStorage has datasetId", () => {
      const url = "http://localhost:3000/researcher/pa";
      expect(extractDatasetIdFromUrl(url)).toBeNull();
    });

    it("should handle sessionStorage when URL parsing fails", () => {
      // Simulate saved params
      deepLinkStorage.saveDeepLinkParams({ datasetId: "stored-dataset-123" });

      const invalidUrl = "not-a-valid-url";
      expect(extractDatasetIdFromUrl(invalidUrl)).toBe("stored-dataset-123");
    });
  });

  describe("isValidDatasetId", () => {
    it("should return true for non-empty string", () => {
      expect(isValidDatasetId("test-dataset-123")).toBe(true);
    });

    it("should return false for empty string", () => {
      expect(isValidDatasetId("")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidDatasetId(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidDatasetId(undefined)).toBe(false);
    });

    it("should return true for string with spaces", () => {
      expect(isValidDatasetId("test dataset")).toBe(true);
    });

    it("should return true for UUID format", () => {
      expect(isValidDatasetId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    });
  });

  describe("syncDatasetFromUrl", () => {
    const mockSetActiveDatasetId = jest.fn();
    const mockSetFeedback = jest.fn();
    const mockNavigate = jest.fn();
    const availableDatasets = [
      { id: "dataset-1", name: "Dataset 1", tenant: { id: "tenant-1" } },
      { id: "dataset-2", name: "Dataset 2", tenant: { id: "tenant-2" } },
      { id: "test-dataset-123", name: "Test Dataset", tenant: { id: "tenant-test" } },
    ];

    beforeEach(() => {
      mockSetActiveDatasetId.mockClear();
      mockSetFeedback.mockClear();
      mockNavigate.mockClear();
    });

    it("should return no sync when URL has no datasetId parameter", () => {
      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: false,
        syncSuccess: false,
        datasetId: null,
      });
      expect(mockSetActiveDatasetId).not.toHaveBeenCalled();
      expect(mockSetFeedback).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should successfully sync when datasetId is valid and accessible", () => {
      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa?datasetId=test-dataset-123",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: true,
        datasetId: "test-dataset-123",
      });
      expect(mockSetActiveDatasetId).toHaveBeenCalledWith("test-dataset-123");
      // Only datasetId provided, no PA params - navigates to /information with no query string
      expect(mockNavigate).toHaveBeenCalledWith("/researcher/information", {
        state: { tenantId: "tenant-test" },
      });
      expect(mockSetFeedback).not.toHaveBeenCalled();
      // Verify sessionStorage cleared after successful use
      expect(deepLinkStorage.loadDeepLinkParams()).toBeNull();
    });

    it("should show error when datasetId is not in available datasets", () => {
      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa?datasetId=non-existent-dataset",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: false,
        datasetId: "non-existent-dataset",
      });
      expect(mockSetActiveDatasetId).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetFeedback).toHaveBeenCalledWith({
        type: "error",
        message: "Unable to Open Dataset",
        description:
          'The dataset "non-existent-dataset" specified in the URL is not available. This may be because the dataset does not exist, has been deleted, or you do not have the required permissions to access it.',
      });
      // Verify sessionStorage cleared after error
      expect(deepLinkStorage.loadDeepLinkParams()).toBeNull();
    });

    it("should show error when user has no access to dataset", () => {
      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa?datasetId=restricted-dataset",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: false,
        datasetId: "restricted-dataset",
      });
      expect(mockSetActiveDatasetId).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetFeedback).toHaveBeenCalledWith({
        type: "error",
        message: "Unable to Open Dataset",
        description:
          'The dataset "restricted-dataset" specified in the URL is not available. This may be because the dataset does not exist, has been deleted, or you do not have the required permissions to access it.',
      });
    });

    it("should handle empty available datasets list", () => {
      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa?datasetId=test-dataset-123",
        availableDatasets: [],
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: false,
        datasetId: "test-dataset-123",
      });
      expect(mockSetActiveDatasetId).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockSetFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          message: "Unable to Open Dataset",
        })
      );
    });

    it("should route to /cohort when route=cohort and pass PA params", () => {
      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa?datasetId=dataset-2&route=cohort&linkType=cohort-definition&query=abc123",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: true,
        datasetId: "dataset-2",
      });
      expect(mockSetActiveDatasetId).toHaveBeenCalledWith("dataset-2");
      // Only PA params (linkType, query) in URL - not Portal params (datasetId, route)
      expect(mockNavigate).toHaveBeenCalledWith("/researcher/cohort?linkType=cohort-definition&query=abc123", {
        state: { tenantId: "tenant-2" },
      });
      expect(mockSetFeedback).not.toHaveBeenCalled();
    });

    it("should restore params from sessionStorage and route to /cohort", () => {
      // Simulate initial page load saved params (auth stripped URL params)
      deepLinkStorage.saveDeepLinkParams({
        datasetId: "test-dataset-123",
        route: "cohort",
        linkType: "cohort-definition",
        query: "xyz789",
      });

      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: true,
        datasetId: "test-dataset-123",
      });
      expect(mockSetActiveDatasetId).toHaveBeenCalledWith("test-dataset-123");
      // Only PA params restored to URL
      expect(mockNavigate).toHaveBeenCalledWith("/researcher/cohort?linkType=cohort-definition&query=xyz789", {
        state: { tenantId: "tenant-test" },
      });
      expect(mockSetFeedback).not.toHaveBeenCalled();
      // Verify sessionStorage cleared after successful use
      expect(deepLinkStorage.loadDeepLinkParams()).toBeNull();
    });

    it("should merge URL params with sessionStorage params", () => {
      // Simulate saved params (route and PA params saved, datasetId in URL)
      deepLinkStorage.saveDeepLinkParams({
        route: "cohort",
        linkType: "cohort-definition",
        query: "xyz789",
      });

      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa?datasetId=dataset-1",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result).toEqual({
        hasDatasetParam: true,
        syncSuccess: true,
        datasetId: "dataset-1",
      });
      expect(mockSetActiveDatasetId).toHaveBeenCalledWith("dataset-1");
      // Only PA params in URL
      expect(mockNavigate).toHaveBeenCalledWith("/researcher/cohort?linkType=cohort-definition&query=xyz789", {
        state: { tenantId: "tenant-1" },
      });
      expect(mockSetFeedback).not.toHaveBeenCalled();
      // Verify sessionStorage cleared after successful use
      expect(deepLinkStorage.loadDeepLinkParams()).toBeNull();
    });

    it("should default to /information when no route param", () => {
      // Only PA params, no route specified
      deepLinkStorage.saveDeepLinkParams({
        datasetId: "dataset-1",
        linkType: "some-other-type",
        query: "abc",
      });

      const result = syncDatasetFromUrl({
        url: "http://localhost:3000/researcher/pa",
        availableDatasets,
        setActiveDatasetId: mockSetActiveDatasetId,
        setFeedback: mockSetFeedback,
        navigate: mockNavigate,
        basePath: "/researcher",
      });

      expect(result.syncSuccess).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith("/researcher/information?linkType=some-other-type&query=abc", {
        state: { tenantId: "tenant-1" },
      });
    });
  });
});
