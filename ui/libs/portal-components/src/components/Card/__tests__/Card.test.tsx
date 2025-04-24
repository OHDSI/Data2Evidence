import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/extend-expect";
import { Card } from "../Card";
import { DatasetIcon } from "../../../components/Icons";

it("has title", () => {
  const { queryByTestId } = render(<Card title="Title Test" />);
  expect(queryByTestId("card-title")).toHaveTextContent("Title Test");
});

it("has class", () => {
  const { queryByTestId } = render(<Card className="card-test" />);
  expect(queryByTestId("card")).toHaveClass("card-test");
});

it("has icon", () => {
  const { queryByTestId } = render(<Card icon={DatasetIcon} title="Icon Test" />);
  expect(queryByTestId("card-icon")).toBeTruthy();
});

it("has child element", () => {
  const { queryByTestId } = render(
    <Card>
      <div data-testid="content">Content</div>
    </Card>
  );

  const content = queryByTestId("content");
  expect(queryByTestId("card-content")).toContainElement(content);
  expect(content).toHaveTextContent("Content");
});
