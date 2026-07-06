import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pencil, Trash2, X, RotateCcw } from "lucide-react";
import { IconButton } from "./IconButton";

describe("IconButton", () => {
  it("renders a button with the given accessible label", () => {
    render(<IconButton Icon={Pencil} label="Edit Project Alpha" />);

    const button = screen.getByRole("button", { name: "Edit Project Alpha" });
    expect(button).toBeInTheDocument();
  });

  it("sets both aria-label and title to the label value", () => {
    render(<IconButton Icon={Trash2} label="Delete Project Alpha" />);

    const button = screen.getByRole("button", { name: "Delete Project Alpha" });
    expect(button).toHaveAttribute("aria-label", "Delete Project Alpha");
    expect(button).toHaveAttribute("title", "Delete Project Alpha");
  });

  it("calls onClick when clicked", async () => {
    const handleClick = vi.fn();
    render(<IconButton Icon={Pencil} label="Edit something" onClick={handleClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Edit something" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and non-interactive when disabled prop is true", async () => {
    const handleClick = vi.fn();
    render(
      <IconButton Icon={RotateCcw} label="Clear override for Tasks" disabled onClick={handleClick} />
    );

    const button = screen.getByRole("button", { name: "Clear override for Tasks" });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("is enabled by default (disabled=false)", () => {
    render(<IconButton Icon={X} label="Remove value" />);

    const button = screen.getByRole("button", { name: "Remove value" });
    expect(button).not.toBeDisabled();
  });
});
